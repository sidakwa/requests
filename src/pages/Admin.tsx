import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Admin() {
  const [activeTab, setActiveTab] = useState("doa")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-2">Configure system settings and approval rules</p>
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
            <CardHeader>
              <CardTitle>Delegation of Authority (DoA) Matrix</CardTitle>
              <CardDescription>Configure approval thresholds and required roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount Range</TableHead>
                    <TableHead>Required Approvers</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>$0 - $10,000</TableCell>
                    <TableCell>Line Manager → Dept Head</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>$10,001 - $50,000</TableCell>
                    <TableCell>Line Manager → Dept Head → Finance</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>$50,001 - $250,000</TableCell>
                    <TableCell>Line Manager → Dept Head → Chief → Finance</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>$250,001+</TableCell>
                    <TableCell>Full chain → CFO/CEO</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Mapping Tab */}
        <TabsContent value="dept">
          <Card>
            <CardHeader>
              <CardTitle>Department Approver Mapping</CardTitle>
              <CardDescription>Map Azure AD users to approval roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Dept Head</TableHead>
                    <TableHead>Chief/Executive</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Digital Innovation (DI)</TableCell>
                    <TableCell>john.smith@company.com</TableCell>
                    <TableCell>cto@company.com</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Data Science (DS)</TableCell>
                    <TableCell>jane.doe@company.com</TableCell>
                    <TableCell>cto@company.com</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4">
                <Button>+ Add Department</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle>Legal Entities (22 Total)</CardTitle>
              <CardDescription>All legal entities grouped by Business Unit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">DI Business Unit</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• Entity 1 - DI US</div>
                    <div>• Entity 2 - DI UK</div>
                    <div>• Entity 3 - DI EU</div>
                    <div>• Entity 4 - DI APAC</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">DS Business Unit</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• Entity 5 - DS US</div>
                    <div>• Entity 6 - DS UK</div>
                    <div>• Entity 7 - DS EU</div>
                    <div>• Entity 8 - DS APAC</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Manage All 22 Entities</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle>Supported Currencies (9 Total)</CardTitle>
              <CardDescription>Configure exchange rates and display settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded">
                    <p className="font-medium">USD</p>
                    <p className="text-sm text-gray-500">US Dollar</p>
                    <p className="text-xs text-green-600">Base Currency</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium">EUR</p>
                    <p className="text-sm text-gray-500">Euro</p>
                    <p className="text-xs">Rate: 0.92</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium">GBP</p>
                    <p className="text-sm text-gray-500">British Pound</p>
                    <p className="text-xs">Rate: 0.79</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Configure Currencies</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Azure & System Integration</CardTitle>
              <CardDescription>Configure Azure Entra ID and API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-900">✓ Azure Entra ID Connected</p>
                <p className="text-sm text-green-700">Last sync: 2 minutes ago</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenant ID</label>
                <Input placeholder="azure-tenant-id" />
                <label className="text-sm font-medium">Client ID</label>
                <Input placeholder="azure-client-id" />
                <label className="text-sm font-medium">Notification Channel</label>
                <select className="w-full p-2 border rounded">
                  <option>Teams + Email</option>
                  <option>Email Only</option>
                  <option>Teams Only</option>
                </select>
              </div>
              <Button>Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
