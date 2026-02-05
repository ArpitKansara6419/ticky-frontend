/* CustomerReceivablePage.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiFileText, FiCalendar, FiCheckCircle,
    FiAlertCircle, FiX, FiSearch, FiArrowRight, FiUser,
    FiBriefcase, FiHash, FiClock
} from 'react-icons/fi';
import './CustomerReceivablePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CustomerReceivablePage = () => {
    const [stats, setStats] = useState({ unbilled: 0, unpaid: 0, overdue: 0 });
    const [activeTab, setActiveTab] = useState('unbilled');
    const [unbilledList, setUnbilledList] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
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

    const filteredInvoices = useMemo(() => {
        return invoiceList.filter(inv =>
            inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.customer_company.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [invoiceList, searchTerm]);

    return (
        <div className="receivable-page">
            <header className="receivable-header">
                <div className="receivable-title">
                    <h2>Customer Receivables</h2>
                    <p>Manage unbilled work and track client payments professionally.</p>
                </div>
                <div className="receivable-actions">
                    <div className="search-bar-receivable">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search customers or invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="receivable-stats-grid">
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--blue"><FiClock /></div>
                    <div className="stat-content">
                        <h3>{stats.currency || '$'}{parseFloat(stats.unbilled).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p>Work To Be Billed</p>
                    </div>
                </div>
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--amber"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>{stats.currency || '$'}{parseFloat(stats.unpaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p>Unpaid Invoices</p>
                    </div>
                </div>
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--green"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>{stats.currency || '$'}{parseFloat(stats.overdue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p>Total Overdue</p>
                    </div>
                </div>
            </div>

            <div className="receivable-tabs">
                <button
                    className={`receivable-tab ${activeTab === 'unbilled' ? 'receivable-tab--active' : ''}`}
                    onClick={() => setActiveTab('unbilled')}
                >
                    Unbilled Work
                </button>
                <button
                    className={`receivable-tab ${activeTab === 'invoices' ? 'receivable-tab--active' : ''}`}
                    onClick={() => setActiveTab('invoices')}
                >
                    Invoice History
                </button>
            </div>

            {loading ? (
                <div className="loading-state-cr">
                    <div className="spinner-cr"></div>
                    <p>Loading records...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'unbilled' && (
                        <div className="receivable-grid">
                            {filteredUnbilled.map(item => (
                                <div className="unbilled-card-v2" key={item.id}>
                                    <div className="unbilled-v2-header">
                                        <div className="customer-avatar-cr">
                                            <FiUser />
                                        </div>
                                        <div className="customer-meta-cr">
                                            <h3>{item.name}</h3>
                                            <p>{item.company}</p>
                                        </div>
                                    </div>
                                    <div className="unbilled-v2-body">
                                        <div className="unbilled-v2-stat">
                                            <label>Total Tickets</label>
                                            <span>{item.ticket_count}</span>
                                        </div>
                                        <div className="unbilled-v2-stat">
                                            <label>Pending Amount</label>
                                            <span className="amount-highlight">${parseFloat(item.total_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button className="generate-btn-v2" onClick={() => openInvoiceModal(item)}>
                                        Review & Invoice <FiArrowRight />
                                    </button>
                                </div>
                            ))}
                            {filteredUnbilled.length === 0 && (
                                <div className="empty-state-cr">
                                    <FiCheckCircle size={48} />
                                    <p>No unbilled work found for your search.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                        <div className="invoices-table-container-v2">
                            <table className="invoices-table-v2">
                                <thead>
                                    <tr>
                                        <th><FiHash /> Invoice #</th>
                                        <th><FiCalendar /> Issued</th>
                                        <th><FiUser /> Customer</th>
                                        <th><FiDollarSign /> Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-mono">{inv.invoice_number}</td>
                                            <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                                            <td>
                                                <div className="td-customer-info">
                                                    <strong>{inv.customer_name}</strong>
                                                    <span>{inv.customer_company}</span>
                                                </div>
                                            </td>
                                            <td className="font-bold text-dark">${parseFloat(inv.amount).toFixed(2)}</td>
                                            <td>
                                                <span className={`invoice-pill status-${inv.status.toLowerCase()}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td>
                                                {inv.status !== 'Paid' && (
                                                    <button className="mark-paid-btn" onClick={() => handleMarkPaid(inv.id)}>
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '100px 0', color: '#718096' }}>
                                                <FiFileText size={48} style={{ opacity: 0.2, marginBottom: '10px' }} /><br />
                                                No invoices found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Professional Modal */}
            {selectedCustomer && (
                <div className="crm-overlay" onClick={() => setSelectedCustomer(null)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <div>
                                <h3>Generate Invoice</h3>
                                <p>Reviewing {selectedCustomer.name}</p>
                            </div>
                            <button className="crm-close" onClick={() => setSelectedCustomer(null)}><FiX /></button>
                        </div>

                        <div className="crm-modal-content">
                            <div className="crm-ticket-list">
                                <div className="crm-list-header">
                                    <label>Select Work Items</label>
                                    <span>{selectedTicketIds.length} Selected</span>
                                </div>
                                {customerTickets.map(t => (
                                    <div
                                        key={t.id}
                                        className={`crm-ticket-row ${selectedTicketIds.includes(t.id) ? 'crm-row--selected' : ''}`}
                                        onClick={() => toggleTicket(t.id)}
                                    >
                                        <div className="crm-row-check">
                                            <div className={`custom-checkbox ${selectedTicketIds.includes(t.id) ? 'checked' : ''}`}>
                                                {selectedTicketIds.includes(t.id) && <FiCheckCircle />}
                                            </div>
                                        </div>
                                        <div className="crm-row-meta">
                                            <strong>{t.task_name}</strong>
                                            <p>{new Date(t.task_start_date).toLocaleDateString()} • {t.billing_type || 'Hourly'}</p>
                                        </div>
                                        <div className="crm-row-amount">
                                            ${parseFloat(t.total_cost || 0).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="crm-billing-details">
                                <div className="crm-form-group">
                                    <label>Payment Due Date</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.dueDate}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="crm-form-group">
                                    <label>Invoice Notes (Optional)</label>
                                    <textarea
                                        placeholder="Add notes for the client..."
                                        value={invoiceForm.notes}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <div className="crm-total-block">
                                    <div className="crm-total-row">
                                        <span>Subtotal ({selectedTicketIds.length} items)</span>
                                        <span>${calculateSelectedTotal()}</span>
                                    </div>
                                    <div className="crm-total-row crm-total-grand">
                                        <span>Total Receivable</span>
                                        <span>${calculateSelectedTotal()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="crm-modal-footer">
                            <button className="crm-btn-cancel" onClick={() => setSelectedCustomer(null)}>Cancel</button>
                            <button
                                className="crm-btn-submit"
                                onClick={handleCreateInvoice}
                                disabled={creating || selectedTicketIds.length === 0}
                            >
                                {creating ? 'Generating Invoice...' : 'Generate & Send Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerReceivablePage;
