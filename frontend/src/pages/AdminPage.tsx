import { supabase } from '../supabaseClient'

export function AdminPage() {
  return (
    <div className="min-h-full bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-semibold text-slate-900">관리자 페이지</div>
          <div className="mt-1 text-sm text-slate-600">여기에 관리자 기능을 붙이면 됩니다.</div>
          <div className="mt-4">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => void supabase.auth.signOut()}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

