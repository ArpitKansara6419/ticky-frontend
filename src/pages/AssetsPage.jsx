import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBox, FiUser, FiCheckCircle, FiTool, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import './AssetsPage.css';

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
        if (!window.confirm('Are you sure you want to delete this asset?')) return;
        await fetch(`${API_BASE_URL}/assets/${id}`, { method: 'DELETE' });
        fetchAssets();
        fetchStats();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            assigned_to: formData.status === 'Assigned' ? formData.assigned_to : null,
            cost: parseFloat(formData.cost) || 0
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
        <div className="assets-page">
            {/* Header */}
            <header className="assets-header">
                <div className="assets-title">
                    <h2>Asset Management</h2>
                    <p>Track tools, equipment, and company assets efficiently.</p>
                </div>
                <button className="assets-add-btn" onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}>
                    <FiPlus /> Add New Asset
                </button>
            </header>

            {/* Stats Cards */}
            <div className="assets-stats-grid">
                <div className="asset-stat-card">
                    <div className="asset-stat-icon asset-stat-icon--blue"><FiBox /></div>
                    <div className="asset-stat-info">
                        <h3>{stats.total}</h3>
                        <p>Total Assets</p>
                    </div>
                </div>
                <div className="asset-stat-card">
                    <div className="asset-stat-icon asset-stat-icon--green"><FiCheckCircle /></div>
                    <div className="asset-stat-info">
                        <h3>{stats.available}</h3>
                        <p>Available</p>
                    </div>
                </div>
                <div className="asset-stat-card">
                    <div className="asset-stat-icon asset-stat-icon--orange"><FiUser /></div>
                    <div className="asset-stat-info">
                        <h3>{stats.assigned}</h3>
                        <p>Assigned</p>
                    </div>
                </div>
                <div className="asset-stat-card">
                    <div className="asset-stat-icon asset-stat-icon--red"><FiTool /></div>
                    <div className="asset-stat-info">
                        <h3>{stats.maintenance}</h3>
                        <p>Maintenance</p>
                    </div>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="assets-filter-bar">
                <div className="assets-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search assets by name or serial..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="assets-table-container">
                <table className="assets-table">
                    <thead>
                        <tr>
                            <th>Asset Name</th>
                            <th>Serial Number</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Cost ($)</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.id}>
                                <td>
                                    <div className="asset-name">{asset.name}</div>
                                    <div style={{ fontSize: '12px', color: '#718096' }}>{asset.description}</div>
                                </td>
                                <td>
                                    {asset.serial_number ? <span className="asset-serial">{asset.serial_number}</span> : <span style={{ color: '#cbd5e0' }}>--</span>}
                                </td>
                                <td><span style={{ fontWeight: 500, color: '#4a5568' }}>{asset.type}</span></td>
                                <td>
                                    <span className={`asset-badge asset-badge--${asset.status.toLowerCase()}`}>
                                        {asset.status}
                                    </span>
                                </td>
                                <td>{asset.engineer_name || <span style={{ color: '#cbd5e0' }}>Unassigned</span>}</td>
                                <td style={{ fontFamily: 'monospace' }}>{asset.cost}</td>
                                <td>
                                    <div className="asset-actions" style={{ justifyContent: 'flex-end' }}>
                                        <button className="asset-action-btn" title="Edit" onClick={() => openEdit(asset)}><FiEdit2 /></button>
                                        <button className="asset-action-btn asset-action-btn--delete" title="Delete" onClick={() => handleDelete(asset.id)}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && !loading && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>No assets found matching your search.</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Loading assets...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="assets-modal-overlay">
                    <div className="assets-modal">
                        <div className="assets-modal-header">
                            <h3>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
                            <button className="assets-modal-close" onClick={() => setIsModalOpen(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="assets-form-group">
                                <label>Asset Name</label>
                                <input required placeholder="e.g. Hilti Drill X2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="assets-form-row">
                                <div className="assets-form-group">
                                    <label>Serial Number</label>
                                    <input placeholder="SN-12345" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                                </div>
                                <div className="assets-form-group">
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
                            <div className="assets-form-row">
                                <div className="assets-form-group">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option>Available</option>
                                        <option>Assigned</option>
                                        <option>Maintenance</option>
                                        <option>Retired</option>
                                    </select>
                                </div>
                                <div className="assets-form-group">
                                    <label>Cost</label>
                                    <input type="number" step="0.01" placeholder="0.00" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                                </div>
                            </div>

                            {formData.status === 'Assigned' && (
                                <div className="assets-form-group">
                                    <label>Assign To Engineer</label>
                                    <select required value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                                        <option value="">Select Engineer</option>
                                        {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="assets-form-group">
                                <label>Description</label>
                                <textarea rows="2" placeholder="Condition, purchase info, etc." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                            </div>

                            <div className="assets-modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingAsset ? 'Update Asset' : 'Create Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetsPage;
