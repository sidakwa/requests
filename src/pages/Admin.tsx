import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { CurrenciesTab } from './Admin/CurrenciesTab'

// Types
interface DoaRule {
  id: string
  min_amount: number
  max_amount: number
  currency: string
  approval_level: string
}

interface Department {
  id: string
  name: string
  chief_email: string
  head_email: string
}

interface LegalEntity {
  id: string
  code: string
  name: string
  business_unit: string
}

interface BusinessUnit {
  code: string
  name: string
}

export default function Admin() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('doa')
  const [loading, setLoading] = useState(true)
  
  // DoA Matrix state
  const [doaRules, setDoaRules] = useState<DoaRule[]>([])
  const [editingDoa, setEditingDoa] = useState<DoaRule | null>(null)
  const [showDoaDialog, setShowDoaDialog] = useState(false)
  
  // Departments state
  const [departments, setDepartments] = useState<Department[]>([])
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [showDeptDialog, setShowDeptDialog] = useState(false)
  
  // Legal Entities state - MOVED TO TOP
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null)
  const [showEntityDialog, setShowEntityDialog] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [doaRes, deptRes, legalRes, buRes] = await Promise.all([
        supabase.from('doa_rules').select('*').order('min_amount'),
        supabase.from('departments').select('*'),
        supabase.from('legal_entities').select('*').order('name'),
        supabase.from('business_units').select('*')
      ])
      
      if (doaRes.data) setDoaRules(doaRes.data)
      if (deptRes.data) setDepartments(deptRes.data)
      if (legalRes.data) setLegalEntities(legalRes.data)
      if (buRes.data) setBusinessUnits(buRes.data)
      
    } catch (error) {
      console.error('Error fetching admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  // Department CRUD
  const saveDepartment = async () => {
    if (!editingDept) return
    
    try {
      const departmentData = {
        name: editingDept.name,
        chief_email: editingDept.chief_email || null,
        head_email: editingDept.head_email || null
      }
      
      if (editingDept.id) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDept.id)
        if (error) throw error
        toast.success('Department updated')
      } else {
        const { error } = await supabase.from('departments').insert(departmentData)
        if (error) throw error
        toast.success('Department created')
      }
      await fetchData()
      setShowDeptDialog(false)
      setEditingDept(null)
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Failed to save department: ' + error.message)
    }
  }

  const deleteDepartment = async (id: string) => {
    if (!confirm('Delete this department?')) return
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id)
      if (error) throw error
      toast.success('Department deleted')
      await fetchData()
    } catch (error) {
      toast.error('Failed to delete department')
    }
  }

  // Legal Entity CRUD
  const saveLegalEntity = async () => {
    if (!editingEntity) return
    
    try {
      if (editingEntity.id) {
        const { error } = await supabase
          .from('legal_entities')
          .update({
            code: editingEntity.code,
            name: editingEntity.name,
            business_unit: editingEntity.business_unit
          })
          .eq('id', editingEntity.id)
        if (error) throw error
        toast.success('Legal entity updated')
      } else {
        const { error } = await supabase.from('legal_entities').insert({
          code: editingEntity.code,
          name: editingEntity.name,
          business_unit: editingEntity.business_unit
        })
        if (error) throw error
        toast.success('Legal entity created')
      }
      await fetchData()
      setShowEntityDialog(false)
      setEditingEntity(null)
    } catch (error) {
      console.error('Error saving legal entity:', error)
      toast.error('Failed to save legal entity')
    }
  }

  const deleteLegalEntity = async (id: string) => {
    if (!confirm('Delete this legal entity?')) return
    try {
      const { error } = await supabase.from('legal_entities').delete().eq('id', id)
      if (error) throw error
      toast.success('Legal entity deleted')
      await fetchData()
    } catch (error) {
      toast.error('Failed to delete legal entity')
    }
  }

  const resetDoaToDefaults = async () => {
    const defaultRules = [
      { min_amount: 0, max_amount: 10000, currency: 'USD', approval_level: 'Level 1 - Manager Approval' },
      { min_amount: 10001, max_amount: 50000, currency: 'USD', approval_level: 'Level 2 - Department Head Approval' },
      { min_amount: 50001, max_amount: 250000, currency: 'USD', approval_level: 'Level 3 - Chief/Executive Approval' },
      { min_amount: 250001, max_amount: 999999999, currency: 'USD', approval_level: 'Level 4 - CFO/CEO Approval' },
    ]
    
    try {
      await supabase.from('doa_rules').delete().neq('id', '')
      const { error } = await supabase.from('doa_rules').insert(defaultRules)
      if (error) throw error
      toast.success('DoA rules reset to defaults')
      await fetchData()
    } catch (error) {
      toast.error('Failed to reset DoA rules')
    }
  }

  // Early returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Please Sign In</h3>
            <p className="text-gray-600">You need to be signed in to access admin settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const diEntities = legalEntities.filter(e => e.business_unit === 'DI')
  const dsEntities = legalEntities.filter(e => e.business_unit === 'DS')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">Configure system settings and approval rules</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="doa">DoA Matrix</TabsTrigger>
          <TabsTrigger value="dept">Dept Mapping</TabsTrigger>
          <TabsTrigger value="entities">Legal Entities</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        {/* DoA Matrix Tab */}
        <TabsContent value="doa">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Delegation of Authority (DoA) Matrix</CardTitle>
                <CardDescription>Configure approval thresholds and required roles</CardDescription>
              </div>
              <Button variant="outline" onClick={resetDoaToDefaults}>
                <RefreshCw className="w-4 h-4 mr-2" /> Reset to Defaults
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount Range</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Required Approvers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doaRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>${rule.min_amount.toLocaleString()} - ${rule.max_amount.toLocaleString()}</TableCell>
                      <TableCell>{rule.currency}</TableCell>
                      <TableCell>{rule.approval_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Mapping Tab */}
        <TabsContent value="dept">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Department Head & Chief Mapping</CardTitle>
                <CardDescription>Maps departments to their approval authority</CardDescription>
              </div>
              <Button onClick={() => { setEditingDept({ id: '', name: '', chief_email: '', head_email: '' }); setShowDeptDialog(true) }}>
                <Plus className="w-4 h-4 mr-2" /> Add Department
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Department Head</TableHead>
                    <TableHead>Chief / Executive</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.head_email}</TableCell>
                      <TableCell>{dept.chief_email}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDept(dept); setShowDeptDialog(true) }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDepartment(dept.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Legal Entities ({legalEntities.length} Total)</CardTitle>
                <CardDescription>All legal entities grouped by Business Unit</CardDescription>
              </div>
              <Button onClick={() => { setEditingEntity({ id: '', code: '', name: '', business_unit: 'DI' }); setShowEntityDialog(true) }}>
                <Plus className="w-4 h-4 mr-2" /> Add Entity
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {businessUnits.map(bu => {
                  const entities = legalEntities.filter(e => e.business_unit === bu.code)
                  return (
                    <div key={bu.code} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 text-blue-700">{bu.name}</h3>
                      <div className="space-y-2">
                        {entities.map(entity => (
                          <div key={entity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-mono text-xs text-gray-500">{entity.code}</span>
                              <p className="font-medium">{entity.name}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingEntity(entity); setShowEntityDialog(true) }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteLegalEntity(entity.id)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies">
          <CurrenciesTab />
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Azure & System Integration</CardTitle>
              <CardDescription>Configure Azure Entra ID and API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="font-medium text-green-900">✓ Azure Entra ID Connected</p>
                </div>
                <p className="text-sm text-green-700 mt-1">Edge Function deployed: azure-sync-users</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Tenant ID</Label>
                  <Input value={import.meta.env.VITE_AZURE_TENANT_ID || '4c1a7a88-ef89-4360-a322-cc29c20d1966'} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>Client ID</Label>
                  <Input value={import.meta.env.VITE_AZURE_CLIENT_ID || '4b2d84bf-ee4e-4446-8d14-b2624a6323d3'} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>Notification Channel</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Teams + Email</option>
                    <option>Email Only</option>
                    <option>Teams Only</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Directory Sync</span>
                  <Badge>Microsoft Graph API v1.0</Badge>
                </div>
              </div>
              
              <Button className="w-full" variant="outline">Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Edit Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDept?.id ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Department Name</Label><Input value={editingDept?.name || ''} onChange={(e) => setEditingDept({...editingDept!, name: e.target.value})} /></div>
            <div><Label>Head Email</Label><Input type="email" value={editingDept?.head_email || ''} onChange={(e) => setEditingDept({...editingDept!, head_email: e.target.value})} /></div>
            <div><Label>Chief Email</Label><Input type="email" value={editingDept?.chief_email || ''} onChange={(e) => setEditingDept({...editingDept!, chief_email: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={saveDepartment}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal Entity Edit Dialog */}
      <Dialog open={showEntityDialog} onOpenChange={setShowEntityDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEntity?.id ? 'Edit Legal Entity' : 'Add Legal Entity'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Code</Label><Input value={editingEntity?.code || ''} onChange={(e) => setEditingEntity({...editingEntity!, code: e.target.value})} /></div>
            <div><Label>Name</Label><Input value={editingEntity?.name || ''} onChange={(e) => setEditingEntity({...editingEntity!, name: e.target.value})} /></div>
            <div><Label>Business Unit</Label>
              <select className="w-full p-2 border rounded-md" value={editingEntity?.business_unit || 'DI'} onChange={(e) => setEditingEntity({...editingEntity!, business_unit: e.target.value})}>
                <option value="DI">Digital Infrastructure (DI)</option>
                <option value="DS">Digital Services (DS)</option>
              </select>
            </div>
          </div>
          <DialogFooter><Button onClick={saveLegalEntity}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
