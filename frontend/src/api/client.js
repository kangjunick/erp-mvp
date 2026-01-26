import axios from 'axios'

// 배포환경에서는 nginx가 /api 를 backend로 프록시하므로 기본값은 /api
const DEFAULT_BASE_URL = '/api'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
})

export default api
