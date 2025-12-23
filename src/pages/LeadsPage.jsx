// LeadsPage.jsx - Leads list + Create / Edit Lead page
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMoreVertical, FiCheckCircle, FiCalendar, FiXCircle, FiAlertCircle, FiFileText, FiArrowLeft, FiEye, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi'
import Select from 'react-select'
import Autocomplete from 'react-google-autocomplete'
import './LeadsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const LEAD_TYPES = ['Full time', 'Part time', 'Dispatch']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'GBP', label: 'Pound (GBP)' },
]

const LEAD_STATUSES = ['BID', 'Confirm', 'Reschedule', 'Cancelled']

const customSelectStyles = {
  control: (provided) => ({
    ...provided,
    borderRadius: '10px',
    border: '1px solid var(--border-subtle, #e5e7eb)',
    padding: '1px 0',
    fontSize: '13px',
    boxShadow: 'none',
    '&:hover': {
      border: '1px solid var(--border-subtle, #9ca3af)',
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 50,
    fontSize: '13px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#e0e7ff' : null,
    color: state.isSelected ? 'white' : 'black',
  }),
}

function LeadsPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('list')

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

  const [countriesList, setCountriesList] = useState([])
  const [availableTimezones, setAvailableTimezones] = useState([])

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusChangeData, setStatusChangeData] = useState({
    leadId: null,
    leadName: '',
    currentStatus: '',
    newStatus: ''
  })
  const [followUpDate, setFollowUpDate] = useState('')
  const [statusChangeReason, setStatusChangeReason] = useState('')

  // Form Fields
  const [taskName, setTaskName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [leadType, setLeadType] = useState(LEAD_TYPES[0])
  const [clientTicketNumber, setClientTicketNumber] = useState('')
  const [isRecurring, setIsRecurring] = useState('No')
  const [recurringStartDate, setRecurringStartDate] = useState('')
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [totalWeeks, setTotalWeeks] = useState('')
  const [recurringDays, setRecurringDays] = useState([])

  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskTime, setTaskTime] = useState('09:00')
  const [scopeOfWork, setScopeOfWork] = useState('')

  const [apartment, setApartment] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [timezone, setTimezone] = useState('')

  const [currency, setCurrency] = useState('EUR')
  const [hourlyRate, setHourlyRate] = useState('')
  const [halfDayRate, setHalfDayRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [toolsRequired, setToolsRequired] = useState('')
  const [agreedRate, setAgreedRate] = useState('')

  const [travelCostPerDay, setTravelCostPerDay] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [status, setStatus] = useState(LEAD_STATUSES[0])

  const resetForm = () => {
    setTaskName('')
    setCustomerId('')
    setLeadType(LEAD_TYPES[0])
    setClientTicketNumber('')
    setTaskStartDate('')
    setTaskEndDate('')
    setTaskTime('09:00')
    setScopeOfWork('')
    setApartment('')
    setIsRecurring('No')
    setRecurringStartDate('')
    setRecurringEndDate('')
    setTotalWeeks('')
    setRecurringDays([])
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setCountry('')
    setZipCode('')
    setTimezone('')
    setAvailableTimezones([])
    setCurrency('EUR')
    setHourlyRate('')
    setHalfDayRate('')
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

  const fetchCountries = () => {
    const staticCountries = [
      { name: 'United States', timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] },
      { name: 'United Kingdom', timezones: ['Europe/London'] },
      { name: 'India', timezones: ['Asia/Kolkata'] },
      { name: 'Canada', timezones: ['America/Toronto', 'America/Vancouver'] },
      { name: 'Australia', timezones: ['Australia/Sydney', 'Australia/Melbourne'] },
      { name: 'Germany', timezones: ['Europe/Berlin'] },
      { name: 'France', timezones: ['Europe/Paris'] },
      { name: 'Italy', timezones: ['Europe/Rome'] },
      { name: 'Spain', timezones: ['Europe/Madrid'] },
      { name: 'Netherlands', timezones: ['Europe/Amsterdam'] },
      { name: 'United Arab Emirates', timezones: ['Asia/Dubai'] }
    ].sort((a, b) => a.name.localeCompare(b.name))
    setCountriesList(staticCountries)
  }

  const handleGoogleAddressSelect = async (place) => {
    if (!place || !place.address_components) return

    let streetNo = '', route = '', loc = '', ctry = '', pc = '', state = ''

    place.address_components.forEach(c => {
      const types = c.types
      if (types.includes('street_number')) streetNo = c.long_name
      if (types.includes('route')) route = c.long_name
      if (types.includes('locality')) loc = c.long_name
      if (types.includes('country')) ctry = c.long_name
      if (types.includes('postal_code')) pc = c.long_name
      if (types.includes('administrative_area_level_1')) state = c.long_name
    })

    // Address 1 (Street Number + Route)
    const addr1 = streetNo ? `${streetNo} ${route}` : route || place.name || ''
    setAddressLine1(addr1)

    // City (Locality or State as fallback)
    setCity(loc || state || '')

    // Zip Code
    setZipCode(pc)

    // Country logic - sync with our dropdown
    if (ctry) {
      handleCountrySelectChange({ value: ctry })
    }

    // Auto Timezone based on Latitude/Longitude
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat()
      const lon = place.geometry.location.lng()
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`)
        const data = await res.json()
        if (data?.timezone) {
          setTimezone(data.timezone)
          setAvailableTimezones(prev => Array.from(new Set([data.timezone, ...prev])))
        }
      } catch (e) {
        console.error('Timezone detection failed', e)
      }
    }
  }

  const handleCountrySelectChange = (option) => {
    const ctry = option ? option.value : ''
    setCountry(ctry)
    const match = countriesList.find(c => c.name === ctry)
    if (match) {
      setAvailableTimezones(match.timezones)
      setTimezone(match.timezones[0])
    } else {
      setAvailableTimezones([]); setTimezone('')
    }
  }

  const countryOptions = useMemo(() => countriesList.map(c => ({ value: c.name, label: c.name })), [countriesList])
  const timezoneOptions = useMemo(() => availableTimezones.map(t => ({ value: t, label: t })), [availableTimezones])

  const openStatusChangeModal = (lead) => {
    setStatusChangeData({ leadId: lead.id, leadName: lead.taskName, currentStatus: lead.status, newStatus: lead.status })
    setFollowUpDate(lead.followUpDate ? lead.followUpDate.split('T')[0] : '')
    setStatusChangeReason(lead.statusChangeReason || '')
    setIsStatusModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    try {
      const { leadId, newStatus } = statusChangeData
      if (newStatus === 'Reschedule' && !followUpDate) return alert('Select follow-up date')
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ status: newStatus, followUpDate: followUpDate || null, statusChangeReason: statusChangeReason || null })
      })
      if (!res.ok) throw new Error('Update failed')
      setIsStatusModalOpen(false); loadLeads()
    } catch (e) { alert(e.message) }
  }

  const loadLeads = async () => {
    setLoadingLeads(true)
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, { credentials: 'include' })
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (e) { setListError('Load failed') }
    setLoadingLeads(false)
  }

  const openLeadModal = (id) => {
    const l = leads.find(x => x.id === id)
    if (l) {
      setSelectedLead(l)
      setIsLeadModalOpen(true)
    }
  }

  useEffect(() => {
    const total = leads.length
    const bid = leads.filter(l => l.status === 'BID').length
    const confirmed = leads.filter(l => l.status === 'Confirm').length
    const rescheduled = leads.filter(l => l.status === 'Reschedule').length
    setSummary({ total, bid, confirmed, rescheduled })
  }, [leads])

  useEffect(() => {
    const fetchInit = async () => {
      setLoadingCustomers(true)
      try {
        const res = await fetch(`${API_BASE_URL}/leads/customers`, { credentials: 'include' })
        const data = await res.json()
        setCustomers(data.customers || [])
      } catch (e) { console.error(e) }
      setLoadingCustomers(false)
    }
    fetchInit(); loadLeads(); fetchCountries()
  }, [])

  const filteredLeads = useMemo(() => {
    const t = searchTerm.toLowerCase().trim()
    return leads.filter(l => l.taskName.toLowerCase().includes(t) || l.customerName.toLowerCase().includes(t))
  }, [leads, searchTerm])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      const res = await fetch(editingLeadId ? `${API_BASE_URL}/leads/${editingLeadId}` : `${API_BASE_URL}/leads`, {
        method: editingLeadId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          customerId: Number(customerId), taskName, leadType, clientTicketNumber, taskStartDate, taskEndDate, taskTime: taskTime + ':00',
          scopeOfWork, apartment, addressLine1, addressLine2, city, country, zipCode, timezone, currency,
          hourlyRate: Number(hourlyRate), halfDayRate: Number(halfDayRate), fullDayRate: Number(fullDayRate), monthlyRate: Number(monthlyRate),
          toolsRequired, agreedRate: Number(agreedRate), travelCostPerDay: Number(travelCostPerDay), totalCost: Number(totalCost), status,
          isRecurring, recurringStartDate, recurringEndDate, totalWeeks, recurringDays: recurringDays.join(',')
        })
      })
      if (!res.ok) throw new Error('Save failed')
      resetForm(); setViewMode('list'); loadLeads()
    } catch (err) { setFormError(err.message) }
    setSaving(false)
  }

  const fillFormFromLead = (l) => {
    setTaskName(l.taskName); setCustomerId(String(l.customerId)); setLeadType(l.leadType); setClientTicketNumber(l.clientTicketNumber || '')
    setTaskStartDate(l.taskStartDate?.split('T')[0]); setTaskEndDate(l.taskEndDate?.split('T')[0]); setTaskTime(l.taskTime?.slice(0, 5))
    setScopeOfWork(l.scopeOfWork); setApartment(l.apartment || ''); setAddressLine1(l.addressLine1); setAddressLine2(l.addressLine2 || '')
    setCity(l.city); setCountry(l.country); setZipCode(l.zipCode); setTimezone(l.timezone)
    setCurrency(l.currency); setHourlyRate(l.hourlyRate); setHalfDayRate(l.halfDayRate); setFullDayRate(l.fullDayRate)
    setMonthlyRate(l.monthlyRate); setToolsRequired(l.toolsRequired || ''); setAgreedRate(l.agreedRate || '')
    setTravelCostPerDay(l.travelCostPerDay); setTotalCost(l.totalCost); setStatus(l.status)
    setIsRecurring(l.isRecurring || 'No'); setRecurringStartDate(l.recurringStartDate?.split('T')[0])
    setRecurringEndDate(l.recurringEndDate?.split('T')[0]); setTotalWeeks(l.totalWeeks || ''); setRecurringDays(l.recurringDays?.split(',') || [])
    const match = countriesList.find(c => c.name === l.country)
    if (match) setAvailableTimezones(match.timezones)
  }

  const startEditLead = (id) => {
    const l = leads.find(x => x.id === id)
    if (l) { fillFormFromLead(l); setEditingLeadId(id); setViewMode('form') }
  }

  const startCloneLead = (id) => {
    const l = leads.find(x => x.id === id)
    if (l) {
      fillFormFromLead(l)
      setEditingLeadId(null) // Clear ID to represent a new clone
      setViewMode('form')
    }
  }

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Delete failed')
      loadLeads()
    } catch (e) {
      alert(e.message)
    }
  }

  if (viewMode === 'form') {
    return (
      <section className="leads-page">
        <header className="leads-header">
          <button type="button" className="leads-back" onClick={() => { resetForm(); setViewMode('list'); }}><FiArrowLeft /></button>
          <div>
            <h1 className="leads-title">{editingLeadId ? 'Edit Lead' : 'Create Lead'}</h1>
            <p className="leads-subtitle">Task details and pricing.</p>
          </div>
        </header>

        <form className="leads-form" onSubmit={handleSubmit}>
          <section className="leads-card">
            <h2 className="leads-section-title">Lead Information</h2>
            <div className="leads-grid">
              <label className="leads-field leads-field--2/3"><span>Task Name *</span><input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} required /></label>
              <label className="leads-field"><span>Type</span><select value={leadType} onChange={e => setLeadType(e.target.value)}>{LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
              <label className="leads-field"><span>Customer *</span><select value={customerId} onChange={e => setCustomerId(e.target.value)} required><option value="">Select...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="leads-field"><span>Ticket #</span><input type="text" value={clientTicketNumber} onChange={e => setClientTicketNumber(e.target.value)} /></label>

              {leadType === 'Dispatch' && (
                <>
                  <div className="leads-field leads-field--full" style={{ marginTop: '10px' }}>
                    <span style={{ display: 'block', marginBottom: '8px' }}>Recurring</span>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" value="Yes" checked={isRecurring === 'Yes'} onChange={e => setIsRecurring(e.target.value)} /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" value="No" checked={isRecurring === 'No'} onChange={e => setIsRecurring(e.target.value)} /> No
                      </label>
                    </div>
                  </div>

                  {isRecurring === 'Yes' && (
                    <>
                      <label className="leads-field"><span>Recurring Start Date</span><input type="date" value={recurringStartDate} onChange={e => setRecurringStartDate(e.target.value)} /></label>
                      <label className="leads-field"><span>Recurring End Date</span><input type="date" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} /></label>

                      <div className="leads-field leads-field--full" style={{ marginTop: '10px' }}>
                        <span style={{ display: 'block', marginBottom: '8px' }}>Total Weeks (Days)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                          {WEEKDAYS.map(day => (
                            <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={recurringDays.includes(day)}
                                onChange={e => {
                                  if (e.target.checked) setRecurringDays([...recurringDays, day])
                                  else setRecurringDays(recurringDays.filter(d => d !== day))
                                }}
                              /> {day}
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="leads-card">
            <h2 className="leads-section-title">Schedule & Scope</h2>
            <div className="leads-grid">
              <label className="leads-field"><span>Start Date *</span><input type="date" value={taskStartDate} onChange={e => setTaskStartDate(e.target.value)} required /></label>
              <label className="leads-field"><span>End Date *</span><input type="date" value={taskEndDate} onChange={e => setTaskEndDate(e.target.value)} required /></label>
              <label className="leads-field"><span>Time *</span><input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} required /></label>
              <label className="leads-field leads-field--full"><span>Scope *</span><textarea rows={2} value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} required /></label>
            </div>
          </section>

          <section className="leads-card">
            <h2 className="leads-section-title">Location</h2>
            <div className="leads-grid">
              <label className="leads-field leads-field--full">
                <span>Address (Search)</span>
                <Autocomplete
                  apiKey={GOOGLE_MAPS_API_KEY}
                  onPlaceSelected={handleGoogleAddressSelect}
                  options={{ types: ['address'] }}
                  className="google-autocomplete-input"
                  placeholder="Start typing your address..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </label>

              <label className="leads-field">
                <span>Address 1 *</span>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  required
                  placeholder="Street name / Building"
                />
              </label>

              <label className="leads-field">
                <span>Apartment/Street 2</span>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={e => setAddressLine2(e.target.value)}
                  placeholder="Suite, Floor, etc."
                />
              </label>

              <label className="leads-field">
                <span>City *</span>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                />
              </label>

              <label className="leads-field">
                <span>Country *</span>
                <Select
                  options={countryOptions}
                  value={countryOptions.find(o => o.value === country)}
                  onChange={handleCountrySelectChange}
                  styles={customSelectStyles}
                  placeholder="Select Country"
                />
              </label>

              <label className="leads-field">
                <span>Zip Code *</span>
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  required
                />
              </label>

              <label className="leads-field leads-field--2/3">
                <span>Timezone *</span>
                <Select
                  options={timezoneOptions}
                  value={timezoneOptions.find(o => o.value === timezone)}
                  onChange={o => setTimezone(o?.value)}
                  styles={customSelectStyles}
                  placeholder="Select Timezone"
                />
              </label>
            </div>
          </section>

          <section className="leads-card">
            <h2 className="leads-section-title">Project Details</h2>
            <div className="leads-grid">
              <label className="leads-field leads-field--full">
                <span>Tools Required</span>
                <input
                  type="text"
                  value={toolsRequired}
                  onChange={(e) => setToolsRequired(e.target.value)}
                  placeholder="e.g. Drill, Laptop, Console cable"
                />
              </label>
            </div>
          </section>

          <section className="leads-card">
            <h2 className="leads-section-title">Pricing & Rates</h2>
            <div className="leads-grid leads-grid--pricing">
              <label className="leads-field">
                <span>Currency</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="leads-field">
                <span>Hourly</span>
                <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Half Day</span>
                <input type="number" step="0.01" value={halfDayRate} onChange={(e) => setHalfDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Full Day</span>
                <input type="number" step="0.01" value={fullDayRate} onChange={(e) => setFullDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Monthly</span>
                <input type="number" step="0.01" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Agreed Rate</span>
                <input type="text" value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} placeholder="Details" />
              </label>
            </div>
          </section>

          <section className="leads-card">
            <h2 className="leads-section-title">Additional Costs</h2>
            <div className="leads-grid">
              <label className="leads-field">
                <span>Travel/Day</span>
                <input
                  type="number"
                  step="0.01"
                  value={travelCostPerDay}
                  onChange={(e) => setTravelCostPerDay(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="leads-field">
                <span>Tool Cost</span>
                <input
                  type="number"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
          </section>

          <div className="leads-actions-footer">
            <button type="button" className="leads-secondary-btn" onClick={() => setViewMode('list')}>Cancel</button>
            <button type="submit" className="leads-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Lead'}</button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="leads-page">
      <header className="leads-header">
        <div>
          <h1 className="leads-title">Business Leads</h1>
          <p className="leads-subtitle">Manage and track your customer opportunities.</p>
        </div>
        <button type="button" className="leads-primary-btn" onClick={() => { resetForm(); setViewMode('form'); }}>
          + Add New Lead
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
        <div className="leads-list-toolbar"><div className="leads-search"><input type="text" placeholder="Search leads..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
        <div className="leads-table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Lead Information</th>
                <th>Customer</th>
                <th>Service Date</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="leads-name-main">{l.taskName}</div>
                    <div className="leads-name-sub">#AIM-L-{String(l.id).padStart(3, '0')}</div>
                  </td>
                  <td>{l.customerName}</td>
                  <td>
                    {(() => {
                      let history = [];
                      try {
                        if (l.followUpHistory) {
                          history = typeof l.followUpHistory === 'string' ? JSON.parse(l.followUpHistory) : l.followUpHistory;
                        }
                      } catch (e) { history = []; }

                      return (
                        <div className="date-stack">
                          <span className={`date-value ${history.filter(h => h.date).length > 0 ? 'date-value--old' : ''}`}>
                            {l.taskStartDate?.split('T')[0]}
                          </span>
                          {history.filter(h => h.date).map((h, i, arr) => (
                            <div key={i} className="reschedule-item">
                              <div className="date-label">RESCHEDULE {i + 1}:</div>
                              <span className={`date-value ${i === arr.length - 1 ? 'date-value--new' : 'date-value--old'}`}>
                                {h.date}
                              </span>
                              {h.remarks && <div className="date-remarks">{h.remarks}</div>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-badge status-badge--${l.status.toLowerCase()}`}
                      onClick={() => openStatusChangeModal(l)}
                    >
                      {l.status === 'BID' && <FiAlertCircle />}
                      {l.status === 'Confirm' && <FiCheckCircle />}
                      {l.status === 'Reschedule' && <FiCalendar />}
                      {l.status === 'Cancelled' && <FiXCircle />}
                      {l.status}
                    </button>
                  </td>
                  <td>
                    {l.status === 'Confirm' ? (
                      <button type="button" className="leads-create-ticket-btn" onClick={() => navigate('/dashboard', { state: { openTickets: true } })}>
                        <FiFileText /> Ticket
                      </button>
                    ) : l.clientTicketNumber || '--'}
                  </td>
                  <td className="leads-actions-cell">
                    <div className="action-icons">
                      <button title="View" onClick={() => openLeadModal(l.id)} className="action-btn view"><FiEye /></button>
                      <button title="Edit" onClick={() => startEditLead(l.id)} className="action-btn edit"><FiEdit2 /></button>
                      <button title="Clone" onClick={() => startCloneLead(l.id)} className="action-btn clone"><FiCopy /></button>
                      <button title="Delete" onClick={() => handleDeleteLead(l.id)} className="action-btn delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isStatusModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsStatusModalOpen(false)}>
          <div className="lead-modal" onClick={e => e.stopPropagation()}>
            <header className="lead-modal-header">
              <h2>Update Lead Status</h2>
              <p>Change the current progress of: <strong>{statusChangeData.leadName}</strong></p>
            </header>

            <div className="lead-modal-content">
              <div className="status-options-grid">
                {[
                  { id: 'BID', label: 'BID', icon: <FiAlertCircle /> },
                  { id: 'Confirm', label: 'Confirm', icon: <FiCheckCircle /> },
                  { id: 'Reschedule', label: 'Reschedule', icon: <FiCalendar /> },
                  { id: 'Cancelled', label: 'Cancelled', icon: <FiXCircle /> }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`status-option-card ${opt.id.toLowerCase()} ${statusChangeData.newStatus === opt.id ? 'active' : ''}`}
                    onClick={() => setStatusChangeData(p => ({ ...p, newStatus: opt.id }))}
                  >
                    <div className="status-option-icon">{opt.icon}</div>
                    <div className="status-option-label">{opt.label}</div>
                  </div>
                ))}
              </div>

              {statusChangeData.newStatus === 'Reschedule' && (
                <div className="reschedule-date-box">
                  <label>Select New Reschedule Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setFollowUpDate(e.target.value)}
                  />
                </div>
              )}

              <div className="remarks-box">
                <label>Remarks / Note</label>
                <textarea
                  placeholder="Enter reason or additional notes..."
                  value={statusChangeReason}
                  onChange={e => setStatusChangeReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="lead-modal-footer">
              <button className="btn-wow-secondary" onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
              <button className="btn-wow-primary" onClick={handleStatusUpdate}>Update Now</button>
            </div>
          </div>
        </div>
      )}

      {isLeadModalOpen && selectedLead && (
        <div className="lead-modal-backdrop" onClick={() => setIsLeadModalOpen(false)}>
          <div className="lead-modal lead-modal--details" onClick={e => e.stopPropagation()}>
            <header className="lead-modal-header">
              <h2>Lead Details</h2>
              <p>#{String(selectedLead.id).padStart(3, '0')} - {selectedLead.taskName}</p>
            </header>
            <div className="lead-modal-content">
              <div className="details-grid">
                <div className="detail-item"><label>Customer</label><span>{selectedLead.customerName}</span></div>
                <div className="detail-item"><label>Type</label><span>{selectedLead.leadType}</span></div>
                <div className="detail-item"><label>Service Date</label><span>{selectedLead.taskStartDate?.split('T')[0]}</span></div>
                <div className="detail-item"><label>Time</label><span>{selectedLead.taskTime}</span></div>
                <div className="detail-item--full"><label>Scope of Work</label><span>{selectedLead.scopeOfWork}</span></div>
                <div className="detail-item"><label>Location</label><span>{selectedLead.city}, {selectedLead.country}</span></div>
                <div className="detail-item"><label>Address</label><span>{selectedLead.addressLine1} {selectedLead.addressLine2}</span></div>
                <div className="detail-item"><label>Tools Required</label><span>{selectedLead.toolsRequired || '--'}</span></div>
                <div className="detail-item"><label>Tool Cost</label><span>{selectedLead.currency} {selectedLead.totalCost || '0.00'}</span></div>
                <div className="detail-item"><label>Status</label><span>{selectedLead.status}</span></div>
              </div>
            </div>
            <div className="lead-modal-footer">
              <button className="btn-wow-secondary" onClick={() => setIsLeadModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default LeadsPage
