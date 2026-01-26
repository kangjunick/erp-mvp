/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { fetchMyRole } from '../auth/role'

type Role = 'admin' | 'staff' | 'client' | string

export function ProtectedRoute(props: { allowRoles?: Role[] }) {
  const { allowRoles } = props
  const { loading, session } = useAuth()
  const location = useLocation()

  const [role, setRole] = useState<Role | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!session?.user?.id) return
    setRoleLoading(true)
    setRoleError(null)
    fetchMyRole()
      .then((r: string | null) => {
        if (!mounted) return
        setRole(r)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setRoleError(e instanceof Error ? e.message : 'role 조회 실패')
        setRole(null)
      })
      .finally(() => {
        if (!mounted) return
        setRoleLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-600">로그인 상태 확인 중…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowRoles || allowRoles.length === 0) {
    return <Outlet />
  }

  if (roleLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-600">권한 확인 중…</div>
      </div>
    )
  }

  if (roleError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="space-y-2 text-center">
          <div className="text-sm font-semibold text-slate-900">권한 확인 실패</div>
          <div className="text-xs text-slate-600">{roleError}</div>
          <Navigate to="/login" replace />
        </div>
      </div>
    )
  }

  if (!role || !allowRoles.includes(role)) {
    // 로그인은 됐지만 권한이 다르면 역할에 맞는 페이지로 보내거나 로그인으로 회귀
    const redirect = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/login'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

