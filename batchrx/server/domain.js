import { seedBatches, seedMedicines } from '../src/data/seed.js'

export const MS_PER_DAY = 86400000

export function toDateOnly(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? value : null
}

export function daysUntilExpiry(expiry, today) {
  const expiryDate = new Date(`${expiry}T00:00:00Z`)
  const todayDate = new Date(`${today}T00:00:00Z`)
  return Math.ceil((expiryDate - todayDate) / MS_PER_DAY)
}

export function isSellable(batch, today) {
  return batch.status === 'active' && batch.quantity > 0 && daysUntilExpiry(batch.expiry, today) > 0
}

export function sellableQuantity(state, medicineId, today) {
  return state.batches.filter((batch) => batch.medicineId === medicineId && isSellable(batch, today)).reduce((total, batch) => total + batch.quantity, 0)
}

export function createInitialState(today = new Date().toISOString().slice(0, 10)) {
  return { version: 3, clockDate: today, medicines: structuredClone(seedMedicines).map((medicine) => ({ ...medicine, reorderThreshold: medicine.reorderThreshold ?? 20 })), batches: structuredClone(seedBatches), dispenseLogs: [], outbox: [], clockRuns: [] }
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function checkReorderTransitions(previousState, nextState, changedMedicineIds, today) {
  for (const medicineId of changedMedicineIds) {
    const medicine = nextState.medicines.find((item) => item.id === medicineId)
    if (!medicine) continue
    const before = sellableQuantity(previousState, medicineId, today)
    const after = sellableQuantity(nextState, medicineId, today)
    const threshold = Number(medicine.reorderThreshold) || 0
    if (before >= threshold && after < threshold) {
      const alreadyOpen = nextState.outbox.some((message) => message.type === 'REORDER_REQUIRED' && message.medicineId === medicineId && message.status === 'pending')
      if (!alreadyOpen) nextState.outbox.push({ id: createId('event'), type: 'REORDER_REQUIRED', medicineId, medicineName: medicine.name, sellableQuantity: after, threshold, status: 'pending', createdAt: `${today}T00:00:00.000Z` })
    }
  }
}
