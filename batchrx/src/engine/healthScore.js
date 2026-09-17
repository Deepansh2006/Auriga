export function daysUntilExpiry(expiry, today = new Date()) {
  const expiryDate = new Date(`${expiry}T00:00:00`)
  const currentDate = new Date(today)
  currentDate.setHours(0, 0, 0, 0)
  return Math.ceil((expiryDate - currentDate) / 86400000)
}

export function healthScore(expiry, today = new Date()) {
  const days = daysUntilExpiry(expiry, today)
  if (days <= 0) return 0
  if (days >= 365) return 100
  return Math.max(1, Math.round((days / 365) * 100))
}

export function medicineHealthScore(batches, today = new Date()) {
  const sellable = batches.filter((batch) => batch.status === 'active' && batch.quantity > 0 && daysUntilExpiry(batch.expiry, today) > 0)
  if (sellable.length === 0) return 0
  const earliestDays = Math.min(...sellable.map((batch) => daysUntilExpiry(batch.expiry, today)))
  const totalQuantity = sellable.reduce((total, batch) => total + batch.quantity, 0)
  const soonQuantity = sellable.filter((batch) => daysUntilExpiry(batch.expiry, today) <= 30).reduce((total, batch) => total + batch.quantity, 0)
  let score = 100
  if (earliestDays < 7) score -= 50
  else if (earliestDays < 30) score -= 30
  else if (earliestDays < 60) score -= 10
  score -= Math.floor((soonQuantity / totalQuantity) * 30)
  return Math.max(0, Math.min(100, score))
}

export function healthTone(score) {
  if (score <= 0) return { label: 'Expired', color: 'coral' }
  if (score <= 20) return { label: 'Critical', color: 'coral' }
  if (score <= 45) return { label: 'Expiring soon', color: 'amber' }
  return { label: 'Healthy', color: 'teal' }
}