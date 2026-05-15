import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, FileText, RotateCcw, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, CURRENCIES, initials, type RequestStatus } from "@/lib/index";

const STATUS_CFG: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "text-muted-foreground", bg: "bg-muted",          icon: FileText },
  submitted: { label: "Submitted", color: "text-chart-2",          bg: "bg-chart-2/10",     icon: Clock },
  in_review: { label: "In Review", color: "text-warning",          bg: "bg-warning/10",     icon: Clock },
  returned:  { label: "Returned",  color: "text-chart-4",          bg: "bg-chart-4/10",     icon: RotateCcw },
  approved:  { label: "Approved",  color: "text-chart-3",          bg: "bg-chart-3/10",     icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "text-destructive",      bg: "bg-destructive/10", icon: XCircle },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CFG[status]; const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>;
}

export default function MyRequests() {
  const { requests, currentUser } = usePortalStore();
  const navigate = useNavigate();
  const mine = requests.filter(r => r.requestedBy?.id === currentUser.id);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Requests submitted by you · {mine.length} total</p>
      </div>
      {mine.length === 0 && (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">You haven't submitted any requests yet.</p>
        </CardContent></Card>
      )}
      <motion.div initial="hidden" animate="visible"
        variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.06 }} }}
        className="space-y-3">
        {mine.map(req => {
          const entity = LEGAL_ENTITIES.find(e => e.code === req.legalEntity);
          const currency = CURRENCIES.find(c => c.code === req.currency);
          const approvedSteps = req.approvalChain.filter(s => s.status === "approved").length;
          const requiredSteps = req.approvalChain.filter(s => s.status !== "not_required").length;
          const pct = requiredSteps > 0 ? (approvedSteps / requiredSteps) * 100 : 0;
          const pendingStep = req.approvalChain.find(s => s.status === "pending");
          return (
            <motion.div key={req.id}
              variants={{ hidden:{ opacity:0,y:10 }, visible:{ opacity:1,y:0, transition:{ type:"spring",stiffness:280,damping:28 }} }}>
              <Card className="hover:shadow-md cursor-pointer hover:border-primary/30 group transition-all"
                onClick={() => navigate(`/request/${req.id}`)}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{req.referenceNo}</span>
                        <StatusBadge status={req.status} />
                        <Badge variant="secondary" className="text-xs">{req.classification}</Badge>
                        {req.budgetStatus === "not_approved" && (
                          <span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Budget TBC</span>
                        )}
                      </div>
                      <h3 className="font-semibold">{req.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{entity?.name} · {req.vendor}</p>
                      {pendingStep && (
                        <p className="text-xs text-warning mt-1">⏳ Awaiting: <span className="font-medium">{pendingStep.role}</span>{pendingStep.assignedTo ? ` (${pendingStep.assignedTo.displayName})` : ""}</p>
                      )}
                      {req.status === "returned" && (
                        <p className="text-xs text-chart-4 mt-1">↩ Returned for correction – please review and resubmit</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold font-mono">{currency?.symbol}{req.amount.toLocaleString("en-US")}</p>
                      <p className="text-xs text-muted-foreground">{req.currency} · {req.requiredBy}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Approval progress */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {req.approvalChain.filter(s => s.status !== "not_required").map((s, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className={`text-[9px] ${
                              s.status==="approved"?"bg-chart-3/20 text-chart-3":
                              s.status==="rejected"?"bg-destructive/20 text-destructive":
                              s.status==="returned"?"bg-chart-4/20 text-chart-4":
                              "bg-muted text-muted-foreground"}`}>
                              {s.assignedTo ? initials(s.assignedTo.displayName) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          {i < req.approvalChain.filter(s => s.status !== "not_required").length - 1 && (
                            <div className={`w-4 h-0.5 ${s.status==="approved"?"bg-chart-3":"bg-border"}`} />
                          )}
                        </div>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">{approvedSteps}/{requiredSteps}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        req.status==="approved"?"bg-chart-3":req.status==="rejected"?"bg-destructive":"bg-primary"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
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
