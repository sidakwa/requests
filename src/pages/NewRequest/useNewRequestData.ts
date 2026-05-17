import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface LegalEntity {
  id: string
  name: string
  code: string
  business_unit: string
}

export interface Department {
  id: string
  name: string
}

export interface BusinessUnit {
  code: string
  name: string
}

export interface DoaRule {
  min_amount: number
  max_amount: number
  currency: string
  approval_level: string
}

interface UseNewRequestDataReturn {
  legalEntities: LegalEntity[]
  filteredLegalEntities: LegalEntity[]
  departments: Department[]
  businessUnits: BusinessUnit[]
  doaRules: DoaRule[]
  loading: boolean
  filterEntitiesByBU: (buCode: string) => void
}

export function useNewRequestData(): UseNewRequestDataReturn {
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([])
  const [filteredLegalEntities, setFilteredLegalEntities] = useState<LegalEntity[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [doaRules, setDoaRules] = useState<DoaRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [deptRes, buRes, legalRes, doaRes] = await Promise.all([
          supabase.from('departments').select('*'),
          supabase.from('business_units').select('*'),
          supabase.from('legal_entities').select('*').order('name'),
          supabase.from('doa_rules').select('*').order('min_amount'),
        ])

        if (deptRes.data) setDepartments(deptRes.data)
        if (buRes.data) setBusinessUnits(buRes.data)
        if (legalRes.data) setLegalEntities(legalRes.data)
        if (doaRes.data) setDoaRules(doaRes.data)
      } catch (err) {
        console.error('Error fetching form data:', err)
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const filterEntitiesByBU = (buCode: string) => {
    const filtered = legalEntities.filter(e => e.business_unit === buCode)
    setFilteredLegalEntities(filtered)
  }

  return {
    legalEntities,
    filteredLegalEntities,
    departments,
    businessUnits,
    doaRules,
    loading,
    filterEntitiesByBU,
  }
}
