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
                // Success - Fetch both summary AND tickets to keep everything in sync
                await fetchEngineersSummary();
                await fetchEngineerTickets(selectedEngineerId);
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

    // Proper Calculation Logic for Engineers
    const calculateEngineerPayoutFrontend = (ticket, calcTimezone) => {
        if (!ticket.start_time || !ticket.end_time) return { totalPayout: 0, hrs: 0, otHours: 0, isOOH: false };

        try {
            const s = new Date(ticket.start_time);
            const e = new Date(ticket.end_time);
            const brkSec = (ticket.break_time || 0) * 60;
            const totSec = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brkSec);
            const hrs = totSec / 3600;

            const targetTZ = (calcTimezone && calcTimezone !== 'Ticket Local') ? calcTimezone : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

            const getZonedInfo = (date) => {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: targetTZ,
                    hour12: false,
                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).formatToParts(date);
                const p = {}; parts.forEach(pt => p[pt.type] = pt.value);
                return { hour: parseInt(p.hour), day: date.getDay(), dateStr: `${p.year}-${p.month}-${p.day}` };
            };

            const info = getZonedInfo(s);
            const endInfo = getZonedInfo(e);
            
            // --- PROPER LOGIC FIX FOR TIMEZONE SHIFTS ---
            let startHr = info.hour;
            let endHr = endInfo.hour;
            if (ticket.start_time.includes('T')) {
              startHr = parseInt(ticket.start_time.split('T')[1].split(':')[0], 10);
            }
            if (ticket.end_time.includes('T')) {
              endHr = parseInt(ticket.end_time.split('T')[1].split(':')[0], 10);
            }
            const workIsOOH = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

            const isWeekend = (s.getDay() === 0 || s.getDay() === 6 || e.getDay() === 0 || e.getDay() === 6);
            const PUBLIC_HOLIDAYS = ['2026-01-26', '2026-10-02', '2026-12-25'];
            const isHoliday = PUBLIC_HOLIDAYS.includes(info.dateStr) || PUBLIC_HOLIDAYS.includes(endInfo.dateStr);
            const isSpecialDay = isWeekend || isHoliday;

            const billingType = ticket.eng_billing_type || 'Hourly';
            const hr = parseFloat(ticket.eng_hourly_rate || 0);
            const hd = parseFloat(ticket.eng_half_day_rate || 0);
            const fd = parseFloat(ticket.eng_full_day_rate || 0);

            let base = 0, ot = 0, ooh = 0, special = 0;

            if (billingType === 'Hourly') {
                const b = Math.max(2, hrs); 
                base = b * hr; 
            } else if (billingType === 'Half Day + Hourly') {
                if (hrs <= 4) {
                    base = hd;
                } else {
                    base = hd + ((hrs - 4) * hr);
                }
            } else if (billingType === 'Full Day + OT') {
                base = fd;
                if (hrs > 8) {
                    ot = (hrs - 8) * (hr * 1.5);
                }
            } else if (billingType.includes('Monthly')) {
                base = parseFloat(ticket.eng_monthly_rate) || 0;
                if (isSpecialDay) {
                    special = hrs * (hr * 2.0);
                } else { 
                    if (hrs > 8) {
                        ot = (hrs - 8) * (hr * 1.5); 
                    }
                }
            } else if (billingType === 'Agreed Rate') { 
                base = parseFloat(ticket.eng_agreed_rate) || 0;
            } else if (billingType === 'Cancellation') { 
                base = parseFloat(ticket.eng_cancellation_fee) || 0; 
            }

            return {
                totalPayout: (base + ot + ooh + special),
                hrs: hrs.toFixed(2),
                otHours: (hrs > 8 ? (hrs - 8) : 0).toFixed(1),
                isOOH: workIsOOH,
                isSpecialDay,
                base: base.toFixed(2),
                ot: ot.toFixed(2),
                ooh: ooh.toFixed(2),
                special: special.toFixed(2)
            };
        } catch (err) {
            return { totalPayout: 0, hrs: 0 };
        }
    };

    // Calculation for selected total (payout)
    const selectedPayoutTotal = useMemo(() => {
        return unpaidTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => {
                const pd = calculateEngineerPayoutFrontend(t, calcTimezone);
                return sum + parseFloat(pd.totalPayout || 0);
            }, 0)
            .toFixed(2);
    }, [unpaidTickets, selectedTicketIds, calcTimezone]);

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
                                {unpaidTickets.length > 0 ? (
                                    unpaidTickets.map(ticket => (
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
                                            <td className="amount-cell">${(() => {
                                                const pd = calculateEngineerPayoutFrontend(ticket, calcTimezone);
                                                return parseFloat(ticket.eng_total_cost || pd.totalPayout || 0).toFixed(2);
                                            })()}</td>
                                            <td>
                                                <button className="btn-view" onClick={() => handleOpenDetails(ticket)}>
                                                    <FiEye />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-row" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                            <FiAlertCircle style={{ fontSize: '24px', marginBottom: '8px', display: 'block', margin: '0 auto' }} />
                                            No unpaid resolved tickets found for this engineer.
                                        </td>
                                    </tr>
                                )}
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
                                    {(() => {
                                        const pd = calculateEngineerPayoutFrontend(detailTicket, calcTimezone);
                                        return (
                                            <div className="payout-breakdown">
                                                <div className="breakdown-row">
                                                    <span>Base Pay:</span>
                                                    <span>${pd.base}</span>
                                                </div>
                                                {parseFloat(pd.ot) > 0 && <div className="breakdown-row"><span>OT Premium:</span><span>+ ${pd.ot}</span></div>}
                                                {pd.isOOH && parseFloat(pd.ooh) > 0 && <div className="breakdown-row"><span>OOH Premium:</span><span>+ ${pd.ooh}</span></div>}
                                                {pd.isSpecialDay && <div className="breakdown-row"><span>Weekend/Holiday:</span><span>+ ${pd.special}</span></div>}
                                                <div className="breakdown-total">
                                                    <span>Net Payout:</span>
                                                    <span>${parseFloat(detailTicket.eng_total_cost || pd.totalPayout).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
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
