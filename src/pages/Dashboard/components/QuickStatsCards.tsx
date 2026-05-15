interface QuickStatsCardsProps {
  totalRequests: number
  approvedCount: number
  pendingCount: number
  returnedCount: number
  rejectedCount: number
}

export function QuickStatsCards({ totalRequests, approvedCount, pendingCount, returnedCount, rejectedCount }: QuickStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Total - Blue */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="p-4">
          <div className="text-3xl font-bold">{totalRequests}</div>
          <p className="text-sm mt-1" style={{ color: '#bfdbfe' }}>Total Requests</p>
          <div className="mt-2 text-xs" style={{ color: '#93c5fd' }}>All requests</div>
        </div>
      </div>

      {/* Approved - Green */}
      <div style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="p-4">
          <div className="text-3xl font-bold">{approvedCount}</div>
          <p className="text-sm mt-1" style={{ color: '#bbf7d0' }}>Approved</p>
          <div className="mt-2 text-xs" style={{ color: '#86efac' }}>✓ Completed</div>
        </div>
      </div>

      {/* In Review - Amber */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="p-4">
          <div className="text-3xl font-bold">{pendingCount}</div>
          <p className="text-sm mt-1" style={{ color: '#fde68a' }}>In Review</p>
          <div className="mt-2 text-xs" style={{ color: '#fcd34d' }}>⏳ Pending</div>
        </div>
      </div>

      {/* Returned - Orange */}
      <div style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="p-4">
          <div className="text-3xl font-bold">{returnedCount}</div>
          <p className="text-sm mt-1" style={{ color: '#fed7aa' }}>Returned</p>
          <div className="mt-2 text-xs" style={{ color: '#fdba74' }}>↩️ Needs changes</div>
        </div>
      </div>

      {/* Rejected - Red */}
      <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '0.5rem', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div className="p-4">
          <div className="text-3xl font-bold">{rejectedCount}</div>
          <p className="text-sm mt-1" style={{ color: '#fecaca' }}>Rejected</p>
          <div className="mt-2 text-xs" style={{ color: '#fca5a5' }}>❌ Declined</div>
        </div>
      </div>
    </div>
  )
}
