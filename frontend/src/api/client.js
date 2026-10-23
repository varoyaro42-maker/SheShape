import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000
})

export function readError(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error || error?.message || fallback
}

export default api
