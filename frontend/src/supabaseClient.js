import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // 개발 시 빠르게 원인 파악하기 위한 에러
  // (실서비스에서는 빌드 단계에서 env 주입하도록 구성)
  console.warn('Supabase env가 설정되지 않았습니다. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 확인하세요.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

