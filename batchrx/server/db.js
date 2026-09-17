import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { seedBatches, seedMedicines } from '../src/data/seed.js'

const databasePath = process.env.BATCHRX_DB ?? resolve('data/batchrx.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
const db = new DatabaseSync(databasePath)
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    generic TEXT NOT NULL,
    form TEXT NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    reorder_threshold INTEGER NOT NULL DEFAULT 20
  );
  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    medicine_id TEXT NOT NULL REFERENCES medicines(id),
    lot TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    original_qty INTEGER NOT NULL,
    expiry TEXT NOT NULL,
    received TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    flagged_at TEXT,
    quarantined_at TEXT,
    quarantine_reason TEXT,
    resolved_at TEXT,
    UNIQUE(medicine_id, lot, expiry)
  );
  CREATE TABLE IF NOT EXISTS dispense_logs (
    id TEXT PRIMARY KEY,
    medicine_id TEXT NOT NULL,
    medicine_name TEXT NOT NULL,
    total_qty INTEGER NOT NULL,
    picklist_json TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    medicine_id TEXT NOT NULL,
    medicine_name TEXT NOT NULL,
    sellable_quantity INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clock_runs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    flagged INTEGER NOT NULL,
    quarantined INTEGER NOT NULL,
    ran_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`)

const id = (prefix) => `${prefix}-${randomBytes(12).toString('hex')}`
const now = () => new Date().toISOString()

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':')
  const actual = scryptSync(password, salt, 64)
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

function seedDatabase() {
  if (db.prepare('SELECT COUNT(*) AS count FROM medicines').get().count > 0) return
  const insertMedicine = db.prepare('INSERT INTO medicines (id, name, generic, form, unit, category, reorder_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertBatch = db.prepare('INSERT INTO batches (id, medicine_id, lot, quantity, original_qty, expiry, received, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  db.exec('BEGIN')
  try {
    for (const medicine of seedMedicines) insertMedicine.run(medicine.id, medicine.name, medicine.generic, medicine.form, medicine.unit, medicine.category, medicine.reorderThreshold ?? 20)
    for (const batch of seedBatches) insertBatch.run(batch.id, batch.medicineId, batch.lot, batch.quantity, batch.originalQty ?? batch.quantity, batch.expiry, batch.received, batch.status)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

seedDatabase()

export function registerUser(username, password) {
  if (!username?.trim() || !password || password.length < 4) throw new Error('Username and password with at least 4 characters are required')
  const userId = id('user')
  try {
    db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(userId, username.trim().toLowerCase(), hashPassword(password), now())
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new Error('Username is already registered')
    throw error
  }
  return createSession(userId, username.trim().toLowerCase())
}

export function loginUser(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.trim().toLowerCase())
  if (!user || !verifyPassword(password ?? '', user.password_hash)) throw new Error('Invalid username or password')
  return createSession(user.id, user.username)
}

function createSession(userId, username) {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now(), new Date(Date.now() + 86400000 * 7).toISOString())
  return { token, user: { id: userId, username } }
}

export function getState() {
  const medicines = db.prepare('SELECT id, name, generic, form, unit, category, reorder_threshold AS reorderThreshold FROM medicines ORDER BY name').all()
  const batches = db.prepare('SELECT id, medicine_id AS medicineId, lot, quantity, original_qty AS originalQty, expiry, received, status, flagged_at AS flaggedAt, quarantined_at AS quarantinedAt, quarantine_reason AS quarantineReason, resolved_at AS resolvedAt FROM batches ORDER BY expiry').all()
  const dispenseLogs = db.prepare('SELECT id, medicine_id AS medicineId, medicine_name AS medicineName, total_qty AS totalQty, picklist_json, timestamp FROM dispense_logs ORDER BY timestamp DESC').all().map((log) => ({ ...log, picklist: JSON.parse(log.picklist_json), picklist_json: undefined }))
  const outbox = db.prepare('SELECT id, type, medicine_id AS medicineId, medicine_name AS medicineName, sellable_quantity AS sellableQuantity, threshold, status, created_at AS createdAt FROM outbox ORDER BY created_at DESC').all()
  const clockRuns = db.prepare('SELECT id, date, flagged, quarantined, ran_at AS ranAt FROM clock_runs ORDER BY ran_at DESC').all()
  return { version: 4, clockDate: db.prepare("SELECT value FROM app_meta WHERE key = 'clockDate'").get()?.value ?? new Date().toISOString().slice(0, 10), medicines, batches, dispenseLogs, outbox, clockRuns }
}

export function replaceState(state) {
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM batches; DELETE FROM medicines; DELETE FROM dispense_logs; DELETE FROM outbox; DELETE FROM clock_runs;')
    const medicine = db.prepare('INSERT INTO medicines (id, name, generic, form, unit, category, reorder_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const batch = db.prepare('INSERT INTO batches (id, medicine_id, lot, quantity, original_qty, expiry, received, status, flagged_at, quarantined_at, quarantine_reason, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const item of state.medicines) medicine.run(item.id, item.name, item.generic ?? item.name, item.form ?? 'Units', item.unit, item.category ?? 'General', item.reorderThreshold ?? 20)
    for (const item of state.batches) batch.run(item.id, item.medicineId, item.lot, item.quantity, item.originalQty ?? item.quantity, item.expiry, item.received, item.status, item.flaggedAt ?? null, item.quarantinedAt ?? null, item.quarantineReason ?? null, item.resolvedAt ?? null)
    const log = db.prepare('INSERT INTO dispense_logs (id, medicine_id, medicine_name, total_qty, picklist_json, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    for (const item of state.dispenseLogs ?? []) log.run(item.id, item.medicineId, item.medicineName, item.totalQty ?? item.quantity ?? 0, JSON.stringify(item.picklist ?? []), item.timestamp ?? item.at ?? now())
    const message = db.prepare('INSERT INTO outbox (id, type, medicine_id, medicine_name, sellable_quantity, threshold, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (const item of state.outbox ?? []) message.run(item.id, item.type, item.medicineId, item.medicineName, item.sellableQuantity, item.threshold, item.status ?? 'pending', item.createdAt ?? now())
    const run = db.prepare('INSERT INTO clock_runs (id, date, flagged, quarantined, ran_at) VALUES (?, ?, ?, ?, ?)')
    for (const item of state.clockRuns ?? []) run.run(item.id, item.date, item.flagged, item.quarantined, item.ranAt ?? now())
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('clockDate', ?)").run(state.clockDate ?? new Date().toISOString().slice(0, 10))
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getState()
}

export function resetDatabase(date) {
  const state = { version: 4, clockDate: date ?? new Date().toISOString().slice(0, 10), medicines: structuredClone(seedMedicines).map((item) => ({ ...item, reorderThreshold: item.reorderThreshold ?? 20 })), batches: structuredClone(seedBatches), dispenseLogs: [], outbox: [], clockRuns: [] }
  return replaceState(state)
}

export function database() { return db }
export { id, now }
