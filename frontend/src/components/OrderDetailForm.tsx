import { useEffect, useMemo, useState } from 'react'
import type { Order, OrderStatus } from '../types'
import api from '../api/client'
import { PasteImageUploader } from './PasteImageUploader'

function statusLabel(s: OrderStatus) {
  if (s === 'pending') return '대기'
  if (s === 'purchased') return '구매완료'
  return '리뷰완료'
}

export function OrderDetailForm(props: {
  order: Order | null
  onSave?: (order: Order) => Promise<void> | void
  onChange?: (order: Order) => void
}) {
  const { order, onSave, onChange } = props
  const [draft, setDraft] = useState<Order | null>(order)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<null | 'purchased' | 'reviewed'>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    setDraft(order)
  }, [order])

  const header = useMemo(() => {
    if (!draft) return null
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-500">{draft.mall_name}</div>
        <div className="text-lg font-semibold text-slate-900">{draft.product_name}</div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          {draft.keyword && <span className="rounded bg-slate-100 px-2 py-0.5">키워드: {draft.keyword}</span>}
          {draft.option_text && <span className="rounded bg-slate-100 px-2 py-0.5">옵션: {draft.option_text}</span>}
        </div>
      </div>
    )
  }, [draft])

  function update(partial: Partial<Order>) {
    if (!draft) return
    const next = { ...draft, ...partial }
    setDraft(next)
    onChange?.(next)
  }

  async function mark(kind: 'purchased' | 'reviewed') {
    if (!draft) return
    setActionLoading(kind)
    setActionMsg(null)
    try {
      const path = kind === 'purchased' ? `/api/orders/${draft.id}/mark-purchased` : `/api/orders/${draft.id}/mark-reviewed`
      const res = await api.post(path)
      update({ status: kind === 'purchased' ? 'purchased' : 'reviewed' })
      const smsSent = Boolean(res?.data?.sms_sent)
      const smsError = res?.data?.sms_error
      setActionMsg(smsSent ? '상태 변경 + 문자 발송 완료' : smsError ? `상태 변경 완료(문자 실패: ${smsError})` : '상태 변경 완료(문자 미발송)')
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : '상태 변경 실패')
    } finally {
      setActionLoading(null)
    }
  }

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-sm text-slate-500">좌측에서 주문을 선택하세요.</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="px-6 py-4">{header}</div>
      </div>

      <div className="px-6 py-5">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900">진행 상태</label>
            <select
              value={draft.status}
              onChange={(e) => update({ status: e.target.value as OrderStatus })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="pending">{statusLabel('pending')}</option>
              <option value="purchased">{statusLabel('purchased')}</option>
              <option value="reviewed">{statusLabel('reviewed')}</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-900">송장번호</label>
            <input
              value={draft.invoice_number ?? ''}
              onChange={(e) => update({ invoice_number: e.target.value })}
              placeholder="예) 1234-5678-9012"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <div className="text-xs text-slate-500">구매 완료 후 송장번호를 입력하세요.</div>
          </div>

          <div className="grid gap-2">
            <PasteImageUploader
              orderId={draft.id}
              initialUrl={draft.review_screenshot_url ?? null}
              onUploaded={(url) => update({ review_screenshot_url: url || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">저장</div>
              <div className="text-xs text-slate-600">
                현재 값: 상태 {statusLabel(draft.status)}
                {draft.invoice_number ? ` / 송장 ${draft.invoice_number}` : ''}
              </div>
              {actionMsg && <div className="mt-2 text-xs text-slate-600">{actionMsg}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => void mark('purchased')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {actionLoading === 'purchased' ? '처리 중…' : '구매 완료'}
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => void mark('reviewed')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {actionLoading === 'reviewed' ? '처리 중…' : '후기 완료'}
              </button>
              <button
                type="button"
                disabled={saving || actionLoading !== null}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onSave?.(draft)
                  } finally {
                    setSaving(false)
                  }
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

