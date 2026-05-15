// ============================================================
//  SEACOM Funding Request Portal – Central Types, Constants & Helpers
// ============================================================

// --- Legal Entities ---
export interface LegalEntity {
  code: string;
  name: string;
  bu: "DI" | "DS";
}

export const LEGAL_ENTITIES: LegalEntity[] = [
  { code: "SEA_MS001", name: "SEACOM Managed Services DI", bu: "DI" },
  { code: "SEA_MS002", name: "SEACOM Managed Services DS", bu: "DS" },
  { code: "SEA_SA001", name: "SEACOM South Africa DI", bu: "DI" },
  { code: "SEA_SA002", name: "SEACOM South Africa DS", bu: "DS" },
  { code: "SEA_WC001", name: "SEACOM Western Cape DI", bu: "DI" },
  { code: "SEA_WC002", name: "SEACOM Western Cape DS", bu: "DS" },
  { code: "SEAFIB001", name: "FibreCo Digital Infra", bu: "DI" },
  { code: "SEAFIB002", name: "FibreCo DS", bu: "DS" },
  { code: "SEAFRA001", name: "SEACOM France DI", bu: "DI" },
  { code: "SEAFRA002", name: "SEACOM France DS", bu: "DS" },
  { code: "SEAKEN001", name: "SEACOM Kenya DI", bu: "DI" },
  { code: "SEAKEN002", name: "SEACOM Kenya DS", bu: "DS" },
  { code: "SEAKZN001", name: "SEACOM KZN DI", bu: "DI" },
  { code: "SEAKZN002", name: "SEACOM KZN DS", bu: "DS" },
  { code: "SEALTD001", name: "SEACOM LTD DI", bu: "DI" },
  { code: "SEALTD002", name: "SEACOM LTD DS", bu: "DS" },
  { code: "SEAMOZ001", name: "SEACOM Mozambique DI", bu: "DI" },
  { code: "SEAMOZ002", name: "SEACOM Mozambique DS", bu: "DS" },
  { code: "SEATAN001", name: "SEACOM Tanzania DI", bu: "DI" },
  { code: "SEATAN002", name: "SEACOM Tanzania DS", bu: "DS" },
  { code: "SEAUGA001", name: "SEACOM Uganda DI", bu: "DI" },
  { code: "SEAUGA002", name: "SEACOM Uganda DS", bu: "DS" },
];

// --- Currencies ---
export interface Currency { code: string; symbol: string; name: string }
export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",   name: "US Dollar" },
  { code: "ZAR", symbol: "R",   name: "South African Rand" },
  { code: "EUR", symbol: "€",   name: "Euro" },
  { code: "GBP", symbol: "£",   name: "British Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "MZN", symbol: "MT",  name: "Mozambican Metical" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "MUR", symbol: "₨",   name: "Mauritian Rupee" },
];

// --- Approximate USD conversion rates (for DoA evaluation) ---
export const USD_RATES: Record<string, number> = {
  USD: 1, ZAR: 0.054, EUR: 1.08, GBP: 1.27,
  KES: 0.0077, MZN: 0.016, TZS: 0.00039, UGX: 0.00027, MUR: 0.022,
};
export function toUSD(amount: number, currency: string): number {
  return Math.round(amount * (USD_RATES[currency] ?? 1));
}

// --- Departments ---
export const DEPARTMENTS = [
  "Engineering", "Operations", "Sales", "Product", "Finance",
  "Capacity Planning", "Service Delivery", "IT", "Legal", "HR",
] as const;

// --- Classifications ---
export type CapexOpex = "CAPEX" | "OPEX";
export const CAPEX_CATEGORIES = ["Maintenance","Projects","Software","Success Based","Upgrades","Cable System"] as const;
export const CAPEX_TYPES = [
  "Computer Equipment","IP Equipment","Land & Buildings","Transmission Equipment",
  "Operational Support Systems","Business Support Systems","Multi Tenant Buildings","Metro Build",
] as const;
export const SEGMENTS = ["Digital Infrastructure","Digital Services"] as const;
export const CXO_FUNCTIONS = ["CEO","CFO","COO","CCO"] as const;

// --- Capex Table ---
export const CAPEX_LINE_ITEMS = [
  "Materials","Labour","Import Duties","Accommodation",
  "Engineering","Risk Allowance","Planning","Project Management","Support",
] as const;
export type CapexLineItem = typeof CAPEX_LINE_ITEMS[number];
export const CAPEX_YEARS = [2026, 2027, 2028, 2029, 2030] as const;
export type CapexTable = { [item in CapexLineItem]: { [year in (typeof CAPEX_YEARS)[number]]: number } };

export function emptyCapexTable(): CapexTable {
  const t = {} as CapexTable;
  for (const item of CAPEX_LINE_ITEMS) {
    t[item] = {} as CapexTable[typeof item];
    for (const yr of CAPEX_YEARS) t[item][yr] = 0;
  }
  return t;
}
export function calcRowTotal(row: Record<number, number>): number {
  return CAPEX_YEARS.reduce((s, y) => s + (row[y] || 0), 0);
}
export function calcGrandTotal(table: CapexTable): number {
  return CAPEX_LINE_ITEMS.reduce((s, item) => s + calcRowTotal(table[item] as Record<number, number>), 0);
}

// --- DoA Rule (configurable) ---
export interface DoARule {
  id: string;
  label: string;
  minUSD: number;
  maxUSD: number;
  requiredRoles: string[];   // e.g. ["Manager","Department Head","Chief","CFO"]
  color: string;
}

export const DEFAULT_DOA_RULES: DoARule[] = [
  { id: "doa1", label: "Manager Approval",         minUSD: 0,        maxUSD: 50000,   requiredRoles: ["Line Manager"],                                        color: "text-chart-3" },
  { id: "doa2", label: "Department Head Approval",  minUSD: 50001,    maxUSD: 250000,  requiredRoles: ["Line Manager","Department Head"],                       color: "text-chart-2" },
  { id: "doa3", label: "Chief / Executive Approval",minUSD: 250001,   maxUSD: 1000000, requiredRoles: ["Line Manager","Department Head","Chief / Executive"],   color: "text-warning" },
  { id: "doa4", label: "CFO / CEO / Board",         minUSD: 1000001,  maxUSD: Infinity,requiredRoles: ["Line Manager","Department Head","Chief / Executive","Finance Review","CFO / CEO"], color: "text-destructive" },
];

export function getDoARule(rules: DoARule[], amountUSD: number): DoARule {
  return rules.find(r => amountUSD >= r.minUSD && amountUSD <= r.maxUSD) ?? rules[rules.length - 1];
}

// --- Workflow Step ---
export type ApprovalStatus = "pending" | "approved" | "rejected" | "returned" | "not_required";
export interface ApprovalStep {
  id: string;
  role: string;
  assignedTo?: AzureUser;
  status: ApprovalStatus;
  comment?: string;
  timestamp?: string;
  order: number;
}

// --- Attachment ---
export interface Attachment {
  id: string;
  name: string;
  type: "quote" | "business_case" | "contract" | "invoice" | "other";
  size: string;
  uploadedAt: string;
}

// --- Azure AD User ---
export interface AzureUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  managerName?: string;
}

// --- Department Config (admin-maintained) ---
export interface DeptConfig {
  department: string;
  headName: string;
  headUserId: string;
  chiefName: string;
  chiefUserId: string;
}

// --- Delegation ---
export interface Delegation {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegateeId: string;
  delegateeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

// --- Funding Request ---
export type RequestStatus = "draft" | "submitted" | "in_review" | "returned" | "approved" | "rejected";
export type BudgetStatus = "approved" | "not_approved" | "pending";

export interface FundingRequest {
  id: string;
  referenceNo: string;

  // Core fields
  title: string;
  description: string;
  department: string;
  bu: "DI" | "DS";
  legalEntity: string;
  currency: string;
  amount: number;
  costCentre: string;
  glCode: string;
  vendor: string;
  classification: CapexOpex;
  budgetStatus: BudgetStatus;
  requiredBy: string;

  // CIC-specific
  capexCategory?: string;
  capexType?: string;
  segment?: string;
  cxoFunction?: string;
  headOfDepartment?: string;
  projectNo?: string;
  startDate?: string;
  completionDate?: string;
  capexTable?: CapexTable;
  valueOfQuotation?: number;

  // Narrative
  executiveSummary: string;
  justification: string;
  scopeOfWork?: string;
  approvalComments?: string;

  // Attachments
  attachments: Attachment[];

  // Workflow
  requestedBy?: AzureUser;
  approvalChain: ApprovalStep[];
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export function generateRefNo(): string {
  return `FR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// --- Formatting ---
export function fmtCurrency(amount: number, currencyCode: string): string {
  const c = CURRENCIES.find(x => x.code === currencyCode);
  return `${c?.symbol ?? ""}${amount.toLocaleString("en-US")}`;
}
export function fmtUSD(n: number): string { return `$${n.toLocaleString("en-US")}`; }
export function initials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

// --- Routes ---
export const ROUTES = {
  DASHBOARD:   "/",
  MY_REQUESTS: "/my-requests",
  NEW_REQUEST: "/new",
  VIEW:        "/request/:id",
  INBOX:       "/inbox",
  REPORTS:     "/reports",
  ADMIN:       "/admin",
} as const;
