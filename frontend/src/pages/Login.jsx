import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { fetchMyRole } from '../auth/role'

export default function Login() {
  const nav = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const from = useMemo(() => location.state?.from || null, [location.state])

  useEffect(() => {
    // 이미 로그인된 경우: 역할 기반 리다이렉트
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data?.session) return
      const role = await fetchMyRole().catch(() => null)
      if (role === 'admin') nav('/admin', { replace: true })
      else if (role === 'staff') nav('/staff', { replace: true })
    })
  }, [nav])

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInErr) throw signInErr
      if (!data?.session) throw new Error('로그인 세션을 가져오지 못했습니다.')

      const role = await fetchMyRole()
      if (role === 'admin') nav('/admin', { replace: true })
      else if (role === 'staff') nav('/staff', { replace: true })
      else if (from) nav(from, { replace: true })
      else nav('/staff', { replace: true })
    } catch (err) {
      setError(err?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-slate-900">로그인</div>
          <div className="text-sm text-slate-500">이메일/비밀번호로 로그인하세요.</div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="name@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          환경변수 필요: <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code>,{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>
        </div>
      </div>
    </div>
  )
}

