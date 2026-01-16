import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBox, FiUser, FiCheckCircle, FiTool, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import './CustomersPage.css'; // Reusing customer styles for consistency

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AssetsPage = () => {
    const [assets, setAssets] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [stats, setStats] = useState({ total: 0, available: 0, assigned: 0, maintenance: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        serial_number: '',
        type: 'Tool',
        status: 'Available',
        assigned_to: '',
        cost: '',
        description: ''
    });

    useEffect(() => {
        fetchAssets();
        fetchStats();
        fetchEngineers();
    }, [search]);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/assets?search=${search}`);
            if (res.ok) setAssets(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/assets/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchEngineers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/engineers`);
            if (res.ok) {
                const data = await res.json();
                setEngineers(data.engineers || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        await fetch(`${API_BASE_URL}/assets/${id}`, { method: 'DELETE' });
        fetchAssets();
        fetchStats();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            assigned_to: formData.status === 'Assigned' ? formData.assigned_to : null
        };

        const url = editingAsset ? `${API_BASE_URL}/assets/${editingAsset.id}` : `${API_BASE_URL}/assets`;
        const method = editingAsset ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setIsModalOpen(false);
            setEditingAsset(null);
            setFormData({ name: '', serial_number: '', type: 'Tool', status: 'Available', assigned_to: '', cost: '', description: '' });
            fetchAssets();
            fetchStats();
        }
    };

    const openEdit = (asset) => {
        setEditingAsset(asset);
        setFormData({
            name: asset.name,
            serial_number: asset.serial_number,
            type: asset.type,
            status: asset.status,
            assigned_to: asset.assigned_to || '',
            cost: asset.cost,
            description: asset.description
        });
        setIsModalOpen(true);
    };

    return (
        <div className="customers-page">
            {/* Header */}
            <header className="page-header">
                <div>
                    <h2 className="page-title">Asset Management</h2>
                    <p className="page-subtitle">Track tools, equipment, and company assets.</p>
                </div>
                <button className="add-btn" onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}>
                    <FiPlus /> Add New Asset
                </button>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon--blue"><FiBox /></div>
                    <div className="stat-info">
                        <h3>{stats.total}</h3>
                        <p>Total Assets</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon--green"><FiCheckCircle /></div>
                    <div className="stat-info">
                        <h3>{stats.available}</h3>
                        <p>Available</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon--orange"><FiUser /></div>
                    <div className="stat-info">
                        <h3>{stats.assigned}</h3>
                        <p>Assigned</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon--red"><FiTool /></div>
                    <div className="stat-info">
                        <h3>{stats.maintenance}</h3>
                        <p>Maintenance</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Asset Name</th>
                            <th>Serial Number</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Cost ($)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.id}>
                                <td style={{ fontWeight: '500' }}>{asset.name}</td>
                                <td style={{ color: '#666' }}>{asset.serial_number || '--'}</td>
                                <td><span className="badge badge--gray">{asset.type}</span></td>
                                <td>
                                    <span className={`badge badge--${asset.status === 'Available' ? 'success' : asset.status === 'Assigned' ? 'warning' : 'danger'}`}>
                                        {asset.status}
                                    </span>
                                </td>
                                <td>{asset.engineer_name || '--'}</td>
                                <td>{asset.cost}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn" onClick={() => openEdit(asset)}><FiEdit2 /></button>
                                        <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(asset.id)}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && !loading && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No assets found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Asset Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Serial Number</label>
                                    <input value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option>Tool</option>
                                        <option>Vehicle</option>
                                        <option>Laptop</option>
                                        <option>Equipment</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option>Available</option>
                                        <option>Assigned</option>
                                        <option>Maintenance</option>
                                        <option>Retired</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Cost</label>
                                    <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                                </div>
                            </div>

                            {formData.status === 'Assigned' && (
                                <div className="form-group">
                                    <label>Assign To Engineer</label>
                                    <select required value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                                        <option value="">Select Engineer</option>
                                        {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingAsset ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetsPage;
