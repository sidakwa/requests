import { useState, useEffect, useCallback } from 'react'
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
  chief_email: string
  head_email: string
}

export interface BusinessUnit {
  code: string
  name: string
}

export interface DoaRule {
  id: string
  min_amount: number
  max_amount: number
  currency: string
  approval_level: string
}

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  rate: number
  is_base: boolean
}

interface UseNewRequestDataReturn {
  legalEntities: LegalEntity[]
  filteredLegalEntities: LegalEntity[]
  departments: Department[]
  businessUnits: BusinessUnit[]
  doaRules: DoaRule[]
  currencies: Currency[]
  loading: boolean
  filterEntitiesByBU: (buCode: string) => void
  getDepartmentApprovers: (departmentId: string) => { headEmail: string; chiefEmail: string } | null
}

export function useNewRequestData(): UseNewRequestDataReturn {
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([])
  const [filteredLegalEntities, setFilteredLegalEntities] = useState<LegalEntity[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [doaRules, setDoaRules] = useState<DoaRule[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)

  const getDepartmentApprovers = useCallback((departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    if (!department) return null
    return {
      headEmail: department.head_email,
      chiefEmail: department.chief_email
    }
  }, [departments])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        
        // Fetch departments
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
        if (deptError) throw deptError
        if (deptData) {
          setDepartments(deptData)
        }

        // Fetch business units
        const { data: buData, error: buError } = await supabase
          .from('business_units')
          .select('*')
        if (buError) throw buError
        if (buData) {
          setBusinessUnits(buData)
        }

        // Fetch legal entities
        const { data: legalData, error: legalError } = await supabase
          .from('legal_entities')
          .select('*')
          .order('name')
        if (legalError) throw legalError
        if (legalData) {
          setLegalEntities(legalData)
          const defaultBU = buData && buData.length > 0 ? buData[0].code : 'DI'
          const initialFiltered = legalData.filter(e => e.business_unit === defaultBU)
          setFilteredLegalEntities(initialFiltered)
        }

        // Fetch DOA rules
        const { data: doaData, error: doaError } = await supabase
          .from('doa_rules')
          .select('*')
          .order('min_amount')
        if (doaError) throw doaError
        if (doaData) {
          setDoaRules(doaData)
        }

        // Fetch currencies
        const { data: currencyData, error: currencyError } = await supabase
          .from('currencies')
          .select('*')
          .order('code')
        if (currencyError) {
        } else if (currencyData) {
          setCurrencies(currencyData)
        }

      } catch (err) {
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const filterEntitiesByBU = useCallback((buCode: string) => {
    if (!buCode || legalEntities.length === 0) return
    const filtered = legalEntities.filter(e => e.business_unit === buCode)
    setFilteredLegalEntities(filtered)
  }, [legalEntities])

  return {
    legalEntities,
    filteredLegalEntities,
    departments,
    businessUnits,
    doaRules,
    currencies,
    loading,
    filterEntitiesByBU,
    getDepartmentApprovers,
  }
}
