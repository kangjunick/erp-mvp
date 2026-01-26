import { useMemo, useState } from 'react'
import { OrderDetailForm } from '../components/OrderDetailForm'
import { OrdersList } from '../components/OrdersList'
import type { Order } from '../types'

const MOCK_ORDERS: Order[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    mall_name: '쿠팡',
    product_name: '무선 마우스',
    keyword: '가성비 마우스',
    option_text: '블랙',
    status: 'pending',
    invoice_number: null,
    review_screenshot_url: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    mall_name: '네이버 스마트스토어',
    product_name: 'USB-C 허브',
    keyword: '멀티포트',
    option_text: '6in1',
    status: 'purchased',
    invoice_number: '1234-5678-9012',
    review_screenshot_url: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    mall_name: '11번가',
    product_name: '블루투스 이어폰',
    keyword: '노이즈캔슬링',
    option_text: '화이트',
    status: 'reviewed',
    invoice_number: '9999-0000-1111',
    review_screenshot_url:
      'https://images.unsplash.com/photo-1518441980410-3e1a39bb3f9a?auto=format&fit=crop&w=800&q=80',
  },
]

export function StaffWorkPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [selectedId, setSelectedId] = useState<string>(MOCK_ORDERS[0]?.id ?? '')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      return (
        o.mall_name.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q) ||
        (o.keyword ?? '').toLowerCase().includes(q) ||
        (o.option_text ?? '').toLowerCase().includes(q)
      )
    })
  }, [orders, query])

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId])

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">직원용 업무 처리</div>
            <div className="text-xs text-slate-500">좌측에서 주문 선택 → 우측에서 처리</div>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색 (상품명/쇼핑몰/키워드/옵션)"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid flex-1 max-w-7xl grid-cols-1 md:grid-cols-[380px_1fr]">
        <OrdersList
          orders={filtered}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
          }}
        />
        <OrderDetailForm
          order={selected}
          onChange={(next) => {
            setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)))
          }}
          onSave={async (next) => {
            // TODO: 백엔드 연동 (PATCH /api/orders/{id} 등)
            setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)))
          }}
        />
      </div>
    </div>
  )
}

