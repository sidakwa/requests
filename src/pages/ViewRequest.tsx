import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Building2, FileText,
  RotateCcw, Paperclip, MessageSquare, AlertTriangle, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, CURRENCIES, CAPEX_LINE_ITEMS, CAPEX_YEARS, calcGrandTotal, calcRowTotal, getDoARule, initials, toUSD, type RequestStatus, type ApprovalStatus } from "@/lib/index";
import { toast } from "sonner";

const STATUS_CFG: Record<RequestStatus,{label:string;color:string;bg:string;icon:React.ElementType}> = {
  draft:     {label:"Draft",    color:"text-muted-foreground",bg:"bg-muted",          icon:FileText},
  submitted: {label:"Submitted",color:"text-chart-2",         bg:"bg-chart-2/10",     icon:Clock},
  in_review: {label:"In Review",color:"text-warning",         bg:"bg-warning/10",     icon:Clock},
  returned:  {label:"Returned", color:"text-chart-4",         bg:"bg-chart-4/10",     icon:RotateCcw},
  approved:  {label:"Approved", color:"text-chart-3",         bg:"bg-chart-3/10",     icon:CheckCircle2},
  rejected:  {label:"Rejected", color:"text-destructive",     bg:"bg-destructive/10", icon:XCircle},
};
const STEP_COLORS: Record<ApprovalStatus,string> = {
  approved:"border-chart-3 bg-chart-3/20",rejected:"border-destructive bg-destructive/20",
  returned:"border-chart-4 bg-chart-4/20",pending:"border-warning bg-warning/20",not_required:"border-border bg-muted",
};

const ATTACHMENT_ICON: Record<string,string> = { quote:"📋", business_case:"📄", contract:"📜", invoice:"🧾", other:"📎" };

export default function ViewRequest() {
  const {id} = useParams<{id:string}>();
  const navigate = useNavigate();
  const {requests, updateRequest, currentUser, doaRules} = usePortalStore();
  const req = requests.find(r=>r.id===id);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [returnOpen, setReturnOpen]   = useState(false);
  const [comment, setComment]         = useState("");

  if (!req) return <div className="p-6 text-center text-muted-foreground"><p>Request not found.</p><Button variant="link" onClick={()=>navigate("/")}>Back</Button></div>;

  const entity   = LEGAL_ENTITIES.find(e=>e.code===req.legalEntity);
  const currency = CURRENCIES.find(c=>c.code===req.currency);
  const cfg      = STATUS_CFG[req.status];
  const StatusIcon = cfg.icon;
  const grandTotal = req.capexTable ? calcGrandTotal(req.capexTable) : req.amount;
  const amtUSD   = toUSD(req.amount, req.currency);
  const doa      = getDoARule(doaRules, amtUSD);
  const pendingStep = req.approvalChain.find(s=>s.status==="pending"&&s.assignedTo?.id===currentUser.id);

  function doAction(action:"approved"|"rejected"|"returned") {
    const newChain = req!.approvalChain.map(s =>
      s.id===pendingStep?.id ? {...s,status:action,comment,timestamp:new Date().toISOString()} : s
    );
    const allRequired = newChain.filter(s=>s.status!=="not_required");
    const allApproved = allRequired.every(s=>s.status==="approved");
    const newStatus: RequestStatus = action==="approved" ? (allApproved?"approved":"in_review") : action==="rejected" ? "rejected" : "returned";
    updateRequest(req!.id,{approvalChain:newChain,status:newStatus,updatedAt:new Date().toISOString()});
    [setApproveOpen,setRejectOpen,setReturnOpen].forEach(fn=>fn(false));
    toast[action==="approved"?"success":action==="rejected"?"error":"info"](
      action==="approved"?(allApproved?"Request fully approved!":"Step approved – next approver notified."):
      action==="rejected"?"Request rejected.":"Request returned for correction."
    );
    navigate("/inbox");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={()=>navigate(-1)} className="-ml-2"><ArrowLeft className="w-4 h-4"/></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{req.referenceNo}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}><StatusIcon className="w-3.5 h-3.5"/>{cfg.label}</span>
              <Badge variant="outline" className="text-xs">{req.bu}</Badge>
              <Badge variant="secondary" className="text-xs">{req.classification}</Badge>
              {req.budgetStatus==="not_approved"&&<span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Budget TBC</span>}
            </div>
            <h1 className="text-xl font-bold mt-1">{req.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{entity?.name} · {req.department} · {req.vendor}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Printer className="w-4 h-4"/>Print / PDF</Button>
          {pendingStep && <>
            <Button variant="outline" size="sm" onClick={()=>setReturnOpen(true)} className="gap-1.5 border-chart-4/40 text-chart-4 hover:bg-chart-4/10"><RotateCcw className="w-4 h-4"/>Return</Button>
            <Button variant="destructive" size="sm" onClick={()=>setRejectOpen(true)} className="gap-1.5"><XCircle className="w-4 h-4"/>Reject</Button>
            <Button size="sm" onClick={()=>setApproveOpen(true)} className="gap-1.5 bg-chart-3 hover:bg-chart-3/90"><CheckCircle2 className="w-4 h-4"/>Approve</Button>
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Request Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  {l:"Cost Centre",v:req.costCentre},{l:"GL Code",v:req.glCode},{l:"Vendor",v:req.vendor},
                  {l:"Required By",v:req.requiredBy},{l:"Dept",v:req.department},{l:"Budget",v:req.budgetStatus},
                  ...(req.capexCategory?[{l:"CAPEX Cat.",v:req.capexCategory}]:[]),
                  ...(req.capexType?[{l:"CAPEX Type",v:req.capexType}]:[]),
                  ...(req.segment?[{l:"Segment",v:req.segment}]:[]),
                  ...(req.cxoFunction?[{l:"CXO",v:req.cxoFunction}]:[]),
                  ...(req.projectNo?[{l:"Project No.",v:req.projectNo}]:[]),
                  ...(req.startDate?[{l:"Start",v:req.startDate}]:[]),
                  ...(req.completionDate?[{l:"Completion",v:req.completionDate}]:[]),
                ].map(f=><div key={f.l} className="bg-muted/40 rounded-lg px-3 py-2"><p className="text-[10px] text-muted-foreground">{f.l}</p><p className="text-sm font-medium mt-0.5">{f.v}</p></div>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Narrative</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                {l:"Executive Summary",v:req.executiveSummary},
                {l:"Justification",v:req.justification},
                ...(req.scopeOfWork?[{l:"Scope of Work",v:req.scopeOfWork}]:[]),
              ].map(f=><div key={f.l}><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{f.l}</p><p className="text-sm leading-relaxed">{f.v}</p></div>)}
            </CardContent>
          </Card>

          {/* CAPEX table */}
          {req.capexTable && calcGrandTotal(req.capexTable)>0 && (
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-sm">CAPEX Expenditure '000 ({req.currency})</CardTitle><Badge variant="outline" className="font-mono text-xs">{req.currency}</Badge></div></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Item</th>
                      {CAPEX_YEARS.map(y=><th key={y} className="text-right py-2 px-2 text-muted-foreground font-medium">{y}</th>)}
                      <th className="text-right py-2 pl-2 text-muted-foreground font-medium">Total</th>
                    </tr></thead>
                    <tbody>
                      {CAPEX_LINE_ITEMS.map((item,i)=>{
                        const rt=calcRowTotal(req.capexTable![item] as Record<number,number>);
                        if(!rt) return null;
                        return <tr key={item} className={`border-b border-border/40 ${i%2===0?"bg-muted/20":""}`}>
                          <td className="py-1.5 pr-3 font-medium">{item}</td>
                          {CAPEX_YEARS.map(y=><td key={y} className="py-1.5 px-2 text-right font-mono">{req.capexTable![item][y]?`${currency?.symbol}${req.capexTable![item][y].toLocaleString("en-US")}`:""}</td>)}
                          <td className="py-1.5 pl-2 text-right font-mono font-semibold">{currency?.symbol}{rt.toLocaleString("en-US")}</td>
                        </tr>;
                      })}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-border bg-muted/40">
                      <td className="py-2 pr-3 font-bold">Total</td>
                      {CAPEX_YEARS.map(y=>{const col=CAPEX_LINE_ITEMS.reduce((s,i)=>s+(req.capexTable![i][y]||0),0);return<td key={y} className="py-2 px-2 text-right font-mono font-semibold">{col?`${currency?.symbol}${col.toLocaleString("en-US")}`:""}</td>;})}
                      <td className="py-2 pl-2 text-right font-mono font-bold text-primary">{currency?.symbol}{grandTotal.toLocaleString("en-US")}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {req.attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Paperclip className="w-4 h-4"/>Supporting Documents ({req.attachments.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {req.attachments.map(att=><div key={att.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-lg">{ATTACHMENT_ICON[att.type]}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{att.name}</p><p className="text-xs text-muted-foreground">{att.type.replace("_"," ")} · {att.size}</p></div>
                    <Button variant="ghost" size="sm" className="text-xs">View</Button>
                  </div>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Amount ({req.currency})</p>
                <p className="text-3xl font-bold font-mono text-primary">{currency?.symbol}{req.amount.toLocaleString("en-US")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">≈ ${amtUSD.toLocaleString("en-US")} USD</p>
              </div>
              <Separator/>
              <div className={`px-3 py-2 rounded-lg bg-muted/40 text-xs ${doa.color}`}>
                <p className="font-semibold">{doa.label}</p>
                <p className="text-muted-foreground mt-0.5">{doa.requiredRoles.join(" → ")}</p>
              </div>
            </CardContent>
          </Card>

          {req.requestedBy && (
            <Card>
              <CardHeader><CardTitle className="text-xs">Requested By</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials(req.requestedBy.displayName)}</AvatarFallback></Avatar>
                  <div><p className="font-semibold text-sm">{req.requestedBy.displayName}</p><p className="text-xs text-muted-foreground">{req.requestedBy.jobTitle}</p><p className="text-xs text-muted-foreground">{req.requestedBy.email}</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          )}

          {/* Approval chain timeline */}
          <Card>
            <CardHeader><CardTitle className="text-xs">Approval Chain</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {req.approvalChain.map((s,i)=>{
                  const isLast = i===req.approvalChain.length-1;
                  const ic = s.status==="approved"?CheckCircle2:s.status==="rejected"?XCircle:s.status==="returned"?RotateCcw:s.status==="not_required"?FileText:Clock;
                  const col = s.status==="approved"?"text-chart-3":s.status==="rejected"?"text-destructive":s.status==="returned"?"text-chart-4":s.status==="not_required"?"text-muted-foreground":"text-warning";
                  return (
                    <div key={s.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${STEP_COLORS[s.status]}`}>{React.createElement(ic,{className:`w-4 h-4 ${col}`})}</div>
                        {!isLast&&<div className={`w-0.5 flex-1 min-h-5 my-1 ${s.status==="approved"?"bg-chart-3/40":"bg-border"}`}/>}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2"><p className="font-semibold text-xs">{s.role}</p><span className={`text-[10px] ${col}`}>{s.status==="not_required"?"N/A":s.status}</span></div>
                        {s.assignedTo&&<div className="flex items-center gap-1.5 mt-0.5"><Avatar className="w-5 h-5"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(s.assignedTo.displayName)}</AvatarFallback></Avatar><span className="text-[10px] text-muted-foreground">{s.assignedTo.displayName}</span></div>}
                        {s.comment&&<div className="mt-1 px-2 py-1 bg-muted/40 rounded text-[10px] text-muted-foreground"><MessageSquare className="w-3 h-3 inline mr-1"/>{s.comment}</div>}
                        {s.timestamp&&<p className="text-[9px] text-muted-foreground mt-0.5">{new Date(s.timestamp).toLocaleString()}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {req.approvalComments&&<div className="mt-2 p-2 bg-muted/40 rounded-lg"><p className="text-[10px] font-semibold text-muted-foreground mb-1">Authority Comments</p><p className="text-xs">{req.approvalComments}</p></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve / Reject / Return dialogs */}
      {[
        {open:approveOpen,setOpen:setApproveOpen,action:"approved" as const,title:"Approve Request",desc:`You are approving "${req.title}" as ${pendingStep?.role}.`,btnLabel:"Approve",btnClass:"bg-chart-3 hover:bg-chart-3/90"},
        {open:rejectOpen, setOpen:setRejectOpen, action:"rejected" as const, title:"Reject Request", desc:`Rejecting "${req.title}" will halt the approval chain.`,btnLabel:"Reject",btnClass:"bg-destructive hover:bg-destructive/90"},
        {open:returnOpen, setOpen:setReturnOpen, action:"returned" as const, title:"Return for Correction",desc:`Return "${req.title}" to the requester for amendments.`,btnLabel:"Return",btnClass:"bg-chart-4 hover:bg-chart-4/90"},
      ].map(d=>(
        <AlertDialog key={d.title} open={d.open} onOpenChange={d.setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{d.title}</AlertDialogTitle><AlertDialogDescription>{d.desc}</AlertDialogDescription></AlertDialogHeader>
            <div className="px-1"><Label>Comment{d.action!=="approved"&&" *"}</Label><Textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Add a comment..." className="mt-1"/></div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={()=>setComment("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={()=>doAction(d.action)} className={d.btnClass}>{d.btnLabel}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
