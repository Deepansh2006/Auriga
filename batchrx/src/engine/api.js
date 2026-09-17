const API_BASE = '/api'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'BatchRx API request failed')
  return body
}

export function fetchRemoteState() {
  return apiRequest('/state')
}

export function syncRemoteState(state) {
  return apiRequest('/state', { method: 'POST', body: JSON.stringify(state) })
}
