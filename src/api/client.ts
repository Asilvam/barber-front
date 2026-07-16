import axios from 'axios'
import { clearAuthSession, getAuthToken } from '../auth/session'

const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export const apiClient = axios.create({
  baseURL: API,
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      clearAuthSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
