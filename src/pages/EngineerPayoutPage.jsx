/* EngineerPayoutPage.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiClock, FiCheckCircle, FiSearch,
    FiX, FiUser, FiArrowRight, FiActivity, FiHash, FiCalendar, FiArrowLeft
} from 'react-icons/fi';
import './EngineerPayoutPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EngineerPayoutPage = () => {
    const [stats, setStats] = useState({ total_pending: 0, pending_tickets_count: 0, total_paid: 0 });
    const [activeTab, setActiveTab] = useState('pending');
    const [engineers, setEngineers] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [selectedEngineer, setSelectedEngineer] = useState(null);
    const [unpaidTickets, setUnpaidTickets] = useState([]);
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [payForm, setPayForm] = useState({
        ref: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchStats();
        if (activeTab === 'pending') fetchSummary();
        else fetchHistory();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/summary`);
            if (res.ok) setEngineers(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/history`);
            if (res.ok) setHistory(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const openPayModal = async (eng) => {
        setSelectedEngineer(eng);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/engineer/${eng.id}/unpaid`);
            if (res.ok) {
                const tickets = await res.json();
                setUnpaidTickets(tickets);
                setSelectedTicketIds(tickets.map(t => t.id)); // Default all select
            }
        } catch (e) { console.error(e); }
    };

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const calculateSelectedTotal = () => {
        return unpaidTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => sum + parseFloat(t.total_cost || 0), 0)
            .toFixed(2);
    };

    const handleProcessPayment = async () => {
        if (selectedTicketIds.length === 0) {
            alert('Please select at least one ticket.');
            return;
        }
        if (!confirm('Confirm processing this payment?')) return;

        setProcessing(true);
        try {
            const payload = {
                engineer_id: selectedEngineer.id,
                amount: calculateSelectedTotal(),
                transaction_ref: payForm.ref,
                payment_date: payForm.date,
                notes: payForm.notes,
                ticket_ids: selectedTicketIds
            };

            const res = await fetch(`${API_BASE_URL}/payouts/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSelectedEngineer(null);
                fetchStats();
                fetchSummary();
                setActiveTab('history');
            } else {
                alert('Payment processing failed.');
            }
        } catch (e) { console.error(e); }
        setProcessing(false);
    };

    const filteredEngineers = useMemo(() => {
        return engineers.filter(eng =>
            eng.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eng.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [engineers, searchTerm]);

    const filteredHistory = useMemo(() => {
        return history.filter(h =>
            h.engineer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (h.transaction_ref && h.transaction_ref.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [history, searchTerm]);

    return (
        <div className="payout-page">
            <header className="payout-header">
                <div className="payout-title-section">
                    <h2>Engineer Payouts</h2>
                    <p>Track engineer earnings and fulfill payment obligations.</p>
                </div>
                <div className="payout-header-actions">
                    <div className="payout-search-bar">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search engineer or reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="payout-stats-row">
                <div className="payout-stat-card">
                    <div className="stat-icon-circ circ--amber"><FiClock /></div>
                    <div className="stat-info">
                        <h3>${parseFloat(stats.total_pending).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p>Total Pending Payout</p>
                    </div>
                </div>
                <div className="payout-stat-card">
                    <div className="stat-icon-circ circ--blue"><FiActivity /></div>
                    <div className="stat-info">
                        <h3>{stats.pending_tickets_count}</h3>
                        <p>Pending Tickets</p>
                    </div>
                </div>
                <div className="payout-stat-card">
                    <div className="stat-icon-circ circ--green"><FiCheckCircle /></div>
                    <div className="stat-info">
                        <h3>${parseFloat(stats.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p>Total Paid till date</p>
                    </div>
                </div>
            </div>

            <div className="payout-tab-nav">
                <button
                    className={`payout-nav-item ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Payouts
                </button>
                <button
                    className={`payout-nav-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Payment History
                </button>
            </div>

            {loading ? (
                <div className="payout-loading">
                    <div className="payout-spinner"></div>
                    <p>Fetching records...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'pending' && (
                        <div className="payout-engineer-grid">
                            {filteredEngineers.map(eng => (
                                <div className="payout-engineer-card" key={eng.id}>
                                    <div className="eng-card-header">
                                        <div className="eng-avatar-v2">
                                            {eng.avatar_url ? <img src={eng.avatar_url} alt="" /> : <FiUser />}
                                        </div>
                                        <div className="eng-meta-v2">
                                            <h3>{eng.name}</h3>
                                            <p>{eng.email}</p>
                                        </div>
                                    </div>
                                    <div className="eng-card-body">
                                        <div className="eng-stat-item">
                                            <label>Unpaid Tickets</label>
                                            <span>{eng.pending_tickets}</span>
                                        </div>
                                        <div className="eng-stat-item">
                                            <label>Total Earnings</label>
                                            <span className="earnings-amount">${parseFloat(eng.total_pending_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button className="eng-pay-action-btn" onClick={() => openPayModal(eng)}>
                                        Process Payment <FiArrowRight />
                                    </button>
                                </div>
                            ))}
                            {filteredEngineers.length === 0 && (
                                <div className="payout-empty-state">
                                    <FiCheckCircle size={48} />
                                    <p>Wonderful! All engineers are currently paid up.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="payout-history-table-wrapper">
                            <table className="payout-history-table">
                                <thead>
                                    <tr>
                                        <th><FiCalendar /> Payment Date</th>
                                        <th><FiUser /> Engineer</th>
                                        <th><FiHash /> Reference</th>
                                        <th><FiDollarSign /> Amount</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map(h => (
                                        <tr key={h.id}>
                                            <td>{new Date(h.payment_date).toLocaleDateString()}</td>
                                            <td className="font-semibold text-gray-800">{h.engineer_name}</td>
                                            <td>
                                                <span className="payout-ref-pill">{h.transaction_ref || 'N/A'}</span>
                                            </td>
                                            <td className="payout-amount-text">${parseFloat(h.amount).toFixed(2)}</td>
                                            <td className="payout-notes-cell">{h.notes || '--'}</td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="payout-table-empty">
                                                <FiActivity size={48} style={{ opacity: 0.1, marginBottom: '10px' }} /><br />
                                                No payment history records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Professional Modal */}
            {selectedEngineer && (
                <div className="payout-modal-overlay-v2" onClick={() => setSelectedEngineer(null)}>
                    <div className="payout-modal-v2" onClick={e => e.stopPropagation()}>
                        <div className="payout-v2-header">
                            <div>
                                <h3>Process Payment</h3>
                                <p>Releasing funds for <strong>{selectedEngineer.name}</strong></p>
                            </div>
                            <button className="payout-v2-close" onClick={() => setSelectedEngineer(null)}><FiX /></button>
                        </div>

                        <div className="payout-v2-content">
                            <div className="payout-v2-tickets">
                                <div className="list-title-v2">
                                    <label>Select Completed Work</label>
                                    <span>{selectedTicketIds.length} Tickets Selected</span>
                                </div>
                                <div className="tickets-scroll-area">
                                    {unpaidTickets.map(t => (
                                        <div
                                            key={t.id}
                                            className={`ticket-item-v2 ${selectedTicketIds.includes(t.id) ? 'selected' : ''}`}
                                            onClick={() => toggleTicket(t.id)}
                                        >
                                            <div className="item-v2-check">
                                                <div className={`checkbox-ui-v2 ${selectedTicketIds.includes(t.id) ? 'checked' : ''}`}>
                                                    {selectedTicketIds.includes(t.id) && <FiCheckCircle />}
                                                </div>
                                            </div>
                                            <div className="item-v2-info">
                                                <strong>{t.task_name}</strong>
                                                <p>{new Date(t.task_start_date).toLocaleDateString()} • {Math.floor(t.total_time / 60)}h {t.total_time % 60}m</p>
                                            </div>
                                            <div className="item-v2-cost">
                                                ${parseFloat(t.total_cost).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="payout-v2-form">
                                <div className="v2-form-grid">
                                    <div className="v2-input-group">
                                        <label>Release Date</label>
                                        <input
                                            type="date"
                                            value={payForm.date}
                                            onChange={e => setPayForm({ ...payForm, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="v2-input-group">
                                        <label>Transaction Reference</label>
                                        <input
                                            placeholder="e.g. Bank Ref / TX ID"
                                            value={payForm.ref}
                                            onChange={e => setPayForm({ ...payForm, ref: e.target.value })}
                                        />
                                    </div>
                                    <div className="v2-input-group full-width">
                                        <label>Internal Notes</label>
                                        <textarea
                                            placeholder="Add payment context or details..."
                                            value={payForm.notes}
                                            onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <div className="v2-summary-box">
                                    <div className="summary-line">
                                        <span>Total Earnings to Release</span>
                                        <span className="final-amount">${calculateSelectedTotal()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="payout-v2-footer">
                            <button className="payout-btn-cancel" onClick={() => setSelectedEngineer(null)}>Dismiss</button>
                            <button
                                className="payout-btn-confirm"
                                onClick={handleProcessPayment}
                                disabled={processing || selectedTicketIds.length === 0}
                            >
                                {processing ? 'Processing...' : 'Release Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngineerPayoutPage;
