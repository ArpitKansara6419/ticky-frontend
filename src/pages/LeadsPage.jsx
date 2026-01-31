// LeadsPage.jsx - Leads list + Create / Edit Lead page
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMoreVertical, FiCheckCircle, FiCalendar, FiXCircle, FiAlertCircle, FiFileText, FiArrowLeft, FiEye, FiEdit2, FiCopy, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import Select from 'react-select'
import Autocomplete from 'react-google-autocomplete'
import './LeadsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDDVz2pXtvfL3kvQ6m5kNjDYRzuoIwSZTI'

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
  const location = useLocation()
  const [viewMode, setViewMode] = useState('list')

  // Google Maps Places Autocomplete setup using hook (more stable)
  // Google Maps Places Autocomplete setup (using Autocomplete component now)

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
  const [statusChangeEndDate, setStatusChangeEndDate] = useState('')
  const [statusChangeReason, setStatusChangeReason] = useState('')

  // Sync status modal end date with start date
  useEffect(() => {
    if (followUpDate && statusChangeEndDate) {
      if (statusChangeEndDate < followUpDate) {
        setStatusChangeEndDate(followUpDate)
      }
    }
  }, [followUpDate, statusChangeEndDate])

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


  const [addressLine1, setAddressLine1] = useState('')
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
  const [billingType, setBillingType] = useState('Hourly')
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
    setAddressLine1('')
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
    setBillingType('Hourly')
    setStatus(LEAD_STATUSES[0])
    setFormError('')
    setFormSuccess('')
    setEditingLeadId(null)
  }

  const fetchCountries = () => {
    const staticCountries = [
      { name: 'United States', timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'], code: 'US' },
      { name: 'United Kingdom', timezones: ['Europe/London'], code: 'GB' },
      { name: 'India', timezones: ['Asia/Kolkata'], code: 'IN' },
      { name: 'Canada', timezones: ['America/Toronto', 'America/Vancouver'], code: 'CA' },
      { name: 'Australia', timezones: ['Australia/Sydney', 'Australia/Melbourne'], code: 'AU' },
      { name: 'Germany', timezones: ['Europe/Berlin'], code: 'DE' },
      { name: 'France', timezones: ['Europe/Paris'], code: 'FR' },
      { name: 'Italy', timezones: ['Europe/Rome'], code: 'IT' },
      { name: 'Spain', timezones: ['Europe/Madrid'], code: 'ES' },
      { name: 'Netherlands', timezones: ['Europe/Amsterdam'], code: 'NL' },
      { name: 'Poland', timezones: ['Europe/Warsaw'], code: 'PL' },
      { name: 'Sweden', timezones: ['Europe/Stockholm'], code: 'SE' },
      { name: 'Belgium', timezones: ['Europe/Brussels'], code: 'BE' },
      { name: 'Austria', timezones: ['Europe/Vienna'], code: 'AT' },
      { name: 'Switzerland', timezones: ['Europe/Zurich'], code: 'CH' },
      { name: 'Ireland', timezones: ['Europe/Dublin'], code: 'IE' },
      { name: 'Denmark', timezones: ['Europe/Copenhagen'], code: 'DK' },
      { name: 'Norway', timezones: ['Europe/Oslo'], code: 'NO' },
      { name: 'Finland', timezones: ['Europe/Helsinki'], code: 'FI' },
      { name: 'Portugal', timezones: ['Europe/Lisbon'], code: 'PT' },
      { name: 'China', timezones: ['Asia/Shanghai'], code: 'CN' },
      { name: 'Japan', timezones: ['Asia/Tokyo'], code: 'JP' },
      { name: 'Singapore', timezones: ['Asia/Singapore'], code: 'SG' },
      { name: 'United Arab Emirates', timezones: ['Asia/Dubai'], code: 'AE' }
    ].sort((a, b) => a.name.localeCompare(b.name))
    setCountriesList(staticCountries)
  }

  const handleGoogleAddressSelect = async (place) => {
    if (!place || !place.address_components) return

    let streetNumber = ''
    let route = ''
    let cityLocality = ''
    let countryName = ''
    let postalCode = ''

    place.address_components.forEach((component) => {
      const types = component.types
      if (types.includes('street_number')) streetNumber = component.long_name
      if (types.includes('route')) route = component.long_name
      if (types.includes('locality')) cityLocality = component.long_name
      if (types.includes('country')) countryName = component.long_name
      if (types.includes('postal_code')) postalCode = component.long_name
    })

    const newAddressLine1 = (streetNumber && route) ? `${streetNumber} ${route}` : (route || place.name || '')
    setAddressLine1(newAddressLine1)
    setCity(cityLocality)
    setZipCode(postalCode)

    // Country logic - sync with our dropdown
    if (countryName) {
      handleCountrySelectChange({ value: countryName })
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
    setStatusChangeData({
      leadId: lead.id,
      leadName: lead.taskName,
      currentStatus: lead.status,
      newStatus: lead.status
    })

    // Default the dates to current lead's dates (using followUpDate history if available)
    const currentStart = (lead.followUpDate || lead.taskStartDate)?.split('T')[0] || ''
    const currentEnd = lead.taskEndDate?.split('T')[0] || ''

    setFollowUpDate(currentStart)
    setStatusChangeEndDate(currentEnd)
    setStatusChangeReason('')
    setIsStatusModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    try {
      const { leadId, newStatus, currentStatus } = statusChangeData

      // Real-time Scenario Validations
      if (newStatus === 'Reschedule' && !followUpDate) return alert('A new date is required for rescheduling.')
      if (newStatus === 'Confirm' && !followUpDate) return alert('Please confirm the service date.')
      if (newStatus === 'Cancelled' && !statusChangeReason) return alert('Please provide a reason for cancellation.')

      if (newStatus === 'Reschedule') {
        const todayStr = new Date().toISOString().split('T')[0]
        if (followUpDate < todayStr) {
          return alert('The new start date must be in the future.')
        }
        if (statusChangeEndDate < followUpDate) {
          return alert('The new end date cannot be before the new start date.')
        }

        const currentLead = leads.find(l => l.id === leadId)
        const currentStartDate = currentLead?.taskStartDate?.split('T')[0]
        const currentEndDate = currentLead?.taskEndDate?.split('T')[0]

        if (currentStartDate === followUpDate && currentEndDate === statusChangeEndDate) {
          return alert('The new dates must be different from the current service dates.')
        }
      }

      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          followUpDate: followUpDate || null,
          newEndDate: statusChangeEndDate || null,
          statusChangeReason: statusChangeReason || null
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Update failed')
      }

      setIsStatusModalOpen(false)
      loadLeads()
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
    if (taskStartDate && taskEndDate) {
      if (taskEndDate < taskStartDate) {
        setTaskEndDate(taskStartDate)
      }
    }
  }, [taskStartDate, taskEndDate])

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

  // Handle navigation from dashboard's "New Lead" button
  useEffect(() => {
    if (location.state?.openForm) {
      setViewMode('form')
      resetForm()

      // Auto-select customer if coming from Customers page
      const storedCustomer = localStorage.getItem('selectedCustomerForLead')
      if (storedCustomer) {
        try {
          const customer = JSON.parse(storedCustomer)
          setCustomerId(String(customer.id))
          localStorage.removeItem('selectedCustomerForLead')
        } catch (e) {
          console.error("Failed to parse stored customer", e)
        }
      }

      // Clear state so it doesn't persist
      window.history.replaceState({}, document.title)
    }
  }, [location])


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
          scopeOfWork, apartment: '', addressLine1, addressLine2: '', city, country, zipCode, timezone, currency,
          hourlyRate: hourlyRate !== '' ? Number(hourlyRate) : null,
          halfDayRate: halfDayRate !== '' ? Number(halfDayRate) : null,
          fullDayRate: fullDayRate !== '' ? Number(fullDayRate) : null,
          monthlyRate: monthlyRate !== '' ? Number(monthlyRate) : null,
          toolsRequired, agreedRate,
          travelCostPerDay: travelCostPerDay !== '' ? Number(travelCostPerDay) : null,
          totalCost: totalCost !== '' ? Number(totalCost) : null,
          billingType,
          status,
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
    const effectiveStartDate = ((l.status === 'Reschedule' || l.status === 'Confirm') && l.followUpDate) ? l.followUpDate : l.taskStartDate
    setTaskStartDate(effectiveStartDate?.split('T')[0]); setTaskEndDate(l.taskEndDate?.split('T')[0]); setTaskTime(l.taskTime?.slice(0, 5))
    setScopeOfWork(l.scopeOfWork); setAddressLine1(l.addressLine1);
    setCity(l.city); setCountry(l.country); setZipCode(l.zipCode); setTimezone(l.timezone)
    setCurrency(l.currency); setHourlyRate(l.hourlyRate != null ? String(l.hourlyRate) : ''); setHalfDayRate(l.halfDayRate != null ? String(l.halfDayRate) : ''); setFullDayRate(l.fullDayRate != null ? String(l.fullDayRate) : '')
    setMonthlyRate(l.monthlyRate != null ? String(l.monthlyRate) : ''); setToolsRequired(l.toolsRequired || ''); setAgreedRate(l.agreedRate || '')
    setTravelCostPerDay(l.travelCostPerDay != null ? String(l.travelCostPerDay) : ''); setTotalCost(l.totalCost != null ? String(l.totalCost) : '')
    setBillingType(l.billingType || 'Hourly'); setStatus(l.status)
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
      // Clear dates for clone as per requirement
      setTaskStartDate('')
      setTaskEndDate('')

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
          {/* Lead Information */}
          <section className="leads-card">
            <h2 className="leads-section-title">Lead Information</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <label className="leads-field">
                <span>Task Name *</span>
                <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} required placeholder="Enter task name" />
              </label>

              <label className="leads-field">
                <span>Customer *</span>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                  <option value="">Select...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="leads-field">
                <span>Type</span>
                <select value={leadType} onChange={e => setLeadType(e.target.value)}>
                  {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="leads-field">
                <span>Ticket #</span>
                <input type="text" value={clientTicketNumber} onChange={e => setClientTicketNumber(e.target.value)} placeholder="Optional" />
              </label>
            </div>

            {leadType === 'Dispatch' && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--input-bg)', borderRadius: '12px' }}>
                <div className="leads-field">
                  <span style={{ display: 'block', marginBottom: '8px' }}>Recurring?</span>
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
                  <div style={{ marginTop: '16px' }}>

                    <div className="leads-field leads-field--full">
                      <span style={{ display: 'block', marginBottom: '8px' }}>Recur on Days</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {WEEKDAYS.map(day => (
                          <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', background: 'var(--card-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            <input
                              type="checkbox"
                              checked={recurringDays.includes(day)}
                              onChange={e => {
                                if (e.target.checked) setRecurringDays([...recurringDays, day])
                                else setRecurringDays(recurringDays.filter(d => d !== day))
                              }}
                            /> {day.slice(0, 3)}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Schedule & Scope */}
          <section className="leads-card">
            <h2 className="leads-section-title">Schedule & Scope</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <label className="leads-field">
                <span>Start Date *</span>
                <input type="date" value={taskStartDate} onChange={e => setTaskStartDate(e.target.value)} required />
              </label>
              <label className="leads-field">
                <span>End Date *</span>
                <input type="date" value={taskEndDate} onChange={e => setTaskEndDate(e.target.value)} required />
              </label>
              <label className="leads-field">
                <span>Time *</span>
                <input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} required />
              </label>
              <label className="leads-field leads-field--full">
                <span>Scope of Work *</span>
                <textarea rows={3} value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} required placeholder="Describe requirements..." />
              </label>
            </div>
          </section>

          {/* Location */}
          <section className="leads-card">
            <h2 className="leads-section-title">Location</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <label className="leads-field leads-field--full">
                <span>Details Address Search</span>
                <Autocomplete
                  apiKey={GOOGLE_MAPS_API_KEY}
                  onPlaceSelected={handleGoogleAddressSelect}
                  options={{
                    types: ['address'],
                  }}
                  placeholder="Type to search global address..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle, #e5e7eb)',
                    fontSize: '13px',
                    outline: 'none',
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)'
                  }}
                />
              </label>

              <label className="leads-field">
                <span>Address Line 1 *</span>
                <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} required placeholder="Street / Building" />
              </label>

              <label className="leads-field">
                <span>City *</span>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} required placeholder="Enter city" />
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
                <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} required placeholder="Enter zip code" />
              </label>

              <label className="leads-field leads-field--full">
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

          {/* Project Details */}
          <section className="leads-card">
            <h2 className="leads-section-title">Tools & Equipment</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
              <label className="leads-field">
                <span>Tools Required</span>
                <input type="text" value={toolsRequired} onChange={(e) => setToolsRequired(e.target.value)} placeholder="e.g. Drill, Laptop, Console cable" />
              </label>
            </div>
          </section>

          {/* Pricing */}
          <section className="leads-card">
            <h2 className="leads-section-title">Pricing & Rates</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <label className="leads-field">
                <span>Currency</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="leads-field">
                <span>Billing Type</span>
                <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
                  <option value="Hourly">Hourly Only (min 2 hrs)</option>
                  <option value="Half Day + Hourly">Half Day + Hourly</option>
                  <option value="Full Day + OT">Full Day + OT</option>
                  <option value="Monthly + OT">Monthly + OT (OT/Weekend/Holiday)</option>
                  <option value="Agreed Rate">Agreed Rate</option>
                  <option value="Cancellation">Cancellation / Reschedule</option>
                </select>
              </label>

              <label className="leads-field">
                <span>Hourly Rate</span>
                <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Half Day Rate</span>
                <input type="number" step="0.01" value={halfDayRate} onChange={(e) => setHalfDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Full Day Rate</span>
                <input type="number" step="0.01" value={fullDayRate} onChange={(e) => setFullDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Monthly Rate</span>
                <input type="number" step="0.01" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field" style={{ gridColumn: 'span 2' }}>
                <span>Agreed / Fixed Rate</span>
                <input type="text" value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} placeholder="Details" />
              </label>
            </div>
          </section>

          {/* Additional Costs */}
          <section className="leads-card">
            <h2 className="leads-section-title">Additional Costs</h2>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <label className="leads-field">
                <span>Travel Cost / Day</span>
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
        </form >
      </section >
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

                      const startDateStr = l.taskStartDate?.split('T')[0];
                      const endDateStr = l.taskEndDate?.split('T')[0];
                      const isMultiDay = endDateStr && endDateStr > startDateStr;

                      // Filter redundant history (e.g. Confirm -> Confirm on same date)
                      const cleanHistory = history.filter((h, i) => {
                        if (i === 0) return true;
                        const prev = history[i - 1];
                        // Remove duplicates: same status transition to same date
                        if (h.toStatus === prev.toStatus && h.newDate === prev.newDate) return false;
                        // Remove Confirm -> Confirm if date didn't change
                        if (h.fromStatus === 'Confirm' && h.toStatus === 'Confirm' && h.newDate === h.prevDate) return false;
                        return true;
                      });

                      // Check if this is a simple "BID -> Confirm" on the same date
                      const firstH = cleanHistory[0];
                      const isSimpleConfirm = cleanHistory.length === 1 &&
                        firstH.fromStatus === 'BID' &&
                        firstH.toStatus === 'Confirm' &&
                        firstH.prevDate === firstH.newDate;

                      // 1. BID Status: Just show date
                      if (l.status === 'BID') {
                        return (
                          <div className="date-value">
                            {startDateStr}{isMultiDay ? ` to ${endDateStr}` : ''}
                          </div>
                        );
                      }

                      // 2. Cancelled Status: Show Cancelled Label
                      if (l.status === 'Cancelled') {
                        const latestActiveDate = l.followUpDate ? l.followUpDate.split('T')[0] : startDateStr;
                        return (
                          <div style={{ color: '#ef4444', fontWeight: '500', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '12px' }}>
                              {latestActiveDate}
                            </span>
                            <span style={{ fontSize: '13px', marginTop: '2px' }}>CANCELLED</span>
                          </div>
                        );
                      }

                      // 2. Simple Confirm (No date change): Show Green Text, No Strikethrough
                      if (l.status === 'Confirm' && (cleanHistory.length === 0 || isSimpleConfirm)) {
                        return (
                          <div style={{ color: '#15803d', fontWeight: '500' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8, marginBottom: '2px' }}>Confirmed For</div>
                            {startDateStr}{isMultiDay ? ` to ${endDateStr}` : ''}
                          </div>
                        );
                      }

                      // 3. Complex History (Date changed or Rescheduled): Show Stack
                      const originalDate = (cleanHistory.length > 0 && cleanHistory[0].prevDate) ? cleanHistory[0].prevDate : startDateStr;

                      return (
                        <div className="date-stack">
                          {/* Original Date struck through */}
                          <span className="date-value date-value--old" style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                            {originalDate}
                          </span>

                          {cleanHistory.map((h, i) => {
                            // Skip if date is same as 'original' and it's the first confirm (handled above? no, if we are here, it's complex)
                            // Actually, map all significant changes

                            const label = h.toStatus === 'Confirm' ? 'CONFIRMED FOR:' : 'RESCHEDULED TO:';
                            const color = h.toStatus === 'Confirm' ? '#15803d' : '#f59e0b';
                            const isLast = i === cleanHistory.length - 1;

                            // Use history specific end date if available, else current if last
                            const hStart = h.newDate;
                            const hEnd = h.newEndDate || (isLast ? endDateStr : null);
                            const hMulti = hEnd && hEnd > hStart;

                            return (
                              <div key={i} className="reschedule-item" style={{ color, marginTop: '4px' }}>
                                <div className="date-label" style={{ fontSize: '10px', opacity: 0.8 }}>{label}</div>
                                <span className={`date-value ${isLast ? 'date-value--new' : 'date-value--old'}`}>
                                  {hStart}{hMulti ? ` to ${hEnd}` : ''}
                                </span>
                              </div>
                            );
                          })}
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
                      l.existingTicketId ? (
                        <button
                          type="button"
                          className="leads-create-ticket-btn"
                          style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                          onClick={() => {
                            // Automatically sync lead data to ticket when viewing
                            localStorage.setItem('editTicketId', l.existingTicketId)
                            localStorage.setItem('syncLeadToTicket', JSON.stringify(l))
                            navigate('/dashboard', { state: { openTickets: true } })
                          }}
                        >
                          <FiEye /> View Ticket
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="leads-create-ticket-btn"
                          onClick={() => {
                            localStorage.setItem('selectedLeadForTicket', JSON.stringify(l))
                            navigate('/dashboard', { state: { openTickets: true } })
                          }}
                        >
                          <FiFileText /> Ticket
                        </button>
                      )
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

              {(statusChangeData.newStatus === 'Reschedule' || statusChangeData.newStatus === 'Confirm') && (
                <div className="reschedule-date-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="reschedule-date-box">
                    <label>New Start Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      min={statusChangeData.newStatus === 'Reschedule' ? new Date().toISOString().split('T')[0] : undefined}
                      onChange={e => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div className="reschedule-date-box">
                    <label>New End Date</label>
                    <input
                      type="date"
                      value={statusChangeEndDate}
                      min={followUpDate}
                      onChange={e => setStatusChangeEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="remarks-box">
                <label>Remarks / Note {statusChangeData.newStatus === 'Cancelled' && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <textarea
                  placeholder={statusChangeData.newStatus === 'Cancelled' ? "Please explain why the lead was cancelled..." : "Enter reason or additional notes..."}
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
              <div className="lead-modal-header-info">
                <h2>Lead Details</h2>
                <div className="lead-badge-id">#{String(selectedLead.id).padStart(3, '0')}</div>
              </div>
              <p className="lead-modal-subtitle">{selectedLead.taskName}</p>
            </header>
            <div className="lead-modal-content">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Customer</label>
                  <span>{selectedLead.customerName}</span>
                </div>
                <div className="detail-item">
                  <label>Type / Category</label>
                  <span>{selectedLead.leadType || '--'}</span>
                </div>
                <div className="detail-item">
                  <label>Start Date</label>
                  <span>{((selectedLead.status === 'Reschedule' || selectedLead.status === 'Confirm') && selectedLead.followUpDate) ? selectedLead.followUpDate.split('T')[0] : selectedLead.taskStartDate?.split('T')[0]}</span>
                </div>
                <div className="detail-item">
                  <label>End Date</label>
                  <span>{selectedLead.taskEndDate ? selectedLead.taskEndDate.split('T')[0] : '--'}</span>
                </div>
                <div className="detail-item">
                  <label>Task Time</label>
                  <span>{selectedLead.taskTime}</span>
                </div>
                <div className="detail-item">
                  <label>Location</label>
                  <span>{selectedLead.city}, {selectedLead.country}</span>
                </div>
                <div className="detail-item">
                  <label>Timezone</label>
                  <span>{selectedLead.timezone || '--'}</span>
                </div>
                <div className="detail-item--full">
                  <label>Address</label>
                  <span>{selectedLead.addressLine1} {selectedLead.addressLine2 ? `, ${selectedLead.addressLine2}` : ''}</span>
                </div>
                <div className="detail-item--full">
                  <label>Scope of Work</label>
                  <p className="scope-text">{selectedLead.scopeOfWork}</p>
                </div>
                <div className="detail-item">
                  <label>Tools Required</label>
                  <span>{selectedLead.toolsRequired || '--'}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-pill ${selectedLead.status?.toLowerCase()}`}>{selectedLead.status}</span>
                </div>
                <div className="detail-item--full divider"></div>
                <div className="detail-item">
                  <label>Hourly Rate</label>
                  <span>{selectedLead.currency} {selectedLead.hourlyRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Half Day Rate</label>
                  <span>{selectedLead.currency} {selectedLead.halfDayRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Full Day Rate</label>
                  <span>{selectedLead.currency} {selectedLead.fullDayRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Monthly Rate</label>
                  <span>{selectedLead.currency} {selectedLead.monthlyRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Tool Cost</label>
                  <span>{selectedLead.currency} {selectedLead.totalCost || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Travel Cost / Day</label>
                  <span>{selectedLead.currency} {selectedLead.travelCostPerDay || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Agreed Rate</label>
                  <span>{selectedLead.agreedRate || '--'}</span>
                </div>
              </div>
            </div>
            <div className="lead-modal-footer">
              <button className="btn-wow-secondary" onClick={() => setIsLeadModalOpen(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default LeadsPage
