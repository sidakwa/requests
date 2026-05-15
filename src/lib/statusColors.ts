export const statusColors = {
  approved: {
    bg: '#d1fae5',
    text: '#065f46',
    border: '#10b981',
    light: '#ecfdf5',
    dark: '#059669',
    icon: '✅'
  },
  pending: {
    bg: '#fed7aa',
    text: '#92400e',
    border: '#f59e0b',
    light: '#fffbeb',
    dark: '#d97706',
    icon: '⏳'
  },
  in_review: {
    bg: '#fed7aa',
    text: '#92400e',
    border: '#f59e0b',
    light: '#fffbeb',
    dark: '#d97706',
    icon: '📋'
  },
  returned: {
    bg: '#ffedd5',
    text: '#9a3412',
    border: '#f97316',
    light: '#fff7ed',
    dark: '#ea580c',
    icon: '↩️'
  },
  rejected: {
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#ef4444',
    light: '#fef2f2',
    dark: '#dc2626',
    icon: '❌'
  },
  draft: {
    bg: '#f3f4f6',
    text: '#374151',
    border: '#6b7280',
    light: '#f9fafb',
    dark: '#4b5563',
    icon: '📝'
  },
  submitted: {
    bg: '#dbeafe',
    text: '#1e40af',
    border: '#3b82f6',
    light: '#eff6ff',
    dark: '#2563eb',
    icon: '📤'
  }
}

export const priorityColors = {
  urgent: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  high: { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  medium: { bg: '#fed7aa', text: '#92400e', border: '#f59e0b' },
  low: { bg: '#d1fae5', text: '#065f46', border: '#10b981' }
}

export const businessUnitColors = {
  DI: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
  DS: { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6', gradient: 'from-purple-500 to-purple-600' }
}

export const getStatusColor = (status: string) => {
  return statusColors[status as keyof typeof statusColors] || statusColors.draft
}

export const getPriorityColor = (priority: string) => {
  return priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium
}

export const getBusinessUnitColor = (bu: string) => {
  return businessUnitColors[bu as keyof typeof businessUnitColors] || businessUnitColors.DI
}
