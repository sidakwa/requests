import { format } from 'date-fns'

interface PDFSummaryProps {
  stats: any
  requests: any[]
  approvedRequests: any[]
  pendingRequests: any[]
  returnedRequests: any[]
  rejectedRequests: any[]
  capexByBU: { bu: string; amount: number; count: number }[]
  requestsByBU: { bu: string; amount: number; count: number }[]
  dateRange?: { from: Date; to: Date }
}

export function PDFSummary({ 
  stats, 
  requests, 
  approvedRequests, 
  pendingRequests, 
  returnedRequests, 
  rejectedRequests,
  capexByBU,
  requestsByBU,
  dateRange 
}: PDFSummaryProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e40af', fontSize: '28px', marginBottom: '10px' }}>
          SEACOM Funding Portal
        </h1>
        <h2 style={{ color: '#4b5563', fontSize: '18px', marginBottom: '5px' }}>
          Capital & Operating Expenditure Report
        </h2>
        <p style={{ color: '#6b7280', fontSize: '12px' }}>
          Generated: {new Date().toLocaleString()}
        </p>
        {dateRange && (
          <p style={{ color: '#6b7280', fontSize: '12px' }}>
            Period: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Executive Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1e40af', fontSize: '18px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px', marginBottom: '20px' }}>
          Executive Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Requested</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>
              {formatCurrency(stats.totalAmount)}
            </p>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>{stats.totalRequests} requests YTD</p>
          </div>
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>Approved Value</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>
              {formatCurrency(stats.approvedAmount)}
            </p>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>{stats.approvedCount} approved ({stats.approvalRate}%)</p>
          </div>
          <div style={{ backgroundColor: '#fefce8', padding: '15px', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>Pending Value</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ca8a04' }}>
              {formatCurrency(stats.pendingAmount)}
            </p>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>{stats.pendingCount} awaiting decision</p>
          </div>
          <div style={{ backgroundColor: '#f3e8ff', padding: '15px', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>Returned/Rejected</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#9333ea' }}>
              {formatCurrency(stats.returnedAmount + stats.rejectedAmount)}
            </p>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>{stats.returnedCount} returned, {stats.rejectedCount} rejected</p>
          </div>
        </div>
      </div>

      {/* CAPEX by Business Unit */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1e40af', fontSize: '18px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px', marginBottom: '20px' }}>
          CAPEX by Business Unit
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {capexByBU.map((item, idx) => (
            <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af' }}>{item.bu}</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(item.amount)}</p>
              <p style={{ fontSize: '11px', color: '#6b7280' }}>{item.count} requests</p>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Requests */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#16a34a', fontSize: '18px', borderBottom: '2px solid #22c55e', paddingBottom: '8px', marginBottom: '20px' }}>
          ✅ Approved Requests ({approvedRequests.length})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Request #</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Department</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {approvedRequests.slice(0, 15).map((req, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px' }}>{req.request_number}</td>
                <td style={{ padding: '8px' }}>{req.title}</td>
                <td style={{ padding: '8px' }}>{req.department?.name || 'N/A'}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(req.amount)}</td>
                <td style={{ padding: '8px' }}>{new Date(req.created_at).toLocaleDateString()}</td>
               </tr>
            ))}
          </tbody>
        </table>
        {approvedRequests.length > 15 && (
          <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '10px' }}>
            Showing 15 of {approvedRequests.length} approved requests
          </p>
        )}
      </div>

      {/* Pending Requests */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#ca8a04', fontSize: '18px', borderBottom: '2px solid #eab308', paddingBottom: '8px', marginBottom: '20px' }}>
          ⏳ Pending Requests ({pendingRequests.length})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#fefce8', borderBottom: '1px solid #fef08a' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Request #</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Department</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Submitted</th>
             </tr>
          </thead>
          <tbody>
            {pendingRequests.slice(0, 15).map((req, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px' }}>{req.request_number}</td>
                <td style={{ padding: '8px' }}>{req.title}</td>
                <td style={{ padding: '8px' }}>{req.department?.name || 'N/A'}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(req.amount)}</td>
                <td style={{ padding: '8px' }}>{new Date(req.created_at).toLocaleDateString()}</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Requests by Business Unit Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1e40af', fontSize: '18px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px', marginBottom: '20px' }}>
          Summary by Business Unit
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {requestsByBU.map((item, idx) => (
            <div key={idx} style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af' }}>{item.bu}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>Total Requests</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.count}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>Total Value</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(item.amount)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>Average</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(item.amount / item.count)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '10px', color: '#9ca3af' }}>
        <p>SEACOM Funding Portal - Confidential Financial Report</p>
        <p>This report is automatically generated and contains sensitive information. Handle with care.</p>
        <p>For questions, contact the Finance Department at finance@seacom.com</p>
      </div>
    </div>
  )
}
