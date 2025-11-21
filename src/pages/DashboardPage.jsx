// DashboardPage.jsx - Main dashboard shell with sidebar navigation, theme toggle and content sections
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomersPage from './CustomersPage'
import LeadsPage from './LeadsPage'
import {
  FiHome,
  FiUsers,
  FiUser,
  FiUserCheck,
  FiTarget,
  FiCreditCard,
  FiFileText,
  FiTag,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiBarChart2,
  FiClock,
  FiCoffee,
  FiBookOpen,
  FiMonitor,
  FiBell,
  FiSettings,
  FiLogOut,
  FiMoreVertical,
  FiSun,
  FiMoon,
  FiColumns,
  FiMaximize2,
  FiShield,
  FiUserPlus,
  FiPhoneCall,
  FiX,
  FiCamera,
} from 'react-icons/fi'
import './DashboardPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const MAIN_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiHome },
  { id: 'engineers', label: 'Engineers', icon: FiUsers },
  { id: 'customers', label: 'Customers', icon: FiUserCheck },
  { id: 'leads', label: 'Leads', icon: FiTarget },
  { id: 'engineerPayout', label: 'Engineer Payout', icon: FiCreditCard },
  { id: 'customerReceivable', label: 'Customer Receivable', icon: FiFileText },
  { id: 'tickets', label: 'Tickets', icon: FiTag },
  { id: 'assetManagement', label: 'Asset Management', icon: FiBox },
  { id: 'projectManagement', label: 'Project Management', icon: FiBriefcase },
  { id: 'meeting', label: 'Meeting', icon: FiCalendar },
  { id: 'sampleReports', label: 'Sample Reports', icon: FiBarChart2 },
  { id: 'attendance', label: 'Attendance', icon: FiClock },
  { id: 'leaves', label: 'Leaves', icon: FiCoffee },
  { id: 'library', label: 'Library', icon: FiBookOpen },
  { id: 'training', label: 'Training', icon: FiMonitor },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'profile', label: 'Profile', icon: FiUser },
]

const SETTINGS_ITEMS = [
  { id: 'settings-holiday', label: 'Holiday', icon: FiCalendar },
  { id: 'settings-roles', label: 'Roles', icon: FiShield },
  { id: 'settings-users', label: 'System Users', icon: FiUsers },
  { id: 'settings-bank', label: 'Bank', icon: FiCreditCard },
]

function DashboardHome({ onChangeLayout, insightsLayout }) {
  return (
    <section className="dashboard-section">
      {/* Quick actions */}
      <div className="dashboard-card-row">
        <h2 className="section-title">Dashboard</h2>
        <p className="section-subtitle">Welcome back &amp; have a great day at work!</p>

        <div className="quick-actions-grid">
          <button type="button" className="quick-card quick-card--ticket">
            <div className="quick-card-icon">
              <FiCalendar className="quick-card-icon-svg" />
            </div>
            <h3 className="quick-card-title">New Ticket</h3>
            <p className="quick-card-text">Create support ticket</p>
          </button>

          <button type="button" className="quick-card quick-card--customer">
            <div className="quick-card-icon">
              <FiUserPlus className="quick-card-icon-svg" />
            </div>
            <h3 className="quick-card-title">Add Customer</h3>
            <p className="quick-card-text">Register new client</p>
          </button>

          <button type="button" className="quick-card quick-card--schedule">
            <div className="quick-card-icon">
              <FiPhoneCall className="quick-card-icon-svg" />
            </div>
            <h3 className="quick-card-title">Schedule Call</h3>
            <p className="quick-card-text">Book meeting time</p>
          </button>

          <button type="button" className="quick-card quick-card--reports">
            <div className="quick-card-icon">
              <FiBarChart2 className="quick-card-icon-svg" />
            </div>
            <h3 className="quick-card-title">View Reports</h3>
            <p className="quick-card-text">Analytics dashboard</p>
          </button>
        </div>
      </div>

      {/* Filter by date */}
      <div className="dashboard-card-full">
        <div className="filter-header">
          <div className="filter-title-block">
            <div className="filter-icon">
              <FiCalendar />
            </div>
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
              <div className="overview-icon overview-icon--receivable">
                <FiFileText />
              </div>
              <span className="overview-label">Customer Receivables</span>
            </div>
            <p className="overview-value">₹ 1,24,500</p>
            <span className="overview-pill overview-pill--up">19.1%&nbsp;▲</span>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <div className="overview-icon overview-icon--payout">
                <FiCreditCard />
              </div>
              <span className="overview-label">Engineer Payout</span>
            </div>
            <p className="overview-value">₹ 84,200</p>
            <span className="overview-pill overview-pill--up">15.2%&nbsp;▲</span>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <div className="overview-icon overview-icon--leads">
                <FiTarget />
              </div>
              <span className="overview-label">Leads</span>
            </div>
            <p className="overview-value">94</p>
            <span className="overview-pill overview-pill--down">94.7%&nbsp;▼</span>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <div className="overview-icon overview-icon--tickets">
                <FiTag />
              </div>
              <span className="overview-label">Total Tickets</span>
            </div>
            <p className="overview-value">218</p>
            <span className="overview-pill overview-pill--up">33.3%&nbsp;▲</span>
          </div>
        </div>
      </div>

      {/* Ticket calendar + details placeholder (for future calendar work) */}
      <section className="dashboard-card-split">
        <div className="ticket-calendar-card">
          <header className="ticket-calendar-header">
            <div>
              <h2 className="section-title">Ticket Calendar</h2>
              <p className="section-subtitle">View and manage tickets by date. Click on a date to see details.</p>
            </div>
            <button type="button" className="ticket-today-btn">
              Today
            </button>
          </header>
          <div className="ticket-calendar-body">
            {/* Calendar grid placeholder; can be wired later */}
            <div className="ticket-calendar-month">November 2025</div>
            <div className="ticket-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="ticket-calendar-day-header">
                  {day}
                </div>
              ))}
              {Array.from({ length: 30 }).map((_, index) => (
                <button
                  // 30 days for sample grid
                  key={index}
                  type="button"
                  className={`ticket-calendar-cell ${index + 1 === 20 ? 'ticket-calendar-cell--active' : ''}`}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="ticket-details-card">
          <h3 className="section-title">Ticket Details</h3>
          <p className="ticket-details-empty">No tickets selected. Click on a date or ticket to view details.</p>
          <div className="ticket-summary">
            <div className="ticket-summary-item">
              <span className="ticket-summary-label">Total Tickets</span>
              <span className="ticket-summary-value">6</span>
            </div>
            <div className="ticket-summary-item">
              <span className="ticket-summary-label">Active Days</span>
              <span className="ticket-summary-value">6</span>
            </div>
          </div>
        </aside>
      </section>

      {/* Insights/layout section under calendar (50/50 or full width) */}
      <section className="dashboard-card-row">
        <div className="section-layout-header">
          <div>
            <h2 className="section-title">Workspace Insights</h2>
            <p className="section-subtitle">Flexible layout for analytics or custom widgets (future expansion).</p>
          </div>
          <div className="layout-toggle" aria-label="Change layout">
            <button
              type="button"
              className={`layout-toggle-btn ${insightsLayout === 'split' ? 'layout-toggle-btn--active' : ''}`}
              onClick={() => onChangeLayout('split')}
            >
              <FiColumns />
            </button>
            <button
              type="button"
              className={`layout-toggle-btn ${insightsLayout === 'full' ? 'layout-toggle-btn--active' : ''}`}
              onClick={() => onChangeLayout('full')}
            >
              <FiMaximize2 />
            </button>
          </div>
        </div>

        <div className={`insights-layout insights-layout--${insightsLayout}`}>
          <div className="insights-card">
            <h3 className="insights-title">Pipeline Snapshot</h3>
            <p className="insights-text">
              This area can later host charts or KPI widgets. For now it is structured to work in both split and full-width
              layouts.
            </p>
          </div>
          <div className="insights-card">
            <h3 className="insights-title">Capacity & Utilisation</h3>
            <p className="insights-text">
              Use this panel for capacity planning, utilisation graphs or any custom content you want to plug in.
            </p>
          </div>
        </div>
      </section>
    </section>
  )
}

const PAGE_COPY = {
  engineers: {
    title: 'Engineers',
    subtitle: 'Manage engineers, skills and allocations.',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Maintain customer information and contacts.',
  },
  leads: {
    title: 'Leads',
    subtitle: 'Track incoming leads and nurture pipeline.',
  },
  engineerPayout: {
    title: 'Engineer Payout',
    subtitle: 'Review and approve engineer payouts.',
  },
  customerReceivable: {
    title: 'Customer Receivable',
    subtitle: 'Monitor receivables and outstanding invoices.',
  },
  tickets: {
    title: 'Tickets',
    subtitle: 'View, assign and resolve support tickets.',
  },
  assetManagement: {
    title: 'Asset Management',
    subtitle: 'Control assets, warranties and lifecycle.',
  },
  projectManagement: {
    title: 'Project Management',
    subtitle: 'Plan, track and deliver projects.',
  },
  meeting: {
    title: 'Meeting',
    subtitle: 'Schedule and manage meetings.',
  },
  sampleReports: {
    title: 'Sample Reports',
    subtitle: 'Preview analytics and business reports.',
  },
  attendance: {
    title: 'Attendance',
    subtitle: 'Capture and monitor attendance entries.',
  },
  leaves: {
    title: 'Leaves',
    subtitle: 'Manage leave requests and approvals.',
  },
  library: {
    title: 'Library',
    subtitle: 'Central place for documents and knowledge.',
  },
  training: {
    title: 'Training',
    subtitle: 'Organise and track trainings.',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'See all system notifications in one place.',
  },
  profile: {
    title: 'Profile',
    subtitle: 'User profile, contact details and preferences.',
  },
  'settings-holiday': {
    title: 'Holiday Settings',
    subtitle: 'Configure holidays for the organisation.',
  },
  'settings-roles': {
    title: 'Roles',
    subtitle: 'Define access roles and permissions.',
  },
  'settings-users': {
    title: 'System Users',
    subtitle: 'Manage system users and access.',
  },
  'settings-bank': {
    title: 'Bank',
    subtitle: 'Configure bank accounts and payment details.',
  },
}

function GenericPage({ pageId }) {
  const meta = PAGE_COPY[pageId] || { title: 'Page', subtitle: 'Content will be added here shortly.' }

  return (
    <section className="dashboard-section">
      <div className="dashboard-card-full placeholder-card">
        <h2 className="section-title">{meta.title}</h2>
        <p className="section-subtitle">{meta.subtitle}</p>
      </div>
    </section>
  )
}

function ProfileModal({ isOpen, onClose, form, onChange, onSubmit, onAvatarChange, saving, error, success }) {
  if (!isOpen) return null

  const handleFieldChange = (field) => (e) => {
    onChange({ ...form, [field]: e.target.value })
  }

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true">
      <div className="profile-modal">
        <header className="profile-modal-header">
          <div>
            <h2 className="section-title">Profile Settings</h2>
            <p className="section-subtitle">Update your personal information and avatar.</p>
          </div>
          <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close profile">
            <FiX />
          </button>
        </header>

        <div className="profile-modal-body">
          <div className="profile-avatar-block">
            <div className="profile-avatar-circle">
              {form.avatarPreview ? <img src={form.avatarPreview} alt="Profile" /> : <span>TU</span>}
              <label className="profile-avatar-upload">
                <FiCamera />
                <input type="file" accept="image/*" onChange={onAvatarChange} />
              </label>
            </div>
            <p className="profile-avatar-hint">PNG or JPG up to 2MB.</p>
          </div>

          <form className="profile-form" onSubmit={onSubmit}>
            <div className="profile-form-grid">
              <label className="profile-field">
                <span>Username</span>
                <input type="text" value={form.name} onChange={handleFieldChange('name')} required />
              </label>
              <label className="profile-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={handleFieldChange('email')} required />
              </label>
              <label className="profile-field">
                <span>Phone</span>
                <input type="tel" value={form.phone} onChange={handleFieldChange('phone')} />
              </label>
              <label className="profile-field">
                <span>Date of Birth</span>
                <input type="date" value={form.dateOfBirth} onChange={handleFieldChange('dateOfBirth')} />
              </label>
            </div>

            <label className="profile-field profile-field--full">
              <span>Address</span>
              <textarea rows={3} value={form.address} onChange={handleFieldChange('address')} />
            </label>

            {error && <div className="profile-message profile-message--error">{error}</div>}
            {success && <div className="profile-message profile-message--success">{success}</div>}

            <div className="profile-actions">
              <button type="button" className="profile-button profile-button--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="profile-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('awokta-theme') || 'light')
  const [insightsLayout, setInsightsLayout] = useState('split')
  const [profileForm, setProfileForm] = useState({
    name: 'Test User',
    email: 'test@example.com',
    phone: '',
    dateOfBirth: '',
    address: '',
    avatarPreview: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  useEffect(() => {
    localStorage.setItem('awokta-theme', theme)
  }, [theme])

  useEffect(() => {
    // Load profile when modal opens
    if (!isProfileModalOpen) return

    const controller = new AbortController()

    async function fetchProfile() {
      try {
        setProfileError('')
        const email = profileForm.email
        const res = await fetch(`${API_BASE_URL}/profile?email=${encodeURIComponent(email)}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        if (data && data.user) {
          setProfileForm((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email || prev.email,
            phone: data.user.phone || '',
            dateOfBirth: data.user.dateOfBirth || '',
            address: data.user.address || '',
            avatarPreview: data.user.avatarUrl || '',
          }))
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Profile fetch error', err)
        }
      }
    }

    fetchProfile()

    return () => controller.abort()
  }, [isProfileModalOpen, profileForm.email])

  const handleLogout = () => {
    // Clear tokens from both storages for safety
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    navigate('/')
  }

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleMenuClick = (id) => {
    setActivePage(id)
    if (isSettingsOpen) setIsSettingsOpen(false)
  }

  const handleSettingsItemClick = (id) => {
    setActivePage(id)
    setIsSettingsOpen(false)
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileForm((prev) => ({ ...prev, avatarPreview: reader.result || '' }))
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          dateOfBirth: profileForm.dateOfBirth,
          address: profileForm.address,
          avatarUrl: profileForm.avatarPreview,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setProfileError(data.message || 'Unable to save profile.')
      } else {
        setProfileSuccess('Profile saved successfully.')
      }
    } catch (err) {
      console.error('Profile save error', err)
      setProfileError('Unable to connect to server.')
    } finally {
      setProfileSaving(false)
    }
  }

  const renderContent = () => {
    if (activePage === 'dashboard') {
      return <DashboardHome insightsLayout={insightsLayout} onChangeLayout={setInsightsLayout} />
    }

    if (activePage === 'customers') {
      return <CustomersPage />
    }

    if (activePage === 'leads') {
      return <LeadsPage />
    }

    return <GenericPage pageId={activePage} />
  }

  return (
    <div
      className={`dashboard-shell ${theme === 'dark' ? 'dashboard-shell--dark' : 'dashboard-shell--light'} ${
        isSidebarCollapsed ? 'dashboard-shell--collapsed' : ''
      } ${activePage === 'dashboard' ? 'dashboard-shell--dashboard-green' : ''}`}
    >
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo" aria-label="Awokta logo">
            <span className="sidebar-logo-text">awokta</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label="Toggle sidebar width"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          >
            <FiMoreVertical />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {MAIN_MENU_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-link ${activePage === id ? 'sidebar-link--active' : ''}`}
              onClick={() => handleMenuClick(id)}
            >
              <span className="sidebar-link-icon">
                <Icon />
              </span>
              <span className="sidebar-link-label">{label}</span>
            </button>
          ))}

          {/* Settings with dropdown */}
          <div className={`sidebar-settings ${isSettingsOpen ? 'sidebar-settings--open' : ''}`}>
            <button
              type="button"
              className={`sidebar-link ${activePage.startsWith('settings') ? 'sidebar-link--active' : ''}`}
              onClick={() => setIsSettingsOpen((prev) => !prev)}
            >
              <span className="sidebar-link-icon">
                <FiSettings />
              </span>
              <span className="sidebar-link-label">Setting</span>
            </button>
            {isSettingsOpen && (
              <div className="sidebar-settings-dropdown">
                {SETTINGS_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`sidebar-settings-item ${activePage === id ? 'sidebar-settings-item--active' : ''}`}
                    onClick={() => handleSettingsItemClick(id)}
                  >
                    <span className="sidebar-settings-icon">
                      <Icon />
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-signout" type="button" onClick={handleLogout}>
            <span className="sidebar-link-icon">
              <FiLogOut />
            </span>
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
            <button
              className="dashboard-theme-toggle"
              type="button"
              aria-label="Toggle light / dark theme"
              onClick={handleThemeToggle}
            >
              {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
            <button
              type="button"
              className="dashboard-user-info"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
            >
              <div className="dashboard-avatar">TU</div>
              <div className="dashboard-user-meta">
                <span className="dashboard-user-name">Test User</span>
                <span className="dashboard-user-role">test@example.com</span>
              </div>
            </button>
            {isUserMenuOpen && (
              <div className="dashboard-user-dropdown">
                <button
                  type="button"
                  className="dashboard-user-dropdown-item"
                  onClick={() => {
                    setActivePage('dashboard')
                    setIsUserMenuOpen(false)
                    setIsProfileModalOpen(false)
                  }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="dashboard-user-dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsProfileModalOpen(true)
                  }}
                >
                  Profile
                </button>
                <button type="button" className="dashboard-user-dropdown-item">
                  Change Password
                </button>
                <button
                  type="button"
                  className="dashboard-user-dropdown-item dashboard-user-dropdown-item--danger"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {renderContent()}
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        form={profileForm}
        onChange={setProfileForm}
        onSubmit={handleProfileSubmit}
        onAvatarChange={handleAvatarChange}
        saving={profileSaving}
        error={profileError}
        success={profileSuccess}
      />
    </div>
  )
}

export default DashboardPage
