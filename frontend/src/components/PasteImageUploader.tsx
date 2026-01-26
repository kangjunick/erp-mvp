import type { ClipboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/client'

type State =
  | { kind: 'idle' }
  | { kind: 'ready' }
  | { kind: 'uploading' }
  | { kind: 'uploaded'; url: string }
  | { kind: 'error'; message: string }

export function PasteImageUploader(props: {
  label?: string
  orderId?: string
  kind?: string
  initialUrl?: string | null
  onUploaded: (url: string) => void
}) {
  const { label = '리뷰 스크린샷', orderId, kind = 'review_screenshot', initialUrl, onUploaded } = props
  const [state, setState] = useState<State>(initialUrl ? { kind: 'uploaded', url: initialUrl } : { kind: 'idle' })
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [armed, setArmed] = useState(false)
  const pasteZoneRef = useRef<HTMLTextAreaElement | null>(null)

  const previewUrl = useMemo(() => {
    if (localPreviewUrl) return localPreviewUrl
    if (state.kind === 'uploaded') return state.url
    return null
  }, [localPreviewUrl, state])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  function stageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setState({ kind: 'error', message: '이미지 파일만 업로드할 수 있어요.' })
      return
    }

    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    const nextPreview = URL.createObjectURL(file)
    setLocalPreviewUrl(nextPreview)
    setPendingFile(file)
    setState({ kind: 'ready' })
  }

  async function uploadNow() {
    if (!pendingFile) return
    setState({ kind: 'uploading' })

    try {
      const form = new FormData()
      form.append('file', pendingFile)
      if (orderId) form.append('order_id', orderId)
      if (kind) form.append('kind', kind)

      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = res?.data?.url
      if (!url) throw new Error('업로드 응답에 url이 없습니다.')
      setState({ kind: 'uploaded', url })
      setPendingFile(null)
      onUploaded(url)
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : '업로드 중 오류가 발생했어요.' })
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          stageFile(file)
          e.preventDefault()
          return
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setArmed(true)
              setTimeout(() => pasteZoneRef.current?.focus(), 0)
            }}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium',
              armed ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ].join(' ')}
          >
            Ctrl+V 붙여넣기 준비
          </button>
          <label className="cursor-pointer rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            파일 선택
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) stageFile(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <textarea
          ref={pasteZoneRef}
          onFocus={() => setArmed(true)}
          onBlur={() => setArmed(false)}
          onPaste={onPaste}
          placeholder="여기를 클릭하고 Ctrl+V로 이미지를 붙여넣으세요."
          className="h-20 w-full resize-none rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="aspect-square w-full overflow-hidden rounded-lg border bg-slate-50">
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">미리보기</div>
            )}
          </div>

          <div className="min-w-0">
            {state.kind === 'idle' && (
              <div className="text-sm text-slate-600">
                - Ctrl+V로 붙여넣으면 미리보기가 뜨고, 전송 버튼으로 업로드합니다.
                <div className="mt-1 text-xs text-slate-500">
                  (서버: <code className="rounded bg-slate-100 px-1">VITE_API_BASE_URL</code> +{' '}
                  <code className="rounded bg-slate-100 px-1">/upload</code>)
                </div>
              </div>
            )}
            {state.kind === 'ready' && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">전송 준비 완료</div>
                <div className="text-xs text-slate-600">아래 전송 버튼을 눌러 업로드하세요.</div>
              </div>
            )}
            {state.kind === 'uploading' && (
              <div className="text-sm font-medium text-slate-900">업로드 중…</div>
            )}
            {state.kind === 'uploaded' && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-emerald-700">업로드 완료</div>
                <div className="truncate text-xs text-slate-600">
                  URL: <code className="rounded bg-slate-100 px-1">{state.url}</code>
                </div>
              </div>
            )}
            {state.kind === 'error' && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-rose-700">업로드 실패</div>
                <div className="text-xs text-slate-600">{state.message}</div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={state.kind === 'uploading' || !pendingFile}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={() => void uploadNow()}
              >
                전송
              </button>
              <button
                type="button"
                className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() => {
                  if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
                  setLocalPreviewUrl(null)
                  setPendingFile(null)
                  setState({ kind: 'idle' })
                  onUploaded('')
                }}
              >
                초기화
              </button>
              <div className="text-xs text-slate-500">
                팁: 크롬/사파리에서 스크린샷을 찍고 바로 붙여넣기 하면 가장 편해요.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

