import { useEffect, useState } from 'react'
import { FiCheck, FiX, FiAlertCircle, FiClock, FiUser, FiTag, FiFileText, FiHistory, FiInbox } from 'react-icons/fi'
import './ApprovalsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function ApprovalsPage() {
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
            const res = await fetch(`${API_BASE_URL}/approvals/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approvalId, action }),
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
                {activeTab === 'pending' ? <FiInbox /> : <FiHistory />}
            </div>
            <h3>{activeTab === 'pending' ? 'All caught up!' : 'No history found'}</h3>
            <p>{activeTab === 'pending' ? 'No pending approval requests at the moment.' : 'Your processed requests will appear here.'}</p>
        </div>
    )

    const renderCard = (approval) => (
        <div key={approval.id} className={`approval-card ${approval.requestStatus?.toLowerCase()}`}>
            <div className="approval-card-header">
                <span className={`type-badge type-${approval.approvalType?.toLowerCase().replace(' ', '-')}`}>
                    {approval.approvalType}
                </span>
                <span className="approval-date">
                    <FiClock /> {new Date(approval.requestedAt).toLocaleDateString()} {new Date(approval.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <div className="approval-card-content">
                <div className="content-main">
                    <h3 className="task-title">
                        <FiTag className="icon-subtle" />
                        {approval.taskName}
                        <span className="ticket-id">#{approval.ticketId}</span>
                    </h3>

                    <div className="info-grid">
                        <div className="info-item">
                            <FiUser className="icon-subtle" />
                            <span><strong>Engineer:</strong> {approval.engineerName}</span>
                        </div>
                        <div className="info-item">
                            <FiFileText className="icon-subtle" />
                            <span><strong>Customer:</strong> {approval.customerName}</span>
                        </div>
                    </div>

                    <div className="reason-section">
                        <label>Reason provided:</label>
                        <p>{approval.reason || 'No reason provided.'}</p>
                    </div>
                </div>

                {activeTab === 'pending' ? (
                    <div className="approval-actions">
                        <button
                            className="btn-action btn-reject"
                            onClick={() => handleProcess(approval.id, 'Rejected')}
                            disabled={processingId === approval.id}
                        >
                            <FiX /> Reject
                        </button>
                        <button
                            className="btn-action btn-approve"
                            onClick={() => handleProcess(approval.id, 'Approved')}
                            disabled={processingId === approval.id}
                        >
                            <FiCheck /> Approve
                        </button>
                    </div>
                ) : (
                    <div className={`status-footer status-${approval.requestStatus?.toLowerCase()}`}>
                        {approval.requestStatus === 'Approved' ? <FiCheck /> : <FiX />}
                        <span>{approval.requestStatus}</span>
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
                    <FiHistory /> History
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
                            : (activeTab === 'pending' ? approvals : history).map(renderCard)
                        }
                    </div>
                )}
            </div>
        </div>
    )
}

export default ApprovalsPage
