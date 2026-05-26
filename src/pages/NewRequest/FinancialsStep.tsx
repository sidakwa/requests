import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const YEARS = ['2026', '2027', '2028', '2029', '2030']

interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
  is_base: boolean
}

interface CapexLineItem {
  name: string
  years: { [key: string]: number }
}

interface FinancialsStepProps {
  capexLineItems: CapexLineItem[]
  quotationValue: number
  currency: string
  currencies: Currency[]
  onCurrencyChange: (currency: string) => void
  onLineItemChange: (itemIndex: number, year: string, value: number) => void
  onQuotationChange: (value: number) => void
  calcLineItemTotal: (item: CapexLineItem) => number
  lineItemsTotal: number
  grandTotal: number
}

export function FinancialsStep({
  capexLineItems,
  quotationValue,
  currency,
  currencies,
  onCurrencyChange,
  onLineItemChange,
  onQuotationChange,
  calcLineItemTotal,
  lineItemsTotal,
  grandTotal
}: FinancialsStepProps) {
  const yearTotals = YEARS.map(year =>
    capexLineItems.reduce((sum, item) => sum + (item.years[year] || 0), 0)
  )
  
  const lineItemsSubtotal = yearTotals.reduce((s, t) => s + t, 0)
  const selectedCurrency = currencies.find(c => c.code === currency) || { symbol: '$', rate: 1, name: 'US Dollar', code: 'USD' }
  const usdEquivalent = grandTotal * selectedCurrency.rate

  return (
    <Card>
      <CardHeader>
        <CardTitle>CAPEX Expenditure Table</CardTitle>
        <CardDescription>5-year breakdown by line item</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Currency Selector */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.symbol}) - Rate: {c.rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CAPEX Grand Total ({selectedCurrency.symbol})</Label>
              <Input value={grandTotal.toLocaleString()} disabled className="bg-blue-50 font-bold text-lg" />
            </div>
            <div>
              <Label>USD Equivalent</Label>
              <Input value={`$${usdEquivalent.toLocaleString()}`} disabled className="bg-gray-100" />
            </div>
          </div>
        </div>

        {/* Capex Table */}
        <p className="text-xs text-gray-400 mb-2 sm:hidden">← Scroll to see all years</p>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="min-w-max w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-left font-semibold text-gray-700 w-40">Line Item</th>
                {YEARS.map(y => <th key={y} className="p-3 text-right font-semibold text-gray-700">{y}</th>)}
                <th className="p-3 text-right font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {capexLineItems.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{item.name}</td>
                  {YEARS.map(year => (
                    <td key={year} className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={item.years[year] || ''}
                        onChange={e => onLineItemChange(idx, year, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right text-sm"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="p-3 text-right font-semibold text-gray-800">
                    ${calcLineItemTotal(item).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td className="p-3 text-gray-700">Line Items Subtotal</td>
                {yearTotals.map((total, i) => <td key={i} className="p-3 text-right text-gray-800">${total.toLocaleString()}</td>)}
                <td className="p-3 text-right text-gray-800">${lineItemsSubtotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Quotation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <Label>Quotation Value (additional) ({selectedCurrency.symbol})</Label>
            <Input
              type="number"
              min={0}
              value={quotationValue || ''}
              onChange={e => onQuotationChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Add any vendor quotation amount</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Line Items Total:</span><span className="font-medium">${lineItemsSubtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Quotation Value:</span><span className="font-medium">{selectedCurrency.symbol} {quotationValue.toLocaleString()}</span></div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between font-bold"><span>CAPEX Grand Total:</span><span className="text-blue-700 text-lg">{selectedCurrency.symbol} {grandTotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>USD Equivalent:</span><span>${usdEquivalent.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
