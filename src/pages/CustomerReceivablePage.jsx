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
            <header className="receivable-header-premium">
                <div className="header-top-premium">
                    <div className="breadcrumb-premium">Home &gt; Customer &gt; Customer Invoices</div>
                    <div className="user-badge-premium">
                        <FiUser style={{ marginRight: '8px' }} />
                        <span>Aimbot </span>
                        <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                        <small style={{ color: '#64748b' }}>#AIM-C-104</small>
                    </div>
                </div>

                <div className="header-main-premium">
                    <div className="receivable-title-premium">
                        <h2><FiDollarSign style={{ color: 'var(--crm-primary)' }} /> Customer Receivables</h2>
                        <p>Manage unbilled tickets, generate invoices, and track payments.</p>
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
            </header>

            <div className="stats-grid-premium">
                <div className="stat-card-premium">
                    <div className="stat-icon blue"><FiClock /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {parseFloat(stats.unbilled).toLocaleString()}</h3>
                        <p>Work To Be Billed</p>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon amber"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {parseFloat(stats.unpaid).toLocaleString()}</h3>
                        <p>Unpaid Invoices</p>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon emerald"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {parseFloat(stats.overdue || 0).toLocaleString()}</h3>
                        <p>Total Overdue</p>
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
                                        <th>Date</th>
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
                                    {filteredUnbilled.map((item, idx) => {
                                        const bd = item.breakdown || {};
                                        return (
                                            <tr key={item.id} className={selectedTicketIds.includes(item.id) ? 'selected' : ''}>
                                                <td><input type="checkbox" checked={selectedTicketIds.includes(item.id)} onChange={() => toggleTicket(item.id)} /></td>
                                                <td style={{ color: '#9ca3af', fontWeight: '500' }}>{String(idx + 1).padStart(2, '0')}</td>
                                                <td style={{ fontWeight: '500' }}>{new Date(item.task_start_date).toISOString().split('T')[0]}</td>
                                                <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.engineer_name || 'N/A'}</td>
                                                <td><span className="ticket-id">#{item.id}</span></td>
                                                <td className="cost-cell">
                                                    {bd.formattedHours || '00:00'}
                                                    {parseFloat(bd.billedHours || 0) > parseFloat(bd.totalHours || 0) && (
                                                        <span style={{ display: 'block', fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>
                                                            Billed: {bd.billedHours}h
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="cost-cell">
                                                    {bd.formattedOT || '--'}
                                                    {bd.otHours > 0 && <span className="badge-ot">1.5x</span>}
                                                </td>
                                                <td style={{ color: bd.ooh === 'Yes' ? '#ef4444' : '#9ca3af' }}>{bd.ooh || 'No'}</td>
                                                <td>
                                                    <span style={{ color: bd.ww === 'Yes' ? '#059669' : '#9ca3af', fontWeight: bd.ww === 'Yes' ? '700' : '400' }}>
                                                        {bd.ww || 'No'}
                                                    </span>
                                                    {bd.ww === 'Yes' && <span className="badge-ww">2.0x</span>}
                                                </td>
                                                <td style={{ color: bd.hw === 'Yes' ? '#ef4444' : '#9ca3af' }}>{bd.hw || 'No'}</td>
                                                <td className="cost-cell">{selectedCurrency} {parseFloat(bd.travelCost || 0).toFixed(0)}</td>
                                                <td className="cost-cell">{selectedCurrency} {parseFloat(bd.toolCost || 0).toFixed(0)}</td>
                                                <td style={{ fontWeight: '800', color: 'var(--crm-primary)', fontSize: '15px' }}>
                                                    {selectedCurrency} {parseFloat(bd.totalReceivable || item.total_cost).toFixed(2)}
                                                </td>
                                                <td><span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>PENDING</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="eye-btn-v3" style={{ background: 'transparent' }} title="View Ticket Details"><FiEye /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredUnbilled.length === 0 && (
                                        <tr><td colSpan="15" className="empty-state">No unbilled work found for the selected period.</td></tr>
                                    )}
                                </tbody>
                            </table>

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
                                {invoiceList.map(inv => (
                                    <tr key={inv.id}>
                                        <td><span className="ticket-id" style={{ background: '#e0e7ff', color: '#4338ca' }}>{inv.invoice_number}</span></td>
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
                                            {inv.status !== 'Paid' && (
                                                <button className="btn-secondary-premium" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => handleMarkPaid(inv.id)}>
                                                    Mark as Paid
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {invoiceList.length === 0 && (
                                    <tr><td colSpan="6" className="empty-state">No past invoices found.</td></tr>
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
