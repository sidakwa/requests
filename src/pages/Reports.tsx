import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-2">View spending analytics and approval metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234,567</div>
            <p className="text-xs text-muted-foreground">YTD across all requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$987,654</div>
            <p className="text-xs text-muted-foreground">80% approval rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">$246,913</div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Approval Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.2</div>
            <p className="text-xs text-muted-foreground">-0.5 vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for charts */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend vs Forecast</CardTitle>
          <CardDescription>Actual vs projected spending by month</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-gray-500">
          Chart component will be added here using Recharts
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by Legal Entity</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-gray-500">
            Horizontal bar chart placeholder
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CAPEX vs OPEX Split</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-gray-500">
            Donut chart placeholder
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
