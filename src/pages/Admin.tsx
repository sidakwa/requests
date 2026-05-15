import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, Save, X, ShieldCheck, Building2, Users, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, CURRENCIES, DEFAULT_DOA_RULES, type DoARule } from "@/lib/index";
import { MOCK_USERS, DEPT_CONFIGS } from "@/data/index";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) { return name.split(" ").map(p=>p[0]).join("").toUpperCase().slice(0,2); }

// ── DoA Matrix editor ────────────────────────────────────────
function DoAMatrix() {
  const { doaRules, setDoaRules } = usePortalStore();
  const [editId, setEditId] = useState<string|null>(null);
  const [editBuf, setEditBuf] = useState<DoARule|null>(null);

  function startEdit(rule: DoARule) { setEditId(rule.id); setEditBuf({ ...rule }); }
  function save() {
    if (!editBuf) return;
    setDoaRules(doaRules.map(r => r.id === editId ? editBuf : r));
    setEditId(null); setEditBuf(null);
  }
  function reset() { setDoaRules(DEFAULT_DOA_RULES); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Delegation of Authority Matrix</p>
          <p className="text-xs text-muted-foreground mt-0.5">Configure approval thresholds and required approvers per level</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>Reset to Defaults</Button>
      </div>
      <div className="space-y-3">
        {doaRules.map(rule => (
          <Card key={rule.id} className={`border ${editId===rule.id?"border-primary/50":""}`}>
            <CardContent className="p-4">
              {editId === rule.id && editBuf ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input className="mt-1 text-sm" value={editBuf.label} onChange={e=>setEditBuf({...editBuf,label:e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Min (USD)</Label>
                      <Input className="mt-1 text-sm font-mono" type="number" value={editBuf.minUSD} onChange={e=>setEditBuf({...editBuf,minUSD:+e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Max (USD) — use 9999999999 for unlimited</Label>
                      <Input className="mt-1 text-sm font-mono" type="number" value={editBuf.maxUSD===Infinity?9999999999:editBuf.maxUSD} onChange={e=>setEditBuf({...editBuf,maxUSD:+e.target.value>=9999999999?Infinity:+e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Required Roles (comma-separated)</Label>
                    <Input className="mt-1 text-sm" value={editBuf.requiredRoles.join(", ")} onChange={e=>setEditBuf({...editBuf,requiredRoles:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={save} className="gap-1.5"><Save className="w-3.5 h-3.5"/>Save</Button>
                    <Button size="sm" variant="outline" onClick={()=>{setEditId(null);setEditBuf(null);}}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                    rule.id==="doa1"?"bg-chart-3":rule.id==="doa2"?"bg-chart-2":rule.id==="doa3"?"bg-warning":"bg-destructive"}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{rule.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${rule.minUSD.toLocaleString()} – {rule.maxUSD===Infinity?"Unlimited":`$${rule.maxUSD.toLocaleString()}`}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rule.requiredRoles.map((r,i)=>(
                        <React.Fragment key={r}>
                          <Badge variant="secondary" className="text-xs">{r}</Badge>
                          {i < rule.requiredRoles.length-1 && <span className="text-muted-foreground text-xs self-center">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={()=>startEdit(rule)}><Edit3 className="w-4 h-4"/></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Department Head / Chief mapping ─────────────────────────
function DeptMapping() {
  const { deptConfigs } = usePortalStore();
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">Department Head & Chief Mapping</p>
        <p className="text-xs text-muted-foreground mt-0.5">Maps departments to their approval authority (from Azure AD + local config)</p>
      </div>
      <div className="space-y-3">
        {deptConfigs.map(cfg => (
          <Card key={cfg.department}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-semibold text-sm w-32">{cfg.department}</p>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(cfg.headName)}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs font-medium">{cfg.headName}</p>
                      <p className="text-[10px] text-muted-foreground">Department Head</p>
                    </div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-chart-2/20 text-chart-2 text-xs">{initials(cfg.chiefName)}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs font-medium">{cfg.chiefName}</p>
                      <p className="text-[10px] text-muted-foreground">Chief / Executive</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"><Edit3 className="w-3.5 h-3.5"/>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Legal entities reference ─────────────────────────────────
function EntitiesPanel() {
  return (
    <div className="space-y-4">
      <p className="font-semibold">Legal Entities ({LEGAL_ENTITIES.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["DI","DS"].map(bu => (
          <div key={bu}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{bu === "DI" ? "Digital Infrastructure" : "Digital Services"}</p>
            <div className="space-y-1">
              {LEGAL_ENTITIES.filter(e=>e.bu===bu).map(e=>(
                <div key={e.code} className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-md">
                  <span className="font-mono text-xs text-primary w-24 shrink-0">{e.code}</span>
                  <span className="text-xs text-muted-foreground">{e.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Azure AD & integration ───────────────────────────────────
function IntegrationPanel() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm">Azure Entra ID (SSO)</CardTitle>
            <Badge className="ml-auto bg-chart-3/20 text-chart-3 border-chart-3/30">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { label: "Tenant Domain",    value: "seacom.com" },
            { label: "Auth Flow",        value: "OAuth 2.0 / MSAL – On-Behalf-Of" },
            { label: "Directory Sync",   value: "Microsoft Graph API v1.0" },
            { label: "Org Chart Source", value: "Graph /users/{id}/manager" },
            { label: "Group Sync",       value: "DI-Users, DS-Users, Finance-Approvers" },
          ].map(f=>(
            <div key={f.label} className="flex items-center gap-4">
              <span className="text-muted-foreground w-40 shrink-0">{f.label}</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{f.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Notification Channels</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { ch: "Email",           status: "Active",    note: "On submit, approve, reject, return" },
            { ch: "Microsoft Teams", status: "Configured",note: "Adaptive Cards to approver channels" },
            { ch: "SMS",             status: "Disabled",  note: "Requires SMS gateway configuration" },
          ].map(n=>(
            <div key={n.ch} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="w-32 font-medium">{n.ch}</span>
              <Badge variant={n.status==="Active"?"default":n.status==="Configured"?"secondary":"outline"} className="text-xs">{n.status}</Badge>
              <span className="text-xs text-muted-foreground">{n.note}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Recommended Tech Stack</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ["Frontend","React / Next.js"],["Backend","Node.js / NestJS"],
              ["Auth","Microsoft Entra ID"],["Directory","MS Graph API"],
              ["Database","PostgreSQL / Azure SQL"],["Files","Azure Blob / SharePoint"],
              ["Workflow","Custom tables / Temporal"],["Notifications","Email + Teams"],
              ["Hosting","Azure Container Apps"],
            ].map(([k,v])=>(
              <div key={k} className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{k}</p>
                <p className="text-xs font-semibold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Currencies ───────────────────────────────────────────────
function CurrenciesPanel() {
  return (
    <div className="space-y-4">
      <p className="font-semibold">Supported Currencies</p>
      <div className="flex flex-wrap gap-3">
        {CURRENCIES.map(c=>(
          <div key={c.code} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border">
            <span className="font-mono font-bold text-primary text-lg">{c.symbol}</span>
            <div><p className="text-xs font-semibold">{c.code}</p><p className="text-[10px] text-muted-foreground">{c.name}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Admin & Configuration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">DoA matrix, approval routing, entities, integrations</p>
      </div>
      <Tabs defaultValue="doa">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="doa" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/>DoA Matrix</TabsTrigger>
          <TabsTrigger value="depts" className="gap-1.5"><Users className="w-3.5 h-3.5"/>Dept Mapping</TabsTrigger>
          <TabsTrigger value="entities" className="gap-1.5"><Building2 className="w-3.5 h-3.5"/>Entities</TabsTrigger>
          <TabsTrigger value="currencies" className="gap-1.5"><span className="text-sm">$</span>Currencies</TabsTrigger>
          <TabsTrigger value="integration" className="gap-1.5"><Link2 className="w-3.5 h-3.5"/>Integration</TabsTrigger>
        </TabsList>
        <TabsContent value="doa" className="mt-5"><DoAMatrix /></TabsContent>
        <TabsContent value="depts" className="mt-5"><DeptMapping /></TabsContent>
        <TabsContent value="entities" className="mt-5"><EntitiesPanel /></TabsContent>
        <TabsContent value="currencies" className="mt-5"><CurrenciesPanel /></TabsContent>
        <TabsContent value="integration" className="mt-5"><IntegrationPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
