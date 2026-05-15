import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Clock, Building2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalStore } from "@/hooks/useCICStore";
import { LEGAL_ENTITIES, CURRENCIES, initials } from "@/lib/index";

export default function ApprovalsInbox() {
  const { requests, currentUser } = usePortalStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("pending");

  // Requests where I have an active approval step
  const myApprovals = requests.filter(r =>
    r.approvalChain.some(s => s.assignedTo?.id === currentUser.id)
  );

  const pending  = myApprovals.filter(r => r.approvalChain.some(s => s.assignedTo?.id === currentUser.id && s.status === "pending"));
  const done     = myApprovals.filter(r => r.approvalChain.some(s => s.assignedTo?.id === currentUser.id && (s.status === "approved" || s.status === "rejected" || s.status === "returned")));
  const showing  = filter === "pending" ? pending : done;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Approvals Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Requests assigned to you for review · {pending.length} pending
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending ({pending.length})</SelectItem>
            <SelectItem value="done">Actioned ({done.length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showing.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-chart-3 opacity-50" />
            <p className="text-muted-foreground text-sm">
              {filter === "pending" ? "All caught up! No pending approvals." : "No actioned items yet."}
            </p>
          </CardContent>
        </Card>
      )}

      <motion.div initial="hidden" animate="visible"
        variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.06 }} }}
        className="space-y-3">
        {showing.map(req => {
          const myStep = req.approvalChain.find(s => s.assignedTo?.id === currentUser.id);
          const entity = LEGAL_ENTITIES.find(e => e.code === req.legalEntity);
          const currency = CURRENCIES.find(c => c.code === req.currency);
          const approvedBefore = req.approvalChain.filter(s => s.order < (myStep?.order ?? 99) && s.status === "approved").length;
          const totalBefore = req.approvalChain.filter(s => s.order < (myStep?.order ?? 99) && s.status !== "not_required").length;

          return (
            <motion.div key={req.id}
              variants={{ hidden:{ opacity:0,y:10 }, visible:{ opacity:1,y:0, transition:{ type:"spring",stiffness:280,damping:28 }} }}>
              <Card className={`hover:shadow-md cursor-pointer transition-all group ${
                myStep?.status === "pending" ? "border-warning/40 hover:border-warning/60" : ""
              }`} onClick={() => navigate(`/request/${req.id}`)}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{req.referenceNo}</span>
                        <Badge variant="outline" className="text-xs">{req.bu}</Badge>
                        <Badge variant="secondary" className="text-xs">{req.classification}</Badge>
                        {/* My role badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          myStep?.status === "pending"   ? "bg-warning/15 text-warning" :
                          myStep?.status === "approved"  ? "bg-chart-3/15 text-chart-3" :
                          myStep?.status === "rejected"  ? "bg-destructive/15 text-destructive" :
                          "bg-chart-4/15 text-chart-4"}`}>
                          {myStep?.role} ·{" "}
                          {myStep?.status === "pending" ? "⏳ Action required" :
                           myStep?.status === "approved" ? "✓ Approved" :
                           myStep?.status === "rejected" ? "✗ Rejected" : "↩ Returned"}
                        </span>
                        {req.budgetStatus === "not_approved" && (
                          <span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Budget TBC</span>
                        )}
                      </div>
                      <h3 className="font-semibold">{req.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{entity?.name}</span>
                        <span>{req.department}</span>
                        <span>By: {req.requestedBy?.displayName}</span>
                        <span>Required: {req.requiredBy}</span>
                      </div>
                      {totalBefore > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {approvedBefore}/{totalBefore} prior steps approved
                        </p>
                      )}
                      {myStep?.comment && (
                        <p className="text-xs mt-1 italic text-muted-foreground">"{myStep.comment}"</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold font-mono">{currency?.symbol}{req.amount.toLocaleString("en-US")}</p>
                      <p className="text-xs text-muted-foreground">{req.currency}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {myStep?.status === "pending" && (
                        <>
                          <Button size="sm" className="bg-chart-3 hover:bg-chart-3/90 gap-1.5 w-28"
                            onClick={e => { e.stopPropagation(); navigate(`/request/${req.id}`); }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Review
                          </Button>
                        </>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
