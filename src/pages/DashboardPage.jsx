// DashboardPage.jsx - Main dashboard shell with sidebar navigation, theme toggle and content sections
import favicon from '../assets/favicon.png'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import CustomersPage from './CustomersPage'
import LeadsPage from './LeadsPage'
import TicketsPage from './TicketsPage'
import EngineersPage from './EngineersPage'
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
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
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

function DashboardHome({ onNavigate, insightsLayout }) {
  const navigate = useNavigate()
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)

  // Real-time Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()) // tracks the mont/year view
  const [selectedDate, setSelectedDate] = useState(new Date()) // tracks clicked date

  const [tickets, setTickets] = useState([])

  // Helpers for Calendar
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay() // 0 = Sun

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const startDay = getFirstDayOfMonth(year, month)

    const days = []
    // Add empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
  }

  const formatMonthYear = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch(`${API_BASE_URL}/tickets`, { credentials: 'include' })
        const data = await res.json()
        if (res.ok) {
          setTickets((data.tickets || []).sort((a, b) => a.id - b.id))
        }
      } catch (err) {
        console.error('Failed to load tickets for dashboard', err)
      }
    }
    fetchTickets()
  }, [])

  // Filter tickets for a specific date (based on taskStartDate)
  const getTicketsForDate = (date) => {
    if (!date) return []
    return tickets.filter(t => {
      if (!t.taskStartDate) return false;
      const tDate = new Date(t.taskStartDate);
      return tDate.toDateString() === date.toDateString();
    })
  }

  const selectedTickets = getTicketsForDate(selectedDate)
  const calendarDays = generateCalendarDays()

  return (
    <section className="dashboard-section">
      {/* 1. Header Row (Title + Filter) */}
      <div className="dashboard-header-row">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="section-subtitle">Welcome back &amp; have a great day at work!</p>
        </div>

        <div className="filter-block-compact">
          <div className="filter-controls">
            <label className="filter-control">
              <select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value, 10)
                  setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1))
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-control-nano">
              <span>Year</span>
              <input
                type="number"
                className="nano-year-input"
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 4) {
                    const newYear = parseInt(val, 10);
                    if (!isNaN(newYear)) {
                      setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
                    }
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value) {
                    setCurrentDate(new Date(new Date().getFullYear(), currentDate.getMonth(), 1));
                  }
                }}
              />
            </label>
            <button type="button" className="filter-today-btn" onClick={goToToday}>
              Today
            </button>
          </div>
          <div className="filter-info-compact">
            Viewing: <strong>{formatMonthYear(currentDate)}</strong>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="quick-actions-grid section-spacer">
        <button
          type="button"
          className="quick-card quick-card--ticket"
          onClick={() => navigate('/dashboard', { state: { openLeads: true, openForm: true } })}
        >
          <div className="quick-card-icon">
            <FiTarget className="quick-card-icon-svg" />
          </div>
          <h3 className="quick-card-title">New Lead</h3>
          <p className="quick-card-text">Create new lead</p>
        </button>

        <button
          type="button"
          className="quick-card quick-card--customer"
          onClick={() => navigate('/dashboard', { state: { openCustomers: true, openForm: true } })}
        >
          <div className="quick-card-icon">
            <FiUserPlus className="quick-card-icon-svg" />
          </div>
          <h3 className="quick-card-title">Add Customer</h3>
          <p className="quick-card-text">Register new client</p>
        </button>

        <button
          type="button"
          className="quick-card quick-card--schedule"
          onClick={() => onNavigate('meeting')}
        >
          <div className="quick-card-icon">
            <FiPhoneCall className="quick-card-icon-svg" />
          </div>
          <h3 className="quick-card-title">Schedule Call</h3>
          <p className="quick-card-text">Book meeting time</p>
        </button>

        <button
          type="button"
          className="quick-card quick-card--reports"
          onClick={() => onNavigate('sampleReports')}
        >
          <div className="quick-card-icon">
            <FiBarChart2 className="quick-card-icon-svg" />
          </div>
          <h3 className="quick-card-title">View Reports</h3>
          <p className="quick-card-text">Analytics dashboard</p>
        </button>
      </div>

      {/* 3. Business Overview Accordion */}
      <div className="dashboard-accordion section-spacer">
        <button
          type="button"
          className="dashboard-accordion-header"
          onClick={() => setIsOverviewOpen(prev => !prev)}
        >
          <div className="dashboard-accordion-title-grp">
            <FiBarChart2 className="dashboard-accordion-icon" />
            <h2 className="section-title">Business Overview</h2>
          </div>
          <div className="dashboard-accordion-chevron">
            {isOverviewOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </button>

        {isOverviewOpen && (
          <div className="dashboard-accordion-content">
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
        )}
      </div>

      {/* 4. Ticket Calendar */}
      <section className="dashboard-card-split section-spacer">
        <div className="ticket-calendar-card">
          <header className="ticket-calendar-header">
            <div>
              <h2 className="section-title">Ticket Calendar</h2>
              <p className="section-subtitle">Manage tickets by date.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="ticket-today-btn" onClick={goToPreviousMonth} aria-label="Previous Month">
                <FiChevronLeft />
              </button>
              <button type="button" className="ticket-today-btn" onClick={goToToday}>
                Today
              </button>
              <button type="button" className="ticket-today-btn" onClick={goToNextMonth} aria-label="Next Month">
                <FiChevronRight />
              </button>
            </div>
          </header>
          <div className="ticket-calendar-body">
            <div className="ticket-calendar-month">{formatMonthYear(currentDate)}</div>
            <div className="ticket-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="ticket-calendar-day-header">
                  {day}
                </div>
              ))}

              {calendarDays.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="ticket-calendar-cell ticket-calendar-cell--empty" />

                const hasTickets = getTicketsForDate(date).length > 0
                const isActive = isSameDay(date, selectedDate)
                const isToday = isSameDay(date, new Date())
                const ticketCount = getTicketsForDate(date).length

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`ticket-calendar-cell ${isActive ? 'ticket-calendar-cell--active' : ''} ${hasTickets ? 'ticket-calendar-cell--has-ticket' : ''}`}
                    onClick={() => setSelectedDate(date)}
                    style={isToday ? { fontWeight: 'bold', color: '#7c3aed' } : {}}
                  >
                    <span>{date.getDate()}</span>
                    {hasTickets && (
                      <span className="ticket-count-badge">{ticketCount}</span>
                      // Or simple dot: <span className="ticket-indicator-dot" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <aside className="ticket-details-card">
          <h3 className="section-title">
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>

          {selectedTickets.length === 0 ? (
            <div className="ticket-details-empty">
              <p>No tickets generated on this date.</p>
            </div>
          ) : (
            <div className="ticket-list-mini">
              {selectedTickets.map(ticket => (
                <div key={ticket.id} className="ticket-mini-item">
                  <div className="ticket-mini-header">
                    <span className="ticket-mini-id">#AIM-T-{String(ticket.id).padStart(3, '0')}</span>
                    <span className={`ticket-mini-status status-${ticket.status?.toLowerCase().replace(' ', '-')}`}>{ticket.status}</span>
                  </div>
                  <div className="ticket-mini-body">
                    <p className="ticket-mini-subject"><strong>Subject:</strong> {ticket.taskName || 'No Subject'}</p>
                    <p className="ticket-mini-info"><strong>Location:</strong> {ticket.city || '-'}, {ticket.country || '-'}</p>
                    <p className="ticket-mini-info"><strong>Date & Time:</strong> {ticket.taskStartDate ? String(ticket.taskStartDate).split('T')[0] : ''} {ticket.taskTime || ''}</p>
                    <p className="ticket-mini-info"><strong>Engineer:</strong> {ticket.engineerName || 'Unassigned'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ticket-summary" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '15px' }}>
            <div className="ticket-summary-item">
              <span className="ticket-summary-label">Total Tickets (Month)</span>
              <span className="ticket-summary-value">
                {tickets.filter(t => {
                  const d = t.taskStartDate ? new Date(t.taskStartDate) : null;
                  return d && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                }).length}
              </span>
            </div>
          </div>
        </aside>
      </section>

      {/* Insights */}
      <section className="dashboard-card-row">
        {/* ... existing insights ... */}
        <div className="section-layout-header">
          <div>
            <h2 className="section-title">Workspace Insights</h2>
          </div>
          {/* ... */}
        </div>
        <div className={`insights-layout insights-layout--${insightsLayout}`}>
          <div className="insights-card">
            <h3 className="insights-title">Pipeline Snapshot</h3>
          </div>
          <div className="insights-card">
            <h3 className="insights-title">Capacity & Utilisation</h3>
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
            <p className="profile-avatar-hint">PNG or JPG up to 50MB.</p>
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
  const location = useLocation()
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  // Last Login logic
  const [lastLoginDisplay, setLastLoginDisplay] = useState('just now')

  useEffect(() => {
    const loginTime = localStorage.getItem('lastLoginTimestamp')
    if (loginTime) {
      const date = new Date(parseInt(loginTime, 10))
      const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' | ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      setLastLoginDisplay(formatted)
    }
  }, [])

  const handleThemeToggle = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      return next
    })
  }
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [insightsLayout] = useState('split')
  const [profileForm, setProfileForm] = useState(() => {
    const storedName = localStorage.getItem('userName') || 'Test User'
    const storedEmail = localStorage.getItem('userEmail') || 'test@example.com'
    const storedPhone = localStorage.getItem('userPhone') || ''
    const storedDob = localStorage.getItem('userDob') || ''
    const storedAddress = localStorage.getItem('userAddress') || ''

    return {
      name: storedName,
      email: storedEmail,
      phone: storedPhone,
      dateOfBirth: storedDob ? String(storedDob).split('T')[0] : '',
      address: storedAddress,
      avatarPreview: '',
    }
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')



  useEffect(() => {
    if (location.state?.openLeads) {
      setActivePage('leads')
      window.history.replaceState({}, document.title)
    } else if (location.state?.openCustomers) {
      setActivePage('customers')
      window.history.replaceState({}, document.title)
    } else if (location.state?.openTickets) {
      setActivePage('tickets')
      window.history.replaceState({}, document.title)
    }
  }, [location])

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
            dateOfBirth: data.user.dateOfBirth ? String(data.user.dateOfBirth).split('T')[0] : '',
            address: data.user.address || '',
            avatarPreview: data.user.avatarUrl || prev.avatarPreview || '',
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

  // Fetch profile on mount to ensure header avatar is up to date
  useEffect(() => {
    const email = localStorage.getItem('userEmail')
    if (!email) return

    const controller = new AbortController()

    async function fetchProfileOnMount() {
      try {
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
            dateOfBirth: data.user.dateOfBirth ? String(data.user.dateOfBirth).split('T')[0] : '',
            address: data.user.address || '',
            avatarPreview: data.user.avatarUrl || prev.avatarPreview || '',
          }))
          // Update localStorage to keep sync
          if (data.user.name) localStorage.setItem('userName', data.user.name)
          if (data.user.phone) localStorage.setItem('userPhone', data.user.phone)
          if (data.user.dateOfBirth) localStorage.setItem('userDob', String(data.user.dateOfBirth).split('T')[0])
          if (data.user.address) localStorage.setItem('userAddress', data.user.address)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Initial profile fetch error', err)
        }
      }
    }

    fetchProfileOnMount()

    return () => controller.abort()
  }, [])

  const handleLogout = () => {
    // Clear tokens from both storages for safety
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    navigate('/')
  }



  const handleMenuClick = (id) => {
    if (id === 'profile') {
      setIsProfileModalOpen(true)
      if (isSettingsOpen) setIsSettingsOpen(false)
      return
    }
    // Clear and replace state to prevent persistence of 'openForm' from dashboard cards
    navigate('/dashboard', { state: {}, replace: true })
    setActivePage(id)
    if (isSettingsOpen) setIsSettingsOpen(false)
  }

  const handleSettingsItemClick = (id) => {
    navigate('/dashboard', { state: {}, replace: true })
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
        const updatedUser = data.user || {
          name: profileForm.name,
          dateOfBirth: profileForm.dateOfBirth,
          phone: profileForm.phone,
          address: profileForm.address
        }

        // Persist to local storage explicitly to survive refresh manually in case backend fails
        localStorage.setItem('userName', updatedUser.name || profileForm.name)
        localStorage.setItem('userPhone', updatedUser.phone || profileForm.phone)
        localStorage.setItem('userDob', updatedUser.dateOfBirth ? String(updatedUser.dateOfBirth).split('T')[0] : profileForm.dateOfBirth)
        localStorage.setItem('userAddress', updatedUser.address || profileForm.address)


        setProfileForm((prev) => ({
          ...prev,
          name: updatedUser.name || prev.name,
          email: updatedUser.email || prev.email,
          phone: updatedUser.phone || '',
          dateOfBirth: updatedUser.dateOfBirth ? String(updatedUser.dateOfBirth).split('T')[0] : '',
          address: updatedUser.address || '',
          avatarPreview: updatedUser.avatarUrl || prev.avatarPreview,
        }))

        // Keep header in sync with latest profile
        if (updatedUser.name) localStorage.setItem('userName', updatedUser.name)
        if (updatedUser.email) localStorage.setItem('userEmail', updatedUser.email)

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
      return <DashboardHome
        insightsLayout={insightsLayout}
        onNavigate={handleMenuClick}
      />
    }

    if (activePage === 'engineers') {
      return <EngineersPage />
    }

    if (activePage === 'customers') {
      return <CustomersPage />
    }

    if (activePage === 'leads') {
      return <LeadsPage />
    }

    if (activePage === 'tickets') {
      return <TicketsPage />
    }

    return <GenericPage pageId={activePage} />
  }

  return (
    <div
      className={`dashboard-shell ${theme === 'dark' ? 'dashboard-shell--dark' : 'dashboard-shell--light'} ${isSidebarCollapsed ? 'dashboard-shell--collapsed' : ''
        }`}
    >
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo" aria-label="Awokta logo">
            <img src={favicon} alt="Logo" className="sidebar-logo-img" />
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
          {MAIN_MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${activePage === item.id ? 'sidebar-link--active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="sidebar-link-icon">
                <item.icon />
              </span>
              <span className="sidebar-link-label">{item.label}</span>
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
                {SETTINGS_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-settings-item ${activePage === item.id ? 'sidebar-settings-item--active' : ''}`}
                    onClick={() => handleSettingsItemClick(item.id)}
                  >
                    <span className="sidebar-settings-icon">
                      <item.icon />
                    </span>
                    <span>{item.label}</span>
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
            <p className="dashboard-subheading">Last login: {lastLoginDisplay}</p>
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
              <div className="dashboard-avatar">
                {profileForm.avatarPreview ? (
                  <img src={profileForm.avatarPreview} alt={profileForm.name || 'User avatar'} />
                ) : (
                  (profileForm.name || 'TU')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('')
                )}
              </div>
              <div className="dashboard-user-meta">
                <span className="dashboard-user-name">{profileForm.name}</span>
                <span className="dashboard-user-role">{profileForm.email}</span>
              </div>
            </button>
            {isUserMenuOpen && (
              <div className="dashboard-user-dropdown">
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
                <button
                  type="button"
                  className="dashboard-user-dropdown-item"
                  onClick={() => {
                    alert('Change Password feature coming soon')
                    setIsUserMenuOpen(false)
                  }}
                >
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
    </div >
  )
}

export default DashboardPage

