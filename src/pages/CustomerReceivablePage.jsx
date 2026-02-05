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
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2024", "2025", "2026"];

const CustomerReceivablePage = () => {
    const [stats, setStats] = useState({ unbilled: 0, unpaid: 0, overdue: 0 });
    const [activeTab, setActiveTab] = useState('unbilled');
    const [unbilledList, setUnbilledList] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Table Filters
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedYear, setSelectedYear] = useState('2025');
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
    const [paymentFilter, setPaymentFilter] = useState('Pending'); // Pending, Processing, Completed

    // Modal / Detailed View
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerTickets, setCustomerTickets] = useState([]);
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [creating, setCreating] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchStats();
        if (activeTab === 'unbilled') fetchUnbilled();
        else fetchInvoices();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchUnbilled = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/unbilled`);
            if (res.ok) setUnbilledList(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/invoices`);
            if (res.ok) setInvoiceList(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const openInvoiceModal = async (customer) => {
        setSelectedCustomer(customer);
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/customer/${customer.id}/tickets`);
            if (res.ok) {
                const tickets = await res.json();
                setCustomerTickets(tickets);
                setSelectedTicketIds(tickets.map(t => t.id)); // Select all by default
            }
        } catch (e) { console.error(e); }
    };

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const calculateSelectedTotal = () => {
        return customerTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => sum + parseFloat(t.total_cost || 0), 0)
            .toFixed(2);
    };

    const handleCreateInvoice = async () => {
        if (!selectedCustomer || selectedTicketIds.length === 0) {
            alert('Please select at least one ticket.');
            return;
        }

        setCreating(true);
        try {
            const amount = calculateSelectedTotal();

            const res = await fetch(`${API_BASE_URL}/invoices/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: selectedCustomer.id,
                    amount,
                    due_date: invoiceForm.dueDate,
                    notes: invoiceForm.notes,
                    ticket_ids: selectedTicketIds
                })
            });

            if (res.ok) {
                setSelectedCustomer(null);
                fetchStats();
                fetchUnbilled();
                setActiveTab('invoices');
            } else {
                alert('Failed to generate invoice.');
            }
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
        const t = searchTerm.toLowerCase().trim();
        return unbilledList.filter(item => {
            const name = (item.name || '').toLowerCase();
            const company = (item.company || '').toLowerCase();
            return name.includes(t) || company.includes(t);
        });
    }, [unbilledList, searchTerm]);

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

            {!selectedCurrency && (
                <div className="receivable-alert-v3">
                    <FiAlertCircle /> Please select a currency before proceeding.
                    <button className="close-alert-v3"><FiX /></button>
                </div>
            )}

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
                <button className={activeTab === 'unbilled' ? 'active' : ''} onClick={() => setActiveTab('unbilled')}>Unbilled Work</button>
                <button className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')}>Invoice History</button>
            </div>

            {loading ? (
                <div className="loading-v3"><div className="spinner-v3"></div><p>Syncing records...</p></div>
            ) : (
                <div className="receivable-table-container-v3">
                    {activeTab === 'unbilled' ? (
                        <table className="receivable-table-v3">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}><input type="checkbox" readOnly /></th>
                                    <th>Sr.</th>
                                    <th>Customer / Name</th>
                                    <th style={{ textAlign: 'center' }}>Tickets</th>
                                    <th style={{ textAlign: 'center' }}>Total Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUnbilled.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td><input type="checkbox" readOnly /></td>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div className="cust-info-v3">
                                                <strong>{item.name}</strong>
                                                <span>{item.company}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.ticket_count}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary-color)' }}>{selectedCurrency} {parseFloat(item.total_amount).toFixed(2)}</td>
                                        <td><span className="pill-pending-v3">Pending</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="eye-btn-v3" onClick={() => openInvoiceModal(item)}><FiEye /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUnbilled.length === 0 && (
                                    <tr><td colSpan="7" className="empty-v3">No unbilled work found for your filters.</td></tr>
                                )}
                            </tbody>
                        </table>
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
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Detailed Selection Modal (Matches image design) */}
            {selectedCustomer && (
                <div className="crm-overlay-v3" onClick={() => setSelectedCustomer(null)}>
                    <div className="crm-modal-v3" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header-v3">
                            <div className="modal-title-v3">
                                <h3>Invoice Breakdown: {selectedCustomer.name}</h3>
                                <p>Select specific tickets to generate a professional invoice.</p>
                            </div>
                            <button className="close-v3" onClick={() => setSelectedCustomer(null)}><FiX /></button>
                        </div>

                        <div className="crm-modal-body-v3">
                            <div className="detailed-table-wrapper-v3">
                                <table className="detailed-table-v3">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" checked={selectedTicketIds.length === customerTickets.length} onChange={(e) => setSelectedTicketIds(e.target.checked ? customerTickets.map(t => t.id) : [])} /></th>
                                            <th>Sr.</th>
                                            <th>Date</th>
                                            <th>Engineer</th>
                                            <th>Ticket</th>
                                            <th>Hours</th>
                                            <th>OT</th>
                                            <th>OOH</th>
                                            <th>WW</th>
                                            <th>HW</th>
                                            <th>Travel</th>
                                            <th>Tool</th>
                                            <th>Receivable</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerTickets.map((t, i) => {
                                            const bd = t.breakdown || {};
                                            return (
                                                <tr key={t.id} className={selectedTicketIds.includes(t.id) ? 'selected' : ''}>
                                                    <td><input type="checkbox" checked={selectedTicketIds.includes(t.id)} onChange={() => toggleTicket(t.id)} /></td>
                                                    <td>{i + 1}</td>
                                                    <td>{new Date(t.task_start_date).toISOString().split('T')[0]}</td>
                                                    <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '800', color: '#475569' }}>{t.engineer_name || 'N/A'}</td>
                                                    <td style={{ color: '#2563eb', fontWeight: '700' }}>#{t.id}</td>
                                                    <td style={{ fontWeight: '600' }}>{bd.formattedHours || '00:00:00'}</td>
                                                    <td style={{ color: bd.otHours > 0 ? '#e11d48' : 'inherit', fontWeight: bd.otHours > 0 ? '700' : '400' }}>{bd.formattedOT || '--'}</td>
                                                    <td>{bd.ooh || 'No'}</td>
                                                    <td>{bd.ww || 'No'}</td>
                                                    <td>{bd.hw || 'No'}</td>
                                                    <td>{selectedCurrency} {parseFloat(bd.travelCost || 0).toFixed(0)}</td>
                                                    <td>{selectedCurrency} {parseFloat(bd.toolCost || 0).toFixed(0)}</td>
                                                    <td style={{ fontWeight: '900', color: 'var(--primary-v3)', fontSize: '14px' }}>
                                                        {selectedCurrency} {parseFloat(bd.totalReceivable || t.total_cost).toFixed(2)}
                                                    </td>
                                                    <td>
                                                        <button className="eye-small-v3" title="View Ticket Details"><FiEye size={14} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="crm-modal-footer-v3">
                            <div className="total-indicator-v3">
                                <span>Grand Total:</span>
                                <strong>{selectedCurrency} {calculateSelectedTotal()}</strong>
                            </div>
                            <div className="footer-btns-v3">
                                <button className="crm-btn-cancel-v3" onClick={() => setSelectedCustomer(null)}>Cancel</button>
                                <button
                                    className="crm-btn-invoice-v3"
                                    onClick={handleCreateInvoice}
                                    disabled={selectedTicketIds.length === 0}
                                >
                                    {creating ? 'Processing...' : `Create Invoice for ${calculateSelectedTotal()}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerReceivablePage;
