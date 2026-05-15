import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, PlusCircle, Settings, Menu, X, ChevronRight,
  Bell, FileText, CheckCircle2, Clock, AlertCircle, Inbox,
  BarChart3, ListFilter, Building2, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { usePortalStore } from "@/hooks/useCICStore";
import { MOCK_USERS } from "@/data/index";
import { ROUTES, initials } from "@/lib/index";

const NAV_MAIN = [
  { label: "Dashboard",       icon: LayoutDashboard, to: ROUTES.DASHBOARD },
  { label: "My Requests",     icon: ListFilter,      to: ROUTES.MY_REQUESTS },
  { label: "Approvals Inbox", icon: Inbox,           to: ROUTES.INBOX, badge: true },
  { label: "New Request",     icon: PlusCircle,      to: ROUTES.NEW_REQUEST },
  { label: "Reports",         icon: BarChart3,       to: ROUTES.REPORTS },
];
const NAV_ADMIN = [
  { label: "Admin / Settings", icon: ShieldCheck, to: ROUTES.ADMIN },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, currentUser, setCurrentUser, requests } = usePortalStore();

  const pendingForMe = requests.filter(r =>
    r.approvalChain.some(s => s.status === "pending" && s.assignedTo?.id === currentUser.id)
  ).length;

  function NavItem({ label, icon: Icon, to, badge }: { label: string; icon: React.ElementType; to: string; badge?: boolean }) {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
          ${active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && pendingForMe > 0 && (
          <Badge className="bg-destructive text-destructive-foreground text-[10px] h-5 px-1.5 ml-auto">{pendingForMe}</Badge>
        )}
      </Link>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }} animate={{ width: 256, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            className="flex flex-col border-r border-border bg-sidebar overflow-hidden shrink-0"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold text-sidebar-foreground text-sm leading-none">SEACOM</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Funding Portal</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_MAIN.map(item => <NavItem key={item.to} {...item} />)}
              <div className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</p>
              </div>
              {NAV_ADMIN.map(item => <NavItem key={item.to} {...item} />)}
            </nav>

            {/* Status legend */}
            <div className="px-5 py-3 border-t border-sidebar-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Key</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "Approved",   icon: CheckCircle2, color: "text-chart-3" },
                  { label: "In Review",  icon: Clock,        color: "text-warning" },
                  { label: "Returned",   icon: AlertCircle,  color: "text-chart-2" },
                  { label: "Rejected",   icon: X,            color: "text-destructive" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User switcher */}
            <div className="px-3 pb-3 pt-2 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(currentUser.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs font-medium text-sidebar-foreground truncate">{currentUser.displayName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{currentUser.jobTitle}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-60">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Switch User (Demo)</div>
                  <DropdownMenuSeparator />
                  {MOCK_USERS.map(u => (
                    <DropdownMenuItem key={u.id} onClick={() => setCurrentUser(u)} className="gap-2">
                      <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px] bg-primary/20 text-primary">{initials(u.displayName)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{u.displayName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.jobTitle}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-background shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="shrink-0">
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Azure AD · seacom.com</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.NEW_REQUEST)} className="hidden sm:flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> New Request
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            {pendingForMe > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />}
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }} className="h-full">
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
