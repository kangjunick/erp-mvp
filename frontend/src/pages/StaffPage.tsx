import { supabase } from '../supabaseClient'
import { StaffWorkPage } from './StaffWorkPage'

export function StaffPage() {
  return (
    <div className="h-full">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="text-xs text-slate-600">로그인됨: 직원</div>
          <button
            type="button"
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => void supabase.auth.signOut()}
          >
            로그아웃
          </button>
        </div>
      </div>
      <StaffWorkPage />
    </div>
  )
}

