import { supabase } from '../supabaseClient'

// TODO: 실제 프로젝트에서 Users 테이블명이 다르면 여기만 바꾸면 됩니다.
// 이전에 작성한 SQL 기준 테이블명: app_users
const USERS_TABLE = 'app_users'

export async function fetchMyRole() {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr) throw sessionErr

  const userId = sessionData?.session?.user?.id
  if (!userId) return null

  const { data, error } = await supabase.from(USERS_TABLE).select('role').eq('id', userId).maybeSingle()
  if (error) throw error

  return data?.role ?? null
}

