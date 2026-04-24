// LeadsPage.jsx - Leads list + Create / Edit Lead page
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMoreVertical, FiCheckCircle, FiCalendar, FiXCircle, FiAlertCircle, FiFileText, FiArrowLeft, FiEye, FiEdit2, FiCopy, FiTrash2, FiRefreshCw, FiX } from 'react-icons/fi'
import Select from 'react-select'
import Autocomplete from 'react-google-autocomplete'
import './LeadsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDLND9h_AWApPg9gQVYZhhsPmIHMuN-6fg'

const LEAD_TYPES = ['Full time', 'Part time', 'Dispatch']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CURRENCIES = [
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Pound (GBP)' },
  { value: 'INR', label: 'Rupee (INR)' },
]

const LEAD_STATUSES = ['BID', 'Confirm', 'Reschedule', 'Cancelled']

const GOOGLE_AUTOCOMPLETE_OPTIONS = {
  types: ['address'],
}

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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  const [engineers, setEngineers] = useState([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null)
  const [assignEngineerId, setAssignEngineerId] = useState('')
  const [assignPayType, setAssignPayType] = useState('Default') // 'Default' (Profile) | 'Custom' (Customer)
  const [assignEngBillingType, setAssignEngBillingType] = useState('Hourly')
  const [assignEngMonthlyRate, setAssignEngMonthlyRate] = useState('')
  const [assignEngHourlyRate, setAssignEngHourlyRate] = useState('')
  const [assignEngHalfDayRate, setAssignEngHalfDayRate] = useState('')
  const [assignEngFullDayRate, setAssignEngFullDayRate] = useState('')
  const [assignEngAgreedRate, setAssignEngAgreedRate] = useState('')
  const [assignEngCancellationFee, setAssignEngCancellationFee] = useState('')
  const [assignEngOvertimeRate, setAssignEngOvertimeRate] = useState('')
  const [assignEngOohRate, setAssignEngOohRate] = useState('')
  const [assignEngWeekendRate, setAssignEngWeekendRate] = useState('')
  const [assignEngHolidayRate, setAssignEngHolidayRate] = useState('')
  const [assignEngCurrency, setAssignEngCurrency] = useState('USD')

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

  const [currency, setCurrency] = useState('USD')
  const [hourlyRate, setHourlyRate] = useState('')
  const [halfDayRate, setHalfDayRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [toolsRequired, setToolsRequired] = useState('')
  const [agreedRate, setAgreedRate] = useState('0')
  const [cancellationFee, setCancellationFee] = useState('')

  const [travelCostPerDay, setTravelCostPerDay] = useState('')
  const [toolCost, setToolCost] = useState('0')
  const [billingType, setBillingType] = useState('Hourly')
  const [status, setStatus] = useState(LEAD_STATUSES[0])
  const [calcTimezone, setCalcTimezone] = useState('Ticket Local')

  // Billing Type Options
  const BILLING_TYPES = [
    'Hourly',
    'Half Day + Hourly',
    'Full Day + OT',
    'Monthly + OT + Weekend',
    'Agreed Rate',
    'Cancellation'
  ]

  // Map / LatLng states
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
 
  // AUTO SYNC Engineer Payout details when selecting an engineer in the assignment modal
  useEffect(() => {
    if (assignEngineerId && assignPayType === 'Default') {
      const eng = engineers.find(e => String(e.id) === String(assignEngineerId));
      if (eng) {
        setAssignEngBillingType(eng.billing_type || 'Hourly');
        setAssignEngCurrency(eng.currency || 'USD');
        setAssignEngHourlyRate(eng.hourly_rate != null ? String(eng.hourly_rate) : '');
        setAssignEngHalfDayRate(eng.half_day_rate != null ? String(eng.half_day_rate) : '');
        setAssignEngFullDayRate(eng.full_day_rate != null ? String(eng.full_day_rate) : '');
        setAssignEngMonthlyRate(eng.monthly_rate != null ? String(eng.monthly_rate) : '');
        setAssignEngAgreedRate(eng.agreed_rate || '');
        setAssignEngCancellationFee(eng.cancellation_fee != null ? String(eng.cancellation_fee) : '');
        setAssignEngOvertimeRate(eng.overtime_rate != null ? String(eng.overtime_rate) : '');
        setAssignEngOohRate(eng.ooh_rate != null ? String(eng.ooh_rate) : '');
        setAssignEngWeekendRate(eng.weekend_rate != null ? String(eng.weekend_rate) : '');
        setAssignEngHolidayRate(eng.holiday_rate != null ? String(eng.holiday_rate) : '');
      }
    }
  }, [assignEngineerId, assignPayType, engineers]);

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
    setCurrency('USD')
    setHourlyRate('')
    setHalfDayRate('')
    setFullDayRate('')
    setMonthlyRate('')
    setToolsRequired('')
    setAgreedRate('0')
    setCancellationFee('')
    setTravelCostPerDay('')
    setToolCost('0')
    setBillingType('Hourly')
    setStatus(LEAD_STATUSES[0])
    setFormError('')
    setFormSuccess('')
    setEditingLeadId(null)
    setLatitude(null)
    setLongitude(null)
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

  const handleGoogleAddressSelect = useCallback(async (place) => {
    if (!place || !place.address_components) return

    // Parse all address components
    let streetNumber = ''
    let route = ''
    let sublocality = ''
    let locality = ''
    let adminArea1 = ''
    let adminArea2 = ''
    let countryName = ''
    let countryCode = ''
    let postalCode = ''

    place.address_components.forEach((component) => {
      const types = component.types
      if (types.includes('street_number')) streetNumber = component.long_name
      if (types.includes('route')) route = component.long_name
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = component.long_name
      if (types.includes('neighborhood')) sublocality = sublocality || component.long_name
      if (types.includes('locality')) locality = component.long_name
      if (types.includes('administrative_area_level_1')) adminArea1 = component.long_name
      if (types.includes('administrative_area_level_2')) adminArea2 = component.long_name
      if (types.includes('country')) {
        countryName = component.long_name
        countryCode = component.short_name
      }
      if (types.includes('postal_code')) postalCode = component.long_name
    })

    // Build clean address line 1
    let newAddressLine1 = ''
    if (streetNumber && route) {
      newAddressLine1 = `${streetNumber} ${route}`
    } else if (route) {
      newAddressLine1 = route
    } else {
      newAddressLine1 = place.name || place.formatted_address || ''
    }
    setAddressLine1(newAddressLine1.trim())

    // Set city with robust fallback logic
    const cityValue = locality || sublocality || adminArea2 || adminArea1 || ''
    setCity(cityValue.trim())

    // Set postal code
    setZipCode(postalCode.trim())

    // Country matching - try to find exact match in our list
    if (countryName) {
      const matchedCountry = countriesList.find(c =>
        c.name.toLowerCase() === countryName.toLowerCase() ||
        c.code === countryCode
      )

      if (matchedCountry) {
        handleCountrySelectChange({ value: matchedCountry.name })
      } else {
        // If no exact match from our static list, still update the state
        setCountry(countryName)
        setAvailableTimezones([])
        setTimezone('')
      }
    }

    // Auto Timezone based on Latitude/Longitude
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat()
      const lon = place.geometry.location.lng()
      setLatitude(lat)
      setLongitude(lon)

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
  }, [countriesList])

  const getWorkingDaysInMonth = (dateStr, countryName) => {
    if (!dateStr) return 22;
    const date = new Date(dateStr);
    const month = date.getMonth();
    const year = date.getFullYear();
    const HOLIDAYS_BY_COUNTRY = {
      'India': ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'],
      'Poland': ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25', '2026-12-26'],
      'Other': []
    };
    const holidays = HOLIDAYS_BY_COUNTRY[countryName] || HOLIDAYS_BY_COUNTRY['India'] || [];
    let workingDays = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dObj = new Date(year, month, d);
      const dw = dObj.getDay();
      const dStr = dObj.toISOString().split('T')[0];
      if (dw !== 0 && dw !== 6 && !holidays.includes(dStr)) {
        workingDays++;
      }
    }
    return workingDays || 22;
  };

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

  // Real-time calculation engine (shared with Tickets)
  const calculateTicketTotal = (data) => {
    const {
      startTime, endTime,
      hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
      travelCostPerDay, toolCost, billingType, timezone, calcTimezone
    } = data;

    if (!startTime || !endTime) return { hrs: 0, base: 0, ot: 0, ooh: 0, specialDay: 0, grandTotal: 0 };

    try {
      // Treat as wall-clock time
      const s = new Date(startTime.includes('Z') || startTime.includes('+') ? startTime : startTime.replace(' ', 'T') + 'Z');
      const e = new Date(endTime.includes('Z') || endTime.includes('+') ? endTime : endTime.replace(' ', 'T') + 'Z');
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return { hrs: 0, base: 0, ot: 0, ooh: 0, specialDay: 0, grandTotal: 0 };

      const totSec = Math.max(0, (e.getTime() - s.getTime()) / 1000);
      const hrs = totSec / 3600;

      const hr = parseFloat(hourlyRate) || 0;
      const hd = parseFloat(halfDayRate) || 0;
      const fd = parseFloat(fullDayRate) || 0;

      const targetTZ = (calcTimezone && calcTimezone !== 'Ticket Local') ? calcTimezone : (timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

      const getZonedInfo = (date) => {
        try {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: targetTZ,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
          const localDay = new Date(`${parts.year}-${parts.month}-${parts.day}`).getDay();
          return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, day: localDay, hour: parseInt(parts.hour) };
        } catch (err) { return { dateStr: '', day: date.getUTCDay(), hour: date.getUTCHours() }; }
      };

      const startInfo = getZonedInfo(s);
      const endInfo = getZonedInfo(e);

      // Wall-clock hour extraction for robustness
      let startHr = startInfo.hour;
      let endHr = endInfo.hour;
      if (startTime.includes('T')) startHr = parseInt(startTime.split('T')[1].split(':')[0], 10);
      if (endTime.includes('T')) endHr = parseInt(endTime.split('T')[1].split(':')[0], 10);

      const isWeekend = (startInfo.day === 0 || startInfo.day === 6 || endInfo.day === 0 || endInfo.day === 6);
      const PUBLIC_HOLIDAYS = ['2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14', '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'];
      const isHoliday = PUBLIC_HOLIDAYS.includes(startInfo.dateStr) || PUBLIC_HOLIDAYS.includes(endInfo.dateStr);
      const isSpecialDay = isWeekend || isHoliday;

      const workIsOOH = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

      let base = 0, ot = 0, ooh = 0, special = 0;

      const bil = (billingType || '').trim();

      if (bil === 'Hourly') {
        const billed = Math.max(2, hrs);
        base = billed * hr;
      } else if (bil === 'Half Day + Hourly') {
        if (hrs <= 4) {
          base = hd;
        } else {
          base = hd + ((hrs - 4) * hr);
        }
      } else if (bil === 'Full Day + OT') {
        base = fd;
        if (hrs > 8) {
          ot = (hrs - 8) * (hr * 1.5);
        }
      } else if (bil.includes('Monthly')) {
        const fullRate = parseFloat(monthlyRate) || 0;
        const monthlyDivisor = getWorkingDaysInMonth(startTime.split(' ')[0], data.country || 'India');
        base = fullRate / monthlyDivisor;
        if (isSpecialDay) {
          special = hrs * (hr * 2.0);
        } else {
          if (hrs > 8) ot = (hrs - 8) * (hr * 1.5);
        }
      } else if (bil === 'Agreed Rate') {
        base = parseFloat(agreedRate) || 0;
      } else if (bil === 'Cancellation') {
        base = parseFloat(cancellationFee) || 0;
      } else if (bil === 'Mixed Mode') {
        if (hrs <= 4) {
          base = hd;
        } else if (hrs <= 8) {
          base = fd;
        } else {
          base = fd;
          ot = (hrs - 8) * (hr * 1.5);
        }
      }

      const trav = parseFloat(travelCostPerDay) || 0;
      const tool = parseFloat(toolCost) || 0;
      const grandTotal = base + ot + ooh + special + trav + tool;

      return {
        hrs: hrs.toFixed(2),
        base: base.toFixed(2),
        ot: ot.toFixed(2),
        ooh: ooh.toFixed(2),
        specialDay: special.toFixed(2),
        grandTotal: grandTotal.toFixed(2)
      };
    } catch (e) { return { hrs: 0, base: 0, ot: 0, ooh: 0, specialDay: 0, grandTotal: 0 }; }
  };

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

      // Auto-navigate to Create Ticket if confirmed
      if (status === 'Confirm') {
        // Find lead name from the modal state that we just updated
        if (window.confirm('Lead confirmed! Would you like to create a ticket now?')) {
          localStorage.setItem('selectedLeadForTicket', JSON.stringify({ ...lead, status: 'Confirm' }))
          navigate('/dashboard', { state: { openTickets: true } })
        }
      }
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

  // Auto-sync Lead Type based on Date Range
  useEffect(() => {
    if (taskStartDate && taskEndDate && taskStartDate !== taskEndDate) {
      if (leadType !== 'Dispatch') setLeadType('Dispatch')
    } else if (taskStartDate && taskEndDate && taskStartDate === taskEndDate) {
      if (leadType === 'Dispatch') setLeadType('Full time')
    }
  }, [taskStartDate, taskEndDate])

  useEffect(() => {
    const fetchInit = async () => {
      setLoadingCustomers(true)
      try {
        const [custRes, engRes] = await Promise.all([
          fetch(`${API_BASE_URL}/leads/customers`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/engineers`, { credentials: 'include' })
        ])
        const custData = await custRes.json()
        const engData = await engRes.json()
        setCustomers(custData.customers || [])
        setEngineers(engData.engineers || [])
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
          toolsRequired,
          agreedRate: agreedRate !== '' && agreedRate !== null ? Number(agreedRate) : 0,
          travelCostPerDay: travelCostPerDay !== '' ? Number(travelCostPerDay) : null,
          toolCost: (toolCost !== '' && toolCost !== null) ? Number(toolCost) : 0,
          billingType,
          status,
          isRecurring, recurringStartDate, recurringEndDate, totalWeeks, recurringDays: recurringDays.join(','),
          cancellationFee: cancellationFee !== '' ? Number(cancellationFee) : null,
          latitude, longitude
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
    setCancellationFee(l.cancellationFee != null ? String(l.cancellationFee) : '')
    setTravelCostPerDay(l.travelCostPerDay != null ? String(l.travelCostPerDay) : ''); setToolCost(l.toolCost != null ? String(l.toolCost) : '')
    setBillingType(l.billingType || 'Hourly'); setStatus(l.status)
    setIsRecurring(l.isRecurring || 'No'); setRecurringStartDate(l.recurringStartDate?.split('T')[0])
    setRecurringEndDate(l.recurringEndDate?.split('T')[0]); setTotalWeeks(l.totalWeeks || ''); setRecurringDays(l.recurringDays?.split(',') || [])
    const match = countriesList.find(c => c.name === l.country)
    if (match) setAvailableTimezones(match.timezones)
    setLatitude(l.latitude); setLongitude(l.longitude)
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
                <input
                  type="date"
                  value={taskStartDate}
                  onChange={e => setTaskStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </label>
              <label className="leads-field">
                <span>End Date *</span>
                <input
                  type="date"
                  value={taskEndDate}
                  onChange={e => setTaskEndDate(e.target.value)}
                  min={taskStartDate || new Date().toISOString().split('T')[0]}
                  required
                />
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
                  onPlaceSelected={handleGoogleAddressSelect}
                  options={GOOGLE_AUTOCOMPLETE_OPTIONS}
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
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
              📌 <strong>Rate Multipliers:</strong> OT/OOH = Standard × 1.5 | Weekend/Holiday = Standard × 2.0
            </p>
            <div className="leads-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <label className="leads-field">
                <span>Currency *</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="leads-field" style={{ gridColumn: 'span 3' }}>
                <span>Billing Type *</span>
                <select value={billingType} onChange={(e) => {
                  setBillingType(e.target.value);
                }} required>
                  <option value="Hourly">1) Hourly Only (min 2 hrs billing)</option>
                  <option value="Half Day + Hourly">2) Half Day + Hourly</option>
                  <option value="Full Day + OT">3) Full Day + OT (OT = Rate × 1.5)</option>
                  <option value="Monthly + OT + Weekend">4) Monthly + OT + Weekend/Holidays (Weekend = 2x)</option>
                  <option value="Mixed Mode">5) Mixed (Half/Full/OT Tier)</option>
                  <option value="Agreed Rate">6) Agreed/Fixed Rate</option>
                  <option value="Cancellation">7) Cancellation/Reschedule Fee</option>
                </select>
              </label>

              <label className="leads-field">
                <span>Hourly Rate ({currency})</span>
                <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Half Day Rate ({currency})</span>
                <input type="number" step="0.01" value={halfDayRate} onChange={(e) => setHalfDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Full Day Rate ({currency})</span>
                <input type="number" step="0.01" value={fullDayRate} onChange={(e) => setFullDayRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field">
                <span>Monthly Rate ({currency})</span>
                <input type="number" step="0.01" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field" style={{ gridColumn: 'span 2' }}>
                <span>Agreed/Fixed Rate ({currency})</span>
                <input type="number" step="0.01" value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} placeholder="0.00" />
              </label>
              <label className="leads-field" style={{ gridColumn: 'span 2' }}>
                <span>Cancellation Fee ({currency})</span>
                <input type="number" step="0.01" value={cancellationFee} onChange={(e) => setCancellationFee(e.target.value)} placeholder="0.00" />
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
                  value={toolCost}
                  onChange={(e) => setToolCost(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
          </section>

          {/* Pricing Preview */}
          {(() => {
            const res = calculateTicketTotal({
              startTime: taskStartDate ? `${taskStartDate} ${taskTime}` : '',
              endTime: taskEndDate ? `${taskEndDate} ${taskTime}` : '',
              hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
              travelCostPerDay, toolCost: toolCost, billingType, timezone, country
            });

            if (!res.grandTotal || res.grandTotal == 0) return null;

            return (
              <div className="preview-box-premium" style={{
                marginBottom: '24px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                border: '1px solid #10b981',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                      Smart Quote Preview
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1.5px dashed rgba(16, 185, 129, 0.2)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>BASE COST</div>
                    <div style={{ fontSize: '14px', color: '#166534', fontWeight: '800' }}>{currency} {res.base}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>OT</div>
                    <div style={{ fontSize: '14px', color: '#166534', fontWeight: '800' }}>{currency} {res.ot}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>WORKED HOURS</div>
                    <div style={{ fontSize: '14px', color: '#166534', fontWeight: '800' }}>{res.hrs} hrs</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <div style={{ fontSize: '9px', color: '#047857', fontWeight: '800', marginBottom: '2px' }}>GRAND TOTAL</div>
                    <div style={{ fontSize: '16px', color: '#047857', fontWeight: '900' }}>{currency} {res.grandTotal}</div>
                  </div>
                </div>
              </div>
            );
          })()}

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

      {/* Timezone Context Selector (Consistency) */}
      <div style={{ marginBottom: '20px', padding: '12px 20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h5 style={{ margin: 0, fontSize: '14px', color: '#475569', fontWeight: '700' }}>Operational Timezone Context</h5>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Global context for time-sensitive lead processing and scheduling.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={calcTimezone}
            onChange={(e) => setCalcTimezone(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="Ticket Local">Ticket Local (Auto)</option>
            <option value="Asia/Kolkata">India (IST)</option>
            <option value="Europe/Warsaw">Poland (CET)</option>
            <option value="UTC">UTC (Universal)</option>
          </select>
        </div>
      </div>

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

        {/* Pagination Logic */}
        {(() => {
          const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
          const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

          return (
            <>
              <div className="leads-table-wrapper">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Lead Information</th>
                      <th>Customer</th>
                      <th>Service Date</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th>Location</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map(l => (
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

                            const formatDate = (ds) => {
                              if (!ds) return '';
                              const d = new Date(ds);
                              return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                            };

                            const getRangeStr = (s, e) => {
                              const sF = formatDate(s);
                              const eF = formatDate(e);
                              if (!e || s === e) return sF;
                              return `${sF} - ${eF}`;
                            };

                            const startDateStr = l.taskStartDate?.split('T')[0];
                            const endDateStr = l.taskEndDate?.split('T')[0];

                            // Filter redundant history
                            const cleanHistory = history.filter((h, i) => {
                              if (i === 0) return true;
                              const prev = history[i - 1];
                              if (h.toStatus === prev.toStatus && h.newDate === prev.newDate) return false;
                              if (h.fromStatus === 'Confirm' && h.toStatus === 'Confirm' && h.newDate === h.prevDate) return false;
                              return true;
                            });

                            const firstH = cleanHistory[0];
                            const isSimpleConfirm = cleanHistory.length === 1 &&
                              firstH.fromStatus === 'BID' &&
                              firstH.toStatus === 'Confirm' &&
                              firstH.prevDate === firstH.newDate;

                            if (l.status === 'BID') {
                              return (
                                <div className="date-value" style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                                  {getRangeStr(startDateStr, endDateStr)}
                                </div>
                              );
                            }

                            if (l.status === 'Cancelled') {
                              const latestActiveDate = l.followUpDate ? l.followUpDate.split('T')[0] : startDateStr;
                              const latestActiveEndDate = l.taskEndDate ? l.taskEndDate.split('T')[0] : latestActiveDate;
                              return (
                                <div style={{ color: '#ef4444', fontWeight: '500', display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '11px' }}>
                                    {getRangeStr(latestActiveDate, latestActiveEndDate)}
                                  </span>
                                  <span style={{ fontSize: '13px', marginTop: '2px', fontWeight: '700' }}>CANCELLED</span>
                                </div>
                              );
                            }

                            if (l.status === 'Confirm' && (cleanHistory.length === 0 || isSimpleConfirm)) {
                              return (
                                <div style={{ color: '#15803d', fontWeight: '600' }}>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.05em' }}>Confirmed For</div>
                                  {getRangeStr(startDateStr, endDateStr)}
                                </div>
                              );
                            }

                            const originalDate = (cleanHistory.length > 0 && cleanHistory[0].prevDate) ? cleanHistory[0].prevDate : startDateStr;
                            const originalEndDate = l.taskEndDate?.split('T')[0];

                            return (
                              <div className="date-stack">
                                <span className="date-value date-value--old" style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '12px' }}>
                                  {getRangeStr(originalDate, originalEndDate)}
                                </span>

                                {cleanHistory.map((h, i) => {
                                  const label = h.toStatus === 'Confirm' ? 'CONFIRMED FOR:' : 'RESCHEDULED TO:';
                                  const color = h.toStatus === 'Confirm' ? '#15803d' : '#f59e0b';
                                  const isLast = i === cleanHistory.length - 1;
                                  const hStart = h.newDate;
                                  const hEnd = h.newEndDate || (isLast ? endDateStr : hStart);

                                  return (
                                    <div key={i} className="reschedule-item" style={{ color, marginTop: '4px' }}>
                                      <div className="date-label" style={{ fontSize: '10px', fontWeight: '700', opacity: 0.8 }}>{label}</div>
                                      <span className={`date-value ${isLast ? 'date-value--new' : 'date-value--old'}`} style={{ fontWeight: isLast ? '600' : '400' }}>
                                        {getRangeStr(hStart, hEnd)}
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
                                  setSelectedLeadForAssign(l)
                                  setAssignEngineerId('')
                                  setAssignPayType('Default')
                                  setIsAssignModalOpen(true)
                                }}
                              >
                                <FiFileText /> Ticket
                              </button>
                            )
                          ) : l.clientTicketNumber || '--'}
                        </td>
                        <td style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                          {l.city}, {l.country}
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
              <Pagination total={totalPages} current={currentPage} onChange={setCurrentPage} />
            </>
          )
        })()}
      </section >

      {isStatusModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsStatusModalOpen(false)}>
          <div className="lead-modal" onClick={e => e.stopPropagation()}>
            <header className="lead-modal-header">
              <h2>Update Lead Status</h2>
              <p>Change the current progress of: <strong>{statusChangeData.leadName}</strong></p>
              <button
                type="button"
                className="lead-modal-close-btn"
                onClick={() => setIsStatusModalOpen(false)}
                title="Close"
              >
                <FiX />
              </button>
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

      {
        isLeadModalOpen && selectedLead && (
          <div className="lead-modal-backdrop" onClick={() => setIsLeadModalOpen(false)}>
            <div className="lead-modal lead-modal--details" onClick={e => e.stopPropagation()}>
              <header className="lead-modal-header">
                <div className="lead-modal-header-info">
                  <h2>Lead Details</h2>
                  <div className="lead-badge-id">#{String(selectedLead.id).padStart(3, '0')}</div>
                </div>
                <p className="lead-modal-subtitle">{selectedLead.taskName}</p>
                <button
                  type="button"
                  className="lead-modal-close-btn"
                  onClick={() => setIsLeadModalOpen(false)}
                  title="Close"
                >
                  <FiX />
                </button>
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
                  <div className="detail-item--full">
                    <label>Service Date</label>
                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                      {(() => {
                        const s = selectedLead.taskStartDate?.split('T')[0];
                        const e = selectedLead.taskEndDate?.split('T')[0];

                        const formatDate = (ds) => {
                          if (!ds) return '';
                          const d = new Date(ds);
                          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        };

                        if (!e || s === e) return formatDate(s);
                        return `${formatDate(s)} - ${formatDate(e)}`;
                      })()}
                    </span>
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
                    <span>{[selectedLead.addressLine1, selectedLead.addressLine2, selectedLead.city, selectedLead.zipCode, selectedLead.country].filter(Boolean).join(', ')}</span>
                  </div>

                  {/* --- Google Maps Location Button --- */}
                  {(() => {
                    const lat = selectedLead.latitude;
                    const lng = selectedLead.longitude;
                    const addressQuery = encodeURIComponent(
                      [selectedLead.addressLine1, selectedLead.city, selectedLead.zipCode, selectedLead.country].filter(Boolean).join(', ')
                    );
                    const hasCoords = lat && lng;
                    const mapsLink = hasCoords
                      ? `https://www.google.com/maps?q=${lat},${lng}&z=16`
                      : `https://www.google.com/maps/search/?q=${addressQuery}`;

                    return (
                      <div className="detail-item--full" style={{ marginTop: '4px' }}>
                        <label>📍 Location on Map</label>
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4285F4, #34A853)',
                            color: 'white', fontWeight: '700', fontSize: '13px',
                            textDecoration: 'none', border: 'none',
                            boxShadow: '0 4px 12px rgba(66,133,244,0.35)',
                            transition: 'opacity 0.2s',
                            marginTop: '6px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                          View on Google Maps
                        </a>
                      </div>
                    );
                  })()}
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

                  {/* Billing Type Section */}
                  <div className="detail-item--full divider"></div>
                  <div className="detail-item--full" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Billing Configuration</label>
                  </div>
                  <div className="detail-item">
                    <label>Billing Type</label>
                    <span style={{
                      fontWeight: '600',
                      color: 'var(--primary-color, #6366f1)',
                      background: 'var(--primary-bg, #eef2ff)',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      {selectedLead.billingType || 'Hourly'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Currency</label>
                    <span style={{ fontWeight: '600' }}>{selectedLead.currency || 'USD'}</span>
                  </div>

                  {/* Pricing & Rates Section */}
                  <div className="detail-item--full divider"></div>
                  <div className="detail-item--full" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Pricing & Rates</label>
                  </div>
                  <div className="detail-item">
                    <label>Hourly Rate</label>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedLead.currency} {selectedLead.hourlyRate || selectedLead.hourly_rate || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Half Day Rate</label>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedLead.currency} {selectedLead.halfDayRate || selectedLead.half_day_rate || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Full Day Rate</label>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedLead.currency} {selectedLead.fullDayRate || selectedLead.full_day_rate || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Monthly Rate</label>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedLead.currency} {selectedLead.monthlyRate || selectedLead.monthly_rate || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Agreed / Fixed Rate</label>
                    <span style={{ fontWeight: '600', color: '#059669' }}>{selectedLead.agreedRate || selectedLead.agreed_rate || '--'}</span>
                  </div>

                  {/* Additional Costs Section */}
                  <div className="detail-item--full divider"></div>
                  <div className="detail-item--full" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Additional Costs</label>
                  </div>
                  <div className="detail-item">
                    <label>Tool Cost</label>
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{selectedLead.currency} {selectedLead.toolCost || selectedLead.tool_cost || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Travel Cost / Day</label>
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{selectedLead.currency} {selectedLead.travelCostPerDay || selectedLead.travel_cost_per_day || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Grand Total (Receivable)</label>
                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '15px' }}>{selectedLead.currency} {selectedLead.totalCost || selectedLead.total_cost || '0.00'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Task Location</label>
                    <span style={{ fontWeight: '600' }}>{selectedLead.city}, {selectedLead.country}</span>
                  </div>
                </div>
              </div>
              <div className="lead-modal-footer">
                <button className="btn-wow-secondary" onClick={() => setIsLeadModalOpen(false)}>Close Window</button>
              </div>
            </div>
          </div>
        )
      }
      {/* --- Engineer Assignment Modal --- */}
      {isAssignModalOpen && selectedLeadForAssign && (
        <div className="lead-modal-backdrop" onClick={() => setIsAssignModalOpen(false)}>
          <div className="lead-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="lead-modal-header-info">
                <h2>Engineer Payout Configuration</h2>
                <p>#AIM-L-{String(selectedLeadForAssign.id).padStart(3, '0')} — {selectedLeadForAssign.taskName}</p>
              </div>
              <button className="lead-modal-close-btn" onClick={() => setIsAssignModalOpen(false)}><FiX /></button>
            </div>
            <div className="lead-modal-content" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Select Engineer *
                </label>
                <select
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}
                  value={assignEngineerId}
                  onChange={(e) => setAssignEngineerId(e.target.value)}
                >
                  <option value="">Choose an engineer...</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name} ({eng.city || 'No City'})</option>
                  ))}
                </select>

                {/* --- Real-time Rates Preview --- */}
                {(() => {
                  const eng = engineers.find(e => String(e.id) === String(assignEngineerId));
                  if (!eng) return null;
                  return (
                    <div style={{ marginTop: '12px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px dashed #cbd5e1', animation: 'fadeIn 0.3s ease' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📊 {eng.name}'s Profile Rates
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Billing:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.billing_type || 'Hourly'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Hourly:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.hourly_rate || '0.00'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>OT:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.overtime_rate || '0.00'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>OOH:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.ooh_rate || '0.00'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>W-End:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.weekend_rate || '0.00'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Holiday:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.holiday_rate || '0.00'}</span></div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Cancel:</b><br /> <span style={{ fontWeight: '700', color: '#1e293b' }}>{eng.currency || 'USD'} {eng.cancellation_fee || '0.00'}</span></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                  Payout Configuration Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAssignPayType('Default')}
                    style={{
                      padding: '12px', borderRadius: '10px', border: '2px solid',
                      borderColor: assignPayType === 'Default' ? '#6366f1' : '#e2e8f0',
                      background: assignPayType === 'Default' ? '#f5f3ff' : '#fff',
                      color: assignPayType === 'Default' ? '#4f46e5' : '#64748b',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    👷 Engineer Profile Rates
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignPayType('Custom')}
                    style={{
                      padding: '12px', borderRadius: '10px', border: '2px solid',
                      borderColor: assignPayType === 'Custom' ? '#6366f1' : '#e2e8f0',
                      background: assignPayType === 'Custom' ? '#f5f3ff' : '#fff',
                      color: assignPayType === 'Custom' ? '#4f46e5' : '#64748b',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    📄 Customer Ticket Rates
                  </button>
                </div>
              </div>

              {assignPayType === 'Custom' && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Billing Type (Engineer)</label>
                    <select
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      value={assignEngBillingType}
                      onChange={(e) => setAssignEngBillingType(e.target.value)}
                    >
                      <option value="Hourly">Hourly</option>
                      <option value="Half Day + Hourly">Half Day + Hourly</option>
                      <option value="Full Day + OT">Full Day + OT</option>
                      <option value="Monthly + OT + Weekend">Monthly + OT + Weekend</option>
                      <option value="Agreed Rate">Agreed Rate</option>
                    </select>
                  </div>

                  {assignEngBillingType === 'Monthly + OT + Weekend' && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Monthly Rate ({assignEngCurrency})</label>
                      <input
                        type="number"
                        placeholder="e.g. 2500"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngMonthlyRate}
                        onChange={(e) => setAssignEngMonthlyRate(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Hourly Rate</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngHourlyRate}
                        onChange={(e) => setAssignEngHourlyRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Overtime Rate</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngOvertimeRate}
                        onChange={(e) => setAssignEngOvertimeRate(e.target.value)}
                        placeholder="Rate x 1.5"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>OOH Rate</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngOohRate}
                        onChange={(e) => setAssignEngOohRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Weekend Premium</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngWeekendRate}
                        onChange={(e) => setAssignEngWeekendRate(e.target.value)}
                        placeholder="Rate x 2.0"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Holiday Premium</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngHolidayRate}
                        onChange={(e) => setAssignEngHolidayRate(e.target.value)}
                        placeholder="Rate x 2.0"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Agreed Rate</label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={assignEngAgreedRate}
                        onChange={(e) => setAssignEngAgreedRate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="lead-modal-footer">
              <button className="btn-wow-secondary" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
              <button
                className="btn-wow-primary"
                disabled={!assignEngineerId}
                onClick={() => {
                  const selectedEng = engineers.find(e => String(e.id) === String(assignEngineerId));
                  const payload = {
                    ...selectedLeadForAssign,
                    engineerId: assignEngineerId,
                    engineerName: selectedEng?.name || '',
                    engPayType: assignPayType,
                    engBillingType: assignEngBillingType,
                    engMonthlyRate: assignEngMonthlyRate,
                    engHourlyRate: assignEngHourlyRate,
                    engHalfDayRate: assignEngHalfDayRate,
                    engFullDayRate: assignEngFullDayRate,
                    engAgreedRate: assignEngAgreedRate,
                    engCancellationFee: assignEngCancellationFee,
                    engOvertimeRate: selectedEng?.overtime_rate || 0,
                    engOohRate: selectedEng?.ooh_rate || 0,
                    engWeekendRate: selectedEng?.weekend_rate || 0,
                    engHolidayRate: selectedEng?.holiday_rate || 0,
                    engCurrency: assignEngCurrency
                  };
                  localStorage.setItem('selectedLeadForTicket', JSON.stringify(payload))
                  navigate('/dashboard', { state: { openTickets: true } })
                }}
              >
                Create Ticket & Move ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </section >
  )
}

const Pagination = ({ total, current, onChange }) => {
  if (total <= 1) return null
  let pages = []
  for (let i = 1; i <= total; i++) pages.push(i)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '24px', background: '#fafafc', borderTop: '1px solid var(--border-subtle)', borderRadius: '0 0 20px 20px' }}>
      <button
        className="leads-secondary-btn"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        style={{ minWidth: '80px', padding: '8px 16px' }}
      >
        Prev
      </button>
      {pages.map(p => (
        <button
          key={p}
          className="leads-secondary-btn"
          style={{
            minWidth: '40px',
            padding: '8px 12px',
            background: current === p ? 'var(--primary)' : 'var(--card-bg)',
            color: current === p ? 'white' : 'var(--text-muted)',
            borderColor: current === p ? 'var(--primary)' : 'var(--border-subtle)',
            fontWeight: current === p ? '700' : '600'
          }}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="leads-secondary-btn"
        disabled={total === current}
        onClick={() => onChange(current + 1)}
        style={{ minWidth: '80px', padding: '8px 16px' }}
      >
        Next
      </button>
    </div>
  )
}

export default LeadsPage
