const STORAGE_KEY = 'batchrx-state'

export function loadState(fallback) {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    return parsed?.version === fallback.version ? parsed : fallback
  } catch { return fallback }
}

export function saveState(state) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* Memory state remains usable. */ }
}