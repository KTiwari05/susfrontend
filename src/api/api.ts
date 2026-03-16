import axios from "axios"

const API = axios.create({
  baseURL: "https://83153742-9792-4df1-a74b-d37510601483-00-1py7jffo8sj3m.pike.replit.dev:8000/",
  timeout: 20000,
})

export function getApiErrorMessage(err: any) {
  const status = err?.response?.status
  const detail = err?.response?.data?.detail
  const msg = err?.response?.data?.message
  const fallback = err?.message

  if (typeof detail === "string") return status ? `HTTP ${status}: ${detail}` : detail
  if (typeof msg === "string") return status ? `HTTP ${status}: ${msg}` : msg
  if (typeof fallback === "string") return fallback
  return "Request failed"
}

export default API