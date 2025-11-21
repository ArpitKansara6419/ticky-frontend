// LeadsPage.jsx - Create New Lead page
import { useEffect, useState } from 'react'
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
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoadingCustomers(true)
        setError('')
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
        setError(err.message || 'Unable to load customers')
      } finally {
        setLoadingCustomers(false)
      }
    }

    fetchCustomers()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

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

      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to create lead')
      }

      setSuccess('Lead created successfully.')
      // Optional: keep values so user can duplicate; for now, do not reset completely.
    } catch (err) {
      console.error('Create lead error', err)
      setError(err.message || 'Unable to create lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="leads-page">
      <header className="leads-header">
        <div>
          <h1 className="leads-title">Create New Lead</h1>
          <p className="leads-subtitle">Fill in the details to create a new lead.</p>
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

        {error && <div className="leads-message leads-message--error">{error}</div>}
        {success && <div className="leads-message leads-message--success">{success}</div>}

        <div className="leads-actions-footer">
          <button type="submit" className="leads-primary-btn" disabled={saving}>
            {saving ? 'Creating Lead...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default LeadsPage
