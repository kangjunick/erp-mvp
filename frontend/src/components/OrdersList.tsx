import type { Order } from '../types'

export function OrdersList(props: {
  orders: Order[]
  selectedId?: string | null
  onSelect: (id: string) => void
}) {
  const { orders, selectedId, onSelect } = props

  return (
    <div className="h-full overflow-y-auto border-r bg-white">
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">할당된 주문</div>
          <div className="text-xs text-slate-500">{orders.length}건</div>
        </div>
      </div>
      <ul className="divide-y">
        {orders.map((o) => {
          const active = o.id === selectedId
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                className={[
                  'w-full text-left px-4 py-3 hover:bg-slate-50',
                  active ? 'bg-slate-50' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {o.product_name}
                    </div>
                    <div className="truncate text-xs text-slate-500">{o.mall_name}</div>
                  </div>
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      o.status === 'pending' ? 'bg-amber-50 text-amber-700' : '',
                      o.status === 'purchased' ? 'bg-blue-50 text-blue-700' : '',
                      o.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : '',
                    ].join(' ')}
                  >
                    {o.status === 'pending' && '대기'}
                    {o.status === 'purchased' && '구매완료'}
                    {o.status === 'reviewed' && '리뷰완료'}
                  </span>
                </div>
                {(o.keyword || o.option_text) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    {o.keyword && (
                      <span className="rounded bg-slate-100 px-2 py-0.5">키워드: {o.keyword}</span>
                    )}
                    {o.option_text && (
                      <span className="rounded bg-slate-100 px-2 py-0.5">옵션: {o.option_text}</span>
                    )}
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

