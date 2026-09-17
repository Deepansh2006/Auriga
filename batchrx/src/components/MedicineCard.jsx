import { healthTone, medicineHealthScore } from '../engine/healthScore'
import { sellableBatches, sellableQuantity } from '../engine/fefo'

export function MedicineCard({ medicine, batches, onDispense, onViewBatches }) {
  const activeBatches = sellableBatches(batches, medicine.id)
  const quantity = sellableQuantity(batches, medicine.id)
  const score = medicineHealthScore(batches.filter((batch) => batch.medicineId === medicine.id))
  const tone = healthTone(score)
  const toneClasses = { teal: 'bg-teal', amber: 'bg-amber', coral: 'bg-coral' }

  return <article className="group rounded-2xl border border-ink/10 bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(23,48,66,0.1)]">
    <div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate">{medicine.category}</p><h3 className="font-display text-lg font-extrabold text-ink">{medicine.name}</h3><p className="mt-1 text-sm text-slate">{medicine.generic} · {medicine.form}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone.color === 'teal' ? 'bg-mint text-teal' : tone.color === 'amber' ? 'bg-amber/15 text-amber' : 'bg-coral/15 text-coral'}`}>{tone.label}</span></div>
    <div className="mt-6 flex items-end justify-between"><div><span className="font-display text-3xl font-extrabold text-ink">{quantity}</span><span className="ml-2 text-sm text-slate">{medicine.unit}s ready</span></div><span className="text-xs font-bold text-slate">{activeBatches.length} batch{activeBatches.length === 1 ? '' : 'es'}</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist"><div className={`h-full rounded-full ${toneClasses[tone.color]}`} style={{ width: `${score}%` }} /></div>
    <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4 text-xs text-slate"><button onClick={() => onViewBatches(medicine)} className="hover:text-ink">View batches</button><button disabled={!quantity} onClick={() => onDispense(medicine)} className="font-bold text-teal transition hover:text-ink disabled:cursor-not-allowed disabled:text-slate/50">Dispense →</button></div>
  </article>
}