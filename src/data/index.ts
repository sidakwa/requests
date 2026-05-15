// ============================================================
//  Mock data – users, dept configs, DoA rules, requests
// ============================================================
import type {
  AzureUser, FundingRequest, DeptConfig, Delegation, DoARule, CapexTable
} from "@/lib/index";
import { DEFAULT_DOA_RULES, emptyCapexTable } from "@/lib/index";

// ── Azure AD users ──────────────────────────────────────────
export const MOCK_USERS: AzureUser[] = [
  { id: "u1",  displayName: "Sipho Dlamini",    email: "sipho.dlamini@seacom.com",    jobTitle: "Network Engineer",        department: "Engineering",  managerName: "Priya Naidoo" },
  { id: "u2",  displayName: "Priya Naidoo",     email: "priya.naidoo@seacom.com",     jobTitle: "Head of Engineering",     department: "Engineering",  managerName: "James Okonkwo" },
  { id: "u3",  displayName: "James Okonkwo",    email: "james.okonkwo@seacom.com",    jobTitle: "CFO",                     department: "Finance",      managerName: "Sarah Mensah" },
  { id: "u4",  displayName: "Sarah Mensah",     email: "sarah.mensah@seacom.com",     jobTitle: "Chief Operating Officer", department: "Operations",   managerName: "David Kruger" },
  { id: "u5",  displayName: "David Kruger",     email: "david.kruger@seacom.com",     jobTitle: "Managing Director",       department: "Executive",    managerName: "" },
  { id: "u6",  displayName: "Amara Diallo",     email: "amara.diallo@seacom.com",     jobTitle: "Sales Manager",           department: "Sales",        managerName: "James Okonkwo" },
  { id: "u7",  displayName: "Fatima Hassan",    email: "fatima.hassan@seacom.com",    jobTitle: "Finance Executive",       department: "Finance",      managerName: "James Okonkwo" },
  { id: "u8",  displayName: "Kwame Asante",     email: "kwame.asante@seacom.com",     jobTitle: "IT Manager",              department: "IT",           managerName: "Sarah Mensah" },
  { id: "u9",  displayName: "Lerato Modise",    email: "lerato.modise@seacom.com",    jobTitle: "Product Manager",         department: "Product",      managerName: "Sarah Mensah" },
  { id: "u10", displayName: "Chukwu Eze",       email: "chukwu.eze@seacom.com",       jobTitle: "Infrastructure Lead",     department: "Engineering",  managerName: "Priya Naidoo" },
  { id: "u11", displayName: "Aisha Kamara",     email: "aisha.kamara@seacom.com",     jobTitle: "Operations Analyst",      department: "Operations",   managerName: "Sarah Mensah" },
  { id: "u12", displayName: "Tendai Moyo",      email: "tendai.moyo@seacom.com",      jobTitle: "Finance Manager",         department: "Finance",      managerName: "James Okonkwo" },
];

export function searchUsers(q: string): AzureUser[] {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  return MOCK_USERS.filter(u =>
    u.displayName.toLowerCase().includes(lq) ||
    u.email.toLowerCase().includes(lq) ||
    u.jobTitle.toLowerCase().includes(lq) ||
    u.department.toLowerCase().includes(lq)
  );
}

// ── Department Config (admin-maintained mapping) ────────────
export const DEPT_CONFIGS: DeptConfig[] = [
  { department: "Engineering",  headName: "Priya Naidoo",  headUserId: "u2",  chiefName: "Sarah Mensah",  chiefUserId: "u4" },
  { department: "Operations",   headName: "Sarah Mensah",  headUserId: "u4",  chiefName: "David Kruger",  chiefUserId: "u5" },
  { department: "Finance",      headName: "James Okonkwo", headUserId: "u3",  chiefName: "David Kruger",  chiefUserId: "u5" },
  { department: "Sales",        headName: "Amara Diallo",  headUserId: "u6",  chiefName: "Sarah Mensah",  chiefUserId: "u4" },
  { department: "Product",      headName: "Lerato Modise", headUserId: "u9",  chiefName: "Sarah Mensah",  chiefUserId: "u4" },
  { department: "IT",           headName: "Kwame Asante",  headUserId: "u8",  chiefName: "Sarah Mensah",  chiefUserId: "u4" },
];

export function getDeptConfig(dept: string): DeptConfig | undefined {
  return DEPT_CONFIGS.find(d => d.department === dept);
}

// ── DoA rules (starts with defaults – admin can edit) ───────
export let ACTIVE_DOA_RULES: DoARule[] = [...DEFAULT_DOA_RULES];
export function setDoARules(rules: DoARule[]) { ACTIVE_DOA_RULES = rules; }

// ── Delegations ─────────────────────────────────────────────
export const MOCK_DELEGATIONS: Delegation[] = [
  {
    id: "del1", delegatorId: "u2", delegatorName: "Priya Naidoo",
    delegateeId: "u10", delegateeName: "Chukwu Eze",
    fromDate: "2026-05-01", toDate: "2026-05-31",
    reason: "Annual leave",
  },
];

// ── Helper: build approval chain from dept config ───────────
export function buildApprovalChain(
  requiredRoles: string[],
  dept: string,
  requesterId: string
): import("@/lib/index").ApprovalStep[] {
  const cfg = getDeptConfig(dept);
  const steps: import("@/lib/index").ApprovalStep[] = [];
  let order = 1;

  const roleToUser: Record<string, AzureUser | undefined> = {
    "Line Manager":       MOCK_USERS.find(u => u.id !== requesterId && u.department === dept && u.jobTitle.toLowerCase().includes("head")) ?? cfg ? MOCK_USERS.find(u => u.id === cfg?.headUserId) : undefined,
    "Department Head":    cfg ? MOCK_USERS.find(u => u.id === cfg.headUserId) : undefined,
    "Chief / Executive":  cfg ? MOCK_USERS.find(u => u.id === cfg.chiefUserId) : undefined,
    "Finance Review":     MOCK_USERS.find(u => u.id === "u7"),
    "CFO / CEO":          MOCK_USERS.find(u => u.id === "u3"),
  };

  const allRoles = ["Line Manager","Department Head","Chief / Executive","Finance Review","CFO / CEO"];
  for (const role of allRoles) {
    const required = requiredRoles.includes(role);
    steps.push({
      id: `step-${order}`,
      role,
      assignedTo: required ? roleToUser[role] : undefined,
      status: required ? "pending" : "not_required",
      order: order++,
    });
  }
  return steps;
}

// ── Capex table helper ───────────────────────────────────────
function makeTable(materials: number): CapexTable {
  const t = emptyCapexTable();
  t["Materials"][2026] = materials;
  t["Engineering"][2026] = Math.round(materials * 0.05);
  t["Project Management"][2026] = Math.round(materials * 0.03);
  t["Risk Allowance"][2026] = Math.round(materials * 0.02);
  return t;
}

// ── Mock funding requests ────────────────────────────────────
export const MOCK_REQUESTS: FundingRequest[] = [
  {
    id: "fr-001", referenceNo: "FR-2026-ABC01",
    title: "Fibre Backbone Upgrade – KZN",
    description: "Upgrade of the fibre backbone infrastructure across KwaZulu-Natal.",
    department: "Engineering", bu: "DI", legalEntity: "SEAKZN001",
    currency: "ZAR", amount: 3674724,
    costCentre: "CC-ENG-001", glCode: "GL-4200", vendor: "Huawei Technologies SA",
    classification: "CAPEX", budgetStatus: "approved", requiredBy: "2026-12-31",
    capexCategory: "Upgrades", capexType: "Transmission Equipment",
    segment: "Digital Infrastructure", cxoFunction: "COO",
    headOfDepartment: "Priya Naidoo", projectNo: "PRJ-2026-001",
    startDate: "2026-03-01", completionDate: "2026-12-31",
    capexTable: makeTable(3340658), valueOfQuotation: 3340658,
    executiveSummary: "Upgrade of legacy DWDM equipment to 400G coherent technology across 240km.",
    justification: "Current infrastructure is at 87% capacity. Without upgrade, service degradation expected by Q3 2026.",
    scopeOfWork: "Replace 240km of legacy DWDM equipment with next-gen 400G coherent technology.",
    approvalComments: "",
    attachments: [
      { id: "a1", name: "Huawei_Quote_KZN.pdf",   type: "quote",         size: "2.4 MB", uploadedAt: "2026-02-08" },
      { id: "a2", name: "Business_Case_KZN.docx", type: "business_case", size: "1.1 MB", uploadedAt: "2026-02-08" },
    ],
    requestedBy: MOCK_USERS[0],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "approved",  comment: "Approved – critical infrastructure.", timestamp: "2026-02-10T09:22:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "approved",  comment: "Budget confirmed.",                  timestamp: "2026-02-11T14:05:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "pending",                                                                                      order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "pending",                                                                                      order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "pending",                                                                                      order: 5 },
    ],
    status: "in_review", createdAt: "2026-02-08T08:00:00Z", updatedAt: "2026-02-11T14:05:00Z",
  },
  {
    id: "fr-002", referenceNo: "FR-2026-DEF02",
    title: "Kenya Data Centre Expansion",
    description: "Expansion of Nairobi DC to support cloud services growth.",
    department: "Engineering", bu: "DS", legalEntity: "SEAKEN002",
    currency: "USD", amount: 825000,
    costCentre: "CC-ENG-003", glCode: "GL-4201", vendor: "Vertiv Group",
    classification: "CAPEX", budgetStatus: "approved", requiredBy: "2027-03-31",
    executiveSummary: "Expansion of Nairobi DC to support cloud services growth.",
    justification: "Customer demand for cloud services in East Africa up 140% YoY.",
    scopeOfWork: "Add 200kW of white space, new cooling units, and 10Gbps uplink.",
    attachments: [
      { id: "a3", name: "Vertiv_Quote_Nairobi.pdf", type: "quote", size: "3.1 MB", uploadedAt: "2026-02-03" },
    ],
    requestedBy: MOCK_USERS[5],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "approved", comment: "Approved.", timestamp: "2026-02-05T10:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "approved", comment: "Go ahead.",  timestamp: "2026-02-06T09:00:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "pending",                         order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "pending",                         order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "pending",                         order: 5 },
    ],
    status: "in_review", createdAt: "2026-02-03T09:00:00Z", updatedAt: "2026-02-06T09:00:00Z",
  },
  {
    id: "fr-003", referenceNo: "FR-2026-GHI03",
    title: "SEACOM France IP Refresh",
    description: "Scheduled refresh of IP routing equipment in France PoP.",
    department: "Engineering", bu: "DI", legalEntity: "SEAFRA001",
    currency: "EUR", amount: 198000,
    costCentre: "CC-ENG-005", glCode: "GL-4200", vendor: "Cisco Systems",
    classification: "CAPEX", budgetStatus: "approved", requiredBy: "2026-09-30",
    executiveSummary: "Scheduled refresh of Cisco IP routing equipment in France PoP.",
    justification: "Equipment reaching EoL per Cisco lifecycle roadmap.",
    scopeOfWork: "Replace 6x Cisco ASR9000 series routers.",
    attachments: [
      { id: "a4", name: "Cisco_EoL_Notice.pdf",    type: "business_case", size: "850 KB", uploadedAt: "2026-01-15" },
      { id: "a5", name: "Cisco_France_Quote.pdf",  type: "quote",         size: "1.2 MB", uploadedAt: "2026-01-15" },
    ],
    requestedBy: MOCK_USERS[9],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "approved",      comment: "Approved.",       timestamp: "2026-01-20T11:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "approved",      comment: "Within budget.",  timestamp: "2026-01-21T09:00:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "approved",      comment: "Proceed.",        timestamp: "2026-01-22T10:00:00Z", order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "approved",      comment: "Finance OK.",     timestamp: "2026-01-23T09:00:00Z", order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "not_required",                                                                order: 5 },
    ],
    status: "approved", createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-01-23T09:00:00Z",
  },
  {
    id: "fr-004", referenceNo: "FR-2026-JKL04",
    title: "Tanzania OSS Platform Upgrade",
    description: "Upgrade OSS platform to Netcracker v12 in Tanzania operations.",
    department: "IT", bu: "DS", legalEntity: "SEATAN002",
    currency: "USD", amount: 38000,
    costCentre: "CC-IT-002", glCode: "GL-5100", vendor: "Netcracker Technology",
    classification: "CAPEX", budgetStatus: "pending", requiredBy: "2026-12-31",
    executiveSummary: "Upgrade OSS to Netcracker v12.",
    justification: "Legacy system no longer supported; increasing OPEX for maintenance.",
    scopeOfWork: "Netcracker license, implementation, data migration and training.",
    attachments: [],
    requestedBy: MOCK_USERS[7],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "pending",      order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "not_required", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "not_required", order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "not_required", order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "not_required", order: 5 },
    ],
    status: "submitted", createdAt: "2026-05-13T14:00:00Z", updatedAt: "2026-05-13T14:00:00Z",
  },
  {
    id: "fr-005", referenceNo: "FR-2026-MNO05",
    title: "Uganda Metro Build Phase 2",
    description: "Extend metro fibre ring in Kampala to serve 12 new enterprise customers.",
    department: "Engineering", bu: "DI", legalEntity: "SEAUGA001",
    currency: "USD", amount: 1450000,
    costCentre: "CC-ENG-007", glCode: "GL-4205", vendor: "CommScope Inc",
    classification: "CAPEX", budgetStatus: "approved", requiredBy: "2027-06-30",
    executiveSummary: "Extend metro ring infrastructure in Kampala for enterprise growth.",
    justification: "Pipeline of 12 enterprise deals worth $2.8M ARR blocked pending network build.",
    scopeOfWork: "Deploy 85km of metro fibre, 4 PoPs, and associated civil works.",
    attachments: [
      { id: "a6", name: "CommScope_Quote.pdf",   type: "quote",         size: "4.2 MB", uploadedAt: "2026-04-01" },
      { id: "a7", name: "Uganda_Business_Case.pdf", type: "business_case", size: "2.8 MB", uploadedAt: "2026-04-01" },
      { id: "a8", name: "Civil_Contract_Draft.pdf", type: "contract",    size: "1.5 MB", uploadedAt: "2026-04-02" },
    ],
    requestedBy: MOCK_USERS[0],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "approved", comment: "Approved.", timestamp: "2026-04-10T09:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "approved", comment: "Priority project.", timestamp: "2026-04-11T10:00:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "returned", comment: "Please provide civil contractor risk assessment.", timestamp: "2026-04-15T14:00:00Z", order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "pending",  order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "pending",  order: 5 },
    ],
    status: "returned", createdAt: "2026-04-08T08:00:00Z", updatedAt: "2026-04-15T14:00:00Z",
  },
  {
    id: "fr-006", referenceNo: "FR-2026-PQR06",
    title: "WC Office Lease Renewal – Cape Town",
    description: "Annual OPEX renewal of Cape Town office lease.",
    department: "Operations", bu: "DS", legalEntity: "SEA_WC002",
    currency: "ZAR", amount: 1200000,
    costCentre: "CC-OPS-001", glCode: "GL-6100", vendor: "Growthpoint Properties",
    classification: "OPEX", budgetStatus: "approved", requiredBy: "2026-07-01",
    executiveSummary: "Annual lease renewal for Cape Town HQ office space.",
    justification: "Lease expires 30 June 2026. 180-day notice required.",
    attachments: [
      { id: "a9", name: "Lease_Renewal_Offer.pdf", type: "contract", size: "620 KB", uploadedAt: "2026-01-05" },
    ],
    requestedBy: MOCK_USERS[10],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[3], status: "approved",     comment: "Approved.", timestamp: "2026-01-10T10:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[3], status: "approved",     comment: "Proceed.",  timestamp: "2026-01-11T09:00:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "approved",     comment: "OK.",       timestamp: "2026-01-12T11:00:00Z", order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "approved",     comment: "Budgeted.", timestamp: "2026-01-13T09:00:00Z", order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "approved",     comment: "Signed off.", timestamp: "2026-01-14T10:00:00Z", order: 5 },
    ],
    status: "approved", createdAt: "2026-01-05T09:00:00Z", updatedAt: "2026-01-14T10:00:00Z",
  },
  {
    id: "fr-007", referenceNo: "FR-2026-STU07",
    title: "Mozambique Subsea Cable Maintenance",
    description: "Emergency maintenance of subsea cable landing station in Maputo.",
    department: "Engineering", bu: "DI", legalEntity: "SEAMOZ001",
    currency: "USD", amount: 95000,
    costCentre: "CC-ENG-009", glCode: "GL-4200", vendor: "SubCom LLC",
    classification: "CAPEX", budgetStatus: "not_approved", requiredBy: "2026-08-31",
    executiveSummary: "Emergency repair of Maputo cable landing station terminal equipment.",
    justification: "Station experiencing signal degradation affecting 3 enterprise customers. SLA breach risk.",
    attachments: [],
    requestedBy: MOCK_USERS[1],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[1], status: "approved", comment: "Urgent – proceed.", timestamp: "2026-05-10T08:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "approved", comment: "Approved.", timestamp: "2026-05-10T10:00:00Z", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "pending",  order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "not_required", order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "not_required", order: 5 },
    ],
    status: "in_review", createdAt: "2026-05-09T07:00:00Z", updatedAt: "2026-05-10T10:00:00Z",
  },
  {
    id: "fr-008", referenceNo: "FR-2026-VWX08",
    title: "Managed Services Software Licences",
    description: "Annual renewal of MS software licence stack for managed services platform.",
    department: "IT", bu: "DS", legalEntity: "SEA_MS002",
    currency: "USD", amount: 22500,
    costCentre: "CC-IT-001", glCode: "GL-5200", vendor: "Microsoft",
    classification: "OPEX", budgetStatus: "approved", requiredBy: "2026-06-30",
    executiveSummary: "Annual MS software licence renewal for managed services operations.",
    justification: "Licences expire 30 June 2026. Required to maintain platform operations.",
    attachments: [
      { id: "a10", name: "MS_Renewal_Invoice.pdf", type: "invoice", size: "280 KB", uploadedAt: "2026-05-01" },
    ],
    requestedBy: MOCK_USERS[7],
    approvalChain: [
      { id: "s1", role: "Line Manager",      assignedTo: MOCK_USERS[7], status: "approved", comment: "Pre-approved per budget.", timestamp: "2026-05-02T09:00:00Z", order: 1 },
      { id: "s2", role: "Department Head",   assignedTo: MOCK_USERS[1], status: "not_required", order: 2 },
      { id: "s3", role: "Chief / Executive", assignedTo: MOCK_USERS[3], status: "not_required", order: 3 },
      { id: "s4", role: "Finance Review",    assignedTo: MOCK_USERS[6], status: "not_required", order: 4 },
      { id: "s5", role: "CFO / CEO",         assignedTo: MOCK_USERS[2], status: "not_required", order: 5 },
    ],
    status: "approved", createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-05-02T09:00:00Z",
  },
];

// ── DeptConfig type re-export ────────────────────────────────
export type { DeptConfig } from "@/lib/index";
