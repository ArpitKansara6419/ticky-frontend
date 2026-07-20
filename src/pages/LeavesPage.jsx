import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiCalendar, 
  FiFileText, 
  FiUser, 
  FiInfo,
  FiChevronRight,
  FiDownload
} from 'react-icons/fi';
import './LeavesPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, declined: 0 });
  const [engineerBalance, setEngineerBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  
  // Apply Leave Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Paid',
    reason: '',
    totalDays: 0,
    paidDays: 0,
    unpaidDays: 0,
    documentSigned: false
  });

  // Signed Documents Viewer State
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [activeDocTab, setActiveDocTab] = useState('PL');

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole'); // Assuming role is stored
    const storedUserId = localStorage.getItem('userId');
    
    setUserEmail(email);
    setUserId(storedUserId);
    
    const isUserAdmin = role ? (role === 'Admin') : true;
    setIsAdmin(isUserAdmin);
    
    fetchData(email, storedUserId, isUserAdmin);
  }, []);

  const fetchData = async (email, uId, adminStatus) => {
    setLoading(true);
    try {
      if (adminStatus) {
        // Admin View
        const [leavesRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/leaves`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/leaves/stats`, { credentials: 'include' })
        ]);
        
        if (leavesRes.ok) {
          const data = await leavesRes.json();
          setLeaves(data.leaves || []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } else {
        // Engineer View
        const res = await fetch(`${API_BASE_URL}/leaves/engineer/${uId || 0}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setLeaves(data.leaves || []);
          setEngineerBalance(data.balance);
          
          // Calculate stats from leaves
          const s = (data.leaves || []).reduce((acc, curr) => {
            acc.total++;
            if (curr.status === 'Pending') acc.pending++;
            else if (curr.status === 'Approved') acc.approved++;
            else if (curr.status === 'Declined') acc.declined++;
            return acc;
          }, { total: 0, pending: 0, approved: 0, declined: 0 });
          setStats(s);
        }
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          engineer_id: userId,
          start_date: formData.startDate,
          end_date: formData.endDate,
          leave_type: formData.leaveType,
          reason: formData.reason,
          total_days: formData.totalDays,
          paid_days: formData.paidDays,
          unpaid_days: formData.unpaidDays,
          document_signed: formData.documentSigned
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData(userEmail, userId, isAdmin);
        alert('Leave application submitted successfully!');
      } else {
        const error = await res.json();
        alert('Failed to submit leave: ' + error.message);
      }
    } catch (err) {
      alert('Error submitting leave application');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this leave request?`)) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, approved_by: localStorage.getItem('userId') })
      });

      if (res.ok) {
        fetchData(userEmail, userId, isAdmin);
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
    }
  };

  const openSignedDocs = (leave) => {
    setActiveDocModal(leave);
    if (parseFloat(leave.paid_days || 0) === 0 && parseFloat(leave.unpaid_days || 0) > 0) {
      setActiveDocTab('UL');
    } else {
      setActiveDocTab('PL');
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const onDateChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const days = calculateDays(updated.startDate, updated.endDate);
    updated.totalDays = days;
    if (updated.leaveType === 'Paid') {
      updated.paidDays = days;
      updated.unpaidDays = 0;
    } else if (updated.leaveType === 'Unpaid') {
      updated.unpaidDays = days;
      updated.paidDays = 0;
    }
    setFormData(updated);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="loading-container">Loading Leave Module...</div>;

  return (
    <div className="leaves-page-container">
      <header className="leaves-header">
        <div className="header-text">
          <h1 className="page-title">{isAdmin ? "Workforce Leave Requests" : "Personal Leave Registry"}</h1>
          <p className="page-subtitle">{isAdmin ? "Review, approve, and audit workforce leave requests." : "Track, apply, and manage your leave requests."}</p>
        </div>
        {!isAdmin && (
          <button className="apply-leave-btn" onClick={() => setIsModalOpen(true)}>
            <FiPlus /> Apply for Leave
          </button>
        )}
      </header>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{stats.pending || 0}</span>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Approved</span>
            <span className="stat-value">{stats.approved || 0}</span>
          </div>
        </div>
        <div className="stat-card declined">
          <div className="stat-icon"><FiXCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Declined</span>
            <span className="stat-value">{stats.declined || 0}</span>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon"><FiFileText /></div>
          <div className="stat-info">
            <span className="stat-label">Total Applied</span>
            <span className="stat-value">{stats.total || 0}</span>
          </div>
        </div>
      </div>

      {/* Engineer Balance Section */}
      {!isAdmin && engineerBalance && (
        <div className="balance-section glass-card">
          <h2 className="section-title"><FiInfo /> Leave Balance Summary</h2>
          <div className="balance-grid">
            <div className="balance-item">
              <span className="balance-label">Allocated (Annual)</span>
              <span className="balance-value">{engineerBalance.allocated_annual_leaves} Days</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">Opening Balance</span>
              <span className="balance-value">{engineerBalance.opening_balance} Days</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">Carry Forward</span>
              <span className="balance-value">{engineerBalance.carry_forward_balance} Days</span>
            </div>
            <div className="balance-item remaining">
              <span className="balance-label">Total Remaining</span>
              <span className="balance-value highlight">
                {(parseFloat(engineerBalance.allocated_annual_leaves) + parseFloat(engineerBalance.opening_balance) + parseFloat(engineerBalance.carry_forward_balance) - (leaves.filter(l => l.status === 'Approved' && l.leave_type === 'Paid').reduce((sum, l) => sum + parseFloat(l.paid_days), 0))).toFixed(2)} Days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tables */}
      <div className="leaves-content">
        {isAdmin ? (
          <div className="admin-view">
            <div className="table-card glass-card">
              <h2 className="section-title">Pending Leave Requests</h2>
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Engineer</th>
                      <th>Type</th>
                      <th>Range</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => l.status === 'Pending').length > 0 ? (
                      leaves.filter(l => l.status === 'Pending').map(leave => (
                        <tr key={leave.id}>
                          <td><strong>{leave.engineerName}</strong></td>
                          <td><span className={`badge ${leave.leave_type}`}>{leave.leave_type}</span></td>
                          <td>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</td>
                          <td>{leave.total_days}</td>
                          <td className="reason-cell">{leave.reason || '-'}</td>
                          <td className="action-btns">
                            <button className="btn-view-doc" onClick={() => openSignedDocs(leave)}>
                              <FiFileText /> View Docs
                            </button>
                            <button className="btn-approve" onClick={() => handleUpdateStatus(leave.id, 'Approved')}>Approve</button>
                            <button className="btn-decline" onClick={() => handleUpdateStatus(leave.id, 'Declined')}>Decline</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="empty-msg">No pending requests found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card glass-card section-spacer">
              <h2 className="section-title">Leave History (All Engineers)</h2>
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Engineer</th>
                      <th>Type</th>
                      <th>Range</th>
                      <th>Days Breakdown</th>
                      <th>Status</th>
                      <th>Applied At</th>
                      <th>Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => l.status !== 'Pending').map(leave => {
                      const pDays = parseFloat(leave.paid_days || 0) || (leave.leave_type === 'Paid' ? parseFloat(leave.total_days || 0) : 0);
                      const uDays = parseFloat(leave.unpaid_days || 0) || (leave.leave_type === 'Unpaid' ? parseFloat(leave.total_days || 0) : 0);
                      return (
                        <tr key={leave.id}>
                          <td>{leave.engineerName}</td>
                          <td><span className={`badge ${leave.leave_type}`}>{leave.leave_type}</span></td>
                          <td>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {pDays > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 'bold' }}>🌴 {pDays} Paid</span>}
                              {uDays > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 'bold' }}>💼 {uDays} Unpaid</span>}
                              {pDays === 0 && uDays === 0 && <span>{leave.total_days} Days</span>}
                            </div>
                          </td>
                          <td><span className={`status-pill ${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                          <td>{formatDate(leave.applied_at)}</td>
                          <td>
                            <button className="btn-view-doc-small" onClick={() => openSignedDocs(leave)}>
                              <FiFileText /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="engineer-view">
            <div className="table-card glass-card">
              <h2 className="section-title">Upcoming / Past Leaves</h2>
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Range</th>
                      <th>Type</th>
                      <th>Days (P/U)</th>
                      <th>Status</th>
                      <th>Applied At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length > 0 ? (
                      leaves.map(leave => (
                        <tr key={leave.id}>
                          <td>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</td>
                          <td><span className={`badge ${leave.leave_type}`}>{leave.leave_type}</span></td>
                          <td>{leave.total_days} ({leave.paid_days}/{leave.unpaid_days})</td>
                          <td><span className={`status-pill ${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                          <td>{formatDate(leave.applied_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="empty-msg">You haven't applied for any leaves yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="leave-modal glass-card">
            <header className="modal-header">
              <h2>Apply for Leave</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><FiXCircle /></button>
            </header>
            <form onSubmit={handleApplyLeave} className="leave-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.startDate} 
                    onChange={(e) => onDateChange('startDate', e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.endDate} 
                    onChange={(e) => onDateChange('endDate', e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Leave Type</label>
                <select 
                  value={formData.leaveType} 
                  onChange={(e) => onDateChange('leaveType', e.target.value)}
                >
                  <option value="Paid">Paid Leave (PL)</option>
                  <option value="Unpaid">Unpaid Leave (UL)</option>
                  <option value="Mixed">Mixed (Paid + Unpaid)</option>
                </select>
              </div>

              {formData.leaveType === 'Mixed' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Paid Days</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.paidDays} 
                      onChange={(e) => setFormData({...formData, paidDays: e.target.value, unpaidDays: formData.total_days - e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Unpaid Days</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.unpaidDays} 
                      readOnly 
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea 
                  rows="3" 
                  placeholder="Please provide a valid reason..." 
                  value={formData.reason} 
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required={formData.leaveType !== 'Paid'}
                />
              </div>

              <div className="document-signed-check">
                <input 
                  type="checkbox" 
                  id="doc-signed" 
                  checked={formData.documentSigned} 
                  onChange={(e) => setFormData({...formData, documentSigned: e.target.checked})} 
                />
                <label htmlFor="doc-signed">I have reviewed and signed the leave documents.</label>
              </div>

              <div className="modal-actions">
                <div className="summary-info">
                  Total Days: <strong>{formData.totalDays}</strong>
                </div>
                <button type="submit" className="submit-btn">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signed Documents Viewer Modal */}
      {activeDocModal && (
        <div className="modal-backdrop">
          <div className="leave-modal glass-card doc-viewer-modal">
            <header className="modal-header">
              <h2>Signed Leave Documents</h2>
              <button className="close-btn" onClick={() => setActiveDocModal(null)}><FiXCircle /></button>
            </header>
            
            {/* Summary & Date Breakdown Header */}
            {(() => {
              const pDays = parseFloat(activeDocModal.paid_days || 0) || (activeDocModal.leave_type === 'Paid' ? parseFloat(activeDocModal.total_days || 0) : 0);
              const uDays = parseFloat(activeDocModal.unpaid_days || 0) || (activeDocModal.leave_type === 'Unpaid' ? parseFloat(activeDocModal.total_days || 0) : 0);
              
              let details = [];
              try {
                if (activeDocModal.day_wise_details) {
                  details = typeof activeDocModal.day_wise_details === 'string' ? JSON.parse(activeDocModal.day_wise_details) : activeDocModal.day_wise_details;
                }
              } catch(e) {}

              const paidDates = Array.isArray(details) ? details.filter(d => d.type === 'Paid').map(d => d.date) : [];
              const unpaidDates = Array.isArray(details) ? details.filter(d => d.type === 'Unpaid').map(d => d.date) : [];

              return (
                <div className="doc-summary-card" style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', margin: '15px 0 10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Engineer: </span>
                      <span style={{ color: '#0f172a' }}>{activeDocModal.engineerName}</span>
                      <span style={{ margin: '0 8px', color: '#94a3b8' }}>|</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Type: </span>
                      <span className={`badge ${activeDocModal.leave_type}`}>{activeDocModal.leave_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {pDays > 0 && <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: 'bold', fontSize: '13px' }}>🌴 Paid Leave: {pDays} Days</span>}
                      {uDays > 0 && <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', fontSize: '13px' }}>💼 Unpaid Leave: {uDays} Days</span>}
                    </div>
                  </div>

                  {(paidDates.length > 0 || unpaidDates.length > 0) && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '13px', color: '#475569' }}>
                      {paidDates.length > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong style={{ color: '#15803d' }}>Paid Leave Dates: </strong>
                          {paidDates.map(d => formatDate(d)).join(', ')}
                        </div>
                      )}
                      {unpaidDates.length > 0 && (
                        <div>
                          <strong style={{ color: '#b91c1c' }}>Unpaid Leave Dates: </strong>
                          {unpaidDates.map(d => formatDate(d)).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="doc-tabs">
              {(parseFloat(activeDocModal.paid_days || 0) > 0 || activeDocModal.leave_type === 'Paid' || activeDocModal.leave_type === 'Mixed') && (
                <button 
                  className={`doc-tab-btn ${activeDocTab === 'PL' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('PL')}
                >
                  Paid Leave Document (PL)
                </button>
              )}
              {(parseFloat(activeDocModal.unpaid_days || 0) > 0 || activeDocModal.leave_type === 'Unpaid' || activeDocModal.leave_type === 'Mixed') && (
                <button 
                  className={`doc-tab-btn ${activeDocTab === 'UL' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('UL')}
                >
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

export default LeavesPage;
