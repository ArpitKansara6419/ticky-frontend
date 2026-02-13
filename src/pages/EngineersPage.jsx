
import React, { useEffect, useState } from 'react'
import { FiSearch, FiEye, FiEdit2, FiTrash2, FiArrowLeft, FiSave, FiCheck, FiX, FiBriefcase, FiDollarSign, FiClock, FiCalendar } from 'react-icons/fi'
import './EngineersPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const TAB_STYLE = {
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontWeight: '500',
    color: '#64748b'
};

const TAB_ACTIVE_STYLE = {
    ...TAB_STYLE,
    borderBottom: '2px solid #2563eb',
    color: '#2563eb',
    fontWeight: '600'
};

function EngineersPage() {
    // View State: 'list' or 'details'
    const [viewMode, setViewMode] = useState('list');
    const [selectedEngineer, setSelectedEngineer] = useState(null);

    // List State
    const [engineers, setEngineers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // Details State
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'tickets', 'charges'
    const [engTickets, setEngTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Charges Form State
    const [chargesForm, setChargesForm] = useState({
        jobType: 'Full Time',
        jobTitle: '',
        startDate: '',
        checkInTime: '',
        checkOutTime: '',
        currency: 'USD',
        hourlyRate: '',
        halfDayRate: '',
        fullDayRate: '',
        overtimeRate: '',
        oohRate: '',
        weekendRate: '',
        holidayRate: ''
    });
    const [savingCharges, setSavingCharges] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        fetchEngineers()
    }, [])

    // Fetch basic list
    const fetchEngineers = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_BASE_URL}/engineers`, { credentials: 'include' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Unable to load engineers')

            const sorted = (data.engineers || []).sort((a, b) => a.id - b.id)
            setEngineers(sorted)
        } catch (err) {
            console.error('Load engineers error', err)
            setError(err.message || 'Unable to load engineers')
        } finally {
            setLoading(false)
        }
    }

    // Fetch full details when entering Details view
    const fetchEngineerDetails = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const eng = data.engineer;
                setSelectedEngineer(eng);

                // Populate Form
                setChargesForm({
                    jobType: eng.employmentType || 'Full Time',
                    jobTitle: eng.jobTitle || '',
                    startDate: eng.startDate ? eng.startDate.split('T')[0] : '',
                    checkInTime: eng.checkInTime ? eng.checkInTime.slice(0, 5) : '',
                    checkOutTime: eng.checkOutTime ? eng.checkOutTime.slice(0, 5) : '',
                    currency: eng.currency || 'USD',
                    hourlyRate: eng.hourlyRate || '',
                    halfDayRate: eng.halfDayRate || '',
                    fullDayRate: eng.fullDayRate || '',
                    overtimeRate: eng.overtimeRate || '',
                    oohRate: eng.oohRate || '',
                    weekendRate: eng.weekendRate || '',
                    holidayRate: eng.holidayRate || ''
                });
            }
        } catch (e) { console.error(e); }
    };

    const fetchEngineerTickets = async (id) => {
        setLoadingTickets(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tickets?engineerId=${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEngTickets(data.tickets || []);
            }
        } catch (e) { console.error(e); }
        setLoadingTickets(false);
    };

    const handleView = (engineer) => {
        fetchEngineerDetails(engineer.id);
        fetchEngineerTickets(engineer.id);
        setViewMode('details');
        setActiveTab('profile'); // Default tab
    }

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedEngineer(null);
        setSaveMessage('');
    }

    const handleDelete = async (engineer) => {
        if (!window.confirm(`Are you sure you want to delete ${engineer.name}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${engineer.id}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (!res.ok) throw new Error('Failed to delete engineer')
            fetchEngineers()
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete engineer')
        }
    }

    const handleSaveCharges = async () => {
        setSavingCharges(true);
        setSaveMessage('');
        try {
            const payload = {
                ...selectedEngineer, // keep existing fields
                employmentType: chargesForm.jobType,
                jobTitle: chargesForm.jobTitle,
                startDate: chargesForm.startDate,
                checkInTime: chargesForm.checkInTime,
                checkOutTime: chargesForm.checkOutTime,
                currency: chargesForm.currency,
                hourlyRate: chargesForm.hourlyRate,
                halfDayRate: chargesForm.halfDayRate,
                fullDayRate: chargesForm.fullDayRate,
                overtimeRate: chargesForm.overtimeRate,
                oohRate: chargesForm.oohRate,
                weekendRate: chargesForm.weekendRate,
                holidayRate: chargesForm.holidayRate
            };

            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (res.ok) {
                setSaveMessage('Saved successfully');
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage('Failed to save');
            }
        } catch (e) {
            console.error(e);
            setSaveMessage('Error saving');
        }
        setSavingCharges(false);
    };

    const filteredEngineers = engineers.filter((eng) => {
        const term = searchTerm.toLowerCase()
        return (
            eng.name.toLowerCase().includes(term) ||
            eng.email.toLowerCase().includes(term) ||
            eng.phone.toLowerCase().includes(term)
        )
    })

    // --- Render ---

    if (viewMode === 'details' && selectedEngineer) {
        return (
            <div className="engineers-page details-view">
                <header className="engineers-header" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={handleBackToList} className="back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                            <FiArrowLeft size={24} color="#64748b" />
                        </button>
                        <div>
                            <h1 className="engineers-title">Engineer Details</h1>
                            <p className="engineers-subtitle">{selectedEngineer.name}</p>
                        </div>
                    </div>
                </header>

                <div className="tabs-header" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '25px' }}>
                    <div style={activeTab === 'profile' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('profile')}>PROFILE</div>
                    <div style={activeTab === 'tickets' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('tickets')}>TICKETS</div>
                    <div style={activeTab === 'charges' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('charges')}>CHARGES</div>
                </div>

                <div className="tab-content">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="profile-tab-content card-box">
                            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Personal Information</h3>
                            <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="detail-item">
                                    <label>Name</label>
                                    <div className="detail-value">{selectedEngineer.name}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Email</label>
                                    <div className="detail-value">{selectedEngineer.email}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Phone</label>
                                    <div className="detail-value">{selectedEngineer.phone}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Location</label>
                                    <div className="detail-value">{selectedEngineer.address || '-'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Status</label>
                                    <div className="detail-value">
                                        <span className={`status-pill status-pill--${selectedEngineer.status}`}>{selectedEngineer.status}</span>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>Joined</label>
                                    <div className="detail-value">{selectedEngineer.created_at ? new Date(selectedEngineer.created_at).toLocaleDateString() : '-'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TICKETS TAB */}
                    {activeTab === 'tickets' && (
                        <div className="tickets-tab-content">
                            {loadingTickets ? <p>Loading tickets...</p> : (
                                <div className="engineers-table-wrapper">
                                    <table className="engineers-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Task Name</th>
                                                <th>Customer</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th>Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {engTickets.map(t => (
                                                <tr key={t.id}>
                                                    <td>#AIM-T-{t.id}</td>
                                                    <td>{t.taskName}</td>
                                                    <td>{t.customerName}</td>
                                                    <td>{t.taskStartDate ? new Date(t.taskStartDate).toLocaleDateString() : '-'}</td>
                                                    <td><span className={`status-pill status-pill--${t.status?.toLowerCase().replace(' ', '')}`}>{t.status}</span></td>
                                                    <td>{t.city}, {t.country}</td>
                                                </tr>
                                            ))}
                                            {engTickets.length === 0 && <tr><td colSpan="6">No tickets found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CHARGES TAB */}
                    {activeTab === 'charges' && (
                        <div className="charges-tab-content card-box">
                            <div className="form-section">
                                <h4 className="section-head"><FiBriefcase /> Job Details</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Job Type *</label>
                                        <div className="radio-group" style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                                            {['Full Time', 'Part Time', 'Dispatch'].map(type => (
                                                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="jobType"
                                                        checked={chargesForm.jobType === type}
                                                        onChange={() => setChargesForm({ ...chargesForm, jobType: type })}
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Job Title *</label>
                                        <input type="text" className="form-input" value={chargesForm.jobTitle} onChange={e => setChargesForm({ ...chargesForm, jobTitle: e.target.value })} placeholder="e.g. Senior Technician" />
                                    </div>
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input type="date" className="form-input" value={chargesForm.startDate} onChange={e => setChargesForm({ ...chargesForm, startDate: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row two-col">
                                    <div className="form-group">
                                        <label>Check-In Time *</label>
                                        <input type="time" className="form-input" value={chargesForm.checkInTime} onChange={e => setChargesForm({ ...chargesForm, checkInTime: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Check-Out Time *</label>
                                        <input type="time" className="form-input" value={chargesForm.checkOutTime} onChange={e => setChargesForm({ ...chargesForm, checkOutTime: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 className="section-head"><FiDollarSign /> Costing & Rates</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Select Currency *</label>
                                        <select className="form-input" value={chargesForm.currency} onChange={e => setChargesForm({ ...chargesForm, currency: e.target.value })}>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="INR">INR (₹)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Hourly Charge</label>
                                        <input type="number" className="form-input" value={chargesForm.hourlyRate} onChange={e => setChargesForm({ ...chargesForm, hourlyRate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Half Day Charge</label>
                                        <input type="number" className="form-input" value={chargesForm.halfDayRate} onChange={e => setChargesForm({ ...chargesForm, halfDayRate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Full Day Charge</label>
                                        <input type="number" className="form-input" value={chargesForm.fullDayRate} onChange={e => setChargesForm({ ...chargesForm, fullDayRate: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 className="section-head"><FiClock /> Extra Work Pay</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Over Time (Hourly rate) *</label>
                                        <input type="number" className="form-input" value={chargesForm.overtimeRate} onChange={e => setChargesForm({ ...chargesForm, overtimeRate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Out of Office Hour (Hourly rate) *</label>
                                        <input type="number" className="form-input" value={chargesForm.oohRate} onChange={e => setChargesForm({ ...chargesForm, oohRate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Weekend (Hourly rate) *</label>
                                        <input type="number" className="form-input" value={chargesForm.weekendRate} onChange={e => setChargesForm({ ...chargesForm, weekendRate: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Public Holiday (Hourly rate) *</label>
                                        <input type="number" className="form-input" value={chargesForm.holidayRate} onChange={e => setChargesForm({ ...chargesForm, holidayRate: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '20px', textAlign: 'right' }}>
                                {saveMessage && <span style={{ marginRight: '10px', color: saveMessage.includes('Failed') ? 'red' : 'green' }}>{saveMessage}</span>}
                                <button className="save-btn" onClick={handleSaveCharges} disabled={savingCharges}>
                                    {savingCharges ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <style jsx>{`
                    .card-box { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                    .detail-item label { color: #64748b; font-size: 13px; font-weight: 500; display: block; margin-bottom: 4px; }
                    .detail-value { color: #1e293b; font-weight: 600; font-size: 15px; }
                    .form-section { margin-bottom: 30px; }
                    .section-head { color: #2563eb; display: flex; alignItems: center; gap: 8px; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
                    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                    .form-row.two-col { grid-template-columns: 1fr 1fr; }
                    .form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #475569; }
                    .form-input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; transition: all 0.2s; }
                    .form-input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
                    .save-btn { background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                    .save-btn:hover { background: #1d4ed8; }
                    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                `}</style>
            </div>
        );
    }

    return (
        <section className="engineers-page">
            <header className="engineers-header">
                <div>
                    <h1 className="engineers-title">Engineers</h1>
                    <p className="engineers-subtitle">
                        Manage your engineering team
                    </p>
                </div>
            </header>

            <section className="engineers-stats-row">
                <div className="engineers-stat-card">
                    <p className="stat-value">{engineers.length}</p>
                    <p className="stat-label">Total Engineers</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
            </section>

            <section className="engineers-content-card">
                <div className="engineers-toolbar">
                    <div className="engineers-search">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search engineers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && <div className="engineers-message engineers-message--error">{error}</div>}

                <div className="engineers-table-wrapper">
                    <table className="engineers-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Location</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="engineers-empty">
                                        Loading engineers...
                                    </td>
                                </tr>
                            ) : filteredEngineers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="engineers-empty">
                                        No engineers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredEngineers.map((eng) => (
                                    <tr key={eng.id}>
                                        <td>#AIM-E-{eng.id}</td>
                                        <td>
                                            <div className="engineer-name" onClick={() => handleView(eng)} style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}>{eng.name}</div>
                                        </td>
                                        <td>{eng.city || eng.address || '-'}</td>
                                        <td>{eng.email}</td>
                                        <td>{eng.phone}</td>
                                        <td>
                                            <span className={`status-pill status-pill--${eng.status}`}>{eng.status}</span>
                                        </td>
                                        <td>{new Date(eng.createdAt).toISOString().split('T')[0]}</td>
                                        <td>
                                            <div className="engineer-actions">
                                                <button
                                                    className="action-icon-btn view-btn"
                                                    onClick={() => handleView(eng)}
                                                    title="View"
                                                >
                                                    <FiEye />
                                                </button>
                                                <button
                                                    className="action-icon-btn delete-btn"
                                                    onClick={() => handleDelete(eng)}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    )
}

export default EngineersPage
