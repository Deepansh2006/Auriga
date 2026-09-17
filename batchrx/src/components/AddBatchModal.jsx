import { useState } from 'react'
import { usePharmacy } from '../context/usePharmacy'

const today = new Date().toISOString().slice(0, 10)

export default function AddBatchModal({ onClose, onNotice }) {
  const { state, dispatch } = usePharmacy()
  const [createMedicine, setCreateMedicine] = useState(false)
  const [medicineId, setMedicineId] = useState(state.medicines[0]?.id ?? '')
  const [medicine, setMedicine] = useState({ name: '', category: '', unit: 'strip' })
  const [form, setForm] = useState({ lot: '', quantity: '', expiry: '', received: today })
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  function submit(event) {
    event.preventDefault()
    const duplicate = state.batches.some((batch) => batch.medicineId === medicineId && batch.lot.toLowerCase() === form.lot.trim().toLowerCase())
    if (!createMedicine && duplicate) return onNotice('That batch code already exists for this medicine.')
    let selectedId = medicineId
    if (createMedicine) {
      if (!medicine.name.trim() || !medicine.category.trim()) return onNotice('Add a medicine name and category first.')
      selectedId = crypto.randomUUID()
      dispatch({ type: 'ADD_MEDICINE', medicine: { ...medicine, id: selectedId, generic: medicine.name, form: 'Units' } })
    }
    dispatch({ type: 'ADD_BATCH', batch: { medicineId: selectedId, lot: form.lot.trim(), quantity: Number(form.quantity), originalQty: Number(form.quantity), expiry: form.expiry, received: form.received } })
    onNotice(`Batch ${form.lot.trim()} added successfully.`)
    onClose()
  }

  return <div className="fixed inset-0 z-30 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">Inventory intake</p><h2 className="mt-2 font-display text-2xl font-extrabold text-ink">Add a new batch</h2></div><button onClick={onClose} aria-label="Close" className="text-2xl text-slate hover:text-ink">×</button></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold text-ink">Medicine<select disabled={createMedicine} value={medicineId} onChange={(event) => setMedicineId(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-3 outline-none focus:border-teal">{state.medicines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={() => setCreateMedicine(!createMedicine)} className="text-sm font-bold text-teal">{createMedicine ? '← Choose existing medicine' : '+ Create new medicine'}</button>{createMedicine && <div className="grid gap-3 rounded-xl bg-mist p-4 sm:grid-cols-3"><input required value={medicine.name} onChange={(event) => setMedicine({ ...medicine, name: event.target.value })} placeholder="Medicine name" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" /><input required value={medicine.category} onChange={(event) => setMedicine({ ...medicine, category: event.target.value })} placeholder="Category" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" /><input required value={medicine.unit} onChange={(event) => setMedicine({ ...medicine, unit: event.target.value })} placeholder="Unit" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" /></div>}<div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-ink">Batch code<input required value={form.lot} onChange={update('lot')} placeholder="e.g. A002" className="mt-2 w-full rounded-xl border border-ink/10 px-3 py-3 outline-none focus:border-teal" /></label><label className="block text-sm font-bold text-ink">Quantity<input required min="1" type="number" value={form.quantity} onChange={update('quantity')} placeholder="200" className="mt-2 w-full rounded-xl border border-ink/10 px-3 py-3 outline-none focus:border-teal" /></label><label className="block text-sm font-bold text-ink">Expiry date<input required min={today} type="date" value={form.expiry} onChange={update('expiry')} className="mt-2 w-full rounded-xl border border-ink/10 px-3 py-3 outline-none focus:border-teal" /></label><label className="block text-sm font-bold text-ink">Received date<input required type="date" value={form.received} onChange={update('received')} className="mt-2 w-full rounded-xl border border-ink/10 px-3 py-3 outline-none focus:border-teal" /></label></div><button type="submit" className="w-full rounded-xl bg-teal px-4 py-3.5 font-bold text-white hover:bg-ink">Save batch</button></form></div></div>
}