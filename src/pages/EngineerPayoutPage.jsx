/* EngineerPayoutPage.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiFileText, FiCalendar, FiCheckCircle,
    FiAlertCircle, FiX, FiSearch, FiArrowRight, FiUser,
    FiBriefcase, FiHash, FiClock, FiEye, FiFilter, FiDownload,
    FiCreditCard, FiCheck, FiRefreshCw
} from 'react-icons/fi';
import './EngineerPayoutPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CURRENCIES = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' }
];

const MONTHS = [
    "All Months", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = ["All Years", "2024", "2025", "2026"];

const EngineerPayoutPage = () => {
    const [stats, setStats] = useState({ unpaidCount: 0, totalUnpaidAmount: 0 });
    const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'history'
    const [engineersList, setEngineersList] = useState([]);
    const [unpaidTickets, setUnpaidTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcTimezone, setCalcTimezone] = useState('Ticket Local');
    const [processing, setProcessing] = useState(false);

    // Filter states
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedYear, setSelectedYear] = useState('All Years');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [selectedEngineerId, setSelectedEngineerId] = useState(null);

    // Selection for payment
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);

    // Modals
    const [detailTicket, setDetailTicket] = useState(null);

    useEffect(() => {
        fetchEngineersSummary();
    }, []);

    const fetchEngineersSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/engineers/unpaid`);
            if (res.ok) {
                const data = await res.json();
                setEngineersList(data.engineers || []);
                
                // Update stats
                const totalAmount = data.engineers.reduce((sum, eng) => sum + parseFloat(eng.total_payout_estimated), 0);
                setStats({
                  unpaidCount: data.engineers.length,
                  totalUnpaidAmount: totalAmount.toFixed(2)
                });
            }
        } catch (e) {
            console.error("Fetch Engineers Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchEngineerTickets = async (engineerId) => {
        setLoading(true);
        setSelectedEngineerId(engineerId);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/engineer/${engineerId}/tickets`);
            if (res.ok) {
                const data = await res.json();
                setUnpaidTickets(data.tickets || []);
                setSelectedTicketIds([]); // Clear selection when switching engineers
            }
        } catch (e) {
            console.error("Fetch Tickets Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToEngineers = () => {
        setSelectedEngineerId(null);
        setUnpaidTickets([]);
        fetchEngineersSummary();
    };

    const toggleTicketSelection = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleProcessPayout = async () => {
        if (selectedTicketIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to mark ${selectedTicketIds.length} tickets as PAID?`)) return;

        setProcessing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketIds: selectedTicketIds,
                    engineerId: selectedEngineerId
                })
            });

            if (res.ok) {
                alert('Payout processed successfully!');
                fetchEngineerTickets(selectedEngineerId);
            } else {
                alert('Failed to process payout.');
            }
        } catch (e) {
            console.error(e);
            alert('Error processing payout.');
        } finally {
            setProcessing(false);
        }
    };

    // Modal Helper
    const handleOpenDetails = (ticket) => setDetailTicket(ticket);
    const handleCloseDetails = () => setDetailTicket(null);

    // Filtering logic for the list of engineers
    const filteredEngineers = engineersList.filter(eng => 
        eng.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eng.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculation for selected total (payout)
    const selectedPayoutTotal = useMemo(() => {
        return unpaidTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => sum + parseFloat(t.eng_total_cost || 0), 0)
            .toFixed(2);
    }, [unpaidTickets, selectedTicketIds]);

    if (loading && engineersList.length === 0) {
        return (
            <div className="payout-loading">
                <div className="spinner"></div>
                <p>Loading Engineer Payouts...</p>
            </div>
        );
    }

    return (
        <div className="payout-page">
            {/* Header section */}
            <header className="payout-header">
                <div className="header-left">
                    <h1 className="header-title">Engineer Payouts</h1>
                    <p className="header-subtitle">Manage and track payments for your field engineers</p>
                    <button 
                        className="btn-recalculate" 
                        onClick={async () => {
                            if (!window.confirm("Recalculate payouts for all old resolved tickets?")) return;
                            setProcessing(true);
                            try {
                                const res = await fetch(`${API_BASE_URL}/payouts/maintenance/recalculate`, { method: 'POST' });
                                if (res.ok) {
                                    const data = await res.json();
                                    alert(data.message);
                                    fetchEngineersSummary();
                                }
                            } catch (e) { console.error(e); }
                            setProcessing(false);
                        }}
                        disabled={processing}
                        style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff' }}
                    >
                        <FiRefreshCw className={processing ? 'spin' : ''} /> Recalculate Old Payouts
                    </button>
                </div>
                <div className="header-stats">
                    <div className="stat-card blue">
                        <FiUser className="stat-icon" />
                        <div className="stat-info">
                            <span className="stat-label">Unpaid Engineers</span>
                            <span className="stat-value">{stats.unpaidCount}</span>
                        </div>
                    </div>
                    <div className="stat-card green">
                        <FiDollarSign className="stat-icon" />
                        <div className="stat-info">
                            <span className="stat-label">Est. Total Payout</span>
                            <span className="stat-value">${stats.totalUnpaidAmount}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* View Switching */}
            {!selectedEngineerId ? (
                /* ENGINEER LIST VIEW */
                <main className="payout-content">
                    <div className="content-controls">
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search engineer by name or email..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="payout-table">
                            <thead>
                                <tr>
                                    <th>Engineer</th>
                                    <th>Contact</th>
                                    <th>Location</th>
                                    <th>Pending Tickets</th>
                                    <th>Est. Payout</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEngineers.length > 0 ? (
                                    filteredEngineers.map(eng => (
                                        <tr key={eng.id}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar">{eng.name.charAt(0)}</div>
                                                    <span className="user-name">{eng.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="contact-info">
                                                    <span>{eng.email}</span>
                                                    <small>{eng.phone}</small>
                                                </div>
                                            </td>
                                            <td>{eng.city || 'N/A'}</td>
                                            <td>
                                                <span className="badge-ticket">{eng.ticket_count} Tickets</span>
                                            </td>
                                            <td className="amount-cell">${parseFloat(eng.total_payout_estimated).toFixed(2)}</td>
                                            <td>
                                                <button className="btn-action" onClick={() => fetchEngineerTickets(eng.id)}>
                                                    View Details <FiArrowRight />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="empty-row">No pending payouts found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            ) : (
                /* ENGINEER DETAILED TICKETS VIEW */
                <main className="payout-content">
                    <div className="detail-header">
                        <button className="btn-back" onClick={handleBackToEngineers}>
                            <FiArrowRight style={{ transform: 'rotate(180deg)' }} /> Back to Engineers
                        </button>
                        <div className="engineer-summary">
                            <h2>{engineersList.find(e => e.id === selectedEngineerId)?.name}</h2>
                            <p>Displaying unpaid tickets for this engineer</p>
                        </div>
                    </div>

                    <div className="actions-bar">
                        <div className="selection-info">
                            <span className="count">{selectedTicketIds.length} tickets selected</span>
                            <span className="total-label">Total to Pay:</span>
                            <span className="total-amount">${selectedPayoutTotal}</span>
                        </div>
                        <button 
                            className={`btn-process ${selectedTicketIds.length === 0 ? 'disabled' : ''}`}
                            onClick={handleProcessPayout}
                            disabled={selectedTicketIds.length === 0 || processing}
                        >
                            {processing ? 'Processing...' : <><FiCheck /> Mark as Paid</>}
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="payout-table">
                            <thead>
                                <tr>
                                    <th width="40"><input type="checkbox" onChange={(e) => {
                                        if (e.target.checked) setSelectedTicketIds(unpaidTickets.map(t => t.id));
                                        else setSelectedTicketIds([]);
                                    }} /></th>
                                    <th>Ticket ID</th>
                                    <th>Customer</th>
                                    <th>Task Name</th>
                                    <th>Hours</th>
                                    <th>Resolved Date</th>
                                    <th>Payout</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unpaidTickets.map(ticket => (
                                    <tr key={ticket.id} className={selectedTicketIds.includes(ticket.id) ? 'selected' : ''}>
                                        <td><input 
                                            type="checkbox" 
                                            checked={selectedTicketIds.includes(ticket.id)}
                                            onChange={() => toggleTicketSelection(ticket.id)}
                                        /></td>
                                        <td><span className="ticket-id">#{ticket.id}</span></td>
                                        <td>{ticket.customer_name}</td>
                                        <td>{ticket.task_name}</td>
                                        <td>{ticket.total_time ? (ticket.total_time / 3600).toFixed(2) + 'h' : 'N/A'}</td>
                                        <td>{ticket.end_time ? new Date(ticket.end_time).toLocaleDateString() : 'N/A'}</td>
                                        <td className="amount-cell">${parseFloat(ticket.eng_total_cost || 0).toFixed(2)}</td>
                                        <td>
                                            <button className="btn-view" onClick={() => handleOpenDetails(ticket)}>
                                                <FiEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            )}

            {/* Ticket Detail Modal (Simplified) */}
            {detailTicket && (
                <div className="payout-modal-overlay">
                    <div className="payout-modal">
                        <div className="modal-header">
                            <h3>Ticket Detail: #{detailTicket.id}</h3>
                            <button onClick={handleCloseDetails}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Task</label>
                                    <p>{detailTicket.task_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Customer</label>
                                    <p>{detailTicket.customer_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Work Duration</label>
                                    <p>{(detailTicket.total_time / 3600).toFixed(2)} hours</p>
                                </div>
                                <div className="detail-item">
                                    <label>Payout Type</label>
                                    <p>{detailTicket.eng_pay_type} ({detailTicket.eng_billing_type})</p>
                                </div>
                                <div className="detail-item">
                                    <label>Calculation Breakdown</label>
                                    <div className="payout-breakdown">
                                        <div className="breakdown-row">
                                            <span>Base Pay:</span>
                                            <span>${parseFloat(detailTicket.eng_total_cost || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="breakdown-total">
                                            <span>Net Payout:</span>
                                            <span>${parseFloat(detailTicket.eng_total_cost || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngineerPayoutPage;
