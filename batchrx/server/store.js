import { getState, replaceState, resetDatabase } from './db.js'

export { getState, replaceState }

export function resetState(today) {
  return resetDatabase(today)
}
