import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiClock, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import './EngineerPayoutPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EngineerPayoutPage = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [engineers, setEngineers] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [selectedEngineer, setSelectedEngineer] = useState(null);
    const [unpaidTickets, setUnpaidTickets] = useState([]);
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [payForm, setPayForm] = useState({ ref: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (activeTab === 'pending') fetchSummary();
        else fetchHistory();
    }, [activeTab]);

    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/summary`);
            if (res.ok) setEngineers(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchHistory = async () => {
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
                setSelectedTicketIds(tickets.map(t => t.id)); // Select all by default
            }
        } catch (e) { console.error(e); }
    };

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const calculateTotal = () => {
        return unpaidTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => sum + parseFloat(t.total_cost), 0)
            .toFixed(2);
    };

    const handleProcessPayment = async () => {
        if (!confirm('Confirm processing this payment?')) return;
        setProcessing(true);
        try {
            const payload = {
                engineer_id: selectedEngineer.id,
                amount: calculateTotal(),
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
                fetchSummary();
            } else {
                alert('Payment processing failed.');
            }
        } catch (e) { console.error(e); }
        setProcessing(false);
    };

    return (
        <div className="payout-page">
            <header className="payout-header">
                <div className="payout-title">
                    <h2>Engineer Payouts</h2>
                    <p>Manage engineer earnings and process payments.</p>
                </div>
            </header>

            <div className="payout-tabs">
                <button
                    className={`payout-tab ${activeTab === 'pending' ? 'payout-tab--active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Payouts
                </button>
                <button
                    className={`payout-tab ${activeTab === 'history' ? 'payout-tab--active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Payment History
                </button>
            </div>

            {activeTab === 'pending' && (
                <div className="payout-grid">
                    {engineers.map(eng => (
                        <div className="engineer-card" key={eng.id}>
                            <div className="engineer-info">
                                <div className="engineer-avatar">
                                    {eng.avatar_url ? <img src={eng.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : eng.name[0]}
                                </div>
                                <div className="engineer-details">
                                    <h3>{eng.name}</h3>
                                    <p>{eng.email}</p>
                                </div>
                            </div>
                            <div className="payout-amount-block">
                                <div className="payout-amount-label">Pending Amount</div>
                                <div className="payout-amount-value">${parseFloat(eng.total_pending_amount).toFixed(2)}</div>
                                <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>{eng.pending_tickets} Unpaid Tickets</div>
                            </div>
                            <button className="pay-btn" onClick={() => openPayModal(eng)}>Review & Pay</button>
                        </div>
                    ))}
                    {engineers.length === 0 && !loading && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#718096', padding: '40px' }}>
                            <FiCheck style={{ fontSize: '40px', color: '#cbd5e0' }} /><br />
                            No pending payouts. All engineers are paid up!
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="assets-table-container">
                    <table className="assets-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Engineer</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(h => (
                                <tr key={h.id}>
                                    <td>{new Date(h.payment_date).toLocaleDateString()}</td>
                                    <td>{h.engineer_name}</td>
                                    <td><span style={{ fontFamily: 'monospace', background: '#edf2f7', padding: '2px 6px', borderRadius: '4px' }}>{h.transaction_ref || '-'}</span></td>
                                    <td style={{ fontWeight: '700', color: '#2d3748' }}>${h.amount}</td>
                                    <td style={{ color: '#718096', fontSize: '13px' }}>{h.notes || '-'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && !loading && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No payment history found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal */}
            {selectedEngineer && (
                <div className="payout-modal-overlay">
                    <div className="payout-modal">
                        <div className="payout-modal-header">
                            <h3>Pay {selectedEngineer.name}</h3>
                            <button className="assets-modal-close" onClick={() => setSelectedEngineer(null)}><FiX /></button>
                        </div>

                        <div className="payout-ticket-list">
                            {unpaidTickets.map(t => (
                                <div className="ticket-row" key={t.id}>
                                    <div className="ticket-row-left">
                                        <input
                                            type="checkbox"
                                            className="ticket-check"
                                            checked={selectedTicketIds.includes(t.id)}
                                            onChange={() => toggleTicket(t.id)}
                                        />
                                        <div className="ticket-meta">
                                            <h4>{t.task_name}</h4>
                                            <p>{new Date(t.task_start_date).toLocaleDateString()} • {Math.floor(t.total_time / 60)}m</p>
                                        </div>
                                    </div>
                                    <div className="ticket-cost">${t.total_cost}</div>
                                </div>
                            ))}
                        </div>

                        <div className="payout-summary">
                            <span className="total-label">Total Payment</span>
                            <span className="total-value">${calculateTotal()}</span>
                        </div>

                        <div className="payout-form-group">
                            <label>Payment Date</label>
                            <input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                        </div>
                        <div className="payout-form-group">
                            <label>Transaction Reference (Optional)</label>
                            <input placeholder="e.g. BANK-TX-1234" value={payForm.ref} onChange={e => setPayForm({ ...payForm, ref: e.target.value })} />
                        </div>

                        <div className="payout-actions">
                            <button className="btn-secondary" onClick={() => setSelectedEngineer(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleProcessPayment} disabled={processing}>
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngineerPayoutPage;
