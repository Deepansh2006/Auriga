import { useEffect, useMemo, useState } from 'react'
import { SearchBar } from '../components/SearchBar'
import { MedicineCard } from '../components/MedicineCard'
import AddBatchModal from '../components/AddBatchModal'
import DispenseModal from '../components/DispenseModal'
import BatchListModal from '../components/BatchListModal'
import AlertFeed from '../components/AlertFeed'
import QuarantinePanel from '../components/QuarantinePanel'
import WasteRadar from '../components/WasteRadar'
import ReorderCenter from '../components/ReorderCenter'
import { usePharmacy } from '../context/usePharmacy'
import { daysUntilExpiry, medicineHealthScore } from '../engine/healthScore'
import { sellableQuantity } from '../engine/fefo'

const filters = ['All', 'Expiring <7d', 'Expiring <30d', 'Fully expired']

export default function Dashboard({ onLogout }) {
  const { state, dispatch } = usePharmacy()
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('healthScore')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [viewBatches, setViewBatches] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => window.localStorage.getItem('batchrx-theme') ?? 'light')
  const expiring = state.batches.filter((batch) => batch.status === 'active' && daysUntilExpiry(batch.expiry) > 0 && daysUntilExpiry(batch.expiry) <= 30)
  const expired = state.batches.filter((batch) => batch.status === 'active' && daysUntilExpiry(batch.expiry) <= 0)
  const totalUnits = state.medicines.reduce((total, medicine) => total + sellableQuantity(state.batches, medicine.id), 0)
  const medicines = useMemo(() => {
    const visible = state.medicines.filter((medicine) => {
      const batches = state.batches.filter((batch) => batch.medicineId === medicine.id && batch.status === 'active')
      if (filter === 'Expiring <7d') return batches.some((batch) => daysUntilExpiry(batch.expiry) > 0 && daysUntilExpiry(batch.expiry) <= 7)
      if (filter === 'Expiring <30d') return batches.some((batch) => daysUntilExpiry(batch.expiry) > 0 && daysUntilExpiry(batch.expiry) <= 30)
      if (filter === 'Fully expired') return batches.length > 0 && batches.every((batch) => daysUntilExpiry(batch.expiry) <= 0)
      return true
    })
    return [...visible].sort((first, second) => {
      if (sort === 'name') return first.name.localeCompare(second.name)
      if (sort === 'stock') return sellableQuantity(state.batches, first.id) - sellableQuantity(state.batches, second.id)
      return medicineHealthScore(state.batches.filter((batch) => batch.medicineId === first.id)) - medicineHealthScore(state.batches.filter((batch) => batch.medicineId === second.id))
    })
  }, [filter, sort, state])
  const pageSize = 6
  const pageCount = Math.max(1, Math.ceil(medicines.length / pageSize))
  const visibleMedicines = medicines.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('batchrx-theme', theme)
  }, [theme])

  function notify(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4500)
  }

  function selectMedicine(id) {
    document.getElementById(`medicine-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return <main className="min-h-screen bg-mist text-ink">
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal font-display text-xl font-extrabold text-white">B</div><div><p className="font-display text-lg font-extrabold leading-none">BatchRx</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate">Pharmacy control</p></div></div><div className="flex items-center gap-3"><button onClick={() => setShowAdd(true)} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink">+ Add batch</button><span className="hidden text-sm text-slate sm:block">Main dispensary</span><div className="relative"><button onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label="Open profile menu" className="grid h-9 w-9 place-items-center rounded-full bg-mint font-bold text-teal">AR</button>{profileOpen && <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl"><div className="border-b border-ink/10 px-3 py-2"><p className="text-sm font-bold text-ink">Pharmacy admin</p><p className="mt-1 text-xs text-slate">Workspace preferences</p></div><div className="p-1"><p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate">Theme</p><div className="grid grid-cols-2 gap-1"><button onClick={() => setTheme('light')} className={`rounded-lg px-2 py-2 text-xs font-bold ${theme === 'light' ? 'bg-ink text-white' : 'text-slate hover:bg-mist'}`}>☼ Light</button><button onClick={() => setTheme('dark')} className={`rounded-lg px-2 py-2 text-xs font-bold ${theme === 'dark' ? 'bg-ink text-white' : 'text-slate hover:bg-mist'}`}>◐ Dark</button></div><button onClick={onLogout} className="mt-2 w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-coral hover:bg-coral/10">Log out</button></div></div>}</div></div></div></header>
    <section className="mx-auto max-w-[1440px] px-6 pb-10 pt-12 lg:px-10 lg:pt-14"><div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-teal">Thursday · 17 September 2026</p><h1 className="max-w-lg font-display text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">Know what is ready. <span className="text-teal">Move it first.</span></h1><p className="mt-5 max-w-md text-base leading-7 text-slate">Every alert has an action. Every dispense follows the earliest expiry.</p></div><SearchBar onSelect={selectMedicine} /></div><div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-2xl bg-ink p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/60">Sellable units</p><p className="mt-3 font-display text-3xl font-extrabold">{totalUnits}</p><p className="mt-1 text-xs text-white/60">in-date across {state.medicines.length} medicines</p></div><div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate">Expiring soon</p><p className="mt-3 font-display text-3xl font-extrabold text-amber">{expiring.length}</p><p className="mt-1 text-xs text-slate">within 30 days</p></div><div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate">Expired</p><p className="mt-3 font-display text-3xl font-extrabold text-coral">{expired.length}</p><p className="mt-1 text-xs text-slate">awaiting action</p></div><div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate">Dispensed</p><p className="mt-3 font-display text-3xl font-extrabold text-teal">{state.dispenseLogs.length}</p><p className="mt-1 text-xs text-slate">saved locally</p></div></div></section>
  <section className="mx-auto grid max-w-[1440px] gap-6 px-6 pb-16 lg:grid-cols-[280px_1fr] lg:px-10"><div className="space-y-6"><AlertFeed batches={state.batches} medicines={state.medicines} onQuarantine={(batchId) => { dispatch({ type: 'QUARANTINE', batchId }); notify('Batch moved to quarantine. Sellable stock was unchanged.') }} /><WasteRadar batches={state.batches} medicines={state.medicines} /><ReorderCenter messages={state.outbox ?? []} onNotice={notify} /></div><div><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl font-extrabold">Stock overview</h2><p className="mt-1 text-sm text-slate">{medicines.length} medicines · page {Math.min(page, pageCount)} of {pageCount}</p></div><div className="flex max-w-full flex-wrap gap-2"><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }} className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-slate outline-none"><option value="healthScore">Sort: health score</option><option value="name">Sort: name</option><option value="stock">Sort: stock level</option></select><div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">{filters.map((item) => <button key={item} onClick={() => { setFilter(item); setPage(1) }} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${filter === item ? 'bg-ink text-white' : 'text-slate hover:text-ink'}`}>{item}</button>)}</div></div></div><div className="grid gap-4 md:grid-cols-2">{visibleMedicines.map((medicine) => <div id={`medicine-${medicine.id}`} key={medicine.id}><MedicineCard medicine={medicine} batches={state.batches} onDispense={setSelectedMedicine} onViewBatches={setViewBatches} /></div>)}</div><div className="mt-5 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-slate disabled:opacity-40">Previous</button><span className="text-xs font-bold text-slate">Showing {visibleMedicines.length} of {medicines.length}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-slate disabled:opacity-40">Next</button></div><div className="mt-8"><QuarantinePanel batches={state.batches} medicines={state.medicines} onResolve={(batchId, status) => { dispatch({ type: 'RESOLVE_QUARANTINE', batchId, status }); notify(status === 'disposed' ? 'Batch marked disposed. Audit trail preserved.' : 'Batch marked returned to supplier. Audit trail preserved.') }} /></div></div></section>
    {showAdd && <AddBatchModal onClose={() => setShowAdd(false)} onNotice={notify} />}{selectedMedicine && <DispenseModal medicine={selectedMedicine} onClose={() => setSelectedMedicine(null)} onNotice={notify} />}{viewBatches && <BatchListModal medicine={viewBatches} batches={state.batches} onClose={() => setViewBatches(null)} />}{notice && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl">{notice}</div>}
  </main>
}
