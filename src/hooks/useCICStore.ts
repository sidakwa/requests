import { create } from "zustand";
import type { FundingRequest, AzureUser, DoARule, DeptConfig } from "@/lib/index";
import { DEFAULT_DOA_RULES } from "@/lib/index";
import { MOCK_REQUESTS, MOCK_USERS, DEPT_CONFIGS } from "@/data/index";

interface PortalStore {
  currentUser: AzureUser;
  setCurrentUser: (u: AzureUser) => void;
  requests: FundingRequest[];
  addRequest: (r: FundingRequest) => void;
  updateRequest: (id: string, updates: Partial<FundingRequest>) => void;
  doaRules: DoARule[];
  setDoaRules: (rules: DoARule[]) => void;
  deptConfigs: DeptConfig[];
  setDeptConfigs: (configs: DeptConfig[]) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const usePortalStore = create<PortalStore>((set) => ({
  currentUser: MOCK_USERS[3], // Sarah Mensah – Chief, has pending approvals
  setCurrentUser: (u) => set({ currentUser: u }),
  requests: MOCK_REQUESTS,
  addRequest: (r) => set((s) => ({ requests: [r, ...s.requests] })),
  updateRequest: (id, updates) =>
    set((s) => ({
      requests: s.requests.map((r) => r.id === id ? { ...r, ...updates } : r),
    })),
  doaRules: DEFAULT_DOA_RULES,
  setDoaRules: (rules) => set({ doaRules: rules }),
  deptConfigs: DEPT_CONFIGS,
  setDeptConfigs: (configs) => set({ deptConfigs: configs }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
