import { createId, toDateOnly } from './domain.js'

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function parseQuantity(value) {
  if (value == null || value === '') return null
  const match = String(value).trim().match(/^([0-9]+(?:\.[0-9]+)?)/)
  if (!match) return null
  const quantity = Number(match[1])
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null
}

function parseDate(value) {
  const raw = cleanText(value)
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return toDateOnly(raw)
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return toDateOnly(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
}

export function importBatchRows(state, rows, today) {
  const report = { imported: 0, deduped: 0, rejected: 0, rejections: [] }
  const seen = new Set(state.batches.map((batch) => `${batch.medicineId}|${batch.lot.toLowerCase()}|${batch.expiry}`))
  const medicinesByName = new Map(state.medicines.map((medicine) => [medicine.name.toLowerCase(), medicine]))
  for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) {
    const medicineName = cleanText(row?.medicine ?? row?.medicineName)
    const lot = cleanText(row?.batch ?? row?.batchCode ?? row?.lot)
    const quantity = parseQuantity(row?.quantity ?? row?.qty)
    const expiry = parseDate(row?.expiry ?? row?.expiryDate)
    const medicine = medicinesByName.get(medicineName.toLowerCase())
    const reason = !medicineName ? 'Missing medicine' : !medicine ? 'Medicine not found' : !lot ? 'Missing batch code' : !quantity ? 'Quantity must be a positive whole number' : !expiry ? 'Invalid or missing expiry date' : expiry <= today ? 'Expiry date must be in the future' : null
    if (reason) {
      report.rejected += 1
      report.rejections.push({ row: index + 1, reason })
      continue
    }
    const fingerprint = `${medicine.id}|${lot.toLowerCase()}|${expiry}`
    if (seen.has(fingerprint)) {
      report.deduped += 1
      continue
    }
    seen.add(fingerprint)
    state.batches.push({ id: createId('batch'), medicineId: medicine.id, lot, quantity, originalQty: quantity, expiry, received: parseDate(row?.received ?? row?.receivedDate) ?? today, status: 'active' })
    report.imported += 1
  }
  return report
}
