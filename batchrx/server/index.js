import { createServer } from 'node:http'
import { getState, replaceState, resetState } from './store.js'
import { checkReorderTransitions, daysUntilExpiry, isSellable } from './domain.js'
import { importBatchRows } from './importer.js'
import { loginUser, registerUser } from './db.js'

const port = Number(process.env.PORT) || 8787

try { registerUser('admin', 'admin') } catch { /* Demo account already exists. */ }

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' })
  response.end(JSON.stringify(body))
}

async function readBody(request) {
  let raw = ''
  for await (const chunk of request) raw += chunk
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { throw new Error('Request body must be valid JSON') }
}

function currentDate(body, state) {
  const candidate = body?.date ?? state.clockDate ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) throw new Error('date must use YYYY-MM-DD')
  return candidate
}

function processClock(state, today) {
  let flagged = 0
  let quarantined = 0
  for (const batch of state.batches) {
    if (batch.status !== 'active') continue
    const days = daysUntilExpiry(batch.expiry, today)
    if (days <= 0) {
      batch.status = 'quarantine'
      batch.quarantinedAt = `${today}T00:00:00.000Z`
      batch.quarantineReason = 'expired-by-clock'
      quarantined += 1
    } else if (days <= 7 && !batch.flaggedAt) {
      batch.flaggedAt = `${today}T00:00:00.000Z`
      batch.flagReason = 'expires-within-7-days'
      flagged += 1
    }
  }
  state.clockDate = today
  state.clockRuns.push({ id: crypto.randomUUID(), date: today, flagged, quarantined, ranAt: new Date().toISOString() })
  return { flagged, quarantined }
}

function dispense(state, body) {
  const medicineId = body.medicineId
  const requested = Number(body.quantity)
  if (!medicineId || !Number.isInteger(requested) || requested <= 0) throw new Error('medicineId and a positive integer quantity are required')
  const today = state.clockDate
  const previous = structuredClone(state)
  const candidates = state.batches.filter((batch) => batch.medicineId === medicineId && isSellable(batch, today)).sort((first, second) => first.expiry.localeCompare(second.expiry))
  let remaining = requested
  const allocations = []
  for (const batch of candidates) {
    if (!remaining) break
    const quantity = Math.min(batch.quantity, remaining)
    allocations.push({ batchId: batch.id, lot: batch.lot, expiry: batch.expiry, quantity })
    batch.quantity -= quantity
    if (batch.quantity === 0) batch.status = 'exhausted'
    remaining -= quantity
  }
  const medicine = state.medicines.find((item) => item.id === medicineId)
  state.dispenseLogs.unshift({ id: crypto.randomUUID(), medicineId, medicineName: medicine?.name ?? 'Unknown medicine', totalQty: requested - remaining, picklist: allocations, timestamp: new Date().toISOString() })
  checkReorderTransitions(previous, state, [medicineId], today)
  return { requested, fulfilled: requested - remaining, shortfall: remaining, allocations }
}

function paginated(items, url) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 6))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  return { items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize), page: currentPage, pageSize, total, totalPages }
}

function sortedMedicines(state, url) {
  const sort = url.searchParams.get('sort') ?? 'healthScore'
  const order = url.searchParams.get('order') === 'desc' ? -1 : 1
  const items = state.medicines.map((medicine) => {
    const batches = state.batches.filter((batch) => batch.medicineId === medicine.id)
    const stock = batches.filter((batch) => isSellable(batch, state.clockDate)).reduce((total, batch) => total + batch.quantity, 0)
    const earliest = batches.filter((batch) => isSellable(batch, state.clockDate)).sort((first, second) => first.expiry.localeCompare(second.expiry))[0]?.expiry ?? null
    return { ...medicine, sellableQuantity: stock, earliestExpiry: earliest }
  })
  items.sort((first, second) => {
    if (sort === 'name') return first.name.localeCompare(second.name) * order
    if (sort === 'stock') return (first.sellableQuantity - second.sellableQuantity) * order
    return (first.earliestExpiry ?? '9999').localeCompare(second.earliestExpiry ?? '9999') * order
  })
  return items
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {})
  const url = new URL(request.url, `http://${request.headers.host}`)
  const route = url.pathname.replace(/^\/api/, '')
  try {
    if (request.method === 'GET' && route === '/health') return json(response, 200, { ok: true, service: 'batchrx-api' })
    if (request.method === 'POST' && route === '/auth/register') {
      const body = await readBody(request)
      return json(response, 201, registerUser(body.username, body.password))
    }
    if (request.method === 'POST' && route === '/auth/login') {
      const body = await readBody(request)
      return json(response, 200, loginUser(body.username, body.password))
    }
    if (request.method === 'GET' && route === '/state') return json(response, 200, getState())
    if (request.method === 'GET' && route === '/outbox') return json(response, 200, { messages: getState().outbox })
    if (request.method === 'GET' && route === '/medicines') return json(response, 200, paginated(sortedMedicines(getState(), url), url))
    if (request.method === 'GET' && route === '/batches') {
      const state = getState()
      const medicineId = url.searchParams.get('medicineId')
      const items = state.batches.filter((batch) => !medicineId || batch.medicineId === medicineId).sort((first, second) => first.expiry.localeCompare(second.expiry))
      return json(response, 200, paginated(items, url))
    }
    if (request.method === 'POST' && route === '/clock') {
      const body = await readBody(request)
      const state = getState()
      const previous = structuredClone(state)
      const today = currentDate(body, state)
      const result = processClock(state, today)
      checkReorderTransitions(previous, state, state.medicines.map((medicine) => medicine.id), today)
      replaceState(state)
      return json(response, 200, { date: today, ...result, counts: { active: state.batches.filter((batch) => batch.status === 'active').length, quarantined: state.batches.filter((batch) => batch.status === 'quarantine').length } })
    }
    if (request.method === 'POST' && route === '/import/batches') {
      const body = await readBody(request)
      const state = getState()
      const previous = structuredClone(state)
      const report = importBatchRows(state, body.rows ?? body, state.clockDate)
      const changedMedicineIds = [...new Set(state.batches.filter((batch) => !previous.batches.some((oldBatch) => oldBatch.id === batch.id)).map((batch) => batch.medicineId))]
      checkReorderTransitions(previous, state, changedMedicineIds, state.clockDate)
      replaceState(state)
      return json(response, 200, report)
    }
    if (request.method === 'POST' && route === '/state') {
      const nextState = await readBody(request)
      if (!Array.isArray(nextState.medicines) || !Array.isArray(nextState.batches)) throw new Error('State must contain medicines and batches arrays')
      return json(response, 200, replaceState({ ...nextState, version: 3, outbox: nextState.outbox ?? [], clockRuns: nextState.clockRuns ?? [] }))
    }
    if (request.method === 'POST' && route === '/dispense') {
      const state = getState()
      const result = dispense(state, await readBody(request))
      replaceState(state)
      return json(response, 200, result)
    }
    if (request.method === 'POST' && route === '/reset') return json(response, 200, resetState((await readBody(request)).date))
    return json(response, 404, { error: 'Route not found' })
  } catch (error) {
    return json(response, 400, { error: error.message })
  }
})

server.listen(port, '0.0.0.0', () => console.log(`BatchRx API listening on http://localhost:${port}`))
