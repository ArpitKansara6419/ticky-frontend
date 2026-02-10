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

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const calculateSelectedTotal = () => {
        return unbilledList
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => {
                const val = t.breakdown?.totalReceivable || t.total_cost || 0;
                return sum + parseFloat(val);
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
            // 1. Search filter
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

            // 2. Date filter (Permissive)
            if (selectedYear === 'All Years' && selectedMonth === 'All Months') return true;

            const tDate = new Date(item.task_start_date);
            const y = tDate.getFullYear().toString();
            const m = MONTHS[tDate.getMonth() + 1];

            const matchesYear = (selectedYear === 'All Years' || y === selectedYear);
            const matchesMonth = (selectedMonth === 'All Months' || m === selectedMonth);

            return matchesYear && matchesMonth;
        });
    }, [unbilledList, searchTerm, selectedYear, selectedMonth]);

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
                        <h3>{selectedCurrency} {parseFloat(stats.unbilled).toLocaleString()}</h3>
                        <p>Work To Be Billed</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Pending invoice generation</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon amber"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {parseFloat(stats.unpaid).toLocaleString()}</h3>
                        <p>Unpaid Invoices</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Awaiting client payment</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon emerald"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {parseFloat(stats.overdue || 0).toLocaleString()}</h3>
                        <p>Total Overdue</p>
                        <small style={{ color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>Requires immediate action</small>
                    </div>
                </div>
            </div>

            <div className="tabs-container-premium">
                <button className={`tab-btn-premium ${activeTab === 'unbilled' ? 'active' : ''}`} onClick={() => setActiveTab('unbilled')}>
                    Unbilled Work <span className="tab-badge">{unbilledList.length}</span>
                </button>
                <button className={`tab-btn-premium ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                    Invoice History
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
                                            <th>SR.</th>
                                            <th><FiCalendar style={{ marginRight: '6px' }} /> Date</th>
                                            <th>Engineer</th>
                                            <th>Ticket ID</th>
                                            <th>Hours</th>
                                            <th>OT</th>
                                            <th>OOH</th>
                                            <th>Weekend</th>
                                            <th>Holiday</th>
                                            <th>Travel</th>
                                            <th>Tool</th>
                                            <th>Receivable</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedUnbilled.map((item, idx) => {
                                            const bd = item.breakdown || {};
                                            // Calculate actual SR based on page
                                            const srNumber = ((currentPage - 1) * itemsPerPage) + (idx + 1);
                                            return (
                                                <tr key={item.id} className={selectedTicketIds.includes(item.id) ? 'selected' : ''}>
                                                    <td><input type="checkbox" checked={selectedTicketIds.includes(item.id)} onChange={() => toggleTicket(item.id)} /></td>
                                                    <td style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px' }}>{String(srNumber).padStart(2, '0')}</td>
                                                    <td style={{ fontWeight: '700' }}>{new Date(item.task_start_date).toLocaleDateString()}</td>
                                                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{item.engineer_name || 'N/A'}</td>
                                                    <td><span className="ticket-id">#{item.id}</span></td>
                                                    <td className="cost-cell">
                                                        {bd.formattedHours || '00:00'}
                                                        {parseFloat(bd.billedHours || 0) > parseFloat(bd.totalHours || 0) && (
                                                            <span style={{ display: 'block', fontSize: '10px', color: '#f59e0b', fontWeight: '800' }}>
                                                                MIN {bd.billedHours}h
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="cost-cell">
                                                        {bd.formattedOT || '--'}
                                                        {bd.otHours > 0 && <span className="badge-ot">1.5x</span>}
                                                    </td>
                                                    <td style={{ color: bd.ooh === 'Yes' ? '#ef4444' : '#94a3b8' }}>{bd.ooh || 'No'}</td>
                                                    <td>
                                                        <span style={{ color: bd.ww === 'Yes' ? '#10b981' : '#94a3b8', fontWeight: bd.ww === 'Yes' ? '900' : '500' }}>
                                                            {bd.ww || 'No'}
                                                        </span>
                                                        {bd.ww === 'Yes' && <span className="badge-ww">2.0x</span>}
                                                    </td>
                                                    <td style={{ color: bd.hw === 'Yes' ? '#ef4444' : '#94a3b8' }}>{bd.hw || 'No'}</td>
                                                    <td className="cost-cell">{selectedCurrency} {parseFloat(bd.travelCost || 0).toFixed(0)}</td>
                                                    <td className="cost-cell">{selectedCurrency} {parseFloat(bd.toolCost || 0).toFixed(0)}</td>
                                                    <td style={{ fontWeight: '900', color: 'var(--crm-primary)', fontSize: '16px' }}>
                                                        {selectedCurrency} {parseFloat(bd.totalReceivable || item.total_cost).toFixed(2)}
                                                    </td>
                                                    <td><span className="status-pill-pending">PENDING</span></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button className="eye-btn-v3" title="View Detailed Breakdown" onClick={() => handleOpenDetails(item)}><FiEye /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUnbilled.length === 0 && (
                                            <tr><td colSpan="15" className="empty-state">No unbilled work found to match your criteria.</td></tr>
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
                                <div className="action-bar-premium">
                                    <div className="selection-info">
                                        Selected <strong>{selectedTicketIds.length}</strong> items for invoice generation
                                        <span className="total-display">Total: {selectedCurrency} {calculateSelectedTotal()}</span>
                                    </div>
                                    <div>
                                        <button className="btn-secondary-premium" onClick={() => setSelectedTicketIds([])}>Cancel Selection</button>
                                        <button
                                            className="btn-primary-premium"
                                            onClick={handleCreateInvoice}
                                            disabled={selectedTicketIds.length === 0}
                                        >
                                            {creating ? 'Processing...' : 'Generate Invoice'}
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
                                                <td><span className="ticket-id">{inv.invoice_number}</span></td>
                                                <td style={{ fontWeight: '500' }}>{new Date(inv.issue_date).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: '600' }}>{inv.customer_name}</td>
                                                <td style={{ fontWeight: '800', color: '#111827' }}>{selectedCurrency} {parseFloat(inv.amount).toFixed(2)}</td>
                                                <td>
                                                    <span style={{
                                                        background: inv.status === 'Paid' ? '#ecfdf5' : '#fef2f2',
                                                        color: inv.status === 'Paid' ? '#059669' : '#b91c1c',
                                                        padding: '4px 10px',
                                                        borderRadius: '99px',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}>
                                                        {inv.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="btn-secondary-premium"
                                                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                            onClick={() => handlePrintInvoice(inv)}
                                                            title="Download Invoice"
                                                        >
                                                            <FiDownload /> Print
                                                        </button>
                                                        {inv.status !== 'Paid' && (
                                                            <button
                                                                className="btn-primary-premium"
                                                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                                onClick={() => handleMarkPaid(inv.id)}
                                                                title="Mark as Paid"
                                                            >
                                                                <FiCheckCircle /> Mark Paid
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
            {detailTicket && (
                <div className="modal-overlay-premium" onClick={() => setDetailTicket(null)}>
                    <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-premium">
                            <h3>Ticket Cost Breakdown</h3>
                            <button className="close-btn-premium" onClick={() => setDetailTicket(null)}><FiX /></button>
                        </div>
                        <div className="modal-body-premium">
                            <div className="detail-grid-premium">
                                <div className="detail-item">
                                    <label>Ticket ID</label>
                                    <span>#{detailTicket.id}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Customer</label>
                                    <span>{detailTicket.customer_name}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Task Name</label>
                                    <span>{detailTicket.task_name}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Engineer</label>
                                    <span>{detailTicket.engineer_name}</span>
                                </div>
                            </div>

                            <hr className="divider-premium" />

                            <div className="breakdown-list-premium">
                                {detailTicket.billing_type === 'Cancellation' ? (
                                    <div className="breakdown-row highlight-premium">
                                        <span>Cancellation Fee</span>
                                        <span>{detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.cancellation_fee || 0).toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="breakdown-row">
                                            <span>Base Rate ({detailTicket.billing_type})</span>
                                            <span>{detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.baseCost || 0).toFixed(2)}</span>
                                        </div>

                                        {parseFloat(detailTicket.breakdown?.otPremium) > 0 && (
                                            <div className="breakdown-row highlight-premium">
                                                <span>Overtime Premium (1.5x)</span>
                                                <span>+ {detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.otPremium).toFixed(2)}</span>
                                            </div>
                                        )}

                                        {parseFloat(detailTicket.breakdown?.oohPremium) > 0 && (
                                            <div className="breakdown-row highlight-premium">
                                                <span>Out of Hours Premium (1.5x)</span>
                                                <span>+ {detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.oohPremium).toFixed(2)}</span>
                                            </div>
                                        )}

                                        {parseFloat(detailTicket.breakdown?.specialDayPremium) > 0 && (
                                            <div className="breakdown-row highlight-premium-gold">
                                                <span>Weekend/Holiday Premium (2.0x)</span>
                                                <span>+ {detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.specialDayPremium).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {parseFloat(detailTicket.breakdown?.travelCost) > 0 && (
                                    <div className="breakdown-row">
                                        <span>Travel / Transport</span>
                                        <span>+ {detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.travelCost || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                {parseFloat(detailTicket.breakdown?.toolCost) > 0 && (
                                    <div className="breakdown-row">
                                        <span>Tools / Equipment</span>
                                        <span>+ {detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.toolCost || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="breakdown-row total-row-premium">
                                    <span>Net Receivable</span>
                                    <span>{detailTicket.currency || selectedCurrency} {parseFloat(detailTicket.breakdown?.totalReceivable || detailTicket.total_cost || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer-premium">
                            <button className="btn-primary-premium" onClick={() => setDetailTicket(null)}>Close Details</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerReceivablePage;

