import { daysUntilExpiry } from '../engine/healthScore'

export default function WasteRadar({ batches, medicines }) {
  const atRisk = batches.filter((batch) => batch.status === 'active' && daysUntilExpiry(batch.expiry) > 0 && daysUntilExpiry(batch.expiry) <= 30)
  const grouped = medicines.map((medicine) => {
    const medicineBatches = atRisk.filter((batch) => batch.medicineId === medicine.id)
    return { medicine, units: medicineBatches.reduce((total, batch) => total + batch.quantity, 0), batches: medicineBatches.length }
  }).filter((item) => item.units > 0).sort((first, second) => second.units - first.units)
  const totalUnits = grouped.reduce((total, item) => total + item.units, 0)
  const maxUnits = grouped[0]?.units ?? 1

  return <section className="rounded-2xl border border-ink/10 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber">Waste radar</p><h2 className="mt-1 font-display text-lg font-extrabold">Units at risk</h2><p className="mt-1 text-xs text-slate">Sellable today, expiring within 30 days.</p></div><span className="font-display text-2xl font-extrabold text-amber">{totalUnits}</span></div>{grouped.length === 0 ? <p className="mt-5 text-sm text-slate">No sellable units are currently inside the risk window.</p> : <div className="mt-5 space-y-4">{grouped.slice(0, 4).map((item) => <div key={item.medicine.id}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-ink">{item.medicine.name}</span><span className="shrink-0 font-bold text-amber">{item.units} {item.medicine.unit}s</span></div><div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.max(8, (item.units / maxUnits) * 100)}%` }} /></div></div>)}</div>}{grouped.length > 4 && <p className="mt-4 text-xs font-bold text-slate">+ {grouped.length - 4} more medicines in the risk window</p>}</section>
}
