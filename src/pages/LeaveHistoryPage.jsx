import React, { useState, useEffect } from 'react';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiSearch,
  FiRefreshCw,
  FiCalendar,
  FiFilter,
  FiDownload,
  FiUsers,
} from 'react-icons/fi';
import './LeavesPage.css';
import './LeaveHistoryPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeaveHistoryPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [engineerSummary, setEngineerSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [summarySearch, setSummarySearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [activeDocTab, setActiveDocTab] = useState('PL');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/leaves`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/leaves/engineer-summary`, { credentials: 'include' }),
      ]);
      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data.leaves || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setEngineerSummary(data.engineers || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const openSignedDocs = (leave) => {
    setActiveDocModal(leave);
    if (parseFloat(leave.paid_days || 0) === 0 && parseFloat(leave.unpaid_days || 0) > 0) {
      setActiveDocTab('UL');
    } else {
      setActiveDocTab('PL');
    }
  };

  // Filter leaves
  const filteredLeaves = leaves.filter((l) => {
    const yearMatch = selectedYear === 'all' || (l.start_date && l.start_date.startsWith(selectedYear));
    const searchMatch =
      !searchQuery ||
      (l.engineerName && l.engineerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.leave_type && l.leave_type.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!yearMatch || !searchMatch) return false;

    switch (activeTab) {
      case 'pending': return l.status === 'Pending';
      case 'paid': return l.status === 'Approved' && l.leave_type === 'Paid';
      case 'unpaid': return l.status === 'Approved' && l.leave_type === 'Unpaid';
      case 'mixed': return l.status === 'Approved' && l.leave_type === 'Mixed';
      case 'declined': return l.status === 'Declined';
      default: return true;
    }
  });

  // Filter engineer summary
  const filteredSummary = engineerSummary.filter((e) =>
    !summarySearch ||
    e.engineerName?.toLowerCase().includes(summarySearch.toLowerCase()) ||
    String(e.engineerId).includes(summarySearch)
  );

  const counts = {
    all: leaves.length,
    pending: leaves.filter((l) => l.status === 'Pending').length,
    paid: leaves.filter((l) => l.status === 'Approved' && l.leave_type === 'Paid').length,
    unpaid: leaves.filter((l) => l.status === 'Approved' && l.leave_type === 'Unpaid').length,
    mixed: leaves.filter((l) => l.status === 'Approved' && l.leave_type === 'Mixed').length,
    declined: leaves.filter((l) => l.status === 'Declined').length,
  };

  const TABS = [
    { id: 'all', label: 'All Requests', icon: FiFileText, color: '#6366f1' },
    { id: 'pending', label: 'Pending', icon: FiClock, color: '#f59e0b' },
    { id: 'paid', label: 'Paid Leave', icon: FiCheckCircle, color: '#10b981' },
    { id: 'unpaid', label: 'Unpaid Leave', icon: FiXCircle, color: '#64748b' },
    { id: 'mixed', label: 'Mixed Leave', icon: FiCalendar, color: '#8b5cf6' },
    { id: 'declined', label: 'Declined', icon: FiXCircle, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="lhp-loading">
        <div className="lhp-spinner" />
        <p>Loading Leave History...</p>
      </div>
    );
  }

  return (
    <div className="leaves-page-container">
      {/* Header */}
      <header className="leaves-header">
        <div className="header-text">
          <h1 className="page-title">Engineer Leave History</h1>
          <p className="page-subtitle">
            View and track all engineers' pending, paid, and unpaid leave requests.
          </p>
        </div>
        <button className="lhp-refresh-btn" onClick={fetchAll} title="Refresh">
          <FiRefreshCw />
        </button>
      </header>

      {/* ─── SECTION 1: Engineer Leave Balance Summary ─── */}
      <div className="table-card glass-card" style={{ marginBottom: '28px' }}>
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers style={{ color: '#6366f1', fontSize: '20px' }} />
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>
              Engineer Leave Balance Summary
            </span>
            <span style={{
              background: '#ede9fe', color: '#6366f1', borderRadius: '20px',
              padding: '2px 10px', fontSize: '12px', fontWeight: '600',
            }}>
              {filteredSummary.length} Engineers
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
            <FiSearch style={{ color: '#94a3b8', fontSize: '14px' }} />
            <input
              type="text"
              placeholder="Search engineer..."
              value={summarySearch}
              onChange={(e) => setSummarySearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#475569', width: '160px' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ minWidth: '60px' }}>#</th>
                <th style={{ minWidth: '80px' }}>Eng. ID</th>
                <th style={{ minWidth: '160px' }}>Engineer Name</th>
                <th style={{ minWidth: '120px' }}>Joining Date</th>
                <th style={{ minWidth: '120px' }}>Allocated Annual Leaves</th>
                <th style={{ minWidth: '140px' }}>Accumulated Leaves (This Year)</th>
                <th style={{ minWidth: '160px' }}>Till Date Accumulated Leaves</th>
                <th style={{ minWidth: '130px' }}>Total Paid Leaves Used</th>
                <th style={{ minWidth: '140px' }}>Total Unpaid Leaves Used</th>
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
                      <span style={{
                        background: '#f1f5f9', color: '#6366f1', fontWeight: '700',
                        fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                      }}>
                        #{eng.engineerId}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="lhp-avatar">
                          {(eng.engineerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                          {eng.engineerName || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>
                      {formatDate(eng.joiningDate)}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: '700', color: '#1e293b', background: '#f1f5f9',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '13px',
                      }}>
                        {parseFloat(eng.allocatedAnnualLeaves || 0).toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: '700', color: '#8b5cf6', background: '#ede9fe',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '13px',
                      }}>
                        {parseFloat(eng.accumulatedLeavesThisYear || 0).toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: '700', color: '#0369a1', background: '#e0f2fe',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '13px',
                      }}>
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

      {/* ─── SECTION 2: All Leave Requests ─── */}

      {/* Summary Stat Cards */}
      <div className="lhp-stats-row">
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <FiClock style={{ color: '#f59e0b', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#f59e0b' }}>{counts.pending}</div>
            <div className="lhp-stat-label">Pending</div>
          </div>
        </div>
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #10b981' }}>
          <FiCheckCircle style={{ color: '#10b981', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#10b981' }}>{counts.paid}</div>
            <div className="lhp-stat-label">Approved Paid</div>
          </div>
        </div>
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #64748b' }}>
          <FiXCircle style={{ color: '#64748b', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#64748b' }}>{counts.unpaid}</div>
            <div className="lhp-stat-label">Approved Unpaid</div>
          </div>
        </div>
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <FiCalendar style={{ color: '#8b5cf6', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#8b5cf6' }}>{counts.mixed}</div>
            <div className="lhp-stat-label">Mixed</div>
          </div>
        </div>
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #ef4444' }}>
          <FiXCircle style={{ color: '#ef4444', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#ef4444' }}>{counts.declined}</div>
            <div className="lhp-stat-label">Declined</div>
          </div>
        </div>
        <div className="lhp-stat-card" style={{ borderTop: '3px solid #6366f1' }}>
          <FiFileText style={{ color: '#6366f1', fontSize: '22px' }} />
          <div>
            <div className="lhp-stat-num" style={{ color: '#6366f1' }}>{counts.all}</div>
            <div className="lhp-stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="lhp-filters">
        <div className="lhp-search-wrap">
          <FiSearch className="lhp-search-icon" />
          <input
            type="text"
            className="lhp-search-input"
            placeholder="Search by engineer name or leave type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="lhp-year-wrap">
          <FiFilter style={{ color: '#94a3b8', fontSize: '14px' }} />
          <select
            className="lhp-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="lhp-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`lhp-tab-btn ${isActive ? 'lhp-tab-btn--active' : ''}`}
              style={isActive ? { borderBottomColor: tab.color, color: tab.color } : {}}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
              <span
                className="lhp-tab-count"
                style={isActive ? { background: tab.color, color: 'white' } : {}}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leave Requests Table */}
      <div className="table-card glass-card" style={{ marginTop: '0', borderRadius: '0 16px 16px 16px' }}>
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Engineer</th>
                <th>Leave Type</th>
                <th>Date Range</th>
                <th>Total Days</th>
                <th>Paid Days</th>
                <th>Unpaid Days</th>
                <th>Status</th>
                <th>Applied On</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-msg">
                    No leave records found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave, idx) => (
                  <tr key={leave.id}>
                    <td style={{ color: '#94a3b8', fontWeight: '600', fontSize: '13px' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="lhp-avatar">
                          {(leave.engineerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                            {leave.engineerName || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${leave.leave_type}`}>{leave.leave_type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                        {formatDate(leave.start_date)}
                        <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>
                        {formatDate(leave.end_date)}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: '700', color: '#1e293b', background: '#f1f5f9',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '13px',
                      }}>
                        {leave.total_days || 0}d
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: '600', fontSize: '13px' }}>
                        {leave.paid_days || 0}d
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
                        {leave.unpaid_days || 0}d
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${leave.status?.toLowerCase()}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatDate(leave.applied_at)}
                    </td>
                    <td>
                      <button
                        className="btn-view-doc-small"
                        onClick={() => openSignedDocs(leave)}
                      >
                        <FiDownload size={12} /> Docs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLeaves.length > 0 && (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: '13px', color: '#94a3b8', fontWeight: '500',
          }}>
            <span>
              Showing <strong style={{ color: '#475569' }}>{filteredLeaves.length}</strong> of{' '}
              <strong style={{ color: '#475569' }}>{leaves.length}</strong> records
            </span>
            <span>
              Total Days:{' '}
              <strong style={{ color: '#6366f1' }}>
                {filteredLeaves.reduce((sum, l) => sum + parseFloat(l.total_days || 0), 0).toFixed(1)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Signed Documents Modal */}
      {activeDocModal && (
        <div className="modal-backdrop">
          <div className="leave-modal glass-card doc-viewer-modal">
            <header className="modal-header">
              <h2>Signed Leave Documents</h2>
              <button className="close-btn" onClick={() => setActiveDocModal(null)}>
                <FiXCircle />
              </button>
            </header>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Engineer: <strong>{activeDocModal.engineerName}</strong> &nbsp;|&nbsp;{' '}
              {formatDate(activeDocModal.start_date)} – {formatDate(activeDocModal.end_date)}
            </p>

            <div className="doc-tabs">
              {parseFloat(activeDocModal.paid_days || 0) > 0 && (
                <button
                  className={`doc-tab-btn ${activeDocTab === 'PL' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('PL')}
                >
                  Paid Leave Document
                </button>
              )}
              {parseFloat(activeDocModal.unpaid_days || 0) > 0 && (
                <button
                  className={`doc-tab-btn ${activeDocTab === 'UL' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('UL')}
                >
                  Unpaid Leave Document
                </button>
              )}
            </div>

            <div style={{
              flex: 1, minHeight: '450px', border: '1px solid #e2e8f0',
              borderRadius: '8px', overflow: 'hidden', margin: '15px 0',
            }}>
              <iframe
                src={`${API_BASE_URL}/leaves/${activeDocModal.id}/documents/${activeDocTab.toLowerCase()}`}
                title="Signed Document"
                style={{ width: '100%', height: '100%', border: 'none', minHeight: '450px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '15px' }}>
              <button
                className="apply-leave-btn"
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/leaves/${activeDocModal.id}/documents/${activeDocTab.toLowerCase()}`,
                    '_blank'
                  )
                }
              >
                <FiDownload /> Open Full Page / Print
              </button>
              <button
                onClick={() => setActiveDocModal(null)}
                style={{
                  padding: '10px 16px', backgroundColor: '#f1f5f9',
                  color: '#475569', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: 'bold',
                }}
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
