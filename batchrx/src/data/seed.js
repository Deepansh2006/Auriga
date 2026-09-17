export const seedMedicines = [
  { id: 'med-para', name: 'Paracetamol 500mg', generic: 'Paracetamol', form: 'Tablets', unit: 'strip', category: 'Analgesic' },
  { id: 'med-ibu', name: 'Ibuprofen 400mg', generic: 'Ibuprofen', form: 'Tablets', unit: 'strip', category: 'Analgesic' },
  { id: 'med-amox', name: 'Amoxicillin 250mg', generic: 'Amoxicillin', form: 'Capsules', unit: 'strip', category: 'Antibiotic' },
  { id: 'med-met', name: 'Metformin 500mg', generic: 'Metformin', form: 'Tablets', unit: 'strip', category: 'Diabetes' },
  { id: 'med-ceti', name: 'Cetirizine 10mg', generic: 'Cetirizine', form: 'Tablets', unit: 'strip', category: 'Allergy' },
]

export const seedBatches = [
  { id: 'batch-para-old', medicineId: 'med-para', lot: 'PCM-2406-A', quantity: 10, originalQty: 10, expiry: '2026-09-22', received: '2025-11-04', status: 'active' },
  { id: 'batch-para-new', medicineId: 'med-para', lot: 'PCM-2502-B', quantity: 84, originalQty: 84, expiry: '2027-02-11', received: '2026-02-19', status: 'active' },
  { id: 'batch-para-expired', medicineId: 'med-para', lot: 'PCM-2312-X', quantity: 12, originalQty: 12, expiry: '2026-03-01', received: '2025-04-10', status: 'active' },
  { id: 'batch-ibu', medicineId: 'med-ibu', lot: 'IBU-2501-B', quantity: 36, originalQty: 36, expiry: '2026-11-01', received: '2026-01-12', status: 'active' },
  { id: 'batch-amox-expired', medicineId: 'med-amox', lot: 'AMX-2509-C', quantity: 42, originalQty: 42, expiry: '2026-09-16', received: '2026-01-12', status: 'active' },
  { id: 'batch-met-a', medicineId: 'med-met', lot: 'MET-2502-A', quantity: 50, originalQty: 50, expiry: '2027-03-15', received: '2026-02-19', status: 'active' },
  { id: 'batch-met-b', medicineId: 'med-met', lot: 'MET-2504-B', quantity: 40, originalQty: 40, expiry: '2027-05-20', received: '2026-04-05', status: 'active' },
  { id: 'batch-met-c', medicineId: 'med-met', lot: 'MET-2506-C', quantity: 30, originalQty: 30, expiry: '2027-08-10', received: '2026-06-02', status: 'active' },
  { id: 'batch-ceti-expired', medicineId: 'med-ceti', lot: 'CET-2408-X', quantity: 18, originalQty: 18, expiry: '2026-08-30', received: '2025-08-11', status: 'active' },
]