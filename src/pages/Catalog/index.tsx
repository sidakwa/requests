// Request Catalog — the browsable front door for every request type.
// Tiles come from `catalog_items`; adding a request type is a DB insert.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CircleDollarSign,
  KeyRound,
  Network,
  FileText,
  Building2,
  Users,
  Search,
  ChevronRight,
  LucideIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CatalogItem, fetchCatalog } from '@/api/platformApi'

const ICONS: Record<string, LucideIcon> = {
  CircleDollarSign,
  KeyRound,
  Network,
  FileText,
  Building2,
  Users,
}

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Financial (CAPEX / OPEX)',
  'it-access': 'IT & System Access',
  infrastructure: 'Infrastructure & Engineering',
  'change-management': 'Change Management',
  'hr-admin': 'HR & Admin',
  facilities: 'General / Facilities',
}

export default function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchCatalog()
      .then(setItems)
      .catch(() => toast.error('Failed to load the request catalog'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter(i => `${i.name} ${i.description ?? ''} ${i.category}`.toLowerCase().includes(q))
      : items
    const map = new Map<string, CatalogItem[]>()
    for (const item of filtered) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return map
  }, [items, query])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Catalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          The single front door for every internal request — pick a type to get started.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search requests…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading catalog…</p>}
      {!loading && grouped.size === 0 && (
        <p className="text-sm text-gray-500">No request types match your search.</p>
      )}

      {[...grouped.entries()].map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map(item => {
              const Icon = ICONS[item.icon ?? ''] ?? FileText
              const to = item.launch_path ?? `/catalog/${item.slug}/new`
              return (
                <Link key={item.slug} to={to}>
                  <Card className="h-full hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <h3 className="mt-3 font-semibold text-gray-900">{item.name}</h3>
                      {item.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
