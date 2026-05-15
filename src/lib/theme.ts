export const colors = {
  // Primary brand colors
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  // Status colors
  status: {
    approved: '#10b981',
    approvedBg: '#d1fae5',
    approvedText: '#065f46',
    pending: '#f59e0b',
    pendingBg: '#fed7aa',
    pendingText: '#92400e',
    in_review: '#f59e0b',
    in_reviewBg: '#fed7aa',
    in_reviewText: '#92400e',
    returned: '#f97316',
    returnedBg: '#ffedd5',
    returnedText: '#9a3412',
    rejected: '#ef4444',
    rejectedBg: '#fee2e2',
    rejectedText: '#991b1b',
    draft: '#6b7280',
    draftBg: '#f3f4f6',
    draftText: '#374151',
  },
  // Priority colors
  priority: {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#10b981',
  },
  // Chart colors
  chart: {
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1',
    teal: '#14b8a6',
    orange: '#f97316',
    cyan: '#06b6d4',
  },
  // Business units
  businessUnit: {
    DI: '#3b82f6',
    DI_Bg: '#dbeafe',
    DS: '#8b5cf6',
    DS_Bg: '#ede9fe',
  }
}

export const statusConfig = {
  approved: { bg: colors.status.approvedBg, text: colors.status.approvedText, border: colors.status.approved },
  pending: { bg: colors.status.pendingBg, text: colors.status.pendingText, border: colors.status.pending },
  in_review: { bg: colors.status.in_reviewBg, text: colors.status.in_reviewText, border: colors.status.in_review },
  returned: { bg: colors.status.returnedBg, text: colors.status.returnedText, border: colors.status.returned },
  rejected: { bg: colors.status.rejectedBg, text: colors.status.rejectedText, border: colors.status.rejected },
  draft: { bg: colors.status.draftBg, text: colors.status.draftText, border: colors.status.draft },
}
