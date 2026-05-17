// Currency exchange rates (from currencies table)
let exchangeRates: Record<string, number> = {
  USD: 1,
  ZAR: 0.054,    // 1 ZAR = 0.054 USD
  EUR: 1.08,
  GBP: 1.27,
  KES: 0.0077,
  MZN: 0.016,
  TZS: 0.00039,
  UGX: 0.00027
}

export async function loadExchangeRates() {
  const { data } = await supabase.from('currencies').select('code, rate')
  if (data) {
    exchangeRates = data.reduce((acc, curr) => {
      acc[curr.code] = curr.rate
      return acc
    }, {} as Record<string, number>)
  }
}

export function convertToUSD(amount: number, currency: string): number {
  const rate = exchangeRates[currency] || 1
  return amount * rate
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', ZAR: 'R',
    KES: 'KSh', MZN: 'MT', TZS: 'TSh', UGX: 'USh'
  }
  const symbol = symbols[currency] || '$'
  return `${symbol} ${amount.toLocaleString()}`
}
