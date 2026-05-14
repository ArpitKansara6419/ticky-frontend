import { useEffect, useState } from 'react'
import { FiCheck, FiX, FiAlertCircle, FiClock, FiUser, FiTag, FiFileText, FiRotateCcw, FiInbox, FiBriefcase, FiGlobe, FiChevronRight, FiShield, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import './ApprovalsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const ApprovalsPage = ({ onViewTicket }) => {
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    const fetchApprovals = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/approvals`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setPending(data.pending || []);
                setHistory(data.history || []);
            } else {
                setError('Failed to load approval requests.');
            }
        } catch (err) {
            console.error(err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const handleAction = async (id, action, ticketId) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/approvals/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ approvalId: id, action, ticketId })
            });
            if (res.ok) {
                fetchApprovals();
            } else {
                const data = await res.json();
                alert(data.message || `Failed to ${action} request.`);
            }
        } catch (err) {
            console.error(err);
            alert('Error processing request.');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (ds) => {
        if (!ds) return '-';
        return new Date(ds).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderPending = () => {
        if (loading) return (
            <div className="approvals-fetching">
                <div className="fetching-spinner"></div>
                <p>Curating pending requests...</p>
            </div>
        );

        if (pending.length === 0) return (
            <div className="approvals-empty">
                <div className="empty-icon-wrapper">
                    <FiShield />
                </div>
                <h3>All Clear!</h3>
                <p>There are no pending approval requests at the moment.</p>
            </div>
        );

        return (
            <div className="approvals-list">
                {pending.map((item) => (
                    <div key={item.id} className="approval-card clickable" onClick={() => onViewTicket?.(item.ticket_id)}>
                        <header className="approval-card-header">
                            <span className={`type-badge type-${item.request_type.toLowerCase().replace(' ', '-')}`}>
                                {item.request_type}
                            </span>
                            <span className="approval-date">
                                <FiClock /> {formatDate(item.created_at)}
                            </span>
                        </header>
                        <div className="approval-card-content">
                            <div className="content-main">
                                <h4 className="task-title">
                                    <span className="ticket-id">#{item.ticket_id}</span>
                                    {item.task_name || 'Service Task'}
                                </h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <FiUser className="icon-subtle" />
                                        <strong>Eng:</strong> {item.engineer_name}
                                    </div>
                                    <div className="info-item">
                                        <FiGlobe className="icon-subtle" />
                                        <strong>Loc:</strong> {item.city}, {item.country}
                                    </div>
                                </div>

                                {item.request_type === 'Early Closure' && (
                                    <div className="date-highlight-section">
                                        <div className="date-item">
                                            <label>Original End</label>
                                            <span className="date-val original">{formatDate(item.original_date)}</span>
                                        </div>
                                        <FiChevronRight className="date-arrow" />
                                        <div className="date-item">
                                            <label>Requested End</label>
                                            <span className="date-val proposed">{formatDate(item.new_date)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="reason-section">
                                    <label>Justification</label>
                                    <p>{item.reason || 'No justification provided.'}</p>
                                </div>
                            </div>
                            <div className="approval-actions" onClick={e => e.stopPropagation()}>
                                <button
                                    className="btn-action btn-approve"
                                    disabled={processingId === item.id}
                                    onClick={() => handleAction(item.id, 'Approved', item.ticket_id)}
                                >
                                    <FiCheckCircle /> {processingId === item.id ? '...' : 'Approve'}
                                </button>
                                <button
                                    className="btn-action btn-reject"
                                    disabled={processingId === item.id}
                                    onClick={() => handleAction(item.id, 'Rejected', item.ticket_id)}
                                >
                                    <FiXCircle /> {processingId === item.id ? '...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderHistory = () => {
        if (loading) return (
            <div className="approvals-fetching">
                <div className="fetching-spinner"></div>
                <p>Retrieving history...</p>
            </div>
        );

        if (history.length === 0) return (
            <div className="approvals-empty">
                <div className="empty-icon-wrapper">
                    <FiFileText />
                </div>
                <h3>No History</h3>
                <p>Past approval decisions will appear here.</p>
            </div>
        );

        return (
            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Processed</th>
                            <th>Ticket</th>
                            <th>Engineer</th>
                            <th>Type</th>
                            <th>Outcome</th>
                            <th>Decision By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item) => (
                            <tr key={item.id} className="history-row" onClick={() => onViewTicket?.(item.ticket_id)}>
                                <td className="cell-date">{formatDate(item.updated_at)}</td>
                                <td><span className="table-ticket-id">#{item.ticket_id}</span></td>
                                <td className="cell-name">{item.engineer_name}</td>
                                <td>
                                    <span className="table-badge">{item.request_type}</span>
                                </td>
                                <td>
                                    <span className={`status-badge ${item.status.toLowerCase()}`}>
                                        {item.status === 'Approved' ? <FiCheckCircle /> : <FiXCircle />}
                                        {item.status}
                                    </span>
                                </td>
                                <td style={{ fontSize: '12px', color: '#64748b' }}>{item.processed_by || 'System'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="approvals-container">
            <div className="approvals-tabs">
                <button
                    className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <FiShield /> Pending Requests
                    {pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
                </button>
                <button
                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <FiFileText /> Decision History
                </button>
            </div>

            <div className="approvals-content-scroll">
                {error && (
                    <div className="approvals-error-msg">
                        <FiShield /> {error}
                    </div>
                )}
                {activeTab === 'pending' ? renderPending() : renderHistory()}
            </div>
        </div>
    );
};

export default ApprovalsPage;
