// LeadsPage.jsx - Leads list + Create / Edit Lead page
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMoreVertical, FiCheckCircle, FiCalendar, FiXCircle, FiAlertCircle, FiFileText, FiArrowLeft } from 'react-icons/fi'
import Select from 'react-select'
import AsyncSelect from 'react-select/async'
import './LeadsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const LEAD_TYPES = ['Full time', 'Part time', 'One-time task']

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
  input: (provided) => ({
    ...provided,
    margin: '0',
    padding: '0',
  }),
}

// Promise-aware debounce for AsyncSelect to prevent hanging loading state
const debounce = (func, wait) => {
  let timeout
  let previousResolve

  return (...args) => {
    // If a request is already pending, resolve it with empty options to "cancel" it from the UI's perspective
    if (previousResolve) {
      previousResolve([])
    }

    return new Promise((resolve) => {
      previousResolve = resolve
      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args)
          resolve(result)
        } catch {
          resolve([])
        } finally {
          previousResolve = null
        }
      }, wait)
    })
  }
}

function LeadsPage() {
  const navigate = useNavigate()
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

  // Country/Timezone states
  const [countriesList, setCountriesList] = useState([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [availableTimezones, setAvailableTimezones] = useState([])

  // Status change modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusChangeData, setStatusChangeData] = useState({
    leadId: null,
    leadName: '',
    currentStatus: '',
    newStatus: ''
  })
  const [followUpDate, setFollowUpDate] = useState('')
  const [statusChangeReason, setStatusChangeReason] = useState('')

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
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [timezone, setTimezone] = useState('')

  // Pricing & Rates
  const [currency, setCurrency] = useState('EUR') // default Euro
  const [hourlyRate, setHourlyRate] = useState('')
  const [halfDayRate, setHalfDayRate] = useState('')
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

  // Fetch countries from REST Countries API
  const fetchCountries = async () => {
    try {
      setLoadingCountries(true)
      const res = await fetch('https://restcountries.com/v3.1/all')

      if (!res.ok) {
        throw new Error('Failed to fetch countries')
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format')
      }

      const countries = data.map(c => ({
        name: c.name.common,
        timezones: c.timezones || [],
        code: c.cca2
      })).sort((a, b) => a.name.localeCompare(b.name))

      setCountriesList(countries)
    } catch (err) {
      console.error('Failed to fetch countries:', err)
      // Fallback to basic country list if API fails
      setCountriesList([
        { name: 'India', timezones: ['Asia/Kolkata'], code: 'IN' },
        { name: 'United States', timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'], code: 'US' },
        { name: 'United Kingdom', timezones: ['Europe/London'], code: 'GB' },
        { name: 'Germany', timezones: ['Europe/Berlin'], code: 'DE' },
        { name: 'France', timezones: ['Europe/Paris'], code: 'FR' },
        { name: 'Poland', timezones: ['Europe/Paris'], code: 'PL' },
      ])
    } finally {
      setLoadingCountries(false)
    }
  }

  // Address Autocomplete Logic (OpenStreetMap Nominatim)
  const fetchAddressOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 3) return []
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&addressdetails=1&limit=5&accept-language=en`)
      const data = await res.json()
      return data.map(item => ({
        value: item,
        label: item.display_name
      }))
    } catch (error) {
      console.error("Error fetching address suggestions:", error)
      return []
    }
  }

  // Debounced load options
  const loadAddressOptions = debounce(fetchAddressOptions, 800)

  // Handle Address Selection
  const handleAddressSelect = async (option) => {
    if (!option) return
    const { address, lat, lon } = option.value

    // Auto-fill fields
    const houseNumber = address.house_number || ''
    const road = address.road || address.pedestrian || ''
    const newAddressLine1 = (houseNumber && road) ? `${houseNumber} ${road}` : (road || option.value.display_name.split(',')[0])

    const newCity = address.city || address.town || address.village || address.hamlet || address.municipality || ''
    const newCountry = address.country || ''
    const newZip = address.postcode || ''

    setAddressLine1(newAddressLine1)
    setCity(newCity)
    setZipCode(newZip)

    // 1. Identify Country
    let matchedCountry = null
    let countryTimezones = []

    if (newCountry) {
      matchedCountry = countriesList.find(c => c.name.toLowerCase() === newCountry.toLowerCase()) ||
        countriesList.find(c => c.code.toLowerCase() === (address.country_code || '').toLowerCase())

      if (matchedCountry) {
        setCountry(matchedCountry.name)
        countryTimezones = matchedCountry.timezones || []
      } else {
        setCountry(newCountry)
      }
    }

    // 2. Fetch Precise Timezone from Coordinates (Open-Meteo)
    let detectedTimezone = ''
    if (lat && lon) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`)
        const data = await res.json()
        if (data && data.timezone) {
          detectedTimezone = data.timezone
        }
      } catch (err) {
        console.error("Failed to fetch precise timezone:", err)
      }
    }

    // 3. Set Timezone States
    if (detectedTimezone) {
      // Use the precise timezone
      setTimezone(detectedTimezone)
      // Ensure it's in the list of options. If country gave us a list, merge it.
      const combinedTimezones = Array.from(new Set([detectedTimezone, ...countryTimezones]))
      setAvailableTimezones(combinedTimezones)
    } else {
      // Fallback to Country defaults or browser default if available
      if (countryTimezones.length > 0) {
        setAvailableTimezones(countryTimezones)
        setTimezone(countryTimezones[0])
      } else {
        setAvailableTimezones([])
        setTimezone('')
      }
    }


  }

  // Handle country selection and auto-populate timezone
  const handleCountrySelectChange = (option) => {
    const countryName = option ? option.value : ''
    setCountry(countryName)

    if (!countryName) {
      setAvailableTimezones([])
      setTimezone('')
      return
    }

    const selected = countriesList.find(c => c.name === countryName)
    if (selected && selected.timezones.length > 0) {
      setAvailableTimezones(selected.timezones)
      setTimezone(selected.timezones[0])
    } else {
      setAvailableTimezones([])
      setTimezone('')
    }
  }

  // Derived options for React Select
  const countryOptions = useMemo(() => {
    return countriesList.map(c => ({ value: c.name, label: c.name, ...c }))
  }, [countriesList])

  const timezoneOptions = useMemo(() => {
    return availableTimezones.map(tz => ({ value: tz, label: tz }))
  }, [availableTimezones])

  // Open status change modal
  const openStatusChangeModal = (lead) => {
    setStatusChangeData({
      leadId: lead.id,
      leadName: lead.taskName,
      currentStatus: lead.status,
      newStatus: lead.status
    })
    setFollowUpDate('')
    setStatusChangeReason('')
    setIsStatusModalOpen(true)
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    try {
      const { leadId, newStatus } = statusChangeData

      if (newStatus === 'Reschedule') {
        if (!followUpDate) {
          alert('Please select a follow-up date for rescheduling.')
          return
        }
        const today = new Date().toISOString().split('T')[0]
        if (followUpDate < today) {
          alert('Follow-up date cannot be in the past.')
          return
        }
      }

      // Validate follow-up date if provided for Cancelled status
      if (newStatus === 'Cancelled' && followUpDate) {
        const today = new Date().toISOString().split('T')[0]
        if (followUpDate < today) {
          alert('Follow-up date cannot be in the past.')
          return
        }
      }

      const payload = {
        status: newStatus,
        followUpDate: (newStatus === 'Reschedule' || newStatus === 'Cancelled') ? (followUpDate || null) : null,
        statusChangeReason: statusChangeReason || null
      }

      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to update lead status')
      }

      setIsStatusModalOpen(false)
      await loadLeads()
    } catch (err) {
      console.error('Status update error:', err)
      alert(err.message || 'Unable to update lead status')
    }
  }

  // Handle create ticket from confirmed lead
  const handleCreateTicketFromLead = (lead) => {
    localStorage.setItem('selectedLeadForTicket', JSON.stringify(lead))
    navigate('/dashboard', { state: { openTickets: true } })
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
    fetchCountries()

  }, [])

  const location = useLocation()
  useEffect(() => {
    if (location.state?.openForm) {
      setViewMode('form')
      // Clear state so it doesn't reopen if we navigate back
      window.history.replaceState({}, document.title)
    }
  }, [location])

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

      // Validate task start date is not in the past
      const today = new Date().toISOString().split('T')[0]
      if (taskStartDate < today) {
        throw new Error('Task start date cannot be in the past.')
      }

      const payload = {
        customerId: Number(customerId),
        taskName,
        leadType,
        clientTicketNumber: clientTicketNumber || null,
        taskStartDate,
        taskEndDate,
        taskTime,
        scopeOfWork,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        country: country || null,
        zipCode: zipCode || null,
        timezone: timezone || null,
        currency,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        halfDayRate: halfDayRate ? Number(halfDayRate) : null,
        fullDayRate: fullDayRate ? Number(fullDayRate) : null,
        monthlyRate: monthlyRate ? Number(monthlyRate) : null,
        toolsRequired: toolsRequired || null,
        agreedRate: agreedRate ? Number(agreedRate) : null,
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
    setAddressLine1(lead.addressLine1 || '')
    setAddressLine2(lead.addressLine2 || '')
    setCity(lead.city || '')
    setCountry(lead.country || '')
    setZipCode(lead.zipCode || '')
    setTimezone(lead.timezone || '')
    setCurrency(lead.currency || 'EUR')
    setHourlyRate(lead.hourlyRate != null ? String(lead.hourlyRate) : '')
    setHalfDayRate(lead.halfDayRate != null ? String(lead.halfDayRate) : '')
    setFullDayRate(lead.fullDayRate != null ? String(lead.fullDayRate) : '')
    setMonthlyRate(lead.monthlyRate != null ? String(lead.monthlyRate) : '')
    setToolsRequired(lead.toolsRequired || '')
    setAgreedRate(lead.agreedRate || '')
    setTravelCostPerDay(lead.travelCostPerDay != null ? String(lead.travelCostPerDay) : '')
    setTotalCost(lead.totalCost != null ? String(lead.totalCost) : '')
    setStatus(lead.status || LEAD_STATUSES[0])

    // Trigger country validation to load timezones if needed
    if (lead.country) {
      const matched = countriesList.find(c => c.name === lead.country)
      if (matched) {
        setAvailableTimezones(matched.timezones || [])
      }
    }
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
            className="leads-back"
            onClick={() => {
              resetForm()
              setViewMode('list')
            }}
            aria-label="Go back"
          >
            <FiArrowLeft />
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
                  min={new Date().toISOString().split('T')[0]}
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
              <label className="leads-field leads-field--full">
                <span>
                  Address <span className="field-required">*</span>
                </span>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadAddressOptions}
                  onChange={handleAddressSelect}
                  placeholder="Type to search global address..."
                  styles={customSelectStyles}
                  components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                  noOptionsMessage={() => "Type address to search..."}
                />
                <small style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                  Powered by OpenStreetMap. Type to search & auto-fill.
                </small>
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
                <Select
                  options={countryOptions}
                  value={countryOptions.find(c => c.value === country) || null}
                  onChange={handleCountrySelectChange}
                  isLoading={loadingCountries}
                  placeholder="Select a country..."
                  styles={customSelectStyles}
                  isClearable
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
                <Select
                  options={timezoneOptions}
                  value={timezoneOptions.find(t => t.value === timezone) || null}
                  onChange={(opt) => setTimezone(opt ? opt.value : '')}
                  isDisabled={!country}
                  placeholder="Select timezone..."
                  styles={customSelectStyles}
                  noOptionsMessage={() => "No timezone data available"}
                />
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
                  Half Day Rate <span className="field-required">*</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={halfDayRate}
                  onChange={(e) => setHalfDayRate(e.target.value)}
                  placeholder="Enter half day rate"
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
                <span>Tool Cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="Enter tool cost"
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
              onClick={() => {
                resetForm()
                setViewMode('list')
              }}
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
                    <td>
                      <button
                        type="button"
                        className="leads-status-btn"
                        onClick={() => openStatusChangeModal(lead)}
                      >
                        {lead.status}
                      </button>
                    </td>
                    <td>
                      {lead.status === 'Confirm' ? (
                        <button
                          type="button"
                          className="leads-create-ticket-btn"
                          onClick={() => handleCreateTicketFromLead(lead)}
                        >
                          <FiFileText /> Create Ticket
                        </button>
                      ) : (
                        '--'
                      )}
                    </td>
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
                Currency: {selectedLead.currency} | Hourly: {selectedLead.hourlyRate} | Half Day: {selectedLead.halfDayRate} | Full day:{' '}
                {selectedLead.fullDayRate}
              </p>
              {selectedLead.monthlyRate && (
                <p className="lead-modal-line">Monthly: {selectedLead.monthlyRate}</p>
              )}
              {selectedLead.totalCost && (
                <p className="lead-modal-line">Tool cost: {selectedLead.totalCost}</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsStatusModalOpen(false)}>
          <div className="lead-modal status-modal" onClick={(e) => e.stopPropagation()}>
            <header className="lead-modal-header">
              <div>
                <h2 className="lead-modal-title">Change Status</h2>
                <p className="lead-modal-sub">Update status for: {statusChangeData.leadName}</p>
              </div>
              <button type="button" className="lead-modal-close" onClick={() => setIsStatusModalOpen(false)}>
                ×
              </button>
            </header>

            <section className="lead-modal-section">
              <h3>Current Status</h3>
              <p className="current-status-badge">{statusChangeData.currentStatus}</p>
            </section>

            <section className="lead-modal-section">
              <h3>New Status</h3>
              <div className="status-buttons-grid">
                <button
                  type="button"
                  className={`status-btn status-btn-bid ${statusChangeData.newStatus === 'BID' ? 'active' : ''}`}
                  onClick={() => setStatusChangeData({ ...statusChangeData, newStatus: 'BID' })}
                >
                  <FiAlertCircle /> BID
                </button>
                <button
                  type="button"
                  className={`status-btn status-btn-confirm ${statusChangeData.newStatus === 'Confirm' ? 'active' : ''}`}
                  onClick={() => setStatusChangeData({ ...statusChangeData, newStatus: 'Confirm' })}
                >
                  <FiCheckCircle /> Confirmed
                </button>
                <button
                  type="button"
                  className={`status-btn status-btn-reschedule ${statusChangeData.newStatus === 'Reschedule' ? 'active' : ''}`}
                  onClick={() => setStatusChangeData({ ...statusChangeData, newStatus: 'Reschedule' })}
                >
                  <FiCalendar /> Reschedule
                </button>
                <button
                  type="button"
                  className={`status-btn status-btn-cancelled ${statusChangeData.newStatus === 'Cancelled' ? 'active' : ''}`}
                  onClick={() => setStatusChangeData({ ...statusChangeData, newStatus: 'Cancelled' })}
                >
                  <FiXCircle /> Cancelled
                </button>
              </div>
            </section>


            {/* Follow-up Date for Reschedule and Cancelled */}
            {(statusChangeData.newStatus === 'Reschedule' || statusChangeData.newStatus === 'Cancelled') && (
              <section className="lead-modal-section">
                <label className="leads-field">
                  <span>
                    Follow-up Date
                    {statusChangeData.newStatus === 'Reschedule' && <span className="field-required">*</span>}
                    {statusChangeData.newStatus === 'Cancelled' && ' (Optional)'}
                  </span>
                  <input
                    type="date"
                    value={followUpDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </label>
              </section>
            )}

            {/* Reason for Change - shown for all statuses */}
            {statusChangeData.newStatus && (
              <section className="lead-modal-section">
                <label className="leads-field">
                  <span>Reason for Change (Optional)</span>
                  <textarea
                    rows={3}
                    value={statusChangeReason}
                    onChange={(e) => setStatusChangeReason(e.target.value)}
                    placeholder="Enter reason for status change..."
                  />
                </label>
              </section>
            )}

            <div className="lead-modal-actions">
              <button type="button" className="leads-secondary-btn" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="leads-primary-btn" onClick={handleStatusUpdate}>
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default LeadsPage
