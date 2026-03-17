import axios from "axios"

const API = axios.create({
  baseURL: "https://78793be8-4b51-4b8e-9493-1e9032479e0f-00-3r63kqce1tm9.pike.replit.dev:8000/",
  // baseURL: "http://localhost:8000/",
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