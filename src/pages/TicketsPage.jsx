// TicketsPage.jsx - Support Tickets list + Create / Edit Ticket form
import { useEffect, useMemo, useState } from 'react'
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi'
import './TicketsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const TIMEZONES = [
  'GB United Kingdom (UTC+00:00)',
  'EU Europe (UTC+01:00)',
  'US Eastern (UTC-05:00)',
]

const CURRENCIES = [
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Pound (GBP)' },
]

const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved']

function TicketsPage() {
  const [viewMode, setViewMode] = useState('list') // list | form
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState(null)

  // Form data
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [engineers, setEngineers] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [clientName, setClientName] = useState('')

  const [taskName, setTaskName] = useState('')
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskTime, setTaskTime] = useState('00:00')
  const [scopeOfWork, setScopeOfWork] = useState('')
  const [tools, setTools] = useState('')

  const [engineerName, setEngineerName] = useState('')

  const [apartment, setApartment] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [timezone, setTimezone] = useState(TIMEZONES[0])

  const [pocDetails, setPocDetails] = useState('')
  const [reDetails, setReDetails] = useState('')
  const [callInvites, setCallInvites] = useState('')

  const [documentsLabel, setDocumentsLabel] = useState('')
  const [signoffLabel, setSignoffLabel] = useState('')

  const [currency, setCurrency] = useState('USD')
  const [hourlyRate, setHourlyRate] = useState('')
  const [halfDayRate, setHalfDayRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [agreedRate, setAgreedRate] = useState('')

  const [status, setStatus] = useState('Open')

  const canSubmit = useMemo(
    () =>
      Boolean(
        customerId &&
        taskName &&
        taskStartDate &&
        taskEndDate &&
        taskTime &&
        scopeOfWork &&
        engineerName &&
        apartment &&
        addressLine1 &&
        city &&
        country &&
        zipCode,
      ),
    [
      customerId,
      taskName,
      taskStartDate,
      taskEndDate,
      taskTime,
      scopeOfWork,
      engineerName,
      apartment,
      addressLine1,
      city,
      country,
      zipCode,
    ],
  )

  const resetForm = () => {
    setCustomerId('')
    setLeadId('')
    setClientName('')
    setTaskName('')
    setTaskStartDate('')
    setTaskEndDate('')
    setTaskTime('00:00')
    setScopeOfWork('')
    setTools('')
    setEngineerName('')
    setApartment('')
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setCountry('')
    setZipCode('')
    setTimezone(TIMEZONES[0])
    setPocDetails('')
    setReDetails('')
    setCallInvites('')
    setDocumentsLabel('')
    setSignoffLabel('')
    setCurrency('USD')
    setHourlyRate('')
    setHalfDayRate('')
    setFullDayRate('')
    setMonthlyRate('')
    setAgreedRate('')
    setStatus('Open')
    setError('')
    setSuccess('')
    setEditingTicketId(null)
  }

  const loadTickets = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_BASE_URL}/tickets`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load tickets')
      }
      setSummary({
        total: data.summary?.totalTickets || 0,
        open: data.summary?.openTickets || 0,
        inProgress: data.summary?.inProgressTickets || 0,
        resolved: data.summary?.resolvedTickets || 0,
      })
      setTickets(data.tickets || [])
    } catch (err) {
      console.error('Load tickets error', err)
      setError(err.message || 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true)
      setError('')
      const [customersRes, leadsRes, engineersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/leads/customers`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/leads`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/engineers`, { credentials: 'include' }),
      ])

      const customersData = await customersRes.json()
      const leadsData = await leadsRes.json()
      const engineersData = await engineersRes.json()

      if (!customersRes.ok) {
        throw new Error(customersData.message || 'Unable to load customers')
      }
      if (!leadsRes.ok) {
        throw new Error(leadsData.message || 'Unable to load leads')
      }
      if (!engineersRes.ok) {
        throw new Error(engineersData.message || 'Unable to load engineers')
      }

      setCustomers(customersData.customers || [])
      setLeads(leadsData.leads || [])
      setEngineers(engineersData.engineers || [])
    } catch (err) {
      console.error('Load ticket dropdowns error', err)
      setError(err.message || 'Unable to load dropdown data')
    } finally {
      setLoadingDropdowns(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) =>
        customerId ? String(lead.customerId) === String(customerId) : true,
      ),
    [leads, customerId],
  )

  const handleDocumentsChange = (event) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      setDocumentsLabel('')
      return
    }
    setDocumentsLabel(`${files.length} file(s) selected`)
  }

  const handleSignoffChange = (event) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      setSignoffLabel('')
      return
    }
    setSignoffLabel(`${files.length} file(s) selected`)
  }

  const handleSubmitTicket = async (event) => {
    event.preventDefault()
    if (!canSubmit) {
      setError('Please fill all required fields.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        customerId: Number(customerId),
        leadId: leadId ? Number(leadId) : null,
        clientName,
        taskName,
        taskStartDate,
        taskEndDate,
        taskTime,
        scopeOfWork,
        tools,
        engineerName,
        apartment,
        addressLine1,
        addressLine2,
        city,
        country,
        zipCode,
        timezone,
        pocDetails,
        reDetails,
        callInvites,
        documentsLabel,
        signoffLabel,
        currency,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        halfDayRate: halfDayRate ? Number(halfDayRate) : null,
        fullDayRate: fullDayRate ? Number(fullDayRate) : null,
        monthlyRate: monthlyRate ? Number(monthlyRate) : null,
        agreedRate,
        status,
      }

      const isEditing = Boolean(editingTicketId)
      const url = isEditing ? `${API_BASE_URL}/tickets/${editingTicketId}` : `${API_BASE_URL}/tickets`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || (isEditing ? 'Unable to update ticket' : 'Unable to create ticket'))
      }

      setSuccess(isEditing ? 'Ticket updated successfully.' : 'Ticket created successfully.')
      resetForm()
      setViewMode('list')
      await loadTickets()
    } catch (err) {
      console.error('Create ticket error', err)
      setError(err.message || 'Unable to create ticket')
    } finally {
      setSaving(false)
    }
  }

  const openTicketModal = async (ticketId) => {
    try {
      setError('')
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load ticket details')
      }
      setSelectedTicket(data.ticket)
      setIsTicketModalOpen(true)
    } catch (err) {
      console.error('View ticket error', err)
      setError(err.message || 'Unable to load ticket details')
    }
  }

  const fillFormFromTicket = (ticket) => {
    setCustomerId(ticket.customerId ? String(ticket.customerId) : '')
    setLeadId(ticket.leadId ? String(ticket.leadId) : '')
    setClientName(ticket.clientName || '')
    setTaskName(ticket.taskName || '')
    setTaskStartDate(ticket.taskStartDate || '')
    setTaskEndDate(ticket.taskEndDate || '')
    setTaskTime(ticket.taskTime || '00:00')
    setScopeOfWork(ticket.scopeOfWork || '')
    setTools(ticket.tools || '')
    setEngineerName(ticket.engineerName || '')
    setApartment(ticket.apartment || '')
    setAddressLine1(ticket.addressLine1 || '')
    setAddressLine2(ticket.addressLine2 || '')
    setCity(ticket.city || '')
    setCountry(ticket.country || '')
    setZipCode(ticket.zipCode || '')
    setTimezone(ticket.timezone || TIMEZONES[0])
    setPocDetails(ticket.pocDetails || '')
    setReDetails(ticket.reDetails || '')
    setCallInvites(ticket.callInvites || '')
    setDocumentsLabel(ticket.documentsLabel || '')
    setSignoffLabel(ticket.signoffLabel || '')
    setCurrency(ticket.currency || 'USD')
    setHourlyRate(ticket.hourlyRate != null ? String(ticket.hourlyRate) : '')
    setHalfDayRate(ticket.halfDayRate != null ? String(ticket.halfDayRate) : '')
    setFullDayRate(ticket.fullDayRate != null ? String(ticket.fullDayRate) : '')
    setMonthlyRate(ticket.monthlyRate != null ? String(ticket.monthlyRate) : '')
    setAgreedRate(ticket.agreedRate || '')
    setStatus(ticket.status || 'Open')
  }

  const startEditTicket = async (ticketId) => {
    try {
      // Load dropdown options first
      await loadDropdowns()

      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load ticket')
      }
      fillFormFromTicket(data.ticket)
      setEditingTicketId(ticketId)
      setViewMode('form')
    } catch (err) {
      console.error('Edit ticket error', err)
      setError(err.message || 'Unable to load ticket for edit')
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to delete ticket')
      }
      await loadTickets()
    } catch (err) {
      console.error('Delete ticket error', err)
      setError(err.message || 'Unable to delete ticket')
    }
  }

  const handleCloseTicketModal = () => {
    setIsTicketModalOpen(false)
    setSelectedTicket(null)
  }

  if (viewMode === 'form') {
    return (
      <section className="tickets-page">
        <header className="tickets-header">
          <button
            type="button"
            className="tickets-back"
            onClick={() => {
              resetForm()
              setViewMode('list')
            }}
          >
            ← Back
          </button>
          <div>
            <h1 className="tickets-title">Create Ticket</h1>
            <p className="tickets-subtitle">Generate a support ticket from a lead.</p>
          </div>
        </header>

        <form className="tickets-form" onSubmit={handleSubmitTicket}>
          {/* Customer & Lead */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Customer &amp; Lead</h2>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>
                  Select Customer <span className="field-required">*</span>
                </span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={loadingDropdowns}
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.accountEmail})
                    </option>
                  ))}
                </select>
              </label>

              <label className="tickets-field">
                <span>Select Lead</span>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  disabled={loadingDropdowns || filteredLeads.length === 0}
                >
                  <option value="">Choose a lead...</option>
                  {filteredLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.taskName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tickets-field tickets-field--full">
                <span>Client Name</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </label>
            </div>
          </section>

          {/* Task Details */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Task Details</h2>
            <div className="tickets-grid">
              <label className="tickets-field tickets-field--full">
                <span>
                  Task Name <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Enter task name"
                />
              </label>

              <label className="tickets-field">
                <span>
                  Task Time <span className="field-required">*</span>
                </span>
                <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
              </label>

              <label className="tickets-field">
                <span>
                  Task Start Date <span className="field-required">*</span>
                </span>
                <input type="date" value={taskStartDate} onChange={(e) => setTaskStartDate(e.target.value)} />
              </label>

              <label className="tickets-field">
                <span>
                  Task End Date <span className="field-required">*</span>
                </span>
                <input type="date" value={taskEndDate} onChange={(e) => setTaskEndDate(e.target.value)} />
              </label>

              <label className="tickets-field tickets-field--full">
                <span>
                  Scope of Work <span className="field-required">*</span>
                </span>
                <textarea
                  rows={3}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  placeholder="Describe the scope of work"
                />
              </label>

              <label className="tickets-field tickets-field--full">
                <span>Tools</span>
                <input
                  type="text"
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  placeholder="Enter tools if any"
                />
              </label>
            </div>
          </section>

          {/* Engineer Assignment */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Engineer Assignment</h2>
            <div className="tickets-grid">
              <label className="tickets-field tickets-field--full">
                <span>
                  Select Engineer <span className="field-required">*</span>
                </span>
                <select
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  disabled={loadingDropdowns}
                >
                  <option value="">Choose an engineer...</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.name}>
                      {eng.name} ({eng.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Address */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Address</h2>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>
                  Apartment <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="Enter apartment/unit number"
                />
              </label>

              <label className="tickets-field">
                <span>
                  Address Line 1 <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Enter address line 1"
                />
              </label>

              <label className="tickets-field">
                <span>Address Line 2</span>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Enter address line 2 (optional)"
                />
              </label>

              <label className="tickets-field">
                <span>
                  City <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                />
              </label>

              <label className="tickets-field">
                <span>
                  Country <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Enter country"
                />
              </label>

              <label className="tickets-field">
                <span>
                  Zip/Postal Code <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Enter zip/postal code"
                />
              </label>

              <label className="tickets-field tickets-field--full">
                <span>
                  Timezone <span className="field-required">*</span>
                </span>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* POC & Documents */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">POC &amp; Documents</h2>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>POC details</span>
                <textarea
                  rows={2}
                  value={pocDetails}
                  onChange={(e) => setPocDetails(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>RE details</span>
                <textarea
                  rows={2}
                  value={reDetails}
                  onChange={(e) => setReDetails(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Call invites</span>
                <textarea
                  rows={2}
                  value={callInvites}
                  onChange={(e) => setCallInvites(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Documents (any file)</span>
                <div className="tickets-file-row">
                  <input type="file" multiple onChange={handleDocumentsChange} />
                  {documentsLabel && <span className="tickets-file-label">{documentsLabel}</span>}
                </div>
              </label>
              <label className="tickets-field">
                <span>Sign-off Sheet (any file)</span>
                <div className="tickets-file-row">
                  <input type="file" onChange={handleSignoffChange} />
                  {signoffLabel && <span className="tickets-file-label">{signoffLabel}</span>}
                </div>
              </label>
            </div>
          </section>

          {/* Pricing & Rates */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Pricing &amp; Rates</h2>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>Select Currency</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tickets-field">
                <span>Hourly Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Half Day Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={halfDayRate}
                  onChange={(e) => setHalfDayRate(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Full Day Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fullDayRate}
                  onChange={(e) => setFullDayRate(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Monthly Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Agreed Rate</span>
                <input
                  type="text"
                  value={agreedRate}
                  onChange={(e) => setAgreedRate(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Ticket Status */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Ticket Status</h2>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {error && <div className="tickets-message tickets-message--error">{error}</div>}
          {success && <div className="tickets-message tickets-message--success">{success}</div>}

          <div className="tickets-actions-footer">
            <button
              type="button"
              className="tickets-secondary-btn"
              onClick={() => {
                resetForm()
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="tickets-primary-btn" disabled={saving || !canSubmit}>
              {saving ? 'Creating Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </section>
    )
  }

  // LIST VIEW
  return (
    <section className="tickets-page">
      <header className="tickets-header">
        <div>
          <h1 className="tickets-title">Support Tickets</h1>
          <p className="tickets-subtitle">Manage customer support requests.</p>
        </div>
        <button
          type="button"
          className="tickets-primary-btn"
          onClick={() => {
            setViewMode('form')
            loadDropdowns()
          }}
        >
          + Create Ticket
        </button>
      </header>

      <section className="tickets-summary-row">
        <div className="tickets-summary-card">
          <p className="summary-label">Total Tickets</p>
          <p className="summary-value">{summary.total}</p>
        </div>
        <div className="tickets-summary-card">
          <p className="summary-label">Open</p>
          <p className="summary-value">{summary.open}</p>
        </div>
        <div className="tickets-summary-card">
          <p className="summary-label">In Progress</p>
          <p className="summary-value">{summary.inProgress}</p>
        </div>
        <div className="tickets-summary-card">
          <p className="summary-label">Resolved</p>
          <p className="summary-value">{summary.resolved}</p>
        </div>
      </section>

      <section className="tickets-card">
        <div className="tickets-list-toolbar">
          <div className="tickets-search">
            <input type="text" placeholder="Search tickets..." disabled />
          </div>
          <div className="tickets-filter-row">
            <select disabled>
              <option>All Status</option>
            </select>
            <select disabled>
              <option>All Priority</option>
            </select>
          </div>
        </div>

        {error && <div className="tickets-message tickets-message--error tickets-message--inline">{error}</div>}

        <div className="tickets-table-wrapper">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Location</th>
                <th>Date &amp; Time</th>
                <th>Customer</th>
                <th>Engineer Assigned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="tickets-empty">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tickets-empty">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.taskName}</td>
                    <td>
                      {ticket.city}, {ticket.country}
                    </td>
                    <td>
                      {ticket.taskStartDate} - {ticket.taskEndDate} {ticket.taskTime}
                    </td>
                    <td>{ticket.customerName}</td>
                    <td>{ticket.engineerName || '-'}</td>
                    <td>{ticket.status}</td>
                    <td className="tickets-actions-cell">
                      <button
                        type="button"
                        className="tickets-action-btn tickets-action-btn--view"
                        onClick={() => openTicketModal(ticket.id)}
                        aria-label="View ticket"
                      >
                        <FiEye />
                      </button>
                      <button
                        type="button"
                        className="tickets-action-btn tickets-action-btn--edit"
                        onClick={() => startEditTicket(ticket.id)}
                        aria-label="Edit ticket"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        className="tickets-action-btn tickets-action-btn--delete"
                        onClick={() => handleDeleteTicket(ticket.id)}
                        aria-label="Delete ticket"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isTicketModalOpen && selectedTicket && (
        <div className="ticket-modal-backdrop" role="dialog" aria-modal="true">
          <div className="ticket-modal">
            <header className="ticket-modal-header">
              <div>
                <h2 className="ticket-modal-title">{selectedTicket.taskName}</h2>
                <p className="ticket-modal-sub">
                  Customer: {selectedTicket.customerName} | Engineer: {selectedTicket.engineerName}
                </p>
              </div>
              <button type="button" className="ticket-modal-close" onClick={handleCloseTicketModal}>
                ×
              </button>
            </header>

            <section className="ticket-modal-section">
              <h3>Schedule</h3>
              <p className="ticket-modal-line">
                {selectedTicket.taskStartDate} - {selectedTicket.taskEndDate} {selectedTicket.taskTime}
              </p>
            </section>

            <section className="ticket-modal-section">
              <h3>Scope of Work</h3>
              <p className="ticket-modal-line">{selectedTicket.scopeOfWork}</p>
            </section>

            <section className="ticket-modal-section">
              <h3>Location</h3>
              <p className="ticket-modal-line">Apartment: {selectedTicket.apartment}</p>
              <p className="ticket-modal-line">Address: {selectedTicket.addressLine1}</p>
              {selectedTicket.addressLine2 && (
                <p className="ticket-modal-line">Address Line 2: {selectedTicket.addressLine2}</p>
              )}
              <p className="ticket-modal-line">
                {selectedTicket.city}, {selectedTicket.country} - {selectedTicket.zipCode}
              </p>
            </section>

            <section className="ticket-modal-section">
              <h3>Status</h3>
              <p className="ticket-modal-line">{selectedTicket.status}</p>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

export default TicketsPage
