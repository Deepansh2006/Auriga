import { useMemo, useState } from 'react'
import { usePharmacy } from '../context/usePharmacy'
import { allocateFEFO, sellableQuantity } from '../engine/fefo'
import PickSlip from './PickSlip'

export default function DispenseModal({ medicine, onClose, onNotice }) {
  const { state, dispatch } = usePharmacy()
  const [quantity, setQuantity] = useState('')
  const [showSlip, setShowSlip] = useState(false)
  const available = sellableQuantity(state.batches, medicine.id)
  const requested = Math.max(0, Number(quantity) || 0)
  const allocation = useMemo(() => allocateFEFO(state.batches, medicine.id, requested), [state.batches, medicine.id, requested])

  function confirm() {
    dispatch({ type: 'DISPENSE', medicineId: medicine.id, allocations: allocation.allocations, quantity: requested, fulfilled: requested - allocation.remaining })
    onNotice(`${requested - allocation.remaining} ${medicine.unit}s dispensed using FEFO.`)
    onClose()
  }

  if (showSlip) return <PickSlip medicine={medicine} quantity={requested} allocations={allocation.allocations} shortfall={allocation.remaining} onConfirm={confirm} onClose={() => setShowSlip(false)} />
  return <div className="fixed inset-0 z-30 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">FEFO dispense</p><h2 className="mt-2 font-display text-2xl font-extrabold text-ink">{medicine.name}</h2></div><button onClick={onClose} aria-label="Close" className="text-2xl text-slate hover:text-ink">×</button></div><div className="mt-6 rounded-xl bg-mint p-4"><p className="text-xs font-bold uppercase tracking-widest text-teal">In-date stock</p><p className="mt-1 font-display text-3xl font-extrabold text-ink">{available} <span className="text-sm font-normal text-slate">{medicine.unit}s ready</span></p></div><label className="mt-6 block text-sm font-bold text-ink">How many should be dispensed?<input autoFocus min="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/10 px-4 py-4 text-2xl font-bold outline-none focus:border-teal" /></label>{requested > available && <p className="mt-3 rounded-lg bg-amber/15 px-3 py-2 text-sm font-bold text-amber">Only {available} {medicine.unit}s available. The pick slip will show a partial fill.</p>}<button disabled={!requested || !allocation.allocations.length} onClick={() => setShowSlip(true)} className="mt-6 w-full rounded-xl bg-teal px-4 py-3.5 font-bold text-white hover:bg-ink disabled:cursor-not-allowed disabled:bg-slate/30">Preview pick slip</button></div></div>
}