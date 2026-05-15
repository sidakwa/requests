import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, toUSD } from "@/lib/index";

// ── Colour palette from design system ─────────────────────
const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

// ── Forecast: monthly spend projection (mock data derived from requests) ───
const MONTHLY_FORECAST = [
  { month: "Jan", actual: 0,      forecast: 420000 },
  { month: "Feb", actual: 3340000,forecast: 3500000 },
  { month: "Mar", actual: 825000, forecast: 800000 },
  { month: "Apr", actual: 1450000,forecast: 1300000 },
  { month: "May", actual: 315000, forecast: 1200000 },
  { month: "Jun", actual: 0,      forecast: 950000 },
  { month: "Jul", actual: 0,      forecast: 600000 },
  { month: "Aug", actual: 0,      forecast: 280000 },
  { month: "Sep", actual: 0,      forecast: 420000 },
];

const SPEND_BY_ENTITY = [
  { name: "SEAKZN001", amount: 198374 },
  { name: "SEAKEN002", amount: 825000 },
  { name: "SEAFRA001", amount: 213840 },
  { name: "SEATAN002", amount: 38000 },
  { name: "SEAUGA001", amount: 1450000 },
  { name: "SEA_WC002", amount: 64800 },
  { name: "SEAMOZ001", amount: 95000 },
  { name: "SEA_MS002", amount: 22500 },
].sort((a, b) => b.amount - a.amount);

const SPEND_BY_DEPT = [
  { dept: "Engineering", capex: 2568374, opex: 0 },
  { dept: "IT",           capex: 38000,   opex: 22500 },
  { dept: "Operations",   capex: 0,        opex: 64800 },
  { dept: "Sales",        capex: 825000,   opex: 0 },
];

const CAPEX_OPEX_PIE = [
  { name: "CAPEX", value: 6221374 },
  { name: "OPEX",  value: 87300 },
];

const STATUS_PIE = [
  { name: "Approved",  value: 3 },
  { name: "In Review", value: 3 },
  { name: "Returned",  value: 1 },
  { name: "Submitted", value: 1 },
];
const STATUS_COLORS = ["#22c55e","#f59e0b","#f97316","#3b82f6"];

const APPROVAL_VELOCITY = [
  { week: "W1 Feb", avg: 2.1 },
  { week: "W2 Feb", avg: 1.8 },
  { week: "W3 Feb", avg: 3.2 },
  { week: "W4 Feb", avg: 1.5 },
  { week: "W1 Mar", avg: 2.9 },
  { week: "W2 Mar", avg: 2.0 },
  { week: "W3 Mar", avg: 4.1 },
  { week: "W4 Mar", avg: 1.7 },
  { week: "W1 Apr", avg: 2.4 },
  { week: "W2 Apr", avg: 3.0 },
];

function KPICard({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; trend?: "up"|"down"; color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace("text-","bg-")}/10`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend==="up"?"text-chart-3":"text-destructive"}`}>
            {trend==="up" ? <TrendingUp className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
            <span>{trend==="up"?"↑ On track":"↓ Watch"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { requests } = usePortalStore();
  const [period, setPeriod] = useState("2026");

  const totalUSD = requests.reduce((s,r) => s + toUSD(r.amount, r.currency), 0);
  const approvedUSD = requests.filter(r=>r.status==="approved").reduce((s,r) => s+toUSD(r.amount,r.currency),0);
  const pendingUSD  = requests.filter(r=>["submitted","in_review"].includes(r.status)).reduce((s,r)=>s+toUSD(r.amount,r.currency),0);
  const avgDays = 4.2;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Spend tracking, forecasts, and approval metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Data as of May 2026</Badge>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">FY 2025</SelectItem>
              <SelectItem value="2026">FY 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI row */}
      <motion.div initial="hidden" animate="visible"
        variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.07 }} }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requested (USD)", value: `$${(totalUSD/1e6).toFixed(2)}M`, sub: `${requests.length} requests`, icon: DollarSign, trend: "up" as const, color: "text-primary" },
          { label: "Approved Value (USD)",  value: `$${(approvedUSD/1e6).toFixed(2)}M`, sub: `${requests.filter(r=>r.status==="approved").length} approved`, icon: CheckCircle2, trend: "up" as const, color: "text-chart-3" },
          { label: "Pending Value (USD)",   value: `$${(pendingUSD/1e6).toFixed(2)}M`, sub: `${requests.filter(r=>["submitted","in_review"].includes(r.status)).length} in flight`, icon: Clock, trend: "down" as const, color: "text-warning" },
          { label: "Avg Approval Days",     value: `${avgDays}d`, sub: "Time to final approval", icon: FileText, color: "text-accent" },
        ].map(k => (
          <motion.div key={k.label}
            variants={{ hidden:{ opacity:0,y:10 }, visible:{ opacity:1,y:0, transition:{ type:"spring",stiffness:280,damping:28 }} }}>
            <KPICard {...k} />
          </motion.div>
        ))}
      </motion.div>

      {/* Spend forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Spend vs Forecast (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={MONTHLY_FORECAST} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="frcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, ""]} />
              <Legend />
              <Area type="monotone" dataKey="actual"   name="Actual Spend"   stroke="#3b82f6" fill="url(#actGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="forecast" name="Forecast"        stroke="#f59e0b" fill="url(#frcGrad)" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Middle row: by entity + CAPEX/OPEX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Spend by Legal Entity (USD)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={SPEND_BY_ENTITY} layout="vertical" margin={{ top:0, right:8, bottom:0, left:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={72} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, "Amount"]} />
                <Bar dataKey="amount" radius={[0,4,4,0]}>
                  {SPEND_BY_ENTITY.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">CAPEX vs OPEX Split</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={CAPEX_OPEX_PIE} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    dataKey="value" paddingAngle={4}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {CAPEX_OPEX_PIE.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: i===0?"#3b82f6":"#22c55e" }} />
                    <div>
                      <p className="text-xs font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">${d.value.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Requests by Status</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={120}>
                <PieChart>
                  <Pie data={STATUS_PIE} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                    dataKey="value" paddingAngle={3}>
                    {STATUS_PIE.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {STATUS_PIE.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}:</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Spend by dept */}
      <Card>
        <CardHeader><CardTitle className="text-base">CAPEX vs OPEX by Department (USD)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SPEND_BY_DEPT} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dept" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v:number) => [`$${v.toLocaleString("en-US")}`,""]} />
              <Legend />
              <Bar dataKey="capex" name="CAPEX" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="opex"  name="OPEX"  fill="#22c55e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Approval velocity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Velocity – Avg Days to Approve</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={APPROVAL_VELOCITY} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize:10 }} />
              <YAxis tick={{ fontSize:11 }} unit=" days" />
              <Tooltip />
              <Line type="monotone" dataKey="avg" name="Avg days" stroke="#8b5cf6" strokeWidth={2} dot={{ r:4, fill:"#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Aging table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Request Aging – Pending Approvals</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Reference","Title","Entity","Awaiting","Days Pending","Amount"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usePortalStore.getState().requests
                  .filter(r => ["submitted","in_review"].includes(r.status))
                  .map(r => {
                    const pendingStep = r.approvalChain.find(s => s.status === "pending");
                    const days = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000);
                    const entity = LEGAL_ENTITIES.find(e => e.code === r.legalEntity);
                    return (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 font-mono text-xs">{r.referenceNo}</td>
                        <td className="py-2 pr-4 text-xs font-medium max-w-[160px] truncate">{r.title}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{entity?.name ?? r.legalEntity}</td>
                        <td className="py-2 pr-4 text-xs">{pendingStep?.role ?? "–"}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-mono ${days>7?"text-destructive":days>3?"text-warning":"text-chart-3"}`}>{days}d</span>
                        </td>
                        <td className="py-2 text-xs font-mono font-semibold">${r.amount.toLocaleString("en-US")}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
