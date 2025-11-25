// LeadsPage.jsx - Leads list + Create / Edit Lead page
import { useEffect, useMemo, useState } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import './LeadsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const LEAD_TYPES = ['Full time', 'Part time', 'One-time task']

const TIMEZONES = [
  'GB United Kingdom (UTC+00:00)',
  'EU Europe (UTC+01:00)',
  'US Eastern (UTC-05:00)',
]

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'GBP', label: 'Pound (GBP)' },
]

const LEAD_STATUSES = ['BID', 'Confirm', 'Reschedule', 'Cancelled']

function LeadsPage() {
  const [viewMode, setViewMode] = useState('list') // list | form

  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [listError, setListError] = useState('')
  const [summary, setSummary] = useState({ total: 0, bid: 0, confirmed: 0, rescheduled: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState(null)
  const [menuLeadId, setMenuLeadId] = useState(null)

  // Lead Information
  const [taskName, setTaskName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [leadType, setLeadType] = useState(LEAD_TYPES[0])
  const [clientTicketNumber, setClientTicketNumber] = useState('')

  // Ticket Details
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskTime, setTaskTime] = useState('00:00')
  const [scopeOfWork, setScopeOfWork] = useState('')

  // Address & Location
  const [apartment, setApartment] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [timezone, setTimezone] = useState(TIMEZONES[0])

  // Pricing & Rates
  const [currency, setCurrency] = useState('EUR') // default Euro
  const [hourlyRate, setHourlyRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')

  // Tools / project details
  const [toolsRequired, setToolsRequired] = useState('')
  const [agreedRate, setAgreedRate] = useState('')

  // Additional costs
  const [travelCostPerDay, setTravelCostPerDay] = useState('')
  const [totalCost, setTotalCost] = useState('')

  // Lead status
  const [status, setStatus] = useState(LEAD_STATUSES[0])

  const resetForm = () => {
    setTaskName('')
    setCustomerId('')
    setLeadType(LEAD_TYPES[0])
    setClientTicketNumber('')
    setTaskStartDate('')
    setTaskEndDate('')
    setTaskTime('00:00')
    setScopeOfWork('')
    setApartment('')
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setCountry('')
    setZipCode('')
    setTimezone(TIMEZONES[0])
    setCurrency('EUR')
    setHourlyRate('')
    setFullDayRate('')
    setMonthlyRate('')
    setToolsRequired('')
    setAgreedRate('')
    setTravelCostPerDay('')
    setTotalCost('')
    setStatus(LEAD_STATUSES[0])
    setFormError('')
    setFormSuccess('')
    setEditingLeadId(null)
  }

  const loadLeads = async () => {
    try {
      setLoadingLeads(true)
      setListError('')
      const res = await fetch(`${API_BASE_URL}/leads`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load leads')
      }
      setLeads(data.leads || [])
    } catch (err) {
      console.error('Load leads error', err)
      setListError(err.message || 'Unable to load leads')
    } finally {
      setLoadingLeads(false)
    }
  }

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoadingCustomers(true)
        setFormError('')
        const res = await fetch(`${API_BASE_URL}/leads/customers`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Unable to load customers')
        }
        setCustomers(data.customers || [])
      } catch (err) {
        console.error('Load lead customers error', err)
        setFormError(err.message || 'Unable to load customers')
      } finally {
        setLoadingCustomers(false)
      }
    }

    fetchCustomers()
    loadLeads()
  }, [])

  useEffect(() => {
    if (!leads.length) {
      setSummary({ total: 0, bid: 0, confirmed: 0, rescheduled: 0 })
      return
    }
    const total = leads.length
    const bid = leads.filter((l) => l.status === 'BID').length
    const confirmed = leads.filter((l) => l.status === 'Confirm').length
    const rescheduled = leads.filter((l) => l.status === 'Reschedule').length
    setSummary({ total, bid, confirmed, rescheduled })
  }, [leads])

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return leads
    return leads.filter((lead) => {
      const name = lead.taskName?.toLowerCase() || ''
      const customerName = lead.customerName?.toLowerCase() || ''
      const code = `aim-l-${String(lead.id || '')}`.toLowerCase()
      return name.includes(term) || customerName.includes(term) || code.includes(term)
    })
  }, [leads, searchTerm])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      if (!taskName || !customerId || !taskStartDate || !taskEndDate || !taskTime || !scopeOfWork) {
        throw new Error('Please fill all required fields.')
      }

      const payload = {
        customerId: Number(customerId),
        taskName,
        leadType,
        clientTicketNumber,
        taskStartDate,
        taskEndDate,
        taskTime,
        scopeOfWork,
        apartment,
        addressLine1,
        addressLine2,
        city,
        country,
        zipCode,
        timezone,
        currency,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        fullDayRate: fullDayRate ? Number(fullDayRate) : null,
        monthlyRate: monthlyRate ? Number(monthlyRate) : null,
        toolsRequired,
        agreedRate,
        travelCostPerDay: travelCostPerDay ? Number(travelCostPerDay) : null,
        totalCost: totalCost ? Number(totalCost) : null,
        status,
      }

      const isEditing = Boolean(editingLeadId)
      const url = isEditing ? `${API_BASE_URL}/leads/${editingLeadId}` : `${API_BASE_URL}/leads`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || (isEditing ? 'Unable to update lead' : 'Unable to create lead'))
      }

      setFormSuccess(isEditing ? 'Lead updated successfully.' : 'Lead created successfully.')
      resetForm()
      setViewMode('list')
      await loadLeads()
    } catch (err) {
      console.error('Create lead error', err)
      setFormError(err.message || 'Unable to save lead')
    } finally {
      setSaving(false)
    }
  }

  const openLeadModal = async (leadId) => {
    try {
      setListError('')
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load lead details')
      }
      setSelectedLead(data.lead)
      setIsLeadModalOpen(true)
    } catch (err) {
      console.error('View lead error', err)
      setListError(err.message || 'Unable to load lead details')
    }
  }

  const fillFormFromLead = (lead) => {
    setTaskName(lead.taskName || '')
    setCustomerId(String(lead.customerId || ''))
    setLeadType(lead.leadType || LEAD_TYPES[0])
    setClientTicketNumber(lead.clientTicketNumber || '')
    setTaskStartDate(lead.taskStartDate || '')
    setTaskEndDate(lead.taskEndDate || '')
    setTaskTime(lead.taskTime || '00:00')
    setScopeOfWork(lead.scopeOfWork || '')
    setApartment(lead.apartment || '')
    setAddressLine1(lead.addressLine1 || '')
    setAddressLine2(lead.addressLine2 || '')
    setCity(lead.city || '')
    setCountry(lead.country || '')
    setZipCode(lead.zipCode || '')
    setTimezone(lead.timezone || TIMEZONES[0])
    setCurrency(lead.currency || 'EUR')
    setHourlyRate(lead.hourlyRate != null ? String(lead.hourlyRate) : '')
    setFullDayRate(lead.fullDayRate != null ? String(lead.fullDayRate) : '')
    setMonthlyRate(lead.monthlyRate != null ? String(lead.monthlyRate) : '')
    setToolsRequired(lead.toolsRequired || '')
    setAgreedRate(lead.agreedRate || '')
    setTravelCostPerDay(lead.travelCostPerDay != null ? String(lead.travelCostPerDay) : '')
    setTotalCost(lead.totalCost != null ? String(lead.totalCost) : '')
    setStatus(lead.status || LEAD_STATUSES[0])
  }

  const startEditLead = async (leadId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load lead')
      }
      fillFormFromLead(data.lead)
      setEditingLeadId(leadId)
      setViewMode('form')
    } catch (err) {
      console.error('Edit lead error', err)
      setFormError(err.message || 'Unable to load lead for edit')
    }
  }

  const startCloneLead = async (leadId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load lead')
      }
      fillFormFromLead(data.lead)
      setEditingLeadId(null)
      setViewMode('form')
    } catch (err) {
      console.error('Clone lead error', err)
      setFormError(err.message || 'Unable to prepare cloned lead')
    }
  }

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to delete lead')
      }
      await loadLeads()
    } catch (err) {
      console.error('Delete lead error', err)
      setListError(err.message || 'Unable to delete lead')
    }
  }

  const handleCloseLeadModal = () => {
    setIsLeadModalOpen(false)
    setSelectedLead(null)
  }

  // When arriving from Customers "Create Lead" shortcut
  useEffect(() => {
    const stored = localStorage.getItem('selectedCustomerForLead')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.id) {
        setCustomerId(String(parsed.id))
        setViewMode('form')
      }
    } catch {
      // ignore parse errors
    }
    localStorage.removeItem('selectedCustomerForLead')
  }, [])

  if (viewMode === 'form') {
    return (
      <section className="leads-page">
        <header className="leads-header">
          <button
            type="button"
            className="leads-secondary-btn"
            onClick={() => {
              resetForm()
              setViewMode('list')
            }}
          >
            ← Back
          </button>
          <div>
            <h1 className="leads-title">{editingLeadId ? 'Edit Lead' : 'Create New Lead'}</h1>
            <p className="leads-subtitle">
              {editingLeadId ? 'Update the details of the lead.' : 'Fill in the details to create a new lead.'}
            </p>
          </div>
        </header>

        <form className="leads-form" onSubmit={handleSubmit}>
        {/* Lead Information */}
        <section className="leads-card">
          <h2 className="leads-section-title">Lead Information</h2>

          <div className="leads-grid">
            <label className="leads-field leads-field--full">
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

            <label className="leads-field">
              <span>Lead Type *</span>
              <select value={leadType} onChange={(e) => setLeadType(e.target.value)}>
                {LEAD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="leads-field">
              <span>Client Ticket Number</span>
              <input
                type="text"
                value={clientTicketNumber}
                onChange={(e) => setClientTicketNumber(e.target.value)}
                placeholder="Enter client ticket number (optional)"
              />
            </label>

            <label className="leads-field leads-field--full">
              <span>
                Select Customer <span className="field-required">*</span>
              </span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingCustomers}
              >
                <option value="">Choose a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.accountEmail})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Ticket Details */}
        <section className="leads-card">
          <h2 className="leads-section-title">Ticket Details</h2>

          <div className="leads-grid">
            <label className="leads-field">
              <span>
                Task Start Date <span className="field-required">*</span>
              </span>
              <input
                type="date"
                value={taskStartDate}
                onChange={(e) => setTaskStartDate(e.target.value)}
              />
            </label>

            <label className="leads-field">
              <span>
                Task End Date <span className="field-required">*</span>
              </span>
              <input type="date" value={taskEndDate} onChange={(e) => setTaskEndDate(e.target.value)} />
            </label>

            <label className="leads-field">
              <span>
                Task Time <span className="field-required">*</span>
              </span>
              <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
            </label>

            <label className="leads-field leads-field--full">
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
          </div>
        </section>

        {/* Address & Location */}
        <section className="leads-card">
          <h2 className="leads-section-title">Address &amp; Location</h2>

          <div className="leads-grid">
            <label className="leads-field">
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

            <label className="leads-field">
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

            <label className="leads-field">
              <span>Address Line 2</span>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Enter address line 2 (optional)"
              />
            </label>

            <label className="leads-field">
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

            <label className="leads-field">
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

            <label className="leads-field">
              <span>
                Zip Code <span className="field-required">*</span>
              </span>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter zip code"
              />
            </label>

            <label className="leads-field leads-field--full">
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

        {/* Pricing & Rates */}
        <section className="leads-card">
          <h2 className="leads-section-title">Pricing &amp; Rates</h2>

          <div className="leads-grid">
            <label className="leads-field">
              <span>
                Select Currency <span className="field-required">*</span>
              </span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="leads-field">
              <span>
                Hourly Rate <span className="field-required">*</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Enter hourly rate"
              />
            </label>

            <label className="leads-field">
              <span>
                Full Day Rate <span className="field-required">*</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fullDayRate}
                onChange={(e) => setFullDayRate(e.target.value)}
                placeholder="Enter full day rate"
              />
            </label>

            <label className="leads-field">
              <span>Monthly Rate</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="Enter monthly rate (optional)"
              />
            </label>
          </div>
        </section>

        {/* Tools & Project Details */}
        <section className="leads-card">
          <h2 className="leads-section-title">Tools &amp; Project Details</h2>

          <div className="leads-grid">
            <label className="leads-field leads-field--full">
              <span>Tools Required</span>
              <textarea
                rows={2}
                value={toolsRequired}
                onChange={(e) => setToolsRequired(e.target.value)}
                placeholder="List the tools and technologies required for this project"
              />
            </label>

            <label className="leads-field">
              <span>Agreed Rate</span>
              <input
                type="text"
                value={agreedRate}
                onChange={(e) => setAgreedRate(e.target.value)}
                placeholder="Enter the agreed rate"
              />
            </label>
          </div>
        </section>

        {/* Additional Costs */}
        <section className="leads-card">
          <h2 className="leads-section-title">Additional Costs</h2>

          <div className="leads-grid">
            <label className="leads-field">
              <span>Travel Cost/Day</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={travelCostPerDay}
                onChange={(e) => setTravelCostPerDay(e.target.value)}
                placeholder="Enter travel cost per day"
              />
            </label>

            <label className="leads-field">
              <span>Total Cost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="Enter total cost"
              />
            </label>
          </div>
        </section>

        {/* Lead Status */}
        <section className="leads-card">
          <h2 className="leads-section-title">Lead Status</h2>

          <div className="lead-status-row">
            <label className="leads-field">
              <span>Status *</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {formError && <div className="leads-message leads-message--error">{formError}</div>}
        {formSuccess && <div className="leads-message leads-message--success">{formSuccess}</div>}

        <div className="leads-actions-footer">
          <button
            type="button"
            className="leads-secondary-btn"
            onClick={resetForm}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="leads-primary-btn" disabled={saving}>
            {saving ? (editingLeadId ? 'Updating Lead...' : 'Creating Lead...') : editingLeadId ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>
      </form>
    </section>
  )
 }

  // LIST VIEW
  return (
    <section className="leads-page">
      <header className="leads-header">
        <div>
          <h1 className="leads-title">Leads</h1>
          <p className="leads-subtitle">Manage your business leads.</p>
        </div>
        <button
          type="button"
          className="leads-primary-btn"
          onClick={() => {
            resetForm()
            setViewMode('form')
          }}
        >
          + Add Lead
        </button>
      </header>

      <section className="leads-summary-row">
        <div className="leads-summary-card">
          <p className="summary-label">Total Leads</p>
          <p className="summary-value">{summary.total}</p>
        </div>
        <div className="leads-summary-card">
          <p className="summary-label">BID</p>
          <p className="summary-value">{summary.bid}</p>
        </div>
        <div className="leads-summary-card">
          <p className="summary-label">Confirmed</p>
          <p className="summary-value">{summary.confirmed}</p>
        </div>
        <div className="leads-summary-card">
          <p className="summary-label">Rescheduled</p>
          <p className="summary-value">{summary.rescheduled}</p>
        </div>
      </section>

      <section className="leads-card">
        <div className="leads-list-toolbar">
          <div className="leads-search">
            <input
              type="text"
              placeholder="Search by code, task or customer name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {listError && <div className="leads-message leads-message--error leads-message--inline">{listError}</div>}

        <div className="leads-table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Customer</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Ticket</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingLeads ? (
                <tr>
                  <td colSpan={6} className="leads-empty">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="leads-empty">
                    No leads found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="leads-name-main">{lead.taskName}</div>
                      <div className="leads-name-sub">#AIM-L-{String(lead.id).padStart(3, '0')}</div>
                    </td>
                    <td>{lead.customerName}</td>
                    <td>
                      {lead.taskStartDate} - {lead.taskEndDate} {lead.taskTime}
                    </td>
                    <td>{lead.status}</td>
                    <td>--</td>
                    <td className="leads-actions-cell">
                      <div className="leads-actions-wrapper">
                        <button
                          type="button"
                          className="leads-actions-trigger"
                          onClick={() =>
                            setMenuLeadId((prev) => (prev === lead.id ? null : lead.id))
                          }
                        >
                          <FiMoreVertical />
                        </button>
                        {menuLeadId === lead.id && (
                          <div className="leads-actions-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuLeadId(null)
                                openLeadModal(lead.id)
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuLeadId(null)
                                startEditLead(lead.id)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuLeadId(null)
                                startCloneLead(lead.id)
                              }}
                            >
                              Clone
                            </button>
                            <button
                              type="button"
                              className="leads-actions-item--danger"
                              onClick={() => {
                                setMenuLeadId(null)
                                handleDeleteLead(lead.id)
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isLeadModalOpen && selectedLead && (
        <div className="lead-modal-backdrop" role="dialog" aria-modal="true">
          <div className="lead-modal">
            <header className="lead-modal-header">
              <div>
                <h2 className="lead-modal-title">{selectedLead.taskName}</h2>
                <p className="lead-modal-sub">
                  Code: #AIM-L-{String(selectedLead.id).padStart(3, '0')} &bull; Customer:{' '}
                  {selectedLead.customerName}
                </p>
              </div>
              <button type="button" className="lead-modal-close" onClick={handleCloseLeadModal}>
                ×
              </button>
            </header>

            <section className="lead-modal-section">
              <h3>Lead Information</h3>
              <p className="lead-modal-line">Type: {selectedLead.leadType}</p>
              <p className="lead-modal-line">Status: {selectedLead.status}</p>
              {selectedLead.clientTicketNumber && (
                <p className="lead-modal-line">Ticket Number: {selectedLead.clientTicketNumber}</p>
              )}
            </section>

            <section className="lead-modal-section">
              <h3>Task Details</h3>
              <p className="lead-modal-line">
                Date &amp; Time: {selectedLead.taskStartDate} - {selectedLead.taskEndDate}{' '}
                {selectedLead.taskTime}
              </p>
              <p className="lead-modal-line">Scope of Work: {selectedLead.scopeOfWork}</p>
            </section>

            <section className="lead-modal-section">
              <h3>Address</h3>
              <p className="lead-modal-line">Apartment: {selectedLead.apartment}</p>
              <p className="lead-modal-line">Address: {selectedLead.addressLine1}</p>
              {selectedLead.addressLine2 && (
                <p className="lead-modal-line">Address Line 2: {selectedLead.addressLine2}</p>
              )}
              <p className="lead-modal-line">
                {selectedLead.city}, {selectedLead.country} - {selectedLead.zipCode}
              </p>
            </section>

            <section className="lead-modal-section">
              <h3>Pricing</h3>
              <p className="lead-modal-line">
                Currency: {selectedLead.currency} | Hourly: {selectedLead.hourlyRate} | Full day:{' '}
                {selectedLead.fullDayRate}
              </p>
              {selectedLead.monthlyRate && (
                <p className="lead-modal-line">Monthly: {selectedLead.monthlyRate}</p>
              )}
              {selectedLead.totalCost && (
                <p className="lead-modal-line">Total cost: {selectedLead.totalCost}</p>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

export default LeadsPage
