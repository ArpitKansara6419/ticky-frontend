// DashboardPage.jsx - Dashboard layout similar to provided Ticky screenshot (static UI only)
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

function DashboardPage() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear tokens from both storages for safety
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    navigate('/')
  }

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">t</div>
          <span className="sidebar-logo-text">ticky</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          <button className="sidebar-link sidebar-link--active" type="button">
            <span className="sidebar-link-icon">🏠</span>
            <span className="sidebar-link-label">Dashboard</span>
          </button>
          <button className="sidebar-link" type="button">
            <span className="sidebar-link-icon">👷</span>
            <span className="sidebar-link-label">Engineers</span>
          </button>
          <button className="sidebar-link" type="button">
            <span className="sidebar-link-icon">👥</span>
            <span className="sidebar-link-label">Customers</span>
          </button>
          <button className="sidebar-link" type="button">
            <span className="sidebar-link-icon">🎫</span>
            <span className="sidebar-link-label">Tickets</span>
          </button>
          <button className="sidebar-link" type="button">
            <span className="sidebar-link-icon">📦</span>
            <span className="sidebar-link-label">Asset Management</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-signout" type="button" onClick={handleLogout}>
            <span className="sidebar-link-icon">↩</span>
            <span className="sidebar-link-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {/* Top bar */}
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Welcome back &amp; have a great day at work!</h1>
            <p className="dashboard-subheading">Last login: just now &nbsp;|&nbsp; 21:51 (UTC)</p>
          </div>

          <div className="dashboard-user">
            <button className="dashboard-theme-toggle" type="button" aria-label="Toggle theme">
              🌙
            </button>
            <div className="dashboard-user-info">
              <div className="dashboard-avatar">TU</div>
              <div className="dashboard-user-meta">
                <span className="dashboard-user-name">Test User</span>
                <span className="dashboard-user-role">Admin</span>
              </div>
            </div>
          </div>
        </header>

        <section className="dashboard-section">
          {/* Quick actions */}
          <div className="dashboard-card-row">
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">Commonly used actions for quick access</p>

            <div className="quick-actions-grid">
              <div className="quick-card quick-card--ticket">
                <div className="quick-card-icon">📅</div>
                <h3 className="quick-card-title">New Ticket</h3>
                <p className="quick-card-text">Create support ticket</p>
              </div>

              <div className="quick-card quick-card--customer">
                <div className="quick-card-icon">👤</div>
                <h3 className="quick-card-title">Add Customer</h3>
                <p className="quick-card-text">Register new client</p>
              </div>

              <div className="quick-card quick-card--schedule">
                <div className="quick-card-icon">🔔</div>
                <h3 className="quick-card-title">Schedule Call</h3>
                <p className="quick-card-text">Book meeting time</p>
              </div>

              <div className="quick-card quick-card--reports">
                <div className="quick-card-icon">📊</div>
                <h3 className="quick-card-title">View Reports</h3>
                <p className="quick-card-text">Analytics dashboard</p>
              </div>
            </div>
          </div>

          {/* Filter by date */}
          <div className="dashboard-card-full">
            <div className="filter-header">
              <div className="filter-title-block">
                <div className="filter-icon">📅</div>
                <div>
                  <h2 className="section-title">Filter by Date</h2>
                  <p className="section-subtitle">View metrics for specific month and year</p>
                </div>
              </div>

              <div className="filter-controls">
                <label className="filter-control">
                  <span>Month</span>
                  <select>
                    <option>November</option>
                    <option>October</option>
                    <option>September</option>
                  </select>
                </label>
                <label className="filter-control">
                  <span>Year</span>
                  <select>
                    <option>2025</option>
                    <option>2024</option>
                    <option>2023</option>
                  </select>
                </label>
                <button type="button" className="filter-today-btn">
                  Today
                </button>
              </div>
            </div>

            <div className="filter-footer">
              <span>
                Viewing data for: <strong>November 2025</strong>
              </span>
              <span className="filter-compare">Compared to: October 2025</span>
            </div>
          </div>

          {/* Business overview cards */}
          <div className="dashboard-card-row">
            <h2 className="section-title">Business Overview</h2>

            <div className="overview-grid">
              <div className="overview-card">
                <div className="overview-header">
                  <div className="overview-icon overview-icon--receivable">📥</div>
                  <span className="overview-label">Customer Receivables</span>
                </div>
                <p className="overview-value">₹ 1,24,500</p>
                <span className="overview-pill overview-pill--up">19.1%&nbsp;▲</span>
              </div>

              <div className="overview-card">
                <div className="overview-header">
                  <div className="overview-icon overview-icon--payout">💸</div>
                  <span className="overview-label">Engineer Payout</span>
                </div>
                <p className="overview-value">₹ 84,200</p>
                <span className="overview-pill overview-pill--up">15.2%&nbsp;▲</span>
              </div>

              <div className="overview-card">
                <div className="overview-header">
                  <div className="overview-icon overview-icon--leads">🙋</div>
                  <span className="overview-label">Leads</span>
                </div>
                <p className="overview-value">94</p>
                <span className="overview-pill overview-pill--down">94.7%&nbsp;▼</span>
              </div>

              <div className="overview-card">
                <div className="overview-header">
                  <div className="overview-icon overview-icon--tickets">🎟</div>
                  <span className="overview-label">Total Tickets</span>
                </div>
                <p className="overview-value">218</p>
                <span className="overview-pill overview-pill--up">33.3%&nbsp;▲</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
