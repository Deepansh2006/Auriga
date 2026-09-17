import { useMemo, useState } from 'react'
import { usePharmacy } from '../context/usePharmacy'
import { sellableQuantity } from '../engine/fefo'

export function SearchBar({ onSelect }) {
  const { state } = usePharmacy()
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return state.medicines.filter((medicine) => `${medicine.name} ${medicine.generic}`.toLowerCase().includes(normalized)).slice(0, 5)
  }, [query, state.medicines])

  return <div className="relative w-full max-w-2xl">
    <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 shadow-[0_12px_35px_rgba(23,48,66,0.08)] focus-within:border-teal">
      <span className="text-xl text-teal" aria-hidden="true">⌕</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine, generic name, or lot number" className="w-full bg-transparent text-base text-ink outline-none placeholder:text-slate/70" />
      <kbd className="hidden rounded-md bg-mist px-2 py-1 text-xs text-slate sm:block">⌘ K</kbd>
    </div>
    {results.length > 0 && <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
      {results.map((medicine) => <button key={medicine.id} onClick={() => { onSelect(medicine.id); setQuery('') }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-mint">
        <span><strong className="block text-sm text-ink">{medicine.name}</strong><span className="text-xs text-slate">{medicine.form} · {medicine.category}</span></span>
        <span className="text-sm font-bold text-teal">{sellableQuantity(state.batches, medicine.id)} {medicine.unit}s</span>
      </button>)}
    </div>}
  </div>
}