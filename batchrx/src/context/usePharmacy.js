import { useContext } from 'react'
import { PharmacyContext } from './PharmacyContext'

export function usePharmacy() {
  const context = useContext(PharmacyContext)
  if (!context) throw new Error('usePharmacy must be used inside PharmacyProvider')
  return context
}