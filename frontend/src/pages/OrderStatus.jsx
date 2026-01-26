import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

function statusLabel(s) {
  if (s === 'pending') return '대기'
  if (s === 'purchased') return '구매완료'
  if (s === 'reviewed') return '리뷰완료'
  return s
}

export default function OrderStatus() {
  const { uuid } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)

  const reviewed = useMemo(() => order?.status === 'reviewed', [order?.status])

  useEffect(() => {
    let mounted = true
    if (!uuid) return
    setLoading(true)
    setError(null)
    api
      .get(`/api/orders/public/${uuid}`)
      .then((res) => {
        if (!mounted) return
        setOrder(res.data)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.response?.data?.detail || e?.message || '주문 조회 실패')
        setOrder(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [uuid])

  return (
    <div className="min-h-full bg-slate-100">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="text-sm font-semibold text-slate-900">주문 진행 상태</div>
          <div className="mt-1 text-xs text-slate-500">
            링크로 조회되는 페이지입니다. (로그인 불필요)
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {loading && (
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-sm text-slate-600">불러오는 중…</div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="text-sm font-semibold text-rose-800">조회 실패</div>
            <div className="mt-1 text-sm text-rose-700">{error}</div>
            <div className="mt-3 text-xs text-rose-700">
              URL이 올바른지 확인해주세요: <code className="rounded bg-white/60 px-1">/status/:uuid</code>
            </div>
          </div>
        )}

        {!loading && !error && order && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">{order.mall_name}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{order.product_name}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    {order.keyword && <span className="rounded bg-slate-100 px-2 py-0.5">키워드: {order.keyword}</span>}
                    {order.option_text && <span className="rounded bg-slate-100 px-2 py-0.5">옵션: {order.option_text}</span>}
                  </div>
                </div>

                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-700">배송/송장</div>
                  <div className="mt-1 text-sm text-slate-900">{order.invoice_number || '미입력'}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-700">리뷰</div>
                  <div className="mt-1 text-sm text-slate-900">{reviewed ? '작성 완료' : '대기'}</div>
                </div>
              </div>
            </div>

            {reviewed && (
              <div className="rounded-2xl border bg-white p-6">
                <div className="text-sm font-semibold text-slate-900">리뷰 스크린샷</div>
                <div className="mt-1 text-xs text-slate-500">리뷰 완료 상태인 경우에만 표시됩니다.</div>

                {order.review_screenshot_url ? (
                  <div className="mt-4 overflow-hidden rounded-xl border bg-slate-50">
                    <img
                      src={order.review_screenshot_url}
                      alt="리뷰 스크린샷"
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    스크린샷 URL이 아직 저장되지 않았습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

