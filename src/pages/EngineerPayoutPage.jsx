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
        if (!ticket) return { totalPayout: "0.00", totalHours: 0, base: "0.00", ot: "0.00", sp: "0.00", trav: "0.00", tool: "0.00" };
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // Resolve the target engineer ID (this is the engineer being viewed/calculated)
        const targetEngId = Number(selectedEngineerId);
        const engProfile = engineersList.find(e => Number(e.id) === targetEngId);

        let hr = parseFloat(ticket.eng_hourly_rate || 0);
        let hd = parseFloat(ticket.eng_half_day_rate || 0);
        let fd = parseFloat(ticket.eng_full_day_rate || 0);
        let billingType = ticket.eng_billing_type || 'Hourly';

        // FALLBACK: If pay type is DEFAULT, pull rates from the engineer's master profile
        if ((ticket.eng_pay_type === 'Default' || !ticket.eng_pay_type) && engProfile) {
            hr = parseFloat(engProfile.hourly_rate ?? engProfile.hourlyRate ?? 0);
            hd = parseFloat(engProfile.half_day_rate ?? engProfile.halfDayRate ?? 0);
            fd = parseFloat(engProfile.full_day_rate ?? engProfile.fullDayRate ?? 0);
            billingType = engProfile.billing_type ?? engProfile.billingType ?? 'Hourly';
        }

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
            let combinedBaseBD = "";
            let combinedOtBD = "";

            // Resolve the current target engineer ID. 
            const targetEngId = Number(selectedEngineerId);

            logs.forEach(log => {
                const logEngId = Number(log.engineer_id || log.engineerId || ticket.engineer_id || ticket.engineerId);
                
                // CRITICAL: Only process logs that belong to THIS engineer
                if (logEngId !== targetEngId) return;

                const logDate = (log.task_date || '').split('T')[0];
                if (logDate) {
                    const dObj = new Date(`${logDate}T00:00:00Z`);
                    const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
                    const HOLIDAYS_BY_COUNTRY = {
                        'India': ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'],
                        'Poland': ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25', '2026-12-26'],
                        'Other': []
                    };
                    const activeHols = HOLIDAYS_BY_COUNTRY[ticket.country] || HOLIDAYS_BY_COUNTRY['India'] || [];
                    const isHoliday = activeHols.includes(logDate);
                    if ((isWeekend || isHoliday) && (!log.start_time || !log.end_time)) return;
                }

                let sTime = log.start_time;
                let eTime = log.end_time;
                let brk = (log.break_time_mins || 0) * 60;

                if (!sTime || !eTime) {
                    const dStr = (log.task_date || log.start_time || '').split('T')[0];
                    if (!dStr) return;
                    const ct = String(ticket.task_time || '09:00').slice(0, 5);
                    const sDT = new Date(`${dStr}T${ct}:00Z`);
                    if (isNaN(sDT.getTime())) return;
                    sTime = sDT.toISOString();
                    const eDT = new Date(sDT.getTime() + 8 * 3600000);
                    eTime = eDT.toISOString();
                    brk = 0;
                }

                // Recursive call for single day logic
                const res = calculateEngineerPayoutFrontend({ ...ticket, start_time: sTime, end_time: eTime, break_time: brk, time_logs: [], _is_log_aggregation: true }, tz);
                
                totalHrs += parseFloat(res.totalHours || 0);
                
                // Flexible matching for billing types
                const bType = billingType.toLowerCase();
                if (bType.includes('hourly') || bType.includes('half') || bType.includes('full') || bType.includes('mixed') || bType.includes('monthly')) {
                    baseC += parseFloat(res.base || 0);
                    if (res.baseBreakdown) combinedBaseBD += (combinedBaseBD ? " + " : "") + res.baseBreakdown;
                }
                otP += parseFloat(res.ot || 0);
                if (res.otBreakdown) combinedOtBD += (combinedOtBD ? " + " : "") + res.otBreakdown;
                
                spP += parseFloat(res.sp || 0);
                // Travel and Tool costs are excluded from Engineer Payout
                travC = 0;
                toolC = 0;
            });

            // ── One-Time Fees Attribution ──────────────────────────────────
            const primaryEngId = Number(ticket.engineer_id || ticket.engineerId);
            const isPrimary = targetEngId === primaryEngId;

            if (isPrimary) {
               if (billingType === 'Agreed Rate') {
                   baseC = parseFloat(ticket.eng_agreed_rate || 0);
                   combinedBaseBD = "Fixed Agreed Rate";
               } else if (billingType === 'Cancellation') {
                   baseC = parseFloat(ticket.eng_cancellation_fee || 0);
                   combinedBaseBD = "Fixed Cancellation Fee";
               }
               const tOneTime = 0; // Excluded
               toolC = 0; // Excluded
            } else {
               if (billingType === 'Agreed Rate' || billingType === 'Cancellation') {
                   // No base for sub-eng on fixed tickets unless logs (which are summed above)
               }
            }

            totalRec = baseC + otP + spP; // Excluded travC and toolC
            return {
                totalPayout: totalRec.toFixed(2),
                base: baseC.toFixed(2), ot: otP.toFixed(2), sp: spP.toFixed(2), trav: travC.toFixed(2), tool: toolC.toFixed(2),
                baseBreakdown: combinedBaseBD || "N/A", otBreakdown: combinedOtBD || "",
                totalHours: totalHrs, otHours: totalHrs > 8 ? totalHrs - 8 : 0
            };
        }

        const sStr = ticket.start_time || ticket.task_start_date;
        const eStr = ticket.end_time || ticket.task_end_date || ticket.start_time;
        if (!sStr || !eStr) return { totalPayout: "0.00", totalHours: 0, base: "0.00", ot: "0.00", sp: "0.00", trav: "0.00", tool: "0.00" };

        const s = new Date(sStr.includes('T') ? sStr : `${sStr}T09:00:00Z`);
        const e = new Date(eStr.includes('T') ? eStr : `${eStr}T17:00:00Z`);
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);
        let hrs = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brk) / 3600;
        if (!ticket.start_time && !ticket.end_time && hrs > 8) hrs = 8;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if (sStr.includes('T')) startHr = parseInt(sStr.split('T')[1].split(':')[0], 10);
        if (eStr.includes('T')) endHr = parseInt(eStr.split('T')[1].split(':')[0], 10);

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const HOLS = ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'];
        const isH = HOLS.includes(info.dateStr) || HOLS.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;

        let base = 0, ot = 0, sp = 0;
        let baseBD = "", otBD = "";

        // Custom Rates
        const customOTRate = parseFloat(ticket.eng_overtime_rate) || (hr * 1.5);
        const customWeekendRate = parseFloat(ticket.eng_weekend_rate) || (hr * 2.0);
        const customHolidayRate = parseFloat(ticket.eng_holiday_rate) || (hr * 2.0);

        const bType = billingType.toLowerCase();
        if (bType.includes('hourly') && !bType.includes('half') && !bType.includes('full')) {
            const b = Math.max(2, hrs); 
            base = b * hr; 
            baseBD = `${b.toFixed(2)}h @ ${hr}`;
        } else if (bType.includes('half') && bType.includes('hourly')) {
            base = hrs <= 4 ? hd : hd + (hrs - 4) * hr;
            baseBD = hrs <= 4 ? `Half Day` : `Half Day + Extra`;
        } else if (bType.includes('full') && bType.includes('ot')) {
            base = fd; baseBD = `Full Day`;
            if (hrs > 8) { ot = (hrs - 8) * customOTRate; otBD = `OT`; }
        } else if (bType.includes('mixed')) {
            if (hrs <= 4) base = hd;
            else if (hrs <= 8) base = fd;
            else { base = fd; ot = (hrs - 8) * customOTRate; }
        } else if (bType.includes('monthly')) {
            base = (parseFloat(ticket.eng_monthly_rate || ticket.monthly_rate || 0)) / 30;
            if (hrs > 8) ot = (hrs - 8) * customOTRate;
        } else if (bType.includes('agreed')) {
            base = ticket._is_log_aggregation ? 0 : parseFloat(ticket.eng_agreed_rate || 0);
        } else if (bType.includes('cancellation')) {
            base = ticket._is_log_aggregation ? 0 : parseFloat(ticket.eng_cancellation_fee || 0);
        }

        if (isH) {
            sp = customHolidayRate;
        } else if (isWK) {
            sp = customWeekendRate;
        }

        // Engineer payouts should EXCLUDE travel and tool costs as per user requirement
        const trav = 0;
        const tool = 0;

        const total = base + ot + sp + trav + tool;
        return {
            totalPayout: total.toFixed(2),
            base: base.toFixed(2), ot: ot.toFixed(2), sp: sp.toFixed(2), trav: trav.toFixed(2), tool: tool.toFixed(2),
            baseBreakdown: baseBD, otBreakdown: otBD,
            totalHours: hrs, otHours: hrs > 8 ? hrs - 8 : 0,
            isSpecialDay
        };
    };

    return (
        <div className="payout-page">
            <header className="payout-header">
                <div className="header-title">
                    {selectedEngineerId ? (
                        <button className="btn-back" onClick={handleBackToEngineers}>
                            <FiArrowRight style={{ transform: 'rotate(180deg)' }} /> Back to Engineers
                        </button>
                    ) : null}
                    <h1>
                        {selectedEngineerId 
                          ? engineersList.find(e => e.id === selectedEngineerId)?.name || 'Engineer Detail'
                          : 'Engineer Payouts'}
                    </h1>
                    <p>{selectedEngineerId ? 'Displaying unpaid tickets for this engineer' : 'Manage and process payments for engineers'}</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn-refresh" 
                        onClick={selectedEngineerId ? () => fetchEngineerTickets(selectedEngineerId) : fetchEngineersSummary}
                        disabled={loading}
                    >
                        <FiRefreshCw className={loading ? 'spin' : ''} />
                    </button>
                    <button className="btn-secondary" onClick={async () => {
                        setProcessing(true);
                        try {
                            const res = await fetch(`${API_BASE_URL}/payouts/maintenance/recalculate`, { method: 'POST' });
                            if (res.ok) alert('All unpaid payouts recalculated.');
                        } catch (e) { alert('Maintenance failed.'); }
                        setProcessing(false);
                    }}>
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
                                                <span className="badge-ticket">{eng.ticket_count} tickets</span>
                                            </td>
                                            <td className="amount-cell">
                                                {selectedCurrency} {parseFloat(eng.total_payout_estimated).toFixed(2)}
                                            </td>
                                            <td>
                                                <button className="btn-action" onClick={() => fetchEngineerTickets(eng.id)}>
                                                    View Tickets <FiArrowRight />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="empty-row">No engineers with unpaid tickets found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            ) : (
                /* ENGINEER TICKETS VIEW */
                <main className="payout-content">
                    <div className="selection-bar">
                        <div className="selection-info">
                            <span className="count">{selectedTicketIds.length} tickets selected</span>
                            <span className="total">Total to Pay: <strong>{selectedCurrency} {
                                unpaidTickets
                                    .filter(t => selectedTicketIds.includes(t.id))
                                    .reduce((sum, t) => {
                                        const pd = calculateEngineerPayoutFrontend(t, calcTimezone);
                                        return sum + parseFloat(pd.totalPayout);
                                    }, 0).toFixed(2)
                            }</strong></span>
                        </div>
                        <button 
                            className="btn-primary" 
                            disabled={selectedTicketIds.length === 0 || processing}
                            onClick={handleProcessPayout}
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
                                            <td>{(() => {
                                                 const pd = calculateEngineerPayoutFrontend(ticket, calcTimezone);
                                                 return pd.totalHours.toFixed(2) + 'h';
                                             })()}</td>
                                            <td>{ticket.end_time ? new Date(ticket.end_time).toLocaleDateString() : 'N/A'}</td>
                                            <td className="amount-cell">${(() => {
                                                 const pd = calculateEngineerPayoutFrontend(ticket, calcTimezone);
                                                 return parseFloat(pd.totalPayout || ticket.eng_total_cost || 0).toFixed(2);
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
                                    <label>TASK</label>
                                    <p>{detailTicket.task_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>CUSTOMER</label>
                                    <p>{detailTicket.customer_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>WORK DURATION</label>
                                    <p>{(() => {
                                         const pd = calculateEngineerPayoutFrontend(detailTicket, calcTimezone);
                                         return pd.totalHours.toFixed(2);
                                     })()} hours</p>
                                </div>
                                <div className="detail-item">
                                    <label>PAYOUT TYPE</label>
                                    <p>{detailTicket.eng_pay_type || 'Default'} ({detailTicket.eng_billing_type || 'Hourly'})</p>
                                </div>
                            </div>

                            <div className="calculation-section">
                                <label>CALCULATION BREAKDOWN</label>
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
                                                    <span className="payout-amount">{cur} {pd.ot}</span>
                                                </div>
                                            )}
                                            {parseFloat(pd.trav) > 0 && (
                                                <div className="payout-row">
                                                    <span>Travel Reimbursement</span>
                                                    <span className="payout-amount">{cur} {pd.trav}</span>
                                                </div>
                                            )}
                                            {parseFloat(pd.tool) > 0 && (
                                                <div className="payout-row">
                                                    <span>Tool Charges</span>
                                                    <span className="payout-amount">{cur} {pd.tool}</span>
                                                </div>
                                            )}
                                            <div className="payout-total-line">
                                                <div className="total-box">
                                                    <span className="total-label">Net Payout</span>
                                                    <span className="total-value">{cur} {pd.totalPayout}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngineerPayoutPage;
