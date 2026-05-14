import { useEffect, useState } from 'react'
import { FiCheck, FiX, FiAlertCircle, FiClock, FiUser, FiTag, FiFileText, FiRotateCcw, FiInbox, FiBriefcase } from 'react-icons/fi'
import './ApprovalsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function ApprovalsPage({ onViewTicket }) {
    const [approvals, setApprovals] = useState([])
    const [history, setHistory] = useState([])
    const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'history'
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [processingId, setProcessingId] = useState(null)

    const fetchData = async (tab) => {
        try {
            setLoading(true)
            setError('')
            const endpoint = tab === 'pending' ? '/approvals' : '/approvals/history'
            const res = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: 'include' })
            const data = await res.json()
            if (res.ok) {
                if (tab === 'pending') setApprovals(data.approvals || [])
                else setHistory(data.approvals || [])
            } else {
                setError(data.message || 'Failed to fetch approvals')
            }
        } catch (err) {
            setError('Connection error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData(activeTab)
    }, [activeTab])

    const handleProcess = async (approvalId, action) => {
        if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this request?`)) return

        try {
            setProcessingId(approvalId)
            const userName = localStorage.getItem('userName') || 'Admin'
            const res = await fetch(`${API_BASE_URL}/approvals/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approvalId, action, processedBy: userName }),
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok) {
                setApprovals(prev => prev.filter(a => a.id !== approvalId))
                // Refresh history if we approved/rejected
                if (activeTab === 'history') fetchData('history')
                // Show success toast instead of alert if possible, but alert is fine for now
            } else {
                alert(data.message || 'Failed to process request')
            }
        } catch (err) {
            alert('Connection error')
            console.error(err)
        } finally {
            setProcessingId(null)
        }
    }

    const renderEmptyState = () => (
        <div className="approvals-empty">
            <div className="empty-icon-wrapper">
                {activeTab === 'pending' ? <FiInbox /> : <FiRotateCcw />}
            </div>
            <h3>{activeTab === 'pending' ? 'All caught up!' : 'No history found'}</h3>
            <p>{activeTab === 'pending' ? 'No pending approval requests at the moment.' : 'Your processed requests will appear here.'}</p>
        </div>
    )

    const renderHistoryTable = () => (
        <div className="history-table-container">
            <table className="history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Ticket</th>
                        <th>Engineer</th>
                        <th>Customer</th>
                        <th>Resolution</th>
                        <th>Status</th>
                        <th>Approved By</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map(item => (
                        <tr key={item.id} className="history-row" onClick={() => onViewTicket && onViewTicket(item.ticketId)}>
                            <td className="cell-date">
                                {new Date(item.requestedAt).toLocaleDateString()}
                            </td>
                            <td>
                                <span className={`table-badge type-${item.approvalType?.toLowerCase().replace(' ', '-')}`}>
                                    {item.approvalType}
                                </span>
                            </td>
                            <td><span className="table-ticket-id">#{item.ticketId}</span></td>
                            <td className="cell-name">{item.engineerName}</td>
                            <td className="cell-name">{item.customerName}</td>
                            <td className="cell-dates">
                                {item.approvalType === 'Early Closure' ? (
                                    <div className="table-date-flow">
                                        <span className="date-strikethrough">{item.currentEndDate ? new Date(item.currentEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}</span>
                                        <span className="date-arrow">→</span>
                                        <span className="date-new">{item.newDate ? new Date(item.newDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Today'}</span>
                                    </div>
                                ) : '-'}
                            </td>
                            <td>
                                <span className={`status-badge status-${item.requestStatus?.toLowerCase()}`}>
                                    {item.requestStatus === 'Approved' ? <FiCheck /> : <FiX />}
                                    {item.requestStatus}
                                </span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                                    <FiUser size={12} color="#718096" />
                                    {item.processedBy || 'Admin'}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    const renderCard = (approval) => (
        <div key={approval.id}
                            <FiCheck /> Approve
                        </button>
                    </div>
                ) : (
                    <div className={`status-footer status-${approval.requestStatus?.toLowerCase()}`}>
                        {approval.requestStatus === 'Approved' ? <FiCheck /> : <FiX />}
                        <span>{approval.requestStatus}</span>
                        {approval.processedAt && (
                            <div className="processed-date" style={{ fontSize: '10px', color: '#a0aec0', marginTop: '4px', fontWeight: 'normal' }}>
                                {new Date(approval.processedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="approvals-container">
            <nav className="approvals-tabs">
                <button
                    className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <FiInbox /> Pending
                    {approvals.length > 0 && <span className="tab-badge">{approvals.length}</span>}
                </button>
                <button
                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <FiRotateCcw /> History
                </button>
            </nav>

            <div className="approvals-content-scroll">
                {error && <div className="approvals-error-msg"><FiAlertCircle /> {error}</div>}

                {loading ? (
                    <div className="approvals-fetching">
                        <div className="fetching-spinner"></div>
                        <p>Syncing requests...</p>
                    </div>
                ) : (
                    <div className="approvals-list">
                        {(activeTab === 'pending' ? approvals : history).length === 0
                            ? renderEmptyState()
                            : activeTab === 'pending' 
                                ? approvals.map(renderCard)
                                : renderHistoryTable()
                        }
                    </div>
                )}
            </div>
        </div>
    )
}

export default ApprovalsPage
