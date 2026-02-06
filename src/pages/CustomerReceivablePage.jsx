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

    // Table Filters
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedYear, setSelectedYear] = useState('All Years');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [paymentFilter, setPaymentFilter] = useState('Pending');

    // Modal / Selection
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [creating, setCreating] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
    });

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
            .reduce((sum, t) => sum + parseFloat(t.total_cost || 0), 0)
            .toFixed(2);
    };

    const handleCreateInvoice = async () => {
        if (selectedTicketIds.length === 0) return;
        const firstTicket = unbilledList.find(t => t.id === selectedTicketIds[0]);
        if (!firstTicket) return;

        setCreating(true);
        try {
            const amount = calculateSelectedTotal();
            const res = await fetch(`${API_BASE_URL}/invoices/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: firstTicket.customer_id,
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

    return (
        <div className="receivable-page">
            <header className="receivable-header-v3">
                <div className="header-top-v3">
                    <div className="breadcrumb-v3">Home &gt; Customer &gt; Customer Invoices</div>
                    <div className="user-badge-v3">
                        <span>Aimbot </span>
                        <small>#AIM-C-104</small>
                        <div className="avatar-small-v3"><FiUser /></div>
                    </div>
                </div>

                <div className="header-main-v3">
                    <div className="receivable-title-v3">
                        <h2><FiDollarSign /> Customer Receivables</h2>
                    </div>

                    <div className="receivable-filters-v3">
                        <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}>
                            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>

                        <div className="status-toggle-v3">
                            <button className={paymentFilter === 'Pending' ? 'active' : ''} onClick={() => setPaymentFilter('Pending')}>Pending</button>
                            <button className={paymentFilter === 'Processing' ? 'active' : ''} onClick={() => setPaymentFilter('Processing')}>Processing</button>
                            <button className={paymentFilter === 'Completed' ? 'active' : ''} onClick={() => setPaymentFilter('Completed')}>Completed</button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="receivable-stats-simple">
                <div className="simple-stat-card">
                    <div className="icon-box-v3 icon--teal"><FiClock /></div>
                    <div className="stat-info-v3">
                        <h3>{selectedCurrency} {parseFloat(stats.unbilled).toLocaleString()}</h3>
                        <p>Work To Be Billed</p>
                    </div>
                </div>
                <div className="simple-stat-card">
                    <div className="icon-box-v3 icon--gold"><FiFileText /></div>
                    <div className="stat-info-v3">
                        <h3>{selectedCurrency} {parseFloat(stats.unpaid).toLocaleString()}</h3>
                        <p>Unpaid Invoices</p>
                    </div>
                </div>
                <div className="simple-stat-card">
                    <div className="icon-box-v3 icon--green"><FiCheckCircle /></div>
                    <div className="stat-info-v3">
                        <h3>{selectedCurrency} {parseFloat(stats.overdue || 0).toLocaleString()}</h3>
                        <p>Total Overdue</p>
                    </div>
                </div>
            </div>

            <div className="receivable-tabs-v3">
                <button className={activeTab === 'unbilled' ? 'active' : ''} onClick={() => setActiveTab('unbilled')}>Unbilled Work ({unbilledList.length})</button>
                <button className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')}>Invoice History</button>
            </div>

            {loading ? (
                <div className="loading-v3"><div className="spinner-v3"></div><p>Syncing records...</p></div>
            ) : (
                <div className="receivable-table-container-v3">
                    {/* Debug View for troubleshooting */}
                    {searchTerm === 'debug' && (
                        <div style={{ padding: '10px', background: '#f1f5f9', fontSize: '12px', fontFamily: 'monospace', maxHeight: '200px', overflow: 'auto' }}>
                            <p><strong>Debug Data (First 3 items):</strong></p>
                            <pre>{JSON.stringify(unbilledList.slice(0, 3), null, 2)}</pre>
                            <p><strong>Stats:</strong> {JSON.stringify(stats)}</p>
                        </div>
                    )}

                    {activeTab === 'unbilled' ? (
                        <>
                            {/* Mismatch Warning */}
                            {filteredUnbilled.length === 0 && parseFloat(stats.unbilled) > 0 && selectedYear !== 'All Years' && (
                                <div style={{ padding: '10px 20px', background: '#fffbeb', borderLeft: '4px solid #f59e0b', color: '#92400e', marginBottom: '10px' }}>
                                    <FiAlertCircle style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                    You have <strong>{selectedCurrency} {stats.unbilled}</strong> in unbilled work, but no tickets are shown.
                                    Try switching the Year filter to <strong>All Years</strong>.
                                </div>
                            )}

                            <table className="receivable-table-v3">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" checked={selectedTicketIds.length === filteredUnbilled.length && filteredUnbilled.length > 0} onChange={(e) => setSelectedTicketIds(e.target.checked ? filteredUnbilled.map(t => t.id) : [])} /></th>
                                        <th>SR.</th>
                                        <th>DATE</th>
                                        <th>ENGINEER</th>
                                        <th>TICKET</th>
                                        <th>HOURS</th>
                                        <th>OT</th>
                                        <th>OOH</th>
                                        <th>WW</th>
                                        <th>HW</th>
                                        <th>TRAVEL</th>
                                        <th>TOOL</th>
                                        <th>RECEIVABLE</th>
                                        <th>PAYMENT STATUS</th>
                                        <th style={{ textAlign: 'center' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnbilled.map((item, idx) => {
                                        const bd = item.breakdown || {};
                                        return (
                                            <tr key={item.id} className={selectedTicketIds.includes(item.id) ? 'selected' : ''}>
                                                <td><input type="checkbox" checked={selectedTicketIds.includes(item.id)} onChange={() => toggleTicket(item.id)} /></td>
                                                <td>{idx + 1}</td>
                                                <td>{new Date(item.task_start_date).toISOString().split('T')[0]}</td>
                                                <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '800', color: '#475569' }}>{item.engineer_name || 'N/A'}</td>
                                                <td style={{ color: '#2563eb', fontWeight: '700' }}>#{item.id}</td>
                                                <td style={{ fontWeight: '600' }}>
                                                    {bd.formattedHours || '00:00:00'}
                                                    {parseFloat(bd.billedHours || 0) > parseFloat(bd.totalHours || 0) && (
                                                        <small style={{ display: 'block', fontSize: '10px', color: 'var(--accent-v3)' }}>
                                                            Billed: {bd.billedHours}h
                                                        </small>
                                                    )}
                                                </td>
                                                <td style={{ color: bd.otHours > 0 ? '#e11d48' : 'inherit', fontWeight: bd.otHours > 0 ? '700' : '400' }}>
                                                    {bd.formattedOT || '--'}
                                                    {bd.otHours > 0 && <small style={{ display: 'block', fontSize: '10px' }}>1.5x Applied</small>}
                                                </td>
                                                <td>{bd.ooh || 'No'}</td>
                                                <td style={{ color: bd.ww === 'Yes' ? '#059669' : 'inherit', fontWeight: bd.ww === 'Yes' ? '700' : '400' }}>
                                                    {bd.ww || 'No'}
                                                    {bd.ww === 'Yes' && <small style={{ display: 'block', fontSize: '10px' }}>2.0x Rate</small>}
                                                </td>
                                                <td>{bd.hw || 'No'}</td>
                                                <td>{selectedCurrency} {parseFloat(bd.travelCost || 0).toFixed(0)}</td>
                                                <td>{selectedCurrency} {parseFloat(bd.toolCost || 0).toFixed(0)}</td>
                                                <td style={{ fontWeight: '900', color: 'var(--primary-v3)', fontSize: '14px' }}>
                                                    {selectedCurrency} {parseFloat(bd.totalReceivable || item.total_cost).toFixed(2)}
                                                </td>
                                                <td><span className="pill-pending-v3">Pending</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="eye-btn-v3" title="View Ticket Details"><FiEye /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredUnbilled.length === 0 && (
                                        <tr><td colSpan="15" className="empty-v3">No unbilled work found for your filters.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="receivable-footer-action-v3">
                                <div className="footer-total-info-v3">
                                    <span>Selected: <strong>{selectedTicketIds.length} items</strong></span>
                                    <span>Total: <strong>{selectedCurrency} {calculateSelectedTotal()}</strong></span>
                                </div>
                                <div className="footer-btns-v3">
                                    <button className="crm-btn-cancel-v3" onClick={() => setSelectedTicketIds([])}>Cancel</button>
                                    <button
                                        className="crm-btn-invoice-v3"
                                        onClick={handleCreateInvoice}
                                        disabled={selectedTicketIds.length === 0}
                                    >
                                        {creating ? 'Processing...' : `Create Invoice for ${calculateSelectedTotal()}`}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <table className="receivable-table-v3">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Issued</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceList.map(inv => (
                                    <tr key={inv.id}>
                                        <td className="font-mono-v3">{inv.invoice_number}</td>
                                        <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                                        <td>{inv.customer_name}</td>
                                        <td style={{ fontWeight: '800' }}>{selectedCurrency} {parseFloat(inv.amount).toFixed(2)}</td>
                                        <td><span className={`pill-v3 status-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                                        <td>
                                            {inv.status !== 'Paid' && <button className="pay-btn-v3" onClick={() => handleMarkPaid(inv.id)}>Mark Paid</button>}
                                        </td>
                                    </tr>
                                ))}
                                {invoiceList.length === 0 && (
                                    <tr><td colSpan="6" className="empty-v3">No invoice history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerReceivablePage;
