import { getStatusColor } from '@/lib/statusColors'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export function StatusBadge({ status, className = '', showIcon = true }: StatusBadgeProps) {
  const colors = getStatusColor(status)
  const displayStatus = status === 'in_review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)
  
  return (
    <Badge 
      className={`border-0 ${className}`}
      style={{ 
        backgroundColor: colors.bg, 
        color: colors.text,
        fontWeight: 500
      }}
    >
      {showIcon && <span className="mr-1">{colors.icon}</span>}
      {displayStatus}
    </Badge>
  )
}
