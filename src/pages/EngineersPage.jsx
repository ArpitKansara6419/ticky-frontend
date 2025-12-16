import { useEffect, useState } from 'react'
import { FiSearch, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi'
import './EngineersPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function EngineersPage() {
    const [engineers, setEngineers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchEngineers()
    }, [])

    const fetchEngineers = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_BASE_URL}/engineers`, { credentials: 'include' })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || 'Unable to load engineers')
            }
            // Sort by ID ascending
            const sorted = (data.engineers || []).sort((a, b) => a.id - b.id)
            setEngineers(sorted)
        } catch (err) {
            console.error('Load engineers error', err)
            setError(err.message || 'Unable to load engineers')
        } finally {
            setLoading(false)
        }
    }

    const handleView = (engineer) => {
        alert(`Viewing engineer: ${engineer.name}\nEmail: ${engineer.email}\nPhone: ${engineer.phone}`)
    }

    const handleEdit = (engineer) => {
        alert(`Edit functionality coming soon for: ${engineer.name}`)
    }

    const handleDelete = async (engineer) => {
        if (!window.confirm(`Are you sure you want to delete ${engineer.name}?`)) {
            return
        }

        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${engineer.id}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (!res.ok) {
                throw new Error('Failed to delete engineer')
            }
            await fetchEngineers()
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete engineer')
        }
    }

    const filteredEngineers = engineers.filter((eng) => {
        const term = searchTerm.toLowerCase()
        return (
            eng.name.toLowerCase().includes(term) ||
            eng.email.toLowerCase().includes(term) ||
            eng.phone.toLowerCase().includes(term)
        )
    })

    return (
        <section className="engineers-page">
            <header className="engineers-header">
                <div>
                    <h1 className="engineers-title">Engineers</h1>
                    <p className="engineers-subtitle">
                        Manage your engineering team
                    </p>
                </div>
                {/* No Add Button as per requirement */}
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
                                            <div className="engineer-name">{eng.name}</div>
                                        </td>
                                        <td>{eng.city || eng.address || '-'}</td>
                                        <td>{eng.email}</td>
                                        <td>{eng.phone}</td>
                                        <td>
                                            <span className={`status-pill status-pill--${eng.status}`}>{eng.status}</span>
                                        </td>
                                        <td>{new Date(eng.createdAt).toLocaleDateString()}</td>
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
                                                    className="action-icon-btn edit-btn"
                                                    onClick={() => handleEdit(eng)}
                                                    title="Edit"
                                                >
                                                    <FiEdit2 />
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
