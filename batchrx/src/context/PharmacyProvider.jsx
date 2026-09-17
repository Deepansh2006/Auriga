import { useEffect, useReducer, useState } from 'react'
import { seedBatches, seedMedicines } from '../data/seed'
import { saveState, loadState } from '../engine/storage'
import { fetchRemoteState, syncRemoteState } from '../engine/api'
import { PharmacyContext } from './PharmacyContext'

const initialState = { version: 2, medicines: seedMedicines, batches: seedBatches, dispenseLogs: [] }

function reducer(state, action) {
  switch (action.type) {
    case 'DISPENSE': {
      const quantities = new Map(action.allocations.map((item) => [item.batchId, item.quantity]))
      const medicine = state.medicines.find((item) => item.id === action.medicineId)
      return { ...state, batches: state.batches.map((batch) => { if (!quantities.has(batch.id)) return batch; const quantity = batch.quantity - quantities.get(batch.id); return { ...batch, quantity, status: quantity === 0 ? 'exhausted' : batch.status } }), dispenseLogs: [{ id: crypto.randomUUID(), medicineId: action.medicineId, medicineName: medicine?.name ?? 'Unknown medicine', totalQty: action.fulfilled, picklist: action.allocations, timestamp: new Date().toISOString() }, ...state.dispenseLogs] }
    }
    case 'HYDRATE': return action.state
    case 'ADD_BATCH': return { ...state, batches: [...state.batches, { ...action.batch, id: crypto.randomUUID(), status: 'active' }] }
    case 'ADD_MEDICINE': return { ...state, medicines: [...state.medicines, { ...action.medicine, id: action.medicine.id ?? crypto.randomUUID() }] }
    case 'QUARANTINE': return { ...state, batches: state.batches.map((batch) => batch.id === action.batchId ? { ...batch, status: 'quarantine', quarantinedAt: new Date().toISOString() } : batch) }
    case 'RESOLVE_QUARANTINE': return { ...state, batches: state.batches.map((batch) => batch.id === action.batchId ? { ...batch, status: action.status, resolvedAt: new Date().toISOString() } : batch) }
    default: return state
  }
}

export function PharmacyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, loadState)
  const [remoteReady, setRemoteReady] = useState(false)
  useEffect(() => { fetchRemoteState().then((remoteState) => { dispatch({ type: 'HYDRATE', state: remoteState }); setRemoteReady(true) }).catch(() => setRemoteReady(true)) }, [])
  useEffect(() => saveState(state), [state])
  useEffect(() => { if (remoteReady) syncRemoteState(state).catch(() => {}) }, [remoteReady, state])
  return <PharmacyContext.Provider value={{ state, dispatch }}>{children}</PharmacyContext.Provider>
}