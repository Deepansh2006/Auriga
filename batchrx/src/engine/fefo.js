import { daysUntilExpiry } from './healthScore.js'

export function isSellable(batch, today = new Date()) {
  return batch.status === 'active' && batch.quantity > 0 && daysUntilExpiry(batch.expiry, today) > 0
}

export function sellableBatches(batches, medicineId, today = new Date()) {
  return batches.filter((batch) => batch.medicineId === medicineId && isSellable(batch, today)).sort((first, second) => first.expiry.localeCompare(second.expiry))
}

export function sellableQuantity(batches, medicineId, today = new Date()) {
  return sellableBatches(batches, medicineId, today).reduce((total, batch) => total + batch.quantity, 0)
}

export function allocateFEFO(batches, medicineId, requestedQuantity, today = new Date()) {
  if (requestedQuantity <= 0) return { allocations: [], remaining: 0 }
  let remaining = requestedQuantity
  const allocations = []
  for (const batch of sellableBatches(batches, medicineId, today)) {
    if (remaining === 0) break
    const quantity = Math.min(batch.quantity, remaining)
    allocations.push({ batchId: batch.id, lot: batch.lot, expiry: batch.expiry, quantity })
    remaining -= quantity
  }
  return { allocations, remaining }
}