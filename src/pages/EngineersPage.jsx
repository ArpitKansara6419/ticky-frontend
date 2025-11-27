import { useEffect, useState } from 'react'
import { FiSearch, FiMoreVertical } from 'react-icons/fi'
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
            setEngineers(data.engineers || [])
        } catch (err) {
            console.error('Load engineers error', err)
            setError(err.message || 'Unable to load engineers')
        } finally {
            setLoading(false)
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
                        Manage your engineering team <span className="status-badge status-badge--active">Live Updates</span>
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
                                    <td colSpan={7} className="engineers-empty">
                                        Loading engineers...
                                    </td>
                                </tr>
                            ) : filteredEngineers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="engineers-empty">
                                        No engineers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredEngineers.map((eng) => (
                                    <tr key={eng.id}>
                                        <td>#{eng.id}</td>
                                        <td>
                                            <div className="engineer-name">{eng.name}</div>
                                        </td>
                                        <td>{eng.email}</td>
                                        <td>{eng.phone}</td>
                                        <td>
                                            <span className={`status-pill status-pill--${eng.status}`}>{eng.status}</span>
                                        </td>
                                        <td>{new Date(eng.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button className="action-btn">
                                                <FiMoreVertical />
                                            </button>
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
