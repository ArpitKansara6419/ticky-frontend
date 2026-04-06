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
    const calculateEngineerPayoutFrontend = (ticket, forcedTZ) => {
        if (!ticket) return {};
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        const hr = parseFloat(ticket.eng_hourly_rate || 0);
        const hd = parseFloat(ticket.eng_half_day_rate || 0);
        const fd = parseFloat(ticket.eng_full_day_rate || 0);
        const billingType = ticket.eng_billing_type || 'Hourly';

        const getZonedInfo = (date) => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
                const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
                return { dateStr, day: new Date(dateStr).getDay(), hour: parseInt(parts.hour) };
            } catch (e) { return { dateStr: '', day: date.getDay(), hour: date.getHours() }; }
        };

        let logs = [];
        try { logs = typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs) : (ticket.time_logs || []); } catch (e) { }

        if (logs.length > 0) {
            let totalRec = 0; let totalHrs = 0; let baseC = 0; let otP = 0; let oohP = 0; let spP = 0; let travC = 0; let toolC = 0;
            logs.forEach(log => {
                const logDate = (log.task_date || '').split('T')[0];
                if (logDate) {
                    const dObj = new Date(logDate);
                    const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                    const PUBLIC_HOLIDAYS = ['2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14', '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'];
                    const isHoliday = PUBLIC_HOLIDAYS.includes(logDate);
                    // Skip if weekend/holiday AND no manual times were filled
                    if ((isWeekend || isHoliday) && (!log.start_time || !log.end_time)) return;
                }

                let sTime = log.start_time;
                let eTime = log.end_time;
                let brk = (log.break_time_mins || 0) * 60;

                if (!sTime || !eTime) {
                    if (!log.task_date) return;
                    const d = new Date(log.task_date);
                    if (isNaN(d.getTime())) return;
                    const dateStr = d.toISOString().split('T')[0];
                    const ct = String(ticket.task_time || '08:00').slice(0, 5);
                    const sDT = new Date(`${dateStr}T${ct}:00Z`);
                    if (isNaN(sDT.getTime())) return;
                    sTime = sDT.toISOString().slice(0, 19).replace('T', ' ');
                    const eDT = new Date(sDT.getTime() + 8 * 3600000);
                    eTime = eDT.toISOString().slice(0, 19).replace('T', ' ');
                    brk = 0;
                }

                const res = calculateEngineerPayoutFrontend({ ...ticket, start_time: sTime, end_time: eTime, break_time: brk, time_logs: [] }, tz);
                totalHrs += parseFloat(res.totalHours || 0);
                if (billingType === 'Hourly' || billingType === 'Half Day + Hourly' || billingType === 'Full Day + OT' || billingType === 'Mixed Mode') {
                    baseC += parseFloat(res.baseCost || 0);
                }
                otP += parseFloat(res.otPremium || 0);
                oohP += parseFloat(res.oohPremium || 0);
                spP += parseFloat(res.specialDayPremium || 0);
                travC += parseFloat(res.travelCost || 0);
                toolC += parseFloat(res.toolCost || 0);
            });
            if (billingType.includes('Monthly')) {
                const fullRate = parseFloat(ticket.eng_monthly_rate || ticket.monthly_rate) || 0;
                baseC = (fullRate / 30) * logs.length;
            } else if (billingType === 'Agreed Rate' || billingType === 'Cancellation') {
                const dummy = calculateEngineerPayoutFrontend({ ...ticket, time_logs: [] }, tz);
                baseC = parseFloat(dummy.baseCost);
            }
            totalRec = baseC + otP + oohP + spP + travC + toolC;
            return {
                totalPayout: totalRec.toFixed(2),
                baseCost: baseC.toFixed(2), otPremium: otP.toFixed(2), oohPremium: oohP.toFixed(2), specialDayPremium: spP.toFixed(2),
                totalHours: totalHrs, otHours: totalHrs > 8 ? totalHrs - 8 : 0,
                travelCost: travC.toFixed(2), toolCost: toolC.toFixed(2)
            };
        }

        const s = new Date(ticket.start_time || ticket.task_start_date);
        const e = new Date(ticket.end_time || ticket.task_end_date || ticket.start_time);
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);
        const hrs = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brk) / 3600;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if (ticket.start_time && ticket.start_time.includes('T')) startHr = parseInt(ticket.start_time.split('T')[1].split(':')[0], 10);
        if (ticket.end_time && ticket.end_time.includes('T')) endHr = parseInt(ticket.end_time.split('T')[1].split(':')[0], 10);

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const HOLS = ['2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14', '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'];
        const isH = HOLS.includes(info.dateStr) || HOLS.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;
        const isO = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

        let base = 0, ot = 0, ooh = 0, sp = 0;
        let baseBreakdown = "";
        let otBreakdown = "";
        let spBreakdown = "";
        let oohBreakdown = "";

        if (billingType === 'Hourly') {
            const b = Math.max(2, hrs); 
            base = b * hr; 
            baseBreakdown = `Billed ${b.toFixed(2)}h @ ${hr.toFixed(2)} (Min 2h)`;
        } else if (billingType === 'Half Day + Hourly') {
            if (hrs <= 4) {
                base = hd;
                baseBreakdown = `Fixed Half Day Rate (≤ 4h) = ${hd.toFixed(2)}`;
            } else {
                base = hd + ((hrs - 4) * hr);
                baseBreakdown = `Half Day Rate (${hd.toFixed(2)}) + Extra ${(hrs - 4).toFixed(2)}h @ ${hr.toFixed(2)}`;
            }
        } else if (billingType === 'Full Day + OT') {
            base = fd;
            baseBreakdown = `Fixed Full Day Rate (≤ 8h) = ${fd.toFixed(2)}`;
            if (hrs > 8) {
                ot = (hrs - 8) * (hr * 1.5);
                otBreakdown = `${(hrs - 8).toFixed(2)}h Overtime @ ${(hr * 1.5).toFixed(2)} (1.5x)`;
            }
        } else if (billingType === 'Mixed Mode') {
            if (hrs <= 4) {
                base = hd;
                baseBreakdown = `Billed as Half Day (≤ 4h) = ${hd.toFixed(2)}`;
            } else if (hrs <= 8) {
                base = fd;
                baseBreakdown = `Billed as Full Day (4-8h) = ${fd.toFixed(2)}`;
            } else {
                base = fd;
                baseBreakdown = `Full Day Base (8h) = ${fd.toFixed(2)}`;
                ot = (hrs - 8) * (hr * 1.5);
                otBreakdown = `${(hrs - 8).toFixed(2)}h Overtime @ ${(hr * 1.5).toFixed(2)} (1.5x)`;
            }
        } else if (billingType.includes('Monthly')) {
            const days = (ticket.time_logs && ticket.time_logs.length > 0) ? (typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs).length : ticket.time_logs.length) : 1;
            const fullRate = parseFloat(ticket.eng_monthly_rate || ticket.monthly_rate) || 0;
            base = fullRate / 30; // Pro-rata for 1 day
            baseBreakdown = `Pro-rata Monthly (1 day) = ${base.toFixed(2)} (${fullRate.toFixed(2)}/30)`;
            if (isSpecialDay) {
                sp = hrs * (hr * 2.0);
                spBreakdown = `${hrs.toFixed(2)}h Special Day @ ${(hr * 2.0).toFixed(2)} (2.0x)`;
            } else { 
                if (hrs > 8) { 
                    ot = (hrs - 8) * (hr * 1.5); 
                    otBreakdown = `${(hrs - 8).toFixed(2)}h Overtime @ ${(hr * 1.5).toFixed(2)} (1.5x)`;
                }
            }
        } else if (billingType === 'Agreed Rate') { 
            base = parseFloat(ticket.eng_agreed_rate) || 0;
            baseBreakdown = `Agreed / Fixed Rate = ${base.toFixed(2)}`;
        } else if (billingType === 'Cancellation') { 
            base = parseFloat(ticket.eng_cancellation_fee) || 0; 
            baseBreakdown = `Fixed Cancellation Fee = ${base.toFixed(2)}`;
        }

        const trav = parseFloat(ticket.eng_travel_cost_per_day || ticket.travel_cost_per_day || 0);
        const tool = parseFloat(ticket.eng_tool_cost || ticket.tool_cost || 0);

        return {
            totalPayout: (base + ot + ooh + sp + trav + tool).toFixed(2),
            hrs: hrs.toFixed(2),
            totalHours: hrs,
            otHours: (hrs > 8 ? (hrs - 8) : 0).toFixed(1),
            isOOH: isO,
            isSpecialDay,
            base: base.toFixed(2),
            baseBreakdown,
            ot: ot.toFixed(2),
            otBreakdown,
            ooh: ooh.toFixed(2),
            oohBreakdown,
            special: sp.toFixed(2),
            spBreakdown,
            travelCost: trav.toFixed(2),
            toolCost: tool.toFixed(2)
        };
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
                                        const cur = detailTicket.eng_currency || 'USD';
                                        return (
                                            <div className="payout-breakdown">
                                           <div className="payout-row highlight-bold">
                                        <div className="payout-label-col">
                                            <span>Base Labor Payout</span>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '2px' }}>{pd.baseBreakdown}</div>
                                        </div>
                                        <span className="payout-amount">{cur} {pd.base}</span>
                                    </div>
                                    {parseFloat(pd.ot) > 0 && (
                                        <div className="payout-row">
                                            <div className="payout-label-col">
                                                <span>Overtime Payout (OT)</span>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{pd.otBreakdown}</div>
                                            </div>
                                            <span className="payout-amount">+ {cur} {pd.ot}</span>
                                        </div>
                                    )}
                                    {parseFloat(pd.special) > 0 && (
                                        <div className="payout-row">
                                            <div className="payout-label-col">
                                                <span>Special Day Premium</span>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{pd.spBreakdown}</div>
                                            </div>
                                            <span className="payout-amount">+ {cur} {pd.special}</span>
                                        </div>
                                    )}
                                    {parseFloat(pd.ooh) > 0 && (
                                        <div className="payout-row">
                                            <div className="payout-label-col">
                                                <span>Out of Hours Payout (OOH)</span>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{pd.oohBreakdown}</div>
                                            </div>
                                            <span className="payout-amount">+ {cur} {pd.ooh}</span>
                                        </div>
                                    )}
                                    <div className="payout-total-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #6366f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#6366f1' }}>Net Payout</span>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#6366f1' }}>{cur} {parseFloat(detailTicket.eng_total_cost || pd.totalPayout).toFixed(2)}</span>
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
