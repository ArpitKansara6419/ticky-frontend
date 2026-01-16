/* CustomerReceivablePage.jsx */
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiFileText, FiCalendar, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import './CustomerReceivablePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CustomerReceivablePage = () => {
    const [stats, setStats] = useState({ unbilled: 0, unpaid: 0, overdue: 0 });
    const [activeTab, setActiveTab] = useState('unbilled');
    const [unbilledList, setUnbilledList] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerTickets, setCustomerTickets] = useState([]);
    const [creating, setCreating] = useState(false);

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
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/unbilled`);
            if (res.ok) setUnbilledList(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchInvoices = async () => {
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
            if (res.ok) setCustomerTickets(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreateInvoice = async () => {
        if (!selectedCustomer) return;
        setCreating(true);
        try {
            const ticketIds = customerTickets.map(t => t.id);
            const amount = customerTickets.reduce((sum, t) => sum + parseFloat(t.total_cost || 0), 0);

            // Set due date to 30 days from now
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const res = await fetch(`${API_BASE_URL}/invoices/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: selectedCustomer.id,
                    amount,
                    due_date: dueDate.toISOString().split('T')[0],
                    ticket_ids: ticketIds
                })
            });

            if (res.ok) {
                // Success
                setSelectedCustomer(null);
                fetchStats();
                fetchUnbilled(); // Refresh list
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

    return (
        <div className="receivable-page">
            <header className="receivable-header">
                <div className="receivable-title">
                    <h2>Customer Receivables</h2>
                    <p>Track unbilled work, invoices, and payments.</p>
                </div>
            </header>

            <div className="receivable-stats-grid">
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--blue"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>${parseFloat(stats.unbilled).toFixed(2)}</h3>
                        <p>Unbilled Work</p>
                    </div>
                </div>
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--amber"><FiAlertCircle /></div>
                    <div className="stat-content">
                        <h3>${parseFloat(stats.unpaid).toFixed(2)}</h3>
                        <p>Unpaid Invoices</p>
                    </div>
                </div>
                <div className="receivable-stat-card">
                    <div className="stat-icon-wrapper stat-icon--green"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>${parseFloat(stats.overdue || 0).toFixed(2)}</h3>
                        <p>Overdue</p>
                    </div>
                </div>
            </div>

            <div className="receivable-tabs">
                <button className={`receivable-tab ${activeTab === 'unbilled' ? 'receivable-tab--active' : ''}`} onClick={() => setActiveTab('unbilled')}>Unbilled Work</button>
                <button className={`receivable-tab ${activeTab === 'invoices' ? 'receivable-tab--active' : ''}`} onClick={() => setActiveTab('invoices')}>Invoices</button>
            </div>

            {activeTab === 'unbilled' && (
                <div className="receivable-grid">
                    {unbilledList.map(item => (
                        <div className="unbilled-card" key={item.id}>
                            <div className="unbilled-header">
                                <div className="unbilled-customer">
                                    <h3>{item.name}</h3>
                                    <p>{item.company}</p>
                                </div>
                                <div className="unbilled-amount">
                                    <h4>${parseFloat(item.total_amount).toFixed(2)}</h4>
                                    <span>{item.ticket_count} Tickets</span>
                                </div>
                            </div>
                            <button className="create-invoice-btn" onClick={() => openInvoiceModal(item)}>Generate Invoice</button>
                        </div>
                    ))}
                    {unbilledList.length === 0 && !loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#718096', padding: '40px' }}>No unbilled work found.</div>}
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="invoices-table-container">
                    <table className="invoices-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Issue Date</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceList.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                                    <td>
                                        <div>{inv.customer_name}</div>
                                        <div style={{ fontSize: '12px', color: '#718096' }}>{inv.customer_company}</div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>${inv.amount}</td>
                                    <td>
                                        <span className={`invoice-status invoice-status--${inv.status.toLowerCase()}`}>{inv.status}</span>
                                    </td>
                                    <td>
                                        {inv.status !== 'Paid' && (
                                            <button className="action-btn" onClick={() => handleMarkPaid(inv.id)}>Mark Paid</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {invoiceList.length === 0 && !loading && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No invoices found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {selectedCustomer && (
                <div className="cr-modal-overlay">
                    <div className="cr-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Generate Invoice for {selectedCustomer.name}</h3>
                            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}><FiX /></button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
                            {customerTickets.map(t => (
                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #edf2f7' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t.task_name}</div>
                                        <div style={{ fontSize: '12px', color: '#718096' }}>{new Date(t.task_start_date).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ fontWeight: 600 }}>${t.total_cost}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <div style={{ fontSize: '14px', color: '#718096' }}>Total Invoice Amount</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#2b6cb0' }}>
                                ${customerTickets.reduce((s, t) => s + parseFloat(t.total_cost || 0), 0).toFixed(2)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setSelectedCustomer(null)} style={{ background: '#edf2f7', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleCreateInvoice} disabled={creating} style={{ background: '#4299e1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                {creating ? 'Generating...' : 'Confirm Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerReceivablePage;
