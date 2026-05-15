import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronRight, ChevronLeft, Search, CheckCircle2, Info,
  Upload, X, FileText, Paperclip, Eye, Send, AlertTriangle, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { usePortalStore } from "@/hooks/useCICStore";
import { searchUsers, buildApprovalChain } from "@/data/index";
import {
  LEGAL_ENTITIES, CURRENCIES, CAPEX_CATEGORIES, CAPEX_TYPES,
  SEGMENTS, CXO_FUNCTIONS, DEPARTMENTS,
  CAPEX_LINE_ITEMS, CAPEX_YEARS, emptyCapexTable, calcGrandTotal,
  calcRowTotal, getDoARule, generateRefNo, toUSD, initials,
  type AzureUser, type CapexTable, type Attachment, type FundingRequest
} from "@/lib/index";
import { toast } from "sonner";

// ── Zod schema ───────────────────────────────────────────────
const schema = z.object({
  title:          z.string().min(3, "Title required"),
  description:    z.string().min(10, "Description required"),
  department:     z.string().min(1, "Required"),
  bu:             z.enum(["DI","DS"]),
  legalEntity:    z.string().min(1, "Required"),
  currency:       z.string().min(1, "Required"),
  amount:         z.coerce.number().min(1, "Amount required"),
  costCentre:     z.string().min(1, "Required"),
  glCode:         z.string().min(1, "Required"),
  vendor:         z.string().min(1, "Required"),
  classification: z.enum(["CAPEX","OPEX"]),
  budgetStatus:   z.enum(["approved","not_approved","pending"]),
  requiredBy:     z.string().min(1, "Required"),
  executiveSummary: z.string().min(10, "Required"),
  justification:  z.string().min(10, "Required"),
  scopeOfWork:    z.string().optional(),
  approvalComments: z.string().optional(),
  // Optional CIC fields
  capexCategory:  z.string().optional(),
  capexType:      z.string().optional(),
  segment:        z.string().optional(),
  cxoFunction:    z.string().optional(),
  headOfDepartment: z.string().optional(),
  projectNo:      z.string().optional(),
  startDate:      z.string().optional(),
  completionDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, label: "Request Details",   icon: FileText },
  { id: 2, label: "Financials",        icon: () => <span className="text-sm font-bold">$</span> },
  { id: 3, label: "Attachments",       icon: Paperclip },
  { id: 4, label: "Approval Chain",    icon: Building2 },
  { id: 5, label: "Review & Submit",   icon: Eye },
];

// ── User search ──────────────────────────────────────────────
function UserSearch({ value, onChange, placeholder }: { value?: AzureUser; onChange:(u:AzureUser)=>void; placeholder?:string }) {
  const [q, setQ] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<AzureUser[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = searchUsers(q); setResults(r); setOpen(r.length > 0 && q.length >= 2);
  }, [q]);
  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" value={q} onChange={e => { setQ(e.target.value); if (!e.target.value) onChange(undefined as unknown as AzureUser); }} placeholder={placeholder ?? "Search Azure AD..."} />
      </div>
      {value && <div className="flex items-center gap-2 mt-1.5 px-2 py-1 bg-primary/10 rounded-md"><Avatar className="w-6 h-6"><AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials(value.displayName)}</AvatarFallback></Avatar><span className="text-xs font-medium">{value.displayName}</span><span className="text-xs text-muted-foreground">{value.jobTitle}</span></div>}
      <AnimatePresence>
        {open && <motion.div initial={{ opacity:0,y:-4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-4 }} className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map(u => <button key={u.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left" onClick={() => { onChange(u); setQ(u.displayName); setOpen(false); }}>
            <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials(u.displayName)}</AvatarFallback></Avatar>
            <div><div className="text-sm font-medium">{u.displayName}</div><div className="text-xs text-muted-foreground">{u.jobTitle} · {u.department}</div></div>
          </button>)}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

// ── Capex table editor ───────────────────────────────────────
function CapexEditor({ table, onChange, currency }: { table:CapexTable; onChange:(t:CapexTable)=>void; currency:string }) {
  const cur = CURRENCIES.find(c=>c.code===currency);
  const grand = calcGrandTotal(table);
  function change(item: typeof CAPEX_LINE_ITEMS[number], year: typeof CAPEX_YEARS[number], raw:string) {
    const val = parseFloat(raw.replace(/,/g,"")) || 0;
    onChange({ ...table, [item]: { ...table[item], [year]: val } });
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b border-border">
          <th className="text-left py-2 pr-3 text-muted-foreground font-medium w-36">Line Item</th>
          {CAPEX_YEARS.map(y=><th key={y} className="text-right py-2 px-1.5 text-muted-foreground font-medium w-28">{y}</th>)}
          <th className="text-right py-2 pl-2 text-muted-foreground font-medium w-32">Total</th>
        </tr></thead>
        <tbody>
          {CAPEX_LINE_ITEMS.map((item,i) => {
            const rowTotal = calcRowTotal(table[item] as Record<number,number>);
            return <tr key={item} className={`border-b border-border/40 ${i%2===0?"bg-muted/20":""}`}>
              <td className="py-1.5 pr-3 font-medium">{item}</td>
              {CAPEX_YEARS.map(y=><td key={y} className="py-1 px-1.5">
                <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">{cur?.symbol}</span>
                  <input type="number" min={0} value={table[item][y]||""} onChange={e=>change(item,y,e.target.value)}
                    className="w-full pl-5 pr-1 py-1 text-right font-mono bg-input border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring" placeholder="0" />
                </div></td>)}
              <td className="py-1.5 pl-2 text-right font-mono font-semibold">{cur?.symbol}{rowTotal.toLocaleString("en-US")}</td>
            </tr>;
          })}
        </tbody>
        <tfoot><tr className="border-t-2 border-border bg-muted/40">
          <td className="py-2 pr-3 font-bold">Total</td>
          {CAPEX_YEARS.map(y=>{const col=CAPEX_LINE_ITEMS.reduce((s,i)=>s+(table[i][y]||0),0);return<td key={y} className="py-2 px-1.5 text-right font-mono font-semibold">{col?`${cur?.symbol}${col.toLocaleString("en-US")}`:""}</td>;})}
          <td className="py-2 pl-2 text-right font-mono font-bold text-primary">{cur?.symbol}{grand.toLocaleString("en-US")}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// ── Attachment uploader (simulated) ─────────────────────────
function AttachmentPanel({ attachments, onChange }: { attachments:Attachment[]; onChange:(a:Attachment[])=>void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(files: FileList|null) {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map(f => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      type: f.name.toLowerCase().includes("quote") ? "quote" :
            f.name.toLowerCase().includes("contract") ? "contract" :
            f.name.toLowerCase().includes("invoice") ? "invoice" :
            f.name.toLowerCase().includes("case") ? "business_case" : "other",
      size: `${(f.size/1024).toFixed(0)} KB`,
      uploadedAt: new Date().toISOString().split("T")[0],
    }));
    onChange([...attachments, ...newAttachments]);
    toast.success(`${newAttachments.length} file(s) attached`);
  }

  const TYPE_ICON: Record<string,string> = { quote:"📋", business_case:"📄", contract:"📜", invoice:"🧾", other:"📎" };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true)}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver?"border-primary bg-primary/5":"border-border hover:border-primary/50 hover:bg-muted/20"}`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">Quotes, business cases, contracts, invoices · PDF, DOCX, XLSX</p>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e=>addFiles(e.target.files)} accept=".pdf,.docx,.xlsx,.png,.jpg" />
      </div>
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map(att=>(
            <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
              <span className="text-lg">{TYPE_ICON[att.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.name}</p>
                <p className="text-xs text-muted-foreground">{att.type.replace("_"," ")} · {att.size} · {att.uploadedAt}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{att.type.replace("_"," ")}</Badge>
              <button type="button" onClick={()=>onChange(attachments.filter(a=>a.id!==att.id))} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function NewRequest() {
  const navigate = useNavigate();
  const { currentUser, doaRules, addRequest } = usePortalStore();

  const [step, setStep] = useState(1);
  const [capexTable, setCapexTable] = useState<CapexTable>(emptyCapexTable());
  const [valueOfQuotation, setValueOfQuotation] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<Record<string,AzureUser>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { control, handleSubmit, watch, getValues, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { classification:"CAPEX", budgetStatus:"pending", bu:"DI", currency:"USD" },
    mode: "onBlur",
  });

  const watchCurrency = watch("currency") ?? "USD";
  const watchDept = watch("department") ?? "";
  const watchClassification = watch("classification");
  const watchAmount = watch("amount") ?? 0;
  const amountUSD = toUSD(watchAmount || 0, watchCurrency);
  const doaRule = getDoARule(doaRules, amountUSD);

  // Build chain from DoA rule
  const approvalChain = buildApprovalChain(doaRule.requiredRoles, watchDept, currentUser.id).map(s => ({
    ...s, assignedTo: assignedUsers[s.role] ?? s.assignedTo,
  }));

  async function goNext() {
    const fieldsToValidate: (keyof FormData)[] = step === 1
      ? ["title","description","department","bu","legalEntity","currency","amount","costCentre","glCode","vendor","classification","budgetStatus","requiredBy","executiveSummary","justification"]
      : [];
    if (fieldsToValidate.length > 0) { const ok = await trigger(fieldsToValidate); if (!ok) return; }
    setStep(s => Math.min(s+1, 5));
  }

  function handleSubmitFinal() {
    const vals = getValues();
    const req: FundingRequest = {
      id: `fr-${Date.now()}`,
      referenceNo: generateRefNo(),
      title: vals.title,
      description: vals.description,
      department: vals.department,
      bu: vals.bu,
      legalEntity: vals.legalEntity,
      currency: vals.currency,
      amount: vals.amount,
      costCentre: vals.costCentre,
      glCode: vals.glCode,
      vendor: vals.vendor,
      classification: vals.classification,
      budgetStatus: vals.budgetStatus,
      requiredBy: vals.requiredBy,
      capexCategory: vals.capexCategory,
      capexType: vals.capexType,
      segment: vals.segment,
      cxoFunction: vals.cxoFunction,
      headOfDepartment: vals.headOfDepartment,
      projectNo: vals.projectNo,
      startDate: vals.startDate,
      completionDate: vals.completionDate,
      capexTable,
      valueOfQuotation,
      executiveSummary: vals.executiveSummary,
      justification: vals.justification,
      scopeOfWork: vals.scopeOfWork,
      approvalComments: vals.approvalComments,
      attachments,
      requestedBy: currentUser,
      approvalChain,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addRequest(req);
    setConfirmOpen(false);
    toast.success("Request submitted!", { description: req.referenceNo });
    navigate("/");
  }

  const vals = getValues();
  const entity = LEGAL_ENTITIES.find(e=>e.code===vals.legalEntity);
  const currency = CURRENCIES.find(c=>c.code===watchCurrency);

  function Field({ label, error, required, children, tip }: { label:string; error?:string; required?:boolean; children:React.ReactNode; tip?:string }) {
    return <div><div className="flex items-center gap-1.5 mb-1"><Label>{label}{required&&<span className="text-destructive ml-0.5">*</span>}</Label>{tip&&<Tooltip><TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent><p className="text-xs max-w-xs">{tip}</p></TooltipContent></Tooltip>}</div>{children}{error&&<p className="text-xs text-destructive mt-1">{error}</p>}</div>;
  }

  return (
    <TooltipProvider>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Funding Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">SEACOM Capital & Operating Expenditure Approval Portal</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s,i) => {
            const done = step > s.id; const active = step === s.id;
            return <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${done?"bg-chart-3 text-white":active?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <s.icon />}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active?"text-foreground":"text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length-1 && <div className={`flex-1 h-0.5 mb-5 mx-1 ${done?"bg-chart-3":"bg-border"}`} />}
            </React.Fragment>;
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
            transition={{ type:"spring", stiffness:300, damping:30 }}>

            {/* ── STEP 1: Request Details ── */}
            {step === 1 && <div className="space-y-5">
              <Card><CardHeader><CardTitle className="text-sm">Core Request Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Field label="Request Title" required error={errors.title?.message}>
                        <Controller name="title" control={control} render={({field})=><Input {...field} placeholder="e.g. Fibre Backbone Upgrade – KZN" className="mt-1" />} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Department" required error={errors.department?.message}>
                        <Controller name="department" control={control} render={({field})=>(
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{DEPARTMENTS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Business Unit" required error={errors.bu?.message}>
                        <Controller name="bu" control={control} render={({field})=>(
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                            <div className="flex items-center gap-2"><RadioGroupItem value="DI" id="bu-di"/><label htmlFor="bu-di" className="text-sm cursor-pointer">DI – Digital Infrastructure</label></div>
                            <div className="flex items-center gap-2"><RadioGroupItem value="DS" id="bu-ds"/><label htmlFor="bu-ds" className="text-sm cursor-pointer">DS – Digital Services</label></div>
                          </RadioGroup>
                        )} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Legal Entity" required error={errors.legalEntity?.message}>
                        <Controller name="legalEntity" control={control} render={({field})=>(
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="mt-1"><SelectValue placeholder="Select entity..." /></SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">DI – Digital Infrastructure</div>
                              {LEGAL_ENTITIES.filter(e=>e.bu==="DI").map(e=><SelectItem key={e.code} value={e.code}><span className="font-mono text-xs mr-2 text-muted-foreground">{e.code}</span>{e.name}</SelectItem>)}
                              <Separator className="my-1"/>
                              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">DS – Digital Services</div>
                              {LEGAL_ENTITIES.filter(e=>e.bu==="DS").map(e=><SelectItem key={e.code} value={e.code}><span className="font-mono text-xs mr-2 text-muted-foreground">{e.code}</span>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                        {entity && <p className="text-xs text-muted-foreground mt-1 font-mono">{entity.code}</p>}
                      </Field>
                    </div>
                    <div>
                      <Field label="Currency" required error={errors.currency?.message}>
                        <Controller name="currency" control={control} render={({field})=>(
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="mt-1"><SelectValue placeholder="Select currency..." /></SelectTrigger>
                            <SelectContent>{CURRENCIES.map(c=><SelectItem key={c.code} value={c.code}><span className="font-mono mr-2">{c.code}</span>{c.name} ({c.symbol})</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </Field>
                    </div>
                    <div>
                      <Field label={`Amount (${watchCurrency})`} required error={errors.amount?.message}>
                        <div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency?.symbol}</span>
                          <Controller name="amount" control={control} render={({field})=><Input {...field} type="number" className="pl-8 font-mono" placeholder="0" onChange={e=>field.onChange(e.target.valueAsNumber)} />} />
                        </div>
                        {amountUSD > 0 && <p className="text-xs text-muted-foreground mt-1">≈ ${amountUSD.toLocaleString("en-US")} USD · <span className={doaRule.color + " font-medium"}>{doaRule.label}</span></p>}
                      </Field>
                    </div>
                    <div>
                      <Field label="Cost Centre" required error={errors.costCentre?.message} tip="Internal cost centre code for accounting allocation">
                        <Controller name="costCentre" control={control} render={({field})=><Input {...field} className="mt-1 font-mono" placeholder="CC-ENG-001" />} />
                      </Field>
                    </div>
                    <div>
                      <Field label="GL Code" required error={errors.glCode?.message} tip="General Ledger account code">
                        <Controller name="glCode" control={control} render={({field})=><Input {...field} className="mt-1 font-mono" placeholder="GL-4200" />} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Vendor / Supplier" required error={errors.vendor?.message}>
                        <Controller name="vendor" control={control} render={({field})=><Input {...field} className="mt-1" placeholder="e.g. Huawei Technologies SA" />} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Classification" required error={errors.classification?.message}>
                        <Controller name="classification" control={control} render={({field})=>(
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                            <div className="flex items-center gap-2"><RadioGroupItem value="CAPEX" id="cls-capex"/><label htmlFor="cls-capex" className="text-sm cursor-pointer">CAPEX</label></div>
                            <div className="flex items-center gap-2"><RadioGroupItem value="OPEX" id="cls-opex"/><label htmlFor="cls-opex" className="text-sm cursor-pointer">OPEX</label></div>
                          </RadioGroup>
                        )} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Budget Status" required error={errors.budgetStatus?.message} tip="Is this expenditure included in the approved budget?">
                        <Controller name="budgetStatus" control={control} render={({field})=>(
                          <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">✅ Budget Approved</SelectItem>
                              <SelectItem value="not_approved">⚠️ Not in Budget</SelectItem>
                              <SelectItem value="pending">🕐 Budget Pending Confirmation</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Required By Date" required error={errors.requiredBy?.message}>
                        <Controller name="requiredBy" control={control} render={({field})=><Input {...field} type="date" className="mt-1" />} />
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card><CardHeader><CardTitle className="text-sm">Narrative</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Description / Business Justification" required error={errors.description?.message}>
                    <Controller name="description" control={control} render={({field})=><Textarea {...field} rows={3} placeholder="Describe the request and business need..." className="mt-1" />} />
                  </Field>
                  <Field label="Executive Summary" required error={errors.executiveSummary?.message}>
                    <Controller name="executiveSummary" control={control} render={({field})=><Textarea {...field} rows={2} placeholder="High-level overview..." className="mt-1" />} />
                  </Field>
                  <Field label="Detailed Justification" required error={errors.justification?.message}>
                    <Controller name="justification" control={control} render={({field})=><Textarea {...field} rows={3} placeholder="Business case and rationale..." className="mt-1" />} />
                  </Field>
                  <Field label="Brief Scope of Work" error={errors.scopeOfWork?.message}>
                    <Controller name="scopeOfWork" control={control} render={({field})=><Textarea {...field} rows={2} placeholder="Work to be performed..." className="mt-1" />} />
                  </Field>
                </CardContent>
              </Card>

              {watchClassification === "CAPEX" && (
                <Card><CardHeader><CardTitle className="text-sm">CAPEX Details (Optional)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { name:"capexCategory", label:"CAPEX Category", items:CAPEX_CATEGORIES },
                        { name:"capexType",     label:"CAPEX Type",     items:CAPEX_TYPES },
                        { name:"segment",       label:"Segment",        items:SEGMENTS },
                        { name:"cxoFunction",   label:"CXO Function",   items:CXO_FUNCTIONS },
                      ].map(f=>(
                        <div key={f.name}>
                          <Label className="text-xs">{f.label}</Label>
                          <Controller name={f.name as keyof FormData} control={control} render={({field})=>(
                            <Select onValueChange={field.onChange} value={field.value as string}><SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{(f.items as readonly string[]).map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                            </Select>
                          )} />
                        </div>
                      ))}
                      <div><Label className="text-xs">Head of Department</Label><Controller name="headOfDepartment" control={control} render={({field})=><Input {...field} placeholder="Name" className="mt-1 text-sm" />} /></div>
                      <div><Label className="text-xs">Project No.</Label><Controller name="projectNo" control={control} render={({field})=><Input {...field} placeholder="PRJ-2026-XXX" className="mt-1 text-sm font-mono" />} /></div>
                      <div><Label className="text-xs">Start Date</Label><Controller name="startDate" control={control} render={({field})=><Input {...field} type="date" className="mt-1 text-sm" />} /></div>
                      <div><Label className="text-xs">Completion Date</Label><Controller name="completionDate" control={control} render={({field})=><Input {...field} type="date" className="mt-1 text-sm" />} /></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>}

            {/* ── STEP 2: Financials ── */}
            {step === 2 && <div className="space-y-5">
              <Card><CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">CAPEX Expenditure Table '000 ({watchCurrency})</CardTitle>
                  <Badge variant="outline" className="font-mono">{watchCurrency} · {currency?.name}</Badge>
                </div>
              </CardHeader>
                <CardContent>
                  <CapexEditor table={capexTable} onChange={setCapexTable} currency={watchCurrency} />
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div><Label className="text-xs">Value of Quotation ({watchCurrency})</Label>
                      <div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency?.symbol}</span>
                        <Input type="number" className="pl-8 font-mono" value={valueOfQuotation||""} onChange={e=>setValueOfQuotation(+e.target.value||0)} placeholder="0" />
                      </div>
                    </div>
                    <div><Label className="text-xs">Grand Total (auto)</Label>
                      <div className="mt-1 px-3 py-2 bg-muted rounded-md font-mono font-bold text-primary">{currency?.symbol}{calcGrandTotal(capexTable).toLocaleString("en-US")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* DoA summary */}
              <Card><CardHeader><CardTitle className="text-sm">DoA Level for this Request</CardTitle></CardHeader>
                <CardContent>
                  <div className={`flex items-start gap-3 p-4 rounded-lg bg-muted/40 border`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${doaRule.color}`} />
                    <div>
                      <p className={`font-semibold ${doaRule.color}`}>{doaRule.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">≈ ${amountUSD.toLocaleString("en-US")} USD</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {doaRule.requiredRoles.map((r,i)=>(
                          <React.Fragment key={r}><Badge variant="secondary" className="text-xs">{r}</Badge>
                            {i<doaRule.requiredRoles.length-1&&<span className="text-muted-foreground text-xs self-center">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>}

            {/* ── STEP 3: Attachments ── */}
            {step === 3 && <div className="space-y-5">
              <Card><CardHeader><CardTitle className="text-sm">Supporting Documents</CardTitle></CardHeader>
                <CardContent><AttachmentPanel attachments={attachments} onChange={setAttachments} /></CardContent>
              </Card>
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 text-primary" />
                <span>Attachments are stored in Azure Blob Storage and linked to the request. Approvers can view documents before making a decision.</span>
              </div>
            </div>}

            {/* ── STEP 4: Approval Chain ── */}
            {step === 4 && <div className="space-y-4">
              <Card><CardHeader>
                <CardTitle className="text-sm">Approval Chain – Azure AD User Assignment</CardTitle>
                <p className="text-xs text-muted-foreground">Chain is auto-configured based on your department and the DoA level. Assign specific users from Azure AD.</p>
              </CardHeader>
                <CardContent className="space-y-5">
                  {approvalChain.map((s,i)=>(
                    <div key={s.role} className="flex gap-4">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.status==="not_required"?"bg-muted text-muted-foreground":"bg-primary text-primary-foreground"}`}>{i+1}</div>
                        {i<approvalChain.length-1&&<div className={`w-0.5 h-8 mt-1 ${s.status==="not_required"?"bg-muted":"bg-primary/30"}`}/>}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1.5"><p className="font-semibold text-sm">{s.role}</p>
                          {s.status==="not_required"&&<Badge variant="secondary" className="text-xs">Not Required</Badge>}
                        </div>
                        {s.status!=="not_required"
                          ? <UserSearch value={assignedUsers[s.role] ?? s.assignedTo} onChange={u=>setAssignedUsers(p=>({...p,[s.role]:u}))} placeholder={`Search for ${s.role}...`} />
                          : <p className="text-xs text-muted-foreground">Not required at current DoA level.</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-sm">Comments for Approval Authority</CardTitle></CardHeader>
                <CardContent><Controller name="approvalComments" control={control} render={({field})=><Textarea {...field} placeholder="Any notes for approvers..." rows={3} />} /></CardContent>
              </Card>
            </div>}

            {/* ── STEP 5: Review & Submit ── */}
            {step === 5 && <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader><div className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary"/><CardTitle className="text-sm">Preview & Confirmation</CardTitle></div></CardHeader>
                <CardContent className="space-y-5">
                  <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        {l:"Title",v:vals.title},{l:"Dept",v:vals.department},{l:"BU",v:vals.bu},
                        {l:"Legal Entity",v:entity?.name??vals.legalEntity},{l:"Currency",v:vals.currency},{l:"Amount",v:`${currency?.symbol}${(vals.amount||0).toLocaleString("en-US")}`},
                        {l:"Cost Centre",v:vals.costCentre},{l:"GL Code",v:vals.glCode},{l:"Vendor",v:vals.vendor},
                        {l:"Classification",v:vals.classification},{l:"Budget",v:vals.budgetStatus},{l:"Required By",v:vals.requiredBy},
                      ].map(f=><div key={f.l} className="bg-muted/40 rounded-lg px-3 py-2"><p className="text-[10px] text-muted-foreground">{f.l}</p><p className="text-sm font-medium mt-0.5 truncate">{f.v}</p></div>)}
                    </div>
                  </div>
                  <Separator/>
                  <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Justification</h4>
                    <p className="text-sm bg-muted/40 rounded-lg p-3">{vals.justification}</p>
                  </div>
                  <Separator/>
                  <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">DoA Level</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 text-sm ${doaRule.color}`}>
                      <AlertTriangle className="w-4 h-4"/>{doaRule.label} · ≈ ${amountUSD.toLocaleString("en-US")} USD
                    </div>
                  </div>
                  <Separator/>
                  <div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Approval Routing</h4>
                    <div className="flex flex-wrap gap-2 items-center">
                      {approvalChain.filter(s=>s.status!=="not_required").map((s,i,arr)=>(
                        <React.Fragment key={s.role}>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <Avatar className="w-9 h-9 border-2 border-primary/20"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{s.assignedTo?initials(s.assignedTo.displayName):"?"}</AvatarFallback></Avatar>
                            <p className="text-[10px] font-medium">{s.assignedTo?.displayName??"Unassigned"}</p>
                            <p className="text-[9px] text-muted-foreground">{s.role}</p>
                          </div>
                          {i<arr.length-1&&<ChevronRight className="w-4 h-4 text-muted-foreground"/>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {attachments.length > 0 && <><Separator/><div><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attachments ({attachments.length})</h4>
                    <div className="flex flex-wrap gap-2">{attachments.map(a=><Badge key={a.id} variant="secondary" className="text-xs gap-1"><Paperclip className="w-3 h-3"/>{a.name}</Badge>)}</div>
                  </div></>}
                  <Separator/>
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(currentUser.displayName)}</AvatarFallback></Avatar>
                    <div><p className="text-xs text-muted-foreground">Requested by</p><p className="text-sm font-medium">{currentUser.displayName} · {currentUser.jobTitle}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" onClick={()=>setStep(s=>Math.max(s-1,1))} disabled={step===1} className="gap-2"><ChevronLeft className="w-4 h-4"/>Back</Button>
          <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
          {step < 5
            ? <Button onClick={goNext} className="gap-2">Next<ChevronRight className="w-4 h-4"/></Button>
            : <Button onClick={()=>setConfirmOpen(true)} className="gap-2 bg-chart-3 hover:bg-chart-3/90"><Send className="w-4 h-4"/>Submit Request</Button>}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Submit <strong>{vals.title}</strong> for <strong>{currency?.symbol}{(vals.amount||0).toLocaleString("en-US")} {watchCurrency}</strong>?
                This will route to {doaRule.requiredRoles.join(" → ")} per DoA policy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitFinal} className="bg-chart-3 hover:bg-chart-3/90">Confirm & Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
