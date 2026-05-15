import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, FileText, TrendingUp, DollarSign,
  Plus, Search, AlertTriangle, ArrowRight, Building2, RotateCcw, Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, CURRENCIES, ROUTES, fmtCurrency, initials, type RequestStatus } from "@/lib/index";

const STATUS_CFG: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "text-muted-foreground", bg: "bg-muted",           icon: FileText },
  submitted: { label: "Submitted", color: "text-chart-2",          bg: "bg-chart-2/10",      icon: Clock },
  in_review: { label: "In Review", color: "text-warning",          bg: "bg-warning/10",      icon: Clock },
  returned:  { label: "Returned",  color: "text-chart-4",          bg: "bg-chart-4/10",      icon: RotateCcw },
  approved:  { label: "Approved",  color: "text-chart-3",          bg: "bg-chart-3/10",      icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "text-destructive",      bg: "bg-destructive/10",  icon: XCircle },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" />{cfg.label}
    </span>
  );
}

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 28 } } },
};

export default function Dashboard() {
  const { requests } = usePortalStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBU, setFilterBU] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  const stats = {
    total:    requests.length,
    approved: requests.filter(r => r.status === "approved").length,
    inReview: requests.filter(r => r.status === "in_review" || r.status === "submitted").length,
    returned: requests.filter(r => r.status === "returned").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    totalUSD: requests.reduce((s, r) => {
      const rate: Record<string,number> = { USD:1,ZAR:0.054,EUR:1.08,GBP:1.27,KES:0.0077,MZN:0.016,TZS:0.00039,UGX:0.00027,MUR:0.022 };
      return s + r.amount * (rate[r.currency] ?? 1);
    }, 0),
    capex: requests.filter(r => r.classification === "CAPEX").reduce((s,r)=> s+r.amount,0),
    opex:  requests.filter(r => r.classification === "OPEX").reduce((s,r)=> s+r.amount,0),
  };

  const filtered = requests.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.referenceNo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterBU !== "all" && r.bu !== filterBU) return false;
    if (filterClass !== "all" && r.classification !== filterClass) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funding Portal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All funding requests across SEACOM group</p>
        </div>
        <Button onClick={() => navigate(ROUTES.NEW_REQUEST)} className="gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <motion.div variants={stagger.container} initial="hidden" animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",       value: stats.total,                      icon: FileText,     color: "text-primary",     bg: "bg-primary/10" },
          { label: "Approved",    value: stats.approved,                   icon: CheckCircle2, color: "text-chart-3",     bg: "bg-chart-3/10" },
          { label: "In Review",   value: stats.inReview,                   icon: Clock,        color: "text-warning",     bg: "bg-warning/10" },
          { label: "Returned",    value: stats.returned,                   icon: RotateCcw,    color: "text-chart-4",     bg: "bg-chart-4/10" },
          { label: "Rejected",    value: stats.rejected,                   icon: XCircle,      color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Total (USD)", value: `$${(stats.totalUSD/1000).toFixed(0)}k`, icon: DollarSign, color: "text-accent", bg: "bg-accent/10" },
        ].map(s => (
          <motion.div key={s.label} variants={stagger.item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                  <div className={`p-1.5 rounded-lg ${s.bg}`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* CAPEX vs OPEX bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> CAPEX: {fmtCurrency(stats.capex, "ZAR")}</div>
              <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-sm bg-chart-2 inline-block" /> OPEX: {fmtCurrency(stats.opex, "ZAR")}</div>
            </div>
            <span className="text-xs text-muted-foreground">Mix by value</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
            {(() => {
              const total = stats.capex + stats.opex || 1;
              return <>
                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${(stats.capex/total)*100}%` }} />
                <div className="bg-chart-2 h-full transition-all duration-500" style={{ width: `${(stats.opex/total)*100}%` }} />
              </>;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title or ref..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(["draft","submitted","in_review","returned","approved","rejected"] as const).map(s => (
              <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBU} onValueChange={setFilterBU}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="BU" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All BUs</SelectItem>
            <SelectItem value="DI">DI – Infra</SelectItem>
            <SelectItem value="DS">DS – Services</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">CAPEX + OPEX</SelectItem>
            <SelectItem value="CAPEX">CAPEX only</SelectItem>
            <SelectItem value="OPEX">OPEX only</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Request list */}
      <motion.div variants={stagger.container} initial="hidden" animate="visible" className="space-y-2.5">
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No requests found.</p>
          </CardContent></Card>
        )}
        {filtered.map(req => {
          const entity = LEGAL_ENTITIES.find(e => e.code === req.legalEntity);
          const currency = CURRENCIES.find(c => c.code === req.currency);
          const approvedSteps = req.approvalChain.filter(s => s.status === "approved").length;
          const requiredSteps = req.approvalChain.filter(s => s.status !== "not_required").length;
          const pct = requiredSteps > 0 ? (approvedSteps / requiredSteps) * 100 : 0;
          const hasBudgetWarning = req.budgetStatus === "not_approved";
          return (
            <motion.div key={req.id} variants={stagger.item}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/30 group"
                onClick={() => navigate(`/request/${req.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{req.referenceNo}</span>
                        <StatusBadge status={req.status} />
                        <Badge variant="outline" className="text-xs">{req.bu}</Badge>
                        <Badge variant="secondary" className="text-xs">{req.classification}</Badge>
                        {hasBudgetWarning && (
                          <span className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle className="w-3 h-3" />Budget TBC</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{req.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{entity?.name ?? req.legalEntity}</span>
                        <span>{req.department}</span>
                        <span>{req.vendor}</span>
                        <span>Due: {req.requiredBy}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold font-mono">{currency?.symbol}{req.amount.toLocaleString("en-US")}</p>
                      <p className="text-xs text-muted-foreground">{req.currency}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex -space-x-2">
                        {req.approvalChain.filter(s => s.status !== "not_required").slice(0,4).map((s, i) => (
                          <Avatar key={i} className="w-6 h-6 border-2 border-background">
                            <AvatarFallback className={`text-[9px] ${s.status==="approved"?"bg-chart-3/20 text-chart-3":s.status==="rejected"?"bg-destructive/20 text-destructive":"bg-muted text-muted-foreground"}`}>
                              {s.assignedTo ? initials(s.assignedTo.displayName) : "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{approvedSteps}/{requiredSteps} approved</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
