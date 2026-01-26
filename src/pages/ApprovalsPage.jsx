import { useEffect, useState } from 'react'
import { FiCheck, FiX, FiAlertCircle, FiClock, FiUser, FiTag } from 'react-icons/fi'
import './ApprovalsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function ApprovalsPage() {
    const [approvals, setApprovals] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [processingId, setProcessingId] = useState(null)

    const fetchApprovals = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE_URL}/approvals`, { credentials: 'include' })
            const data = await res.json()
            if (res.ok) {
                setApprovals(data.approvals || [])
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
        fetchApprovals()
    }, [])

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
                alert(data.message)
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

    if (loading) return <div className="approvals-loading">Loading approval requests...</div>

    return (
        <div className="approvals-page">
            <header className="approvals-header">
                <h2 className="section-title">Approval Requests</h2>
                <p className="section-subtitle">Review and approve early closure or extension requests from engineers.</p>
            </header>

            {error && (
                <div className="approvals-error">
                    <FiAlertCircle /> {error}
                </div>
            )}

            <div className="approvals-grid">
                {approvals.length === 0 ? (
                    <div className="approvals-empty">
                        <FiCheck />
                        <p>All caught up! No pending approval requests.</p>
                    </div>
                ) : (
                    approvals.map(approval => (
                        <div key={approval.id} className="approval-card">
                            <div className="approval-card-type">
                                <span className={`type-badge type-${approval.approvalType.toLowerCase().replace(' ', '-')}`}>
                                    {approval.approvalType}
                                </span>
                                <span className="approval-date">
                                    <FiClock /> {new Date(approval.requestedAt).toLocaleString()}
                                </span>
                            </div>

                            <div className="approval-card-body">
                                <h3 className="approval-task-name">
                                    <FiTag /> {approval.taskName} (Ticket #{approval.ticketId})
                                </h3>

                                <div className="approval-meta">
                                    <div className="meta-item">
                                        <FiUser /> <strong>Engineer:</strong> {approval.engineerName}
                                    </div>
                                    <div className="meta-item">
                                        <FiUser /> <strong>Customer:</strong> {approval.customerName}
                                    </div>
                                </div>

                                <div className="approval-reason-box">
                                    <strong>Reason for Early Closure:</strong>
                                    <p>{approval.reason}</p>
                                </div>
                            </div>

                            <div className="approval-card-actions">
                                <button
                                    className="approval-btn approval-btn--reject"
                                    onClick={() => handleProcess(approval.id, 'Rejected')}
                                    disabled={processingId === approval.id}
                                >
                                    <FiX /> Reject
                                </button>
                                <button
                                    className="approval-btn approval-btn--approve"
                                    onClick={() => handleProcess(approval.id, 'Approved')}
                                    disabled={processingId === approval.id}
                                >
                                    <FiCheck /> Approve & Resolve
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default ApprovalsPage
