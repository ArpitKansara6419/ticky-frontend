/* CustomerReceivablePage.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiFileText, FiCalendar, FiCheckCircle,
    FiAlertCircle, FiX, FiSearch, FiArrowRight, FiUser,
    FiBriefcase, FiHash, FiClock, FiEye, FiFilter, FiDownload
} from 'react-icons/fi';
import './CustomerReceivablePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CURRENCIES = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' }
];

const EXCHANGE_RATES = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.0
};

const MONTHS = [
    "All Months", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = ["All Years", "2024", "2025", "2026"];

const CustomerReceivablePage = () => {
    const [stats, setStats] = useState({ unbilled: 0, unpaid: 0, overdue: 0 });
    const [activeTab, setActiveTab] = useState('unbilled');
    const [unbilledList, setUnbilledList] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcTimezone, setCalcTimezone] = useState('Ticket Local');

    // --- FRONTEND CALCULATION ENGINE (Consistent with Tickets/Engineers Page) ---
    const calculateTicketCostFrontend = (ticket, forcedTZ, targetCurrency = 'USD') => {
        if (!ticket) return {};
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        const rateMultiplier = 1;

        const hr = parseFloat(ticket.hourly_rate || 0) * rateMultiplier;
        const hd = parseFloat(ticket.half_day_rate || 0) * rateMultiplier;
        const fd = parseFloat(ticket.full_day_rate || 0) * rateMultiplier;
        const billingType = ticket.billing_type || 'Hourly';

        // Helper for zoned time
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
            let totalRec = 0; let totalHrs = 0; let baseC = 0; let otP = 0; let oohP = 0; let spP = 0;
            logs.forEach(log => {
                if (!log.start_time || !log.end_time) return;
                const res = calculateTicketCostFrontend({ ...ticket, start_time: log.start_time, end_time: log.end_time, break_time: (log.break_time_mins || 0) * 60, time_logs: [] }, tz, targetCurrency);
                totalRec += parseFloat(res.totalReceivable || 0);
                totalHrs += parseFloat(res.totalHours || 0);
                baseC += parseFloat(res.baseCost || 0);
                otP += parseFloat(res.otPremium || 0);
                oohP += parseFloat(res.oohPremium || 0);
                spP += parseFloat(res.specialDayPremium || 0);
            });
            const totalOtHrs = totalHrs > 8 ? totalHrs - 8 : 0; // Simplified for multi-log view
            return {
                totalReceivable: totalRec.toFixed(2),
                baseCost: baseC, otPremium: otP, oohPremium: oohP, specialDayPremium: spP,
                totalHours: totalHrs, formattedHours: `${Math.floor(totalHrs)}h ${Math.round((totalHrs % 1) * 60)}m`,
                travelCost: parseFloat(ticket.travel_cost_per_day || 0) * logs.length,
                toolCost: parseFloat(ticket.tool_cost || 0),
                otHours: totalOtHrs,
                ooh: oohP > 0 ? 'Yes' : 'No',
                ww: spP > 0 ? 'Yes' : 'No', // For UI simplicity
                hw: spP > 0 ? 'Yes' : 'No'
            };
        }

        const s = new Date(ticket.start_time || ticket.task_start_date);
        const e = new Date(ticket.end_time || ticket.task_end_date || ticket.start_time);
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);
        const hrs = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brk) / 3600;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);

        // Wall-clock hour extraction to prevent timezone shift bugs for OOH check
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if (ticket.start_time && ticket.start_time.includes('T')) {
            startHr = parseInt(ticket.start_time.split('T')[1].split(':')[0], 10);
        }
        if (ticket.end_time && ticket.end_time.includes('T')) {
            endHr = parseInt(ticket.end_time.split('T')[1].split(':')[0], 10);
        }

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const HOLS = ['2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14', '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'];
        const isH = HOLS.includes(info.dateStr) || HOLS.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;
        const isO = (startHr < 8 || startHr >= 18 || endHr < 8 || endHr > 18 || hrs > 10) && hrs > 0;

        let base = 0, ot = 0, ooh = 0, sp = 0;
        if (billingType === 'Hourly') {
            const b = Math.max(2, hrs); base = b * hr; if (isSpecialDay) sp = base;
            else { if (b > 8) ot = (b - 8) * (hr * 0.5); if (isO && ot === 0) ooh = b * (hr * 0.5); }
        } else if (billingType === 'Half Day + Hourly') {
            base = hd + (hrs > 4 ? (hrs - 4) * hr : 0); if (isSpecialDay) sp = base;
            else { if (hrs > 8) ot = (hrs - 8) * (hr * 0.5); if (isO && ot === 0) ooh = base * 0.5; }
        } else if (billingType === 'Full Day + OT') {
            base = fd; if (isSpecialDay) { sp = base; if (hrs > 8) ot = (hrs - 8) * (hr * 1.0); }
            else { if (hrs > 8) ot = (hrs - 8) * (hr * 1.5); if (isO && ot === 0) ooh = base * 0.5; }
        } else if (billingType.includes('Monthly')) {
            base = parseFloat(ticket.monthly_rate) || 0;
            if (isSpecialDay) sp = hrs * (hr * 2.0);
            else { if (hrs > 8) ot = (hrs - 8) * (hr * 1.5); if (isO && ot === 0) ooh = hrs * (hr * 0.5); }
        } else if (billingType === 'Agreed Rate') { base = parseFloat(ticket.agreed_rate) || 0;
        } else if (billingType === 'Cancellation') { base = parseFloat(ticket.cancellation_fee) || 0; }

        const trav = parseFloat(ticket.travel_cost_per_day || 0);
        const tool = parseFloat(ticket.tool_cost || 0);
        const total = base + ot + ooh + sp + trav + tool;

        return {
            totalReceivable: total.toFixed(2), baseCost: base, otPremium: ot, oohPremium: ooh, specialDayPremium: sp,
            totalHours: hrs, formattedHours: `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`,
            travelCost: trav, toolCost: tool,
            otHours: hrs > 8 ? hrs - 8 : 0,
            ooh: ooh > 0 ? 'Yes' : 'No',
            ww: isWK ? 'Yes' : 'No',
            hw: isH ? 'Yes' : 'No'
        };
    };

    // Table Filters & Pagination
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedYear, setSelectedYear] = useState('All Years');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal / Selection
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [creating, setCreating] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
    });

    const [detailTicket, setDetailTicket] = useState(null);

    const handleOpenDetails = (ticket) => {
        setDetailTicket(ticket);
    };


    useEffect(() => {
        console.log("Receivable Page Loaded. Hub Status: Unbilled Work");
        fetchStats();
        fetchUnbilled();
        fetchInvoices();
    }, []);

    useEffect(() => {
        if (activeTab === 'unbilled') fetchUnbilled();
        else fetchInvoices();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error("Stats Fetch Error:", e); }
    };

    const fetchUnbilled = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/tickets/unbilled`);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetched Unbilled Tickets:", data.length);
                setUnbilledList(data);
            }
        } catch (e) { console.error("Unbilled Fetch Error:", e); }
        setLoading(false);
    };

    const fetchInvoices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/invoices`);
            if (res.ok) setInvoiceList(await res.json());
        } catch (e) { console.error("Invoice Fetch Error:", e); }
    };

    // Calculate Dynamic Unbilled Total based on Context (uses filteredUnbilled which already filters by currency)
    const dynamicUnbilledTotal = useMemo(() => {
        return unbilledList
            .filter(item => (item.currency || 'USD').toUpperCase() === selectedCurrency.toUpperCase())
            .reduce((sum, item) => {
                const bd = calculateTicketCostFrontend(item, calcTimezone, selectedCurrency);
                return sum + parseFloat(bd.totalReceivable);
            }, 0);
    }, [unbilledList, calcTimezone, selectedCurrency]);

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const calculateSelectedTotal = () => {
        return unbilledList
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => {
                const bd = calculateTicketCostFrontend(t, calcTimezone, selectedCurrency);
                return sum + parseFloat(bd.totalReceivable);
            }, 0)
            .toFixed(2);
    };

    const handleCreateInvoice = async () => {
        if (selectedTicketIds.length === 0) return;

        const selectedTickets = unbilledList.filter(t => selectedTicketIds.includes(t.id));
        const firstCustId = selectedTickets[0].customer_id;
        const isMixed = selectedTickets.some(t => t.customer_id !== firstCustId);

        if (isMixed) {
            alert('Selection Error: You cannot generate a single invoice for multiple customers. Please select tickets from ONLY one customer.');
            return;
        }

        setCreating(true);
        try {
            const amount = calculateSelectedTotal();
            const res = await fetch(`${API_BASE_URL}/invoices/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: firstCustId,
                    amount,
                    due_date: invoiceForm.dueDate,
                    notes: invoiceForm.notes,
                    ticket_ids: selectedTicketIds
                })
            });

            if (res.ok) {
                setSelectedTicketIds([]);
                fetchStats();
                fetchUnbilled();
                setActiveTab('invoices');
            } else { alert('Failed to generate invoice.'); }
        } catch (e) { console.error(e); }
        setCreating(false);
    };

    const handleMarkPaid = async (id) => {
        if (!confirm('Mark invoice as paid?')) return;
        try {
            await fetch(`${API_BASE_URL}/invoices/${id}/pay`, { method: 'POST' });
            fetchStats();
            fetchInvoices();
        } catch (e) { console.error(e); }
    };

    const handlePrintInvoice = (invoice) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice #${invoice.invoice_number}</title>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
                    .invoice-title { font-size: 32px; font-weight: bold; text-align: right; }
                    .meta { text-align: right; color: #666; font-size: 14px; margin-top: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    th { text-align: left; border-bottom: 2px solid #ddd; padding: 10px; color: #555; }
                    td { border-bottom: 1px solid #eee; padding: 10px; }
                    .total-box { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
                    .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">Awokta.</div>
                    <div>
                        <div class="invoice-title">INVOICE</div>
                        <div class="meta">#${invoice.invoice_number}<br>Date: ${new Date(invoice.issue_date).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 40px;">
                    <strong>Bill To:</strong><br>
                    ${invoice.customer_name}<br>
                    ${invoice.customer_company || ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Professional Services (Consolidated)</td>
                            <td>${selectedCurrency} ${parseFloat(invoice.amount).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total-box">
                    Total: ${selectedCurrency} ${parseFloat(invoice.amount).toFixed(2)}
                </div>

                <div class="footer">
                    Thank you for your business.<br>
                    Payment is due within 30 days.
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Reset pagination when filters or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedYear, selectedMonth, activeTab]);

    const filteredUnbilled = useMemo(() => {
        const search = searchTerm.toLowerCase().trim();
        return unbilledList.filter(item => {
            // 1. Currency filter — show only tickets matching selected currency
            const ticketCurrency = (item.currency || 'USD').toUpperCase();
            const filterCurrency = selectedCurrency.toUpperCase();
            if (ticketCurrency !== filterCurrency) return false;

            // 2. Search filter
            const custName = (item.customer_name || '').toLowerCase();
            const compName = (item.customer_company || '').toLowerCase();
            const engName = (item.engineer_name || '').toLowerCase();
            const ticketId = (item.id || '').toString();

            const matchesSearch = !search ||
                custName.includes(search) ||
                compName.includes(search) ||
                engName.includes(search) ||
                ticketId.includes(search);

            if (!matchesSearch) return false;

            // 3. Date filter (Permissive)
            if (selectedYear === 'All Years' && selectedMonth === 'All Months') return true;

            const tDate = new Date(item.task_start_date);
            const y = tDate.getFullYear().toString();
            const m = MONTHS[tDate.getMonth() + 1];

            const matchesYear = (selectedYear === 'All Years' || y === selectedYear);
            const matchesMonth = (selectedMonth === 'All Months' || m === selectedMonth);

            return matchesYear && matchesMonth;
        });
    }, [unbilledList, searchTerm, selectedYear, selectedMonth, selectedCurrency]);

    // Pagination Logic for Unbilled
    const totalUnbilledPages = Math.ceil(filteredUnbilled.length / itemsPerPage);
    const displayedUnbilled = filteredUnbilled.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Pagination Logic for Invoices
    const totalInvoicePages = Math.ceil(invoiceList.length / itemsPerPage);
    const displayedInvoices = invoiceList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const Pagination = ({ total, current, onChange }) => {
        if (total <= 1) return null;
        let pages = [];
        for (let i = 1; i <= total; i++) pages.push(i);

        return (
            <div className="pagination-container-premium">
                <button
                    className="pagination-btn"
                    disabled={current === 1}
                    onClick={() => onChange(current - 1)}
                >
                    Prev
                </button>
                {pages.map(p => (
                    <button
                        key={p}
                        className={`pagination-btn ${current === p ? 'active' : ''}`}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    className="pagination-btn"
                    disabled={current === total}
                    onClick={() => onChange(current + 1)}
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="receivable-page">
            <header className="receivable-header-premium">
                <div className="header-top-premium">
                    <div className="breadcrumb-premium">Accounting &gt; Receivables</div>
                    <div className="user-badge-premium">
                        <FiUser className="u-icon" />
                        <span>Admin Portal</span>
                        <div className="status-dot-active"></div>
                    </div>
                </div>

                <div className="header-main-premium">
                    <div className="receivable-title-premium">
                        <h2><FiDollarSign className="title-icon-glow" /> Customer Receivables</h2>
                        <p>Real-time financial tracking for all resolved tickets and generated invoices.</p>
                    </div>

                    <div className="header-actions-premium">
                        <div className="search-box-premium">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Client, Ticket OR Engineer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="receivable-filters-premium">
                            <select className="filter-select" value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select className="filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <div className="stats-grid-premium">
                <div className="stat-card-premium">
                    <div className="stat-icon blue"><FiClock /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {dynamicUnbilledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Work To Be Billed</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Pending invoice generation</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon amber"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {((parseFloat(stats.unpaid) || 0) * (EXCHANGE_RATES[selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Unpaid Invoices</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Awaiting client payment</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon emerald"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {((parseFloat(stats.overdue) || 0) * (EXCHANGE_RATES[selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Total Overdue</p>
                        <small style={{ color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>Requires immediate action</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon blue" style={{ background: '#f0f9ff', color: '#0369a1' }}><FiDollarSign /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {((parseFloat(stats.paid) || 0) * (EXCHANGE_RATES[selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Collected Revenue</p>
                        <small style={{ color: '#059669', fontSize: '11px', fontWeight: '700' }}>Total for {new Date().getFullYear()}</small>
                    </div>
                </div>
            </div>

            <div className="tabs-container-premium">
                <button className={`tab-btn-premium ${activeTab === 'unbilled' ? 'active' : ''}`} onClick={() => setActiveTab('unbilled')}>
                    <FiClock /> Unbilled Work <span className="tab-badge">{unbilledList.length}</span>
                </button>
                <button className={`tab-btn-premium ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                    <FiFileText /> Invoice History
                </button>
            </div>

            {loading ? (
                <div className="loader-container">
                    <div className="spinner-premium"></div>
                    <p>Syncing financial records...</p>
                </div>
            ) : (
                <div className="table-card-premium">
                    {activeTab === 'unbilled' ? (
                        <>
                            <div className="table-wrapper-premium">
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input type="checkbox"
                                                    checked={selectedTicketIds.length === filteredUnbilled.length && filteredUnbilled.length > 0}
                                                    onChange={(e) => setSelectedTicketIds(e.target.checked ? filteredUnbilled.map(t => t.id) : [])}
                                                />
                                            </th>
                                            <th>Date</th>
                                            <th>Engineer</th>
                                            <th>Ticket</th>
                                            <th>Location</th>
                                            <th>Work Time</th>
                                            <th>Premiums</th>
                                            <th className="text-right">Expenses</th>
                                            <th className="text-right">Receivable</th>
                                            <th style={{ textAlign: 'center' }}>Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedUnbilled.map((item, idx) => {
                                            const bd = calculateTicketCostFrontend(item, calcTimezone, selectedCurrency);
                                            const firstLetter = (item.engineer_name || 'N').charAt(0);
                                            return (
                                                <tr key={item.id} className={selectedTicketIds.includes(item.id) ? 'selected' : ''}>
                                                    <td><input type="checkbox" checked={selectedTicketIds.includes(item.id)} onChange={() => toggleTicket(item.id)} /></td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{new Date(item.task_start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(item.task_start_date).getFullYear()}</div>
                                                    </td>
                                                    <td>
                                                        <div className="engineer-cell">
                                                            <div className="engineer-avatar">{firstLetter}</div>
                                                            <div style={{ fontWeight: '700' }}>{item.engineer_name || 'N/A'}</div>
                                                        </div>
                                                    </td>
                                                    <td><span className="ticket-id-tag">#{item.id}</span></td>
                                                    <td>
                                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                                            {item.city || '-'}, {item.country || '-'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '700' }}>{bd.formattedHours || '00:00'}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {bd.otHours > 0 && <span className="multiplier-tag ot">OT 1.5x</span>}
                                                            {bd.ooh === 'Yes' && <span className="multiplier-tag ooh">OOH 1.5x</span>}
                                                            {bd.ww === 'Yes' && <span className="multiplier-tag ww">WKND 2.0x</span>}
                                                            {bd.hw === 'Yes' && <span className="multiplier-tag ww">HOL 2.0x</span>}
                                                            {!bd.otHours && bd.ooh !== 'Yes' && bd.ww !== 'Yes' && bd.hw !== 'Yes' && <span style={{ color: '#cbd5e1' }}>--</span>}
                                                        </div>
                                                    </td>
                                                    <td className="text-right">
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Travel: {parseFloat(bd.travelCost || 0).toFixed(0)}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Tools: {parseFloat(bd.toolCost || 0).toFixed(0)}</div>
                                                    </td>
                                                    <td className="receivable-amount">
                                                        {item.currency || 'USD'} {bd.totalReceivable}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button className="eye-btn-v3" title="View Detailed Breakdown" onClick={() => handleOpenDetails(item)}><FiEye /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUnbilled.length === 0 && (
                                            <tr><td colSpan="10" className="empty-state">No unbilled work found to match your criteria.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                total={totalUnbilledPages}
                                current={currentPage}
                                onChange={setCurrentPage}
                            />

                            {selectedTicketIds.length > 0 && (
                                <div className="selection-action-bar">
                                    <div className="selection-count">
                                        <strong>{selectedTicketIds.length}</strong>
                                        <span>Tickets selected for billing</span>
                                    </div>
                                    <div className="invoice-summary">
                                        <span>Consolidated Total</span>
                                        <div className="invoice_amount_wrap">
                                            <span className="amount-currency">{selectedCurrency}</span>
                                            <span className="amount-value">{calculateSelectedTotal()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                                        <button className="btn-wow-secondary" onClick={() => setSelectedTicketIds([])}>Cancel</button>
                                        <button
                                            className="btn-generate-premium"
                                            onClick={handleCreateInvoice}
                                            disabled={selectedTicketIds.length === 0}
                                        >
                                            {creating ? 'Creating Invoice...' : 'Generate Invoice'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="table-wrapper-premium">
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Issued Date</th>
                                            <th>Customer</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedInvoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td><span className="ticket-id-tag">{inv.invoice_number}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: '700' }}>{new Date(inv.issue_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(inv.issue_date).getFullYear()}</div>
                                                </td>
                                                <td style={{ fontWeight: '700', color: '#0f172a' }}>{inv.customer_name}</td>
                                                <td className="receivable-amount" style={{ color: '#1e293b' }}>{selectedCurrency} {parseFloat(inv.amount).toFixed(2)}</td>
                                                <td>
                                                    <span className={`status-badge ${inv.status.toLowerCase()}`}>
                                                        {inv.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="eye-btn-v3"
                                                            onClick={() => handlePrintInvoice(inv)}
                                                            title="Print Invoice"
                                                        >
                                                            <FiDownload />
                                                        </button>
                                                        {inv.status !== 'Paid' && (
                                                            <button
                                                                className="btn-primary-premium"
                                                                style={{ padding: '8px 16px', fontSize: '12px', height: '36px' }}
                                                                onClick={() => handleMarkPaid(inv.id)}
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoiceList.length === 0 && (
                                            <tr><td colSpan="6" className="empty-state">No past invoices found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                total={totalInvoicePages}
                                current={currentPage}
                                onChange={setCurrentPage}
                            />
                        </>
                    )}
                </div>
            )}

            {/* --- Ticket Detail Modal --- */}
            {detailTicket && (() => {
                const bd = calculateTicketCostFrontend(detailTicket, calcTimezone, selectedCurrency);
                const cur = detailTicket.currency || 'USD';
                const fmtTime = (v) => {
                    if (!v) return '—';
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
                };
                const fmtDate = (v) => {
                    if (!v) return '—';
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                };
                const savedTotal = parseFloat(detailTicket.total_cost) > 0 ? parseFloat(detailTicket.total_cost) : parseFloat(bd.totalReceivable);
                const adjustment = savedTotal - parseFloat(bd.totalReceivable);

                return (
                    <div className="modal-overlay-premium" onClick={() => setDetailTicket(null)}>
                        <div className="modal-content-premium" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header-premium">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="title-icon-glow" style={{ padding: '8px' }}><FiFileText size={20} /></div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>Ticket Cost Breakdown</h3>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{detailTicket.id} — {detailTicket.task_name}</span>
                                    </div>
                                </div>
                                <button className="close-btn-premium" onClick={() => setDetailTicket(null)}><FiX size={18} /></button>
                            </div>
                            <div className="modal-body-premium">

                                {/* Section 1: Overview */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    {[
                                        { label: 'Customer', value: detailTicket.customer_name || '—' },
                                        { label: 'Engineer', value: detailTicket.engineer_name || '—' },
                                        { label: 'Billing Type', value: detailTicket.billing_type || 'Hourly', highlight: true },
                                        { label: 'Currency', value: cur },
                                        { label: 'Service Date', value: fmtDate(detailTicket.task_start_date) + (detailTicket.task_end_date && detailTicket.task_end_date !== detailTicket.task_start_date ? ` → ${fmtDate(detailTicket.task_end_date)}` : '') },
                                        { label: 'Location', value: [detailTicket.city, detailTicket.country].filter(Boolean).join(', ') || '—' },
                                    ].map(item => (
                                        <div key={item.label} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: item.highlight ? 'var(--crm-primary, #7c3aed)' : '#1e293b' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Section 2: Time Logs */}
                                {(detailTicket.start_time || detailTicket.end_time) && (
                                    <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', border: '1px solid #c7d2fe', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#6d28d9', textTransform: 'uppercase', marginBottom: '12px' }}>⏱ Activity Time Log</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>TIME IN</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{fmtTime(detailTicket.start_time)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>TIME OUT</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{fmtTime(detailTicket.end_time)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>BREAK</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{detailTicket.break_time ? `${Math.floor(detailTicket.break_time / 60)} min` : '0 min'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>BILLABLE HRS</div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed' }}>{bd.formattedHours || `${parseFloat(bd.totalHours || 0).toFixed(2)}h`}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 3: Rates */}
                                <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>💰 Rate Card</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                        {[
                                            { label: 'Hourly Rate', value: detailTicket.hourly_rate },
                                            { label: 'Half Day Rate', value: detailTicket.half_day_rate },
                                            { label: 'Full Day Rate', value: detailTicket.full_day_rate },
                                            { label: 'Monthly Rate', value: detailTicket.monthly_rate },
                                            { label: 'Agreed / Fixed', value: detailTicket.agreed_rate },
                                            { label: 'Cancellation Fee', value: detailTicket.cancellation_fee },
                                        ].map(r => (
                                            <div key={r.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '2px' }}>{r.label}</div>
                                                <div style={{ fontSize: '14px', color: parseFloat(r.value) > 0 ? '#1e293b' : '#cbd5e1', fontWeight: '700' }}>
                                                    {parseFloat(r.value) > 0 ? `${cur} ${parseFloat(r.value).toFixed(2)}` : '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 4: Cost Breakdown */}
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>📊 Cost Breakdown</div>
                                    <div className="breakdown-list-premium">
                                        {detailTicket.billing_type === 'Cancellation' ? (
                                            <div className="breakdown-row highlight-premium">
                                                <span>Cancellation Penalty</span>
                                                <span>{cur} {parseFloat(bd.baseCost || 0).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="breakdown-row">
                                                    <span>Labor Base Cost</span>
                                                    <span>{cur} {parseFloat(bd.baseCost || 0).toFixed(2)}</span>
                                                </div>
                                                {parseFloat(bd.otPremium) > 0 && (
                                                    <div className="breakdown-row highlight-premium">
                                                        <span>Overtime (OT) 1.5x</span>
                                                        <span>+ {cur} {parseFloat(bd.otPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {parseFloat(bd.oohPremium) > 0 && (
                                                    <div className="breakdown-row highlight-premium">
                                                        <span>Out of Hours (OOH) 1.5x</span>
                                                        <span>+ {cur} {parseFloat(bd.oohPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {parseFloat(bd.specialDayPremium) > 0 && (
                                                    <div className="breakdown-row highlight-premium-gold">
                                                        <span>Weekend/Holiday Premium 2.0x</span>
                                                        <span>+ {cur} {parseFloat(bd.specialDayPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {parseFloat(bd.travelCost) > 0 && (
                                            <div className="breakdown-row">
                                                <span>Travel &amp; Logistics</span>
                                                <span>+ {cur} {parseFloat(bd.travelCost).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {parseFloat(detailTicket.tool_cost) > 0 && (
                                            <div className="breakdown-row">
                                                <span>Tools &amp; Material</span>
                                                <span>+ {cur} {parseFloat(detailTicket.tool_cost).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Math.abs(adjustment) > 0.01 && (
                                            <div className="breakdown-row highlight-premium">
                                                <span>Adjustments / Manual Entry</span>
                                                <span>{adjustment > 0 ? '+' : '-'} {cur} {Math.abs(adjustment).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="breakdown-total-premium" style={{ borderTop: '2px dashed #c7d2fe', marginTop: '15px', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Net Receivable</span>
                                        <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--crm-primary, #7c3aed)' }}>{cur} {savedTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Scope of Work */}
                                {detailTicket.scope_of_work && (
                                    <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Scope of Work</div>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{detailTicket.scope_of_work}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer-premium">
                                <button className="btn-primary-premium" onClick={() => setDetailTicket(null)}>Dismiss Breakdown</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CustomerReceivablePage;
