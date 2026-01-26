import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

function fmtStatus(s) {
  if (s === 'pending') return '대기'
  if (s === 'purchased') return '구매완료'
  if (s === 'reviewed') return '리뷰완료'
  return s
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [selectedStaffId, setSelectedStaffId] = useState('')

  const [excelUploading, setExcelUploading] = useState(false)
  const [clientId, setClientId] = useState('') // 엑셀에 client_id가 없을 때 대비

  async function refreshAll() {
    setLoading(true)
    setError(null)
    try {
      const [ordersRes, staffRes] = await Promise.all([api.get('/api/orders', { params: { limit: 500 } }), api.get('/api/orders/staff')])
      setOrders(ordersRes.data || [])
      setStaff(staffRes.data || [])
    } catch (e) {
      setError(e?.message || '데이터 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  const allChecked = useMemo(() => orders.length > 0 && selectedIds.size === orders.length, [orders.length, selectedIds.size])

  function toggleAll(checked) {
    if (checked) setSelectedIds(new Set(orders.map((o) => o.id)))
    else setSelectedIds(new Set())
  }

  function toggleOne(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function onUploadExcel(file) {
    setExcelUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      if (clientId) form.append('client_id', clientId)
      // 필요하면 column_map도 추가 가능
      await api.post('/api/orders/import-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshAll()
    } catch (e) {
      setError(e?.message || '엑셀 업로드 실패')
    } finally {
      setExcelUploading(false)
    }
  }

  async function assign() {
    if (!selectedStaffId) {
      setError('직원을 선택하세요.')
      return
    }
    if (selectedIds.size === 0) {
      setError('배정할 주문을 선택하세요.')
      return
    }
    setError(null)
    try {
      await api.post('/api/orders/assign-staff', {
        order_ids: Array.from(selectedIds),
        assigned_staff_id: selectedStaffId,
      })
      setSelectedIds(new Set())
      await refreshAll()
    } catch (e) {
      setError(e?.message || '배정 실패')
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">관리자 대시보드</div>
            <div className="text-xs text-slate-500">엑셀 업로드 → 주문 리스트 확인 → 직원 배정</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="(선택) client_id (엑셀에 없을 때)"
              className="w-64 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <label className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              {excelUploading ? '업로드 중…' : '엑셀 파일 업로드'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={excelUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUploadExcel(f)
                  e.target.value = ''
                }}
              />
            </label>

            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">직원 할당</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name ? `${u.display_name} (${u.username})` : u.username}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void assign()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              배정
            </button>

            <button
              type="button"
              onClick={() => void refreshAll()}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="rounded-2xl border bg-white">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">Orders</div>
            <div className="text-xs text-slate-500">
              {loading ? '로딩 중…' : `${orders.length}건`} / 선택 {selectedIds.size}건
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="px-3 py-2">
                    <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                  </th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">쇼핑몰</th>
                  <th className="px-3 py-2">상품명</th>
                  <th className="px-3 py-2">키워드</th>
                  <th className="px-3 py-2">옵션</th>
                  <th className="px-3 py-2">담당자ID</th>
                  <th className="px-3 py-2">송장</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => {
                  const checked = selectedIds.has(o.id)
                  return (
                    <tr key={o.id} className={checked ? 'bg-blue-50/40' : ''}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={checked} onChange={(e) => toggleOne(o.id, e.target.checked)} />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{fmtStatus(o.status)}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-700">{o.mall_name}</td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-900">{o.product_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{o.keyword || '-'}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{o.option_text || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        <code className="rounded bg-slate-100 px-1">{o.assigned_staff_id || '-'}</code>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-700">{o.invoice_number || '-'}</td>
                    </tr>
                  )
                })}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      주문이 없습니다. 엑셀을 업로드해보세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

