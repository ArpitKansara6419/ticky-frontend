import React, { useState, useEffect } from 'react';
import {
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiDownload,
  FiXCircle,
} from 'react-icons/fi';
import './LeavesPage.css';
import './LeaveHistoryPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeaveHistoryPage = () => {
  const [engineerSummary, setEngineerSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summarySearch, setSummarySearch] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/engineer-summary`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEngineerSummary(data.engineers || []);
      }
    } catch (err) {
      console.error('Error fetching engineer summary:', err);
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

  const filteredSummary = engineerSummary.filter((e) =>
    !summarySearch ||
    e.engineerName?.toLowerCase().includes(summarySearch.toLowerCase()) ||
    String(e.engineerId).includes(summarySearch)
  );

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
            View and track all engineers' leave balance and usage summary.
          </p>
        </div>
        <button className="lhp-refresh-btn" onClick={fetchSummary} title="Refresh">
          <FiRefreshCw />
        </button>
      </header>

      {/* Engineer Leave Balance Summary Table */}
      <div className="table-card glass-card">
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
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '6px 12px',
          }}>
            <FiSearch style={{ color: '#94a3b8', fontSize: '14px' }} />
            <input
              type="text"
              placeholder="Search engineer..."
              value={summarySearch}
              onChange={(e) => setSummarySearch(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: '13px', color: '#475569', width: '160px',
              }}
            />
          </div>
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
                    <td style={{ color: '#94a3b8', fontWeight: '600', fontSize: '13px' }}>
                      {idx + 1}
                    </td>
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

        {/* Table Footer */}
        {filteredSummary.length > 0 && (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: '13px', color: '#94a3b8', fontWeight: '500',
          }}>
            <span>
              Showing <strong style={{ color: '#475569' }}>{filteredSummary.length}</strong> of{' '}
              <strong style={{ color: '#475569' }}>{engineerSummary.length}</strong> engineers
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistoryPage;
