import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, TrendingUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  rate: number
  is_base: boolean
  updated_at: string
}

export function CurrenciesTab() {
  const { isAdmin } = useAuth()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', rate: 1, is_base: false })

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const fetchCurrencies = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching currencies...')
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code')
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Currencies fetched:', data?.length || 0)
      setCurrencies(data || [])
      
      // If no currencies, insert default ones
      if (!data || data.length === 0) {
        console.log('No currencies found, inserting defaults...')
        await insertDefaultCurrencies()
      }
    } catch (err) {
      console.error('Error fetching currencies:', err)
      setError('Failed to load currencies. Please check your database connection.')
      toast.error('Failed to load currencies')
    } finally {
      setLoading(false)
    }
  }

  const insertDefaultCurrencies = async () => {
    const defaultCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.00, is_base: true },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.50, is_base: false },
      { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92, is_base: false },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, is_base: false },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rate: 130.00, is_base: false },
      { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', rate: 64.00, is_base: false },
      { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', rate: 2600.00, is_base: false },
      { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', rate: 3800.00, is_base: false },
    ]

    try {
      const { error } = await supabase
        .from('currencies')
        .insert(defaultCurrencies)
      
      if (error) throw error
      
      console.log('Default currencies inserted')
      fetchCurrencies() // Refresh the list
      toast.success('Default currencies added')
    } catch (err) {
      console.error('Error inserting default currencies:', err)
      toast.error('Failed to insert default currencies')
    }
  }

  const updateExchangeRate = async (currencyId: string, newRate: number) => {
    if (!isAdmin) {
      toast.error('Only admins can update exchange rates')
      return
    }

    try {
      const { error } = await supabase
        .from('currencies')
        .update({ 
          rate: newRate, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', currencyId)
      
      if (error) throw error
      
      toast.success('Exchange rate updated successfully')
      fetchCurrencies()
    } catch (err) {
      console.error('Error updating rate:', err)
      toast.error('Failed to update exchange rate')
    }
  }

  const setBaseCurrency = async (currencyId: string) => {
    if (!isAdmin) {
      toast.error('Only admins can set base currency')
      return
    }

    try {
      // First, set all currencies to non-base
      await supabase
        .from('currencies')
        .update({ is_base: false })
        .neq('id', '')
      
      // Then set the selected one as base
      const { error } = await supabase
        .from('currencies')
        .update({ is_base: true, rate: 1 })
        .eq('id', currencyId)
      
      if (error) throw error
      
      toast.success('Base currency updated successfully')
      fetchCurrencies()
    } catch (err) {
      console.error('Error setting base currency:', err)
      toast.error('Failed to set base currency')
    }
  }

  const addCurrency = async () => {
    if (!isAdmin) {
      toast.error('Only admins can add currencies')
      return
    }

    if (!newCurrency.code || !newCurrency.name) {
      toast.error('Currency code and name are required')
      return
    }

    try {
      const { error } = await supabase
        .from('currencies')
        .insert({
          code: newCurrency.code.toUpperCase(),
          name: newCurrency.name,
          symbol: newCurrency.symbol,
          rate: newCurrency.rate,
          is_base: newCurrency.is_base
        })
      
      if (error) throw error
      
      toast.success('Currency added successfully')
      setShowAddDialog(false)
      setNewCurrency({ code: '', name: '', symbol: '', rate: 1, is_base: false })
      fetchCurrencies()
    } catch (err) {
      console.error('Error adding currency:', err)
      toast.error('Failed to add currency')
    }
  }

  const deleteCurrency = async (currencyId: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete currencies')
      return
    }

    const currency = currencies.find(c => c.id === currencyId)
    if (currency?.is_base) {
      toast.error('Cannot delete base currency')
      return
    }

    if (!confirm('Delete this currency?')) return

    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', currencyId)
      
      if (error) throw error
      
      toast.success('Currency deleted')
      fetchCurrencies()
    } catch (err) {
      console.error('Error deleting currency:', err)
      toast.error('Failed to delete currency')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading currencies...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchCurrencies}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Supported Currencies ({currencies.length} Total)</CardTitle>
          <CardDescription>Configure exchange rates and display settings</CardDescription>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Currency
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {currencies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No currencies found. Click "Add Currency" to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currencies.map((currency) => (
              <div key={currency.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{currency.code}</p>
                      {currency.is_base && (
                        <Badge className="bg-green-100 text-green-700">Base Currency</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{currency.name}</p>
                    <p className="text-2xl mt-2">{currency.symbol}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingCurrency(currency)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!currency.is_base && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteCurrency(currency.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {!currency.is_base && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Exchange Rate (vs USD)</p>
                        <p className="text-lg font-semibold">{currency.rate.toFixed(4)}</p>
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingCurrency(currency)}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" /> Update Rate
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {!currency.is_base && isAdmin && (
                  <div className="mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => setBaseCurrency(currency.id)}
                    >
                      Set as Base Currency
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-2">
                  Last updated: {new Date(currency.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Currency Dialog */}
      <Dialog open={!!editingCurrency} onOpenChange={() => setEditingCurrency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Currency</DialogTitle>
            <DialogDescription>Update currency details and exchange rate</DialogDescription>
          </DialogHeader>
          {editingCurrency && (
            <div className="space-y-4">
              <div>
                <Label>Currency Code</Label>
                <Input value={editingCurrency.code} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>Currency Name</Label>
                <Input 
                  value={editingCurrency.name} 
                  onChange={(e) => setEditingCurrency({...editingCurrency, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input 
                  value={editingCurrency.symbol} 
                  onChange={(e) => setEditingCurrency({...editingCurrency, symbol: e.target.value})}
                />
              </div>
              {!editingCurrency.is_base && (
                <div>
                  <Label>Exchange Rate (vs USD)</Label>
                  <Input 
                    type="number" 
                    step="0.0001"
                    value={editingCurrency.rate} 
                    onChange={(e) => setEditingCurrency({...editingCurrency, rate: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCurrency(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editingCurrency) {
                updateExchangeRate(editingCurrency.id, editingCurrency.rate)
                setEditingCurrency(null)
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Currency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>Add a new currency to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Currency Code *</Label>
              <Input 
                placeholder="e.g., JPY"
                value={newCurrency.code} 
                onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <Label>Currency Name *</Label>
              <Input 
                placeholder="e.g., Japanese Yen"
                value={newCurrency.name} 
                onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Symbol</Label>
              <Input 
                placeholder="e.g., ¥"
                value={newCurrency.symbol} 
                onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})}
              />
            </div>
            <div>
              <Label>Exchange Rate (vs USD)</Label>
              <Input 
                type="number" 
                step="0.0001"
                value={newCurrency.rate} 
                onChange={(e) => setNewCurrency({...newCurrency, rate: parseFloat(e.target.value)})}
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={newCurrency.is_base}
                onChange={(e) => setNewCurrency({...newCurrency, is_base: e.target.checked})}
              />
              <Label>Set as Base Currency</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={addCurrency}>Add Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
