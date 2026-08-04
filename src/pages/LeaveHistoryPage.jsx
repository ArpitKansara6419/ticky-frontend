import React, { useState, useEffect } from 'react';
import {
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiCalendar,
  FiFilter,
  FiFileText,
  FiXCircle,
  FiCheckCircle,
  FiClock,
  FiMinusCircle,
  FiDownload
} from 'react-icons/fi';
import './LeavesPage.css';
import './LeaveHistoryPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeaveHistoryPage = () => {
  const [engineerSummary, setEngineerSummary] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'summary'
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Signed Documents Viewer State
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [activeDocTab, setActiveDocTab] = useState('PL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, leavesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/leaves/engineer-summary`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/leaves`, { credentials: 'include' })
      ]);

      if (sumRes.ok) {
        const data = await sumRes.json();
        setEngineerSummary(data.engineers || []);
      }
      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setAllLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error('Error fetching leave history data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaidAndUnpaidDates = (leave) => {
    let details = [];
    try {
      if (leave.day_wise_details) {
        details = typeof leave.day_wise_details === 'string' ? JSON.parse(leave.day_wise_details) : leave.day_wise_details;
      }
    } catch(e) {}

    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const pCount = parseFloat(leave.paid_days || 0) || (leave.leave_type === 'Paid' ? parseFloat(leave.total_days || 0) : 0);
    const uCount = parseFloat(leave.unpaid_days || 0) || (leave.leave_type === 'Unpaid' ? parseFloat(leave.total_days || 0) : 0);

    let paidDates = [];
    let unpaidDates = [];

    if (Array.isArray(details) && details.length > 0) {
      paidDates = details.filter(d => d.type === 'Paid').map(d => d.date);
      unpaidDates = details.filter(d => d.type === 'Unpaid').map(d => d.date);
    } else {
      let curr = new Date(start);
      let pRem = pCount;
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        if (pRem > 0) {
          paidDates.push(dStr);
          pRem--;
        } else {
          unpaidDates.push(dStr);
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    return { paidDates, unpaidDates };
  };

  const openSignedDocs = (leave) => {
    setActiveDocModal(leave);
    if (parseFloat(leave.paid_days || 0) === 0 && parseFloat(leave.unpaid_days || 0) > 0) {
      setActiveDocTab('UL');
    } else {
      setActiveDocTab('PL');
    }
  };

  // Filter Leave Requests History by Month, Year, Type, Status & Search
  const filteredLeaves = allLeaves.filter(leave => {
    const lDate = new Date(leave.start_date || leave.applied_at);
    const leaveMonth = String(lDate.getMonth() + 1).padStart(2, '0');
    const leaveYear = String(lDate.getFullYear());

    if (selectedYear !== 'ALL' && leaveYear !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && leaveMonth !== selectedMonth) return false;
    if (selectedType !== 'ALL' && leave.leave_type !== selectedType) return false;
    if (selectedStatus !== 'ALL' && leave.status !== selectedStatus) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = leave.engineerName?.toLowerCase().includes(q);
      const matchId = String(leave.engineer_id || leave.id).includes(q);
      const matchReason = leave.reason?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchReason) return false;
    }

    return true;
  });

  // Filter Engineer Summary
  const filteredSummary = engineerSummary.filter(e =>
    !searchQuery ||
    e.engineerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(e.engineerId).includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="lhp-loading">
        <div className="lhp-spinner" />
        <p>Loading Leave History Console...</p>
      </div>
    );
  }

  return (
    <div className="leaves-page-container">
      {/* Header */}
      <header className="leaves-header">
        <div className="header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-title">Engineer Leave History Console</h1>
            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              🇵🇱 Poland Leave Calendar (CET / Warszawa)
            </span>
          </div>
          <p className="page-subtitle">
            Month-wise and Year-wise leave records, distinct paid/unpaid date breakdowns, and balance tracking.
          </p>
        </div>
        <button className="lhp-refresh-btn" onClick={fetchData} title="Refresh Data">
          <FiRefreshCw />
        </button>
      </header>

      {/* Control Bar: Filters & Tabs */}
      <div className="table-card glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* View Mode Tabs */}
          <div className="view-switcher" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: activeTab === 'history' ? '#fff' : 'transparent', color: activeTab === 'history' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              🗓️ Month/Year Leave History ({filteredLeaves.length})
            </button>
            <button
              className={activeTab === 'summary' ? 'active' : ''}
              onClick={() => setActiveTab('summary')}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: activeTab === 'summary' ? '#fff' : 'transparent', color: activeTab === 'summary' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'summary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              📊 Balance Summary ({filteredSummary.length})
            </button>
          </div>

          {/* Month & Year Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>YEAR:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', outline: 'none', background: '#fff', color: '#1e293b' }}
              >
                <option value="ALL">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>MONTH:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', outline: 'none', background: '#fff', color: '#1e293b' }}
              >
                <option value="ALL">All Months</option>
                <option value="01">01 - January</option>
                <option value="02">02 - February</option>
                <option value="03">03 - March</option>
                <option value="04">04 - April</option>
                <option value="05">05 - May</option>
                <option value="06">06 - June</option>
                <option value="07">07 - July</option>
                <option value="08">08 - August</option>
                <option value="09">09 - September</option>
                <option value="10">10 - October</option>
                <option value="11">11 - November</option>
                <option value="12">12 - December</option>
              </select>
            </div>

            {activeTab === 'history' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>TYPE:</span>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', outline: 'none', background: '#fff', color: '#1e293b' }}
                  >
                    <option value="ALL">All Types</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>STATUS:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', outline: 'none', background: '#fff', color: '#1e293b' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </>
            )}

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
              <FiSearch style={{ color: '#94a3b8', fontSize: '14px' }} />
              <input
                type="text"
                placeholder="Search engineer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#475569', width: '150px' }}
              />
            </div>

          </div>
        </div>
      </div>

      {/* VIEW 1: Detailed Leave Log History */}
      {activeTab === 'history' && (
        <div className="table-card glass-card">
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCalendar style={{ color: '#4f46e5', fontSize: '20px' }} />
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>
                Leave History Log {selectedMonth !== 'ALL' ? `(Month: ${selectedMonth}/${selectedYear})` : `(Year: ${selectedYear})`}
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '40px' }}>#</th>
                  <th style={{ minWidth: '150px' }}>Engineer</th>
                  <th style={{ minWidth: '100px' }}>Leave Type</th>
                  <th style={{ minWidth: '160px' }}>Total Leave Range</th>
                  <th style={{ minWidth: '220px' }}>Paid vs Unpaid Distinct Dates</th>
                  <th style={{ minWidth: '90px' }}>Total Days</th>
                  <th style={{ minWidth: '160px' }}>Reason</th>
                  <th style={{ minWidth: '100px' }}>Status</th>
                  <th style={{ minWidth: '100px' }}>Document</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-msg" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No leave history entries match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave, idx) => {
                    const { paidDates, unpaidDates } = getPaidAndUnpaidDates(leave);
                    return (
                      <tr key={leave.id}>
                        <td style={{ color: '#94a3b8', fontWeight: '600' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{leave.engineerName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>ID: #AIM-E-{leave.engineer_id}</div>
                        </td>
                        <td>
                          <span className={`badge ${leave.leave_type}`}>{leave.leave_type}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '600', color: '#334155' }}>
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                            {paidDates.length > 0 && (
                              <div style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                🌴 <strong>Paid Dates ({paidDates.length}):</strong> {paidDates.map(d => formatDate(d)).join(', ')}
                              </div>
                            )}
                            {unpaidDates.length > 0 && (
                              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                💼 <strong>Unpaid Dates ({unpaidDates.length}):</strong> {unpaidDates.map(d => formatDate(d)).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a' }}>{leave.total_days} Days</td>
                        <td style={{ fontSize: '13px', color: '#475569', maxWidth: '200px' }}>{leave.reason || '—'}</td>
                        <td>
                          <span className={`status-pill ${leave.status?.toLowerCase()}`}>{leave.status}</span>
                        </td>
                        <td>
                          <button className="btn-view-doc-small" onClick={() => openSignedDocs(leave)}>
                            <FiFileText /> View Doc
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Engineer Leave Balance Summary */}
      {activeTab === 'summary' && (
        <div className="table-card glass-card">
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers style={{ color: '#6366f1', fontSize: '20px' }} />
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>
              Engineer Leave Balance Summary
            </span>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '50px' }}>#</th>
                  <th style={{ minWidth: '80px' }}>Eng. ID</th>
                  <th style={{ minWidth: '160px' }}>Engineer Name</th>
                  <th style={{ minWidth: '120px' }}>Joining Date</th>
                  <th style={{ minWidth: '130px' }}>Allocated Annual Leaves</th>
                  <th style={{ minWidth: '150px' }}>Accumulated Leaves (This Year)</th>
                  <th style={{ minWidth: '170px' }}>Till Date Accumulated Leaves</th>
                  <th style={{ minWidth: '140px' }}>Total Paid Leaves Used</th>
                  <th style={{ minWidth: '150px' }}>Total Unpaid Leaves Used</th>
                  <th style={{ minWidth: '110px' }}>Balance Leave</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummary.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-msg">No engineer records found.</td>
                  </tr>
                ) : (
                  filteredSummary.map((eng, idx) => (
                    <tr key={eng.engineerId}>
                      <td style={{ color: '#94a3b8', fontWeight: '600', fontSize: '13px' }}>{idx + 1}</td>
                      <td>
                        <span style={{ background: '#f1f5f9', color: '#6366f1', fontWeight: '700', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                          #{eng.engineerId}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="lhp-avatar">{(eng.engineerName || 'U').charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{eng.engineerName || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>{formatDate(eng.joiningDate)}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#1e293b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                          {parseFloat(eng.allocatedAnnualLeaves || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#8b5cf6', background: '#ede9fe', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                          {parseFloat(eng.accumulatedLeavesThisYear || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                          {parseFloat(eng.tillDateAccumulatedLeaves || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '13px' }}>
                          {parseFloat(eng.totalPaidLeavesUsed || 0).toFixed(1)} d
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#64748b', fontWeight: '700', fontSize: '13px' }}>
                          {parseFloat(eng.totalUnpaidLeavesUsed || 0).toFixed(1)} d
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: '800', fontSize: '14px',
                          color: parseFloat(eng.balanceLeave || 0) > 0 ? '#10b981' : '#ef4444',
                          background: parseFloat(eng.balanceLeave || 0) > 0 ? '#dcfce7' : '#fee2e2',
                          padding: '4px 10px', borderRadius: '8px',
                        }}>
                          {parseFloat(eng.balanceLeave || 0).toFixed(1)} d
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signed Documents Viewer Modal */}
      {activeDocModal && (
        <div className="modal-backdrop">
          <div className="leave-modal glass-card doc-viewer-modal">
            <header className="modal-header">
              <h2>Signed Leave Documents (Poland Labour Code)</h2>
              <button className="close-btn" onClick={() => setActiveDocModal(null)}><FiXCircle /></button>
            </header>
            
            <div className="doc-tabs">
              {(parseFloat(activeDocModal.paid_days || 0) > 0 || activeDocModal.leave_type === 'Paid' || activeDocModal.leave_type === 'Mixed') && (
                <button className={`doc-tab-btn ${activeDocTab === 'PL' ? 'active' : ''}`} onClick={() => setActiveDocTab('PL')}>
                  Paid Leave Document (PL)
                </button>
              )}
              {(parseFloat(activeDocModal.unpaid_days || 0) > 0 || activeDocModal.leave_type === 'Unpaid' || activeDocModal.leave_type === 'Mixed') && (
                <button className={`doc-tab-btn ${activeDocTab === 'UL' ? 'active' : ''}`} onClick={() => setActiveDocTab('UL')}>
                  Unpaid Leave Document (UL)
                </button>
              )}
            </div>

            <div className="iframe-container" style={{ flex: 1, minHeight: '450px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', margin: '15px 0' }}>
              <iframe 
                src={`${API_BASE_URL}/leaves/${activeDocModal.id}/documents/${activeDocTab.toLowerCase()}`}
                title="Signed Document"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '15px' }}>
              <button 
                className="print-btn" 
                onClick={() => window.open(`${API_BASE_URL}/leaves/${activeDocModal.id}/documents/${activeDocTab.toLowerCase()}`, '_blank')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#003366', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <FiDownload /> Open Full Page / Print
              </button>
              <button 
                className="close-btn-footer" 
                onClick={() => setActiveDocModal(null)}
                style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveHistoryPage;
