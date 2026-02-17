// TicketsPage.jsx - Support Tickets list + Create / Edit Ticket form
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiEye, FiEdit2, FiTrash2, FiX, FiDownload } from 'react-icons/fi'
import Autocomplete from 'react-google-autocomplete'
import './TicketsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDDVz2pXtvfL3kvQ6m5kNjDYRzuoIwSZTI'

const TIMEZONES = [
  'GB United Kingdom (UTC+00:00)',
  'EU Europe (UTC+01:00)',
  'US Eastern (UTC-05:00)',
]

const formatForInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATIC_COUNTRIES = [
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

const CURRENCIES = [
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Pound (GBP)' },
]

const TICKET_STATUSES = ['Open', 'Assigned', 'On Route', 'In Progress', 'Resolved', 'Break']

function TicketsPage() {
  const location = useLocation()
  const [viewMode, setViewMode] = useState('list') // list | form
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState(null)
  const [filterTicketIdHandled, setFilterTicketIdHandled] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Extra data modules
  const [ticketNotes, setTicketNotes] = useState([])
  const [ticketAttachments, setTicketAttachments] = useState([])
  const [ticketExpenses, setTicketExpenses] = useState([])
  const [newAdminNote, setNewAdminNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

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

  // Country/Timezone states
  const [countriesList, setCountriesList] = useState([])
  const [loadingCountries] = useState(false)
  const [availableTimezones, setAvailableTimezones] = useState([])

  const [engineerName, setEngineerName] = useState('')
  const [engineerId, setEngineerId] = useState('')

  const [apartment, setApartment] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [timezone, setTimezone] = useState('')

  const [pocDetails, setPocDetails] = useState('')
  const [reDetails, setReDetails] = useState('')
  const [callInvites, setCallInvites] = useState('')

  const [documentsLabel, setDocumentsLabel] = useState('')
  const [signoffLabel, setSignoffLabel] = useState('')

  const [documents, setDocuments] = useState([]) // Array of objects {name, base64} or Files
  const [signoffSheets, setSignoffSheets] = useState([])

  const [currency, setCurrency] = useState('USD')
  const [hourlyRate, setHourlyRate] = useState('')
  const [halfDayRate, setHalfDayRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [agreedRate, setAgreedRate] = useState('')
  const [travelCostPerDay, setTravelCostPerDay] = useState('')
  const [totalCost, setTotalCost] = useState('')

  const [status, setStatus] = useState('Assigned')
  const [billingType, setBillingType] = useState('Hourly')
  const [cancellationFee, setCancellationFee] = useState('')

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakTime, setBreakTime] = useState('0') // in minutes

  const [liveBreakdown, setLiveBreakdown] = useState(null);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineStartTime, setInlineStartTime] = useState('');
  const [inlineEndTime, setInlineEndTime] = useState('');
  const [inlineBreakTime, setInlineBreakTime] = useState('0');
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);
  const [leadType, setLeadType] = useState('Full time') // 'Full time' | 'Dispatch'
  const [timeLogs, setTimeLogs] = useState([]);
  const [isUpdatingLog, setIsUpdatingLog] = useState(null); // stores log ID being updated
  const [isResolvingEarly, setIsResolvingEarly] = useState(false);
  const [newExtendEndDate, setNewExtendEndDate] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // Live Calculation Logic (Mirrors Backend)
  useEffect(() => {
    if (!startTime || !endTime) {
      setLiveBreakdown(null);
      return;
    }

    try {
      const s = new Date(startTime);
      const e = new Date(endTime);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return;

      const brkSec = (parseInt(breakTime) || 0) * 60;
      const totSec = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brkSec);
      const hrs = totSec / 3600;

      const hr = parseFloat(hourlyRate) || 0;
      const hd = parseFloat(halfDayRate) || 0;
      const fd = parseFloat(fullDayRate) || 0;

      const targetTZ = timezone || 'UTC';

      const getZonedInfo = (date) => {
        try {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: targetTZ,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
          const localDay = new Date(`${parts.year}-${parts.month}-${parts.day}`).getDay();
          return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, day: localDay, hour: parseInt(parts.hour) };
        } catch (err) {
          return { dateStr: '', day: date.getDay(), hour: date.getHours() };
        }
      };

      const startInfo = getZonedInfo(s);
      const endInfo = getZonedInfo(e);

      const isWeekend = (startInfo.day === 0 || startInfo.day === 6 || endInfo.day === 0 || endInfo.day === 6);

      const PUBLIC_HOLIDAYS = [
        '2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14',
        '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02',
        '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'
      ];
      const isHoliday = PUBLIC_HOLIDAYS.includes(startInfo.dateStr) || PUBLIC_HOLIDAYS.includes(endInfo.dateStr);
      const isSpecialDay = isWeekend || isHoliday;

      const workIsOOH = startInfo.hour < 8 || startInfo.hour >= 18 || endInfo.hour < 8 || endInfo.hour >= 18 || hrs > 10;

      let base = 0;
      let ot = 0;
      let ooh = 0;
      let special = 0;

      if (billingType === 'Hourly') {
        const billed = Math.max(2, hrs);
        base = billed * hr;
        if (isWeekend) special = base;
        else {
          if (billed > 8) ot = (billed - 8) * hr * 0.5;
          if (workIsOOH && ot === 0) ooh = billed * hr * 0.5;
        }
      } else if (billingType === 'Half Day + Hourly') {
        base = hd + (hrs > 4 ? (hrs - 4) * hr : 0);
        if (isWeekend) special = base;
        else {
          if (hrs > 8) ot = (hrs - 8) * hr * 0.5;
          if (workIsOOH && ot === 0) ooh = base * 0.5;
        }
      } else if (billingType === 'Full Day + OT') {
        base = fd;
        if (isWeekend) {
          special = base;
          if (hrs > 8) ot = (hrs - 8) * hr * 1.0;
        } else {
          if (hrs > 8) ot = (hrs - 8) * (hr * 1.5);
          if (workIsOOH && ot === 0) ooh = base * 0.5;
        }
      } else if (billingType.includes('Monthly')) {
        if (isWeekend) special = hrs * hr * 2.0;
        else if (hrs > 8) ot = (hrs - 8) * hr * 1.5;
        else if (workIsOOH) ooh = hrs * hr * 0.5;
      } else if (billingType === 'Agreed Rate') {
        base = parseFloat(agreedRate) || 0;
      } else if (billingType === 'Cancellation') {
        base = parseFloat(cancellationFee) || 0;
      }

      const tools = parseFloat(totalCost) || 0;
      const travel = parseFloat(travelCostPerDay) || 0;
      const grand = base + ot + ooh + special + tools + travel;

      setLiveBreakdown({
        hrs: hrs.toFixed(2),
        base: base.toFixed(2),
        ot: ot.toFixed(2),
        ooh: ooh.toFixed(2),
        special: special.toFixed(2),
        total: grand.toFixed(2)
      });
    } catch (err) {
      console.error(err);
    }
  }, [startTime, endTime, breakTime, billingType, hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, travelCostPerDay, totalCost, cancellationFee]);

  // Sync Task Dates with Manual Time Log
  useEffect(() => {
    if (startTime) {
      const datePart = startTime.split('T')[1] ? startTime.split('T')[0] : '';
      if (datePart) setTaskStartDate(datePart);
    }
  }, [startTime]);

  useEffect(() => {
    if (endTime) {
      const datePart = endTime.split('T')[1] ? endTime.split('T')[0] : '';
      if (datePart) setTaskEndDate(datePart);
    }
  }, [endTime]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        customerId &&
        taskName &&
        taskStartDate &&
        taskEndDate &&
        taskTime &&
        scopeOfWork &&
        engineerName
      ),
    [
      customerId,
      taskName,
      taskStartDate,
      taskEndDate,
      taskTime,
      scopeOfWork,
      engineerName
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
    setEngineerId('')
    setApartment('')
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setCountry('')
    setZipCode('')
    setTimezone('')
    setAvailableTimezones([])
    setPocDetails('')
    setReDetails('')
    setCallInvites('')
    setDocumentsLabel('')
    setSignoffLabel('')
    setDocuments([])
    setSignoffSheets([])
    setCurrency('USD')
    setHourlyRate('')
    setHalfDayRate('')
    setFullDayRate('')
    setMonthlyRate('')
    setAgreedRate('')
    setTravelCostPerDay('')
    setTotalCost('')
    setStatus('Assigned')
    setBillingType('Hourly')
    setLeadType('Full time')
    setCancellationFee('')
    setStartTime('')
    setEndTime('')
    setBreakTime('0')
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
      setTickets((data.tickets || []).sort((a, b) => b.id - a.id))

      // Handle initial filter if coming from dashboard/approvals
      if (location.state?.filterTicketId && !filterTicketIdHandled) {
        setFilterTicketIdHandled(true)
        openTicketModal(location.state.filterTicketId)
      }
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

  // Fetch countries - using hardcoded list for stability
  const fetchCountries = async () => {
    setCountriesList(STATIC_COUNTRIES)
  }

  // Handle country selection and auto-populate timezone
  const handleCountryChange = (countryName) => {
    setCountry(countryName)
    const selected = countriesList.find(c => c.name === countryName)
    if (selected && selected.timezones.length > 0) {
      setAvailableTimezones(selected.timezones)
      setTimezone(selected.timezones[0])
    } else {
      setAvailableTimezones([])
      setTimezone('')
    }
  }

  // Handle Google Address Selection
  const handleGoogleAddressSelect = async (place) => {
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
    let apartment = ''

    place.address_components.forEach((component) => {
      const types = component.types
      if (types.includes('street_number')) streetNumber = component.long_name
      if (types.includes('route')) route = component.long_name
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = component.long_name
      if (types.includes('locality')) locality = component.long_name
      if (types.includes('administrative_area_level_1')) adminArea1 = component.long_name
      if (types.includes('administrative_area_level_2')) adminArea2 = component.long_name
      if (types.includes('country')) {
        countryName = component.long_name
        countryCode = component.short_name
      }
      if (types.includes('postal_code')) postalCode = component.long_name
      if (types.includes('subpremise')) apartment = component.long_name
    })

    // Build clean address line 1
    const addressParts = [streetNumber, route].filter(Boolean)
    const newAddressLine1 = addressParts.length > 0 ? addressParts.join(' ') : (place.name || '')
    setAddressLine1(newAddressLine1.trim())

    // Set apartment if available
    if (apartment) {
      setApartment(apartment.trim())
    }

    // Set city with fallback logic
    const cityValue = locality || sublocality || adminArea2 || ''
    setCity(cityValue.trim())

    // Set postal code
    setZipCode(postalCode.trim())

    // Country matching - try to find exact match in our list
    let countryTimezones = []
    if (countryName) {
      const matchedCountry = countriesList.find(c =>
        c.name.toLowerCase() === countryName.toLowerCase() ||
        c.code === countryCode
      )

      if (matchedCountry) {
        setCountry(matchedCountry.name)
        if (matchedCountry.timezones.length > 0) {
          setAvailableTimezones(matchedCountry.timezones)
          setTimezone(matchedCountry.timezones[0])
          countryTimezones = matchedCountry.timezones
        }
      } else {
        // If no exact match, still set the country name
        setCountry(countryName)
        setAvailableTimezones([])
        setTimezone('')
      }
    }

    // Try to get precise timezone if geometry exists
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat()
      const lon = place.geometry.location.lng()
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`)
        const data = await res.json()
        if (data && data.timezone) {
          setTimezone(data.timezone)
          const combinedTimezones = Array.from(new Set([data.timezone, ...countryTimezones]))
          setAvailableTimezones(combinedTimezones)
        }
      } catch (err) {
        console.error("Failed to fetch precise timezone:", err)
      }
    }
  }

  useEffect(() => {
    loadTickets()
    fetchCountries()
  }, [])

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) =>
        customerId ? String(lead.customerId) === String(customerId) : true,
      ),
    [leads, customerId],
  )

  const handleDocumentsChange = (event) => {
    const newFiles = Array.from(event.target.files)
    if (newFiles.length === 0) return

    setDocuments((prev) => {
      const updated = [...prev, ...newFiles]
      setDocumentsLabel(`${updated.length} file(s) selected`)
      return updated
    })
    // Reset input so the same file can be selected again if needed
    event.target.value = ''
  }

  const handleSignoffChange = (event) => {
    const newFiles = Array.from(event.target.files)
    if (newFiles.length === 0) return

    setSignoffSheets((prev) => {
      const updated = [...prev, ...newFiles]
      setSignoffLabel(`${updated.length} file(s) selected`)
      return updated
    })
    event.target.value = ''
  }

  const removeDocument = (index) => {
    setDocuments((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      setDocumentsLabel(updated.length > 0 ? `${updated.length} file(s) selected` : '')
      return updated
    })
  }

  const removeSignoff = (index) => {
    setSignoffSheets((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      setSignoffLabel(updated.length > 0 ? `${updated.length} file(s) selected` : '')
      return updated
    })
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
        taskTime,
        scopeOfWork,
        tools,
        engineerName,
        engineerId: engineerId ? Number(engineerId) : null,
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
        documentsLabel: documents.map(f => f.name).join(', '),
        signoffLabel: signoffSheets.map(f => f.name).join(', '),
        currency,
        hourlyRate: hourlyRate !== '' ? Number(hourlyRate) : null,
        halfDayRate: halfDayRate !== '' ? Number(halfDayRate) : null,
        fullDayRate: fullDayRate !== '' ? Number(fullDayRate) : null,
        monthlyRate: monthlyRate !== '' ? Number(monthlyRate) : null,
        agreedRate,
        travelCostPerDay: travelCostPerDay !== '' ? Number(travelCostPerDay) : null,
        totalCost: totalCost !== '' ? Number(totalCost) : null,
        billingType,
        leadType,
        cancellationFee: cancellationFee !== '' ? Number(cancellationFee) : null,
        status,
        taskStartDate: taskStartDate ? String(taskStartDate).split('T')[0] : null,
        taskEndDate: taskEndDate ? String(taskEndDate).split('T')[0] : null,
        startTime,
        endTime,
        breakTime: Number(breakTime) || 0,
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
        const errMsg = data.details ? `${data.message}: ${data.details}` : (data.message || 'Error occurred');
        throw new Error(errMsg);
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

  const openTicketModal = (ticketId) => {
    const t = tickets.find((x) => x.id === ticketId)
    if (t) {
      setSelectedTicket(t)
      setIsTicketModalOpen(true)
      fetchTicketExtras(ticketId)
      setInlineStartTime(t.startTime ? formatForInput(t.startTime) : (t.start_time ? formatForInput(t.start_time) : ''))
      setInlineEndTime(t.endTime ? formatForInput(t.endTime) : (t.end_time ? formatForInput(t.end_time) : ''))
      setInlineBreakTime(t.breakTime ? Math.floor(Number(t.breakTime) / 60) : (t.break_time ? Math.floor(Number(t.break_time) / 60) : '0'))
      setNewExtendEndDate(t.taskEndDate ? t.taskEndDate.split('T')[0] : '')
    }
  }

  const handleUpdateInlineTime = async () => {
    try {
      setIsUpdatingTime(true);

      // Helper function to safely format dates to YYYY-MM-DD
      const formatDateOnly = (dateValue) => {
        if (!dateValue) return null;
        try {
          const dateStr = String(dateValue).split('T')[0];
          // Validate it's a proper date format
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
          }
          return null;
        } catch (e) {
          return null;
        }
      };

      // Send only the required fields for updating
      const payload = {
        customerId: selectedTicket.customerId,
        leadId: selectedTicket.leadId,
        clientName: selectedTicket.clientName,
        taskName: selectedTicket.taskName,
        taskStartDate: formatDateOnly(selectedTicket.taskStartDate),
        taskEndDate: formatDateOnly(selectedTicket.taskEndDate),
        taskTime: selectedTicket.taskTime,
        scopeOfWork: selectedTicket.scopeOfWork,
        tools: selectedTicket.tools,
        engineerName: selectedTicket.engineerName,
        engineerId: selectedTicket.engineerId,
        apartment: selectedTicket.apartment,
        addressLine1: selectedTicket.addressLine1,
        addressLine2: selectedTicket.addressLine2,
        city: selectedTicket.city,
        country: selectedTicket.country,
        zipCode: selectedTicket.zipCode,
        timezone: selectedTicket.timezone,
        pocDetails: selectedTicket.pocDetails,
        reDetails: selectedTicket.reDetails,
        callInvites: selectedTicket.callInvites,
        documentsLabel: selectedTicket.documentsLabel,
        signoffLabel: selectedTicket.signoffLabel,
        currency: selectedTicket.currency,
        hourlyRate: selectedTicket.hourlyRate,
        halfDayRate: selectedTicket.halfDayRate,
        fullDayRate: selectedTicket.fullDayRate,
        monthlyRate: selectedTicket.monthlyRate,
        agreedRate: selectedTicket.agreedRate,
        cancellationFee: selectedTicket.cancellationFee,
        travelCostPerDay: selectedTicket.travelCostPerDay,
        totalCost: selectedTicket.toolCost, // Map toolCost to totalCost for backend
        status: selectedTicket.status,
        leadType: selectedTicket.leadType,
        billingType: selectedTicket.billingType,
        // Time fields being updated
        startTime: inlineStartTime,
        endTime: inlineEndTime,
        breakTime: Number(inlineBreakTime) || 0
      };

      const res = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update time');

      // Fetch fresh ticket details immediately
      const freshRes = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}`, { credentials: 'include' });
      const freshData = await freshRes.json();
      const freshTicket = freshData.ticket || freshData; // Handle potential response wrapper

      if (freshTicket) {
        setSelectedTicket(freshTicket);
        setInlineStartTime(freshTicket.startTime ? formatForInput(freshTicket.startTime) : (freshTicket.start_time ? formatForInput(freshTicket.start_time) : ''));
        setInlineEndTime(freshTicket.endTime ? formatForInput(freshTicket.endTime) : (freshTicket.end_time ? formatForInput(freshTicket.end_time) : ''));
        // Convert seconds to minutes for UI
        const bt = freshTicket.breakTime !== undefined ? freshTicket.breakTime : freshTicket.break_time;
        setInlineBreakTime(bt ? Math.floor(Number(bt) / 60) : '0');
      }

      setIsInlineEditing(false);
      await loadTickets(); // Refresh list view in background
    } catch (err) {
      console.error(err);
      alert('Error updating time log: ' + err.message);
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const fetchTicketExtras = async (ticketId) => {
    try {
      const [notesRes, attachRes, expRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tickets/${ticketId}/notes`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/tickets/${ticketId}/attachments`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/tickets/${ticketId}/expenses`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/tickets/${ticketId}/time-logs`, { credentials: 'include' }),
      ])

      if (notesRes.ok) {
        let d = await notesRes.json();
        setTicketNotes(d.notes || []);
      }
      if (attachRes.ok) {
        let d = await attachRes.json();
        setTicketAttachments(d.attachments || []);
      }
      if (expRes.ok) {
        let d = await expRes.json();
        setTicketExpenses(d.expenses || []);
      }
      if (logsRes.ok) {
        let d = await logsRes.json();
        setTimeLogs(d.logs || []);
      }
    } catch (e) {
      console.error('Error fetching ticket extras', e)
    }
  }

  const handleUpdateLog = async (logId, data) => {
    setIsUpdatingLog(logId);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}/time-logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Update failed');
      fetchTicketExtras(selectedTicket.id);
      loadTickets();
    } catch (e) { alert(e.message); }
    setIsUpdatingLog(null);
  }

  const handleResolveEarly = async (date) => {
    if (!window.confirm(`Are you sure you want to resolve this ticket early on ${date}? Future logs will be deleted.`)) return;
    setIsResolvingEarly(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}/resolve-early`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resolveDate: date })
      });
      if (!res.ok) throw new Error('Action failed');
      handleCloseTicketModal();
      loadTickets();
    } catch (e) { alert(e.message); }
    setIsResolvingEarly(false);
  }

  const handleExtendJob = async () => {
    if (!newExtendEndDate) return;
    setIsExtending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEndDate: newExtendEndDate })
      });
      if (!res.ok) throw new Error('Extension failed');
      fetchTicketExtras(selectedTicket.id);
      loadTickets();
    } catch (e) { alert(e.message); }
    setIsExtending(false);
  }

  const handleAddAdminNote = async () => {
    if (!newAdminNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newAdminNote, authorType: 'admin' }),
      });

      if (res.ok) {
        setNewAdminNote('');
        fetchTicketExtras(selectedTicket.id);
      }
    } catch (e) {
      console.error('Error adding note', e);
    }
    setAddingNote(false);
  }

  const fillFormFromTicket = (ticket) => {
    setCustomerId(ticket.customerId ? String(ticket.customerId) : '')
    setLeadId(ticket.leadId ? String(ticket.leadId) : '')
    setClientName(ticket.clientName || '')
    setTaskName(ticket.taskName || '')
    setTaskStartDate(ticket.taskStartDate ? String(ticket.taskStartDate).split('T')[0] : '')
    setTaskEndDate(ticket.taskEndDate ? String(ticket.taskEndDate).split('T')[0] : '')
    setTaskTime(ticket.taskTime || '00:00')
    setScopeOfWork(ticket.scopeOfWork || '')
    setTools(ticket.tools || '')
    setEngineerName(ticket.engineerName || '')
    setEngineerId(ticket.engineerId ? String(ticket.engineerId) : '')
    setApartment(ticket.apartment || '')
    setAddressLine1(ticket.addressLine1 || '')
    setAddressLine2(ticket.addressLine2 || '')
    setCity(ticket.city || '')
    setCountry(ticket.country || '')
    setZipCode(ticket.zipCode || '')
    setTimezone(ticket.timezone || '')

    // Populate availableTimezones based on the country when editing
    if (ticket.country && countriesList.length > 0) {
      const matchedCountry = countriesList.find((c) => c.name === ticket.country)
      if (matchedCountry) {
        setAvailableTimezones(matchedCountry.timezones || [])
      } else {
        // Fallback: if existing timezone is set but country not in list, at least show the current one
        if (ticket.timezone) setAvailableTimezones([ticket.timezone])
      }
    } else if (ticket.timezone) {
      // Emergency fallback if list hasn't loaded yet
      setAvailableTimezones([ticket.timezone])
    }

    setPocDetails(ticket.pocDetails || '')
    setReDetails(ticket.reDetails || '')
    setCallInvites(ticket.callInvites || '')
    setDocumentsLabel(ticket.documentsLabel || '')
    setSignoffLabel(ticket.signoffLabel || '')

    // Parse existing labels into the list UI
    if (ticket.documentsLabel) {
      setDocuments(ticket.documentsLabel.split(', ').map(name => ({ name })))
    } else {
      setDocuments([])
    }

    if (ticket.signoffLabel) {
      setSignoffSheets(ticket.signoffLabel.split(', ').map(name => ({ name })))
    } else {
      setSignoffSheets([])
    }

    setCurrency(ticket.currency || 'USD')
    setHourlyRate(ticket.hourlyRate != null ? String(ticket.hourlyRate) : '')
    setHalfDayRate(ticket.halfDayRate != null ? String(ticket.halfDayRate) : '')
    setFullDayRate(ticket.fullDayRate != null ? String(ticket.fullDayRate) : '')
    setMonthlyRate(ticket.monthlyRate != null ? String(ticket.monthlyRate) : '')
    setAgreedRate(ticket.agreedRate || '')
    setCancellationFee(ticket.cancellation_fee != null ? String(ticket.cancellation_fee) : '')
    setTravelCostPerDay(ticket.travelCostPerDay != null ? String(ticket.travelCostPerDay) : '')
    setTotalCost(ticket.toolCost != null ? String(ticket.toolCost) : '')
    setBillingType(ticket.billingType || 'Hourly')
    setLeadType(ticket.leadType || 'Full time')
    setStatus(ticket.status || 'Open')

    const formatForInput = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Time Log
    setStartTime(formatForInput(ticket.start_time));
    setEndTime(formatForInput(ticket.end_time));
    setBreakTime(ticket.break_time ? String(Math.floor(ticket.break_time / 60)) : '0');
  }

  const handleViewDocument = (fileUrl) => {
    if (!fileUrl) return;

    if (fileUrl.startsWith('data:')) {
      try {
        const [parts, base64Data] = fileUrl.split(',');
        const mime = parts.split(':')[1].split(';')[0];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const blobWin = window.open(blobUrl, '_blank');
        if (!blobWin || blobWin.closed || typeof blobWin.closed === 'undefined') {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.target = '_blank';
          const filename = `document_${Date.now()}.${mime.split('/')[1] || 'bin'}`;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Base64 decode error', err);
        window.open(fileUrl, '_blank');
      }
    } else if (fileUrl.startsWith('http')) {
      window.open(fileUrl, '_blank');
    } else {
      const base = API_BASE_URL.replace(/\/api\/?$/, '');
      const filename = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      const fullUrl = filename.includes('uploads/')
        ? `${base}/${filename}`
        : `${base}/uploads/${filename}`;
      window.open(fullUrl, '_blank');
    }
  };

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

  // Check for lead data passed from Leads page via localStorage
  useEffect(() => {
    const stored = localStorage.getItem('selectedLeadForTicket')
    if (!stored) return
    try {
      const parsedLead = JSON.parse(stored)
      if (parsedLead && parsedLead.id) {
        // Ensure dropdowns identify the IDs
        loadDropdowns()

        setCustomerId(String(parsedLead.customerId || ''))
        setLeadId(String(parsedLead.id))
        setClientName(parsedLead.customerName || '')
        setTaskName(parsedLead.taskName || '')

        // Use followUpDate as the "latest" date if available, otherwise fallback to taskStartDate/End
        const latestDate = parsedLead.followUpDate || parsedLead.taskStartDate;
        const latestEndDate = parsedLead.taskEndDate || latestDate;

        // Ensure dates are in YYYY-MM-DD for the <input type="date" />
        setTaskStartDate(latestDate ? String(latestDate).split('T')[0] : '')
        setTaskEndDate(latestEndDate ? String(latestEndDate).split('T')[0] : '')

        setTaskTime(parsedLead.taskTime || '00:00')
        setScopeOfWork(parsedLead.scopeOfWork || '')

        // Address & Location
        setApartment(parsedLead.apartment || '')
        setAddressLine1(parsedLead.addressLine1 || '')
        setAddressLine2(parsedLead.addressLine2 || '')
        setCity(parsedLead.city || '')
        setCountry(parsedLead.country || '')
        setZipCode(parsedLead.zipCode || '')
        setTimezone(parsedLead.timezone || '')

        // Sync timezones immediately using static list
        if (parsedLead.country) {
          const matched = STATIC_COUNTRIES.find(c => c.name === parsedLead.country)
          if (matched) {
            setAvailableTimezones(matched.timezones || [])
            // If lead has a specific timezone, use it, otherwise use the first one from matched
            if (parsedLead.timezone) {
              setTimezone(parsedLead.timezone)
            } else if (matched.timezones && matched.timezones.length > 0) {
              setTimezone(matched.timezones[0])
            }
          }
        }

        // Tools
        setTools(parsedLead.toolsRequired || '')

        // Rates
        setCurrency(parsedLead.currency || 'USD')
        setHourlyRate(parsedLead.hourlyRate != null ? String(parsedLead.hourlyRate) : '')
        setHalfDayRate(parsedLead.halfDayRate != null ? String(parsedLead.halfDayRate) : '')
        setFullDayRate(parsedLead.fullDayRate != null ? String(parsedLead.fullDayRate) : '')
        setMonthlyRate(parsedLead.monthlyRate != null ? String(parsedLead.monthlyRate) : '')
        setAgreedRate(parsedLead.agreedRate || '')
        setTravelCostPerDay(parsedLead.travelCostPerDay != null ? String(parsedLead.travelCostPerDay) : '')
        setTotalCost(parsedLead.totalCost != null ? String(parsedLead.totalCost) : '')
        setBillingType(parsedLead.billingType || 'Hourly')
        setLeadType(parsedLead.leadType || 'Full time')

        setViewMode('form')
      }
    } catch (err) {
      console.error("Failed to parse selected lead", err)
    }
    localStorage.removeItem('selectedLeadForTicket')
  }, [leads, countriesList])

  // Handle external edit request (e.g. from Leads Page)
  // Auto-populate when leadId changes (e.g. from dropdown)
  useEffect(() => {
    if (!leadId) return
    const lead = leads.find(l => String(l.id) === String(leadId))
    if (lead) {
      console.log("Populating ticket form from selected lead:", lead.id)
      setTaskName(lead.taskName || '')
      const latestDate = lead.followUpDate || lead.taskStartDate;
      const latestEndDate = lead.taskEndDate || latestDate;
      setTaskStartDate(latestDate ? String(latestDate).split('T')[0] : '')
      setTaskEndDate(latestEndDate ? String(latestEndDate).split('T')[0] : '')
      setTaskTime(lead.taskTime?.slice(0, 5) || '00:00')
      setScopeOfWork(lead.scopeOfWork || '')
      setApartment(lead.apartment || '')
      setAddressLine1(lead.addressLine1 || '')
      setAddressLine2(lead.addressLine2 || '')
      setCity(lead.city || '')
      setCountry(lead.country || '')
      setZipCode(lead.zipCode || '')
      setTimezone(lead.timezone || '')
      setTools(lead.toolsRequired || '')
      setCurrency(lead.currency || 'USD')
      setHourlyRate(lead.hourlyRate != null ? String(lead.hourlyRate) : '')
      setHalfDayRate(lead.halfDayRate != null ? String(lead.halfDayRate) : '')
      setFullDayRate(lead.fullDayRate != null ? String(lead.fullDayRate) : '')
      setMonthlyRate(lead.monthlyRate != null ? String(lead.monthlyRate) : '')
      setAgreedRate(lead.agreedRate || '')
      setTravelCostPerDay(lead.travelCostPerDay != null ? String(lead.travelCostPerDay) : '')
      setTotalCost(lead.totalCost != null ? String(lead.totalCost) : '')
      setBillingType(lead.billingType || 'Hourly')
      setLeadType(lead.leadType || 'Full time')
    }
  }, [leadId, leads])

  useEffect(() => {
    const ticketIdToEdit = localStorage.getItem('editTicketId')
    const syncLeadToTicket = localStorage.getItem('syncLeadToTicket')

    if (ticketIdToEdit) {
      localStorage.removeItem('editTicketId')

      const proceedSync = async () => {
        await startEditTicket(Number(ticketIdToEdit))

        // If we specifically requested a sync from manual button
        if (syncLeadToTicket) {
          localStorage.removeItem('syncLeadToTicket')
          try {
            const parsedLead = JSON.parse(syncLeadToTicket)
            // Force the latest dates from lead into the form
            // Priority: followUpDate (if Confirm/Reschedule) > taskStartDate
            const latestDate = parsedLead.followUpDate || parsedLead.taskStartDate
            const latestEndDate = parsedLead.taskEndDate || latestDate

            if (latestDate) setTaskStartDate(latestDate.split('T')[0])
            if (latestEndDate) setTaskEndDate(latestEndDate.split('T')[0])
            console.log("Ticket dates synced from Lead manual action.")
          } catch (e) {
            console.error("Manual sync failed", e)
          }
        }
      }

      proceedSync()
    }
  }, [])

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
            <h1 className="tickets-title">{editingTicketId ? 'Edit Ticket' : 'Create Ticket'}</h1>
            <p className="tickets-subtitle">{editingTicketId ? 'Update the details of the ticket.' : 'Generate a support ticket from a lead.'}</p>
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
                  Task Start Date <span className="field-required">*</span>
                </span>
                <input
                  type="date"
                  value={taskStartDate}
                  onChange={(e) => setTaskStartDate(e.target.value)}
                />
              </label>

              <label className="tickets-field">
                <span>
                  Task End Date <span className="field-required">*</span>
                </span>
                <input
                  type="date"
                  value={taskEndDate}
                  onChange={(e) => setTaskEndDate(e.target.value)}
                />
              </label>

              <label className="tickets-field">
                <span>
                  Task Time <span className="field-required">*</span>
                </span>
                <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
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
                  value={engineerId}
                  onChange={(e) => {
                    const id = e.target.value
                    setEngineerId(id)
                    const eng = engineers.find(en => String(en.id) === String(id))
                    if (eng) setEngineerName(eng.name)
                  }}
                  disabled={loadingDropdowns}
                >
                  <option value="">Choose an engineer...</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Location */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Location</h2>
            <div className="tickets-grid">
              <label className="tickets-field tickets-field--full">
                <span>Address Search</span>
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

              <label className="tickets-field">
                <span>
                  Address Line 1 <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street / Building"
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
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={loadingCountries}
                >
                  <option value="">Select a country...</option>
                  {countriesList.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!country}>
                  <option value="">Select timezone...</option>
                  {availableTimezones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
                {country && availableTimezones.length === 0 && (
                  <small style={{ color: '#999', marginTop: '4px' }}>No timezone data available for this country</small>
                )}
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
                </div>
                {documents.length > 0 && (
                  <ul className="tickets-file-list">
                    {documents.map((file, idx) => (
                      <li key={idx}>
                        <span>{file.name}</span>
                        <button type="button" onClick={() => removeDocument(idx)}><FiX /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>
              <label className="tickets-field">
                <span>Sign-off Sheet (any file)</span>
                <div className="tickets-file-row">
                  <input type="file" multiple onChange={handleSignoffChange} />
                </div>
                {signoffSheets.length > 0 && (
                  <ul className="tickets-file-list">
                    {signoffSheets.map((file, idx) => (
                      <li key={idx}>
                        <span>{file.name}</span>
                        <button type="button" onClick={() => removeSignoff(idx)}><FiX /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>
            </div>
          </section>

          {/* Time Log (Manual Override) */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Time Log (Manual Override)</h2>
            <p className="tickets-subtitle" style={{ marginBottom: '16px', fontSize: '13px' }}>
              Manually adjust the working hours if the engineer forgot to resolve the task.
            </p>
            <div className="tickets-grid">
              <label className="tickets-field">
                <span>Start Time (Override)</span>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>End Time (Override)</span>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
              <label className="tickets-field">
                <span>Break Time (Minutes)</span>
                <input
                  type="number"
                  min="0"
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
          </section>

          {/* Pricing & Rates */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Pricing &amp; Rates</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
              📌 <strong>Rate Multipliers:</strong> OT/OOH = 1.5x | Weekend/Holiday = 2.0x
            </p>
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
                <span>Billing Type</span>
                <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
                  <option value="Hourly">1) Hourly Only (min 2 hrs billing)</option>
                  <option value="Half Day + Hourly">2) Half Day + Hourly</option>
                  <option value="Full Day + OT">3) Full Day + OT (OT = 1.5x)</option>
                  <option value="Monthly + OT + Weekend/Holiday">4) Monthly + OT + Weekend/Holidays (Weekend = 2x)</option>
                  <option value="Agreed Rate">5) Agreed/Fixed Rate</option>
                  <option value="Cancellation">6) Cancellation/Reschedule Fee</option>
                </select>
              </label>
              <label className="tickets-field">
                <span>Support Type</span>
                <select value={leadType} onChange={(e) => setLeadType(e.target.value)}>
                  <option value="Full time">Full time</option>
                  <option value="Dispatch">Dispatch (Multi-day)</option>
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
                  placeholder="0.00"
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
                  placeholder="0.00"
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
                  placeholder="0.00"
                />
              </label>
              <label className="tickets-field">
                <span>Cancellation Fee ({currency})</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cancellationFee}
                  onChange={(e) => setCancellationFee(e.target.value)}
                  placeholder="0.00"
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
                  placeholder="0.00"
                />
              </label>
              <label className="tickets-field" style={{ gridColumn: 'span 2' }}>
                <span>Agreed Rate</span>
                <input
                  type="text"
                  value={agreedRate}
                  onChange={(e) => setAgreedRate(e.target.value)}
                  placeholder="Details"
                />
              </label>
            </div>
          </section>

          {/* Additional Costs */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Additional Costs</h2>
            <div className="tickets-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <label className="tickets-field">
                <span>Travel Cost / Day</span>
                <input
                  type="number"
                  step="0.01"
                  value={travelCostPerDay}
                  onChange={(e) => setTravelCostPerDay(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="tickets-field">
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
            {liveBreakdown && (
              <div className="calculation-preview-card">
                <h3>Live Estimated Total</h3>
                <div className="preview-grid">
                  <div className="preview-item">
                    <label>Worked Hours</label>
                    <span>{liveBreakdown.hrs}h</span>
                  </div>
                  <div className="preview-item">
                    <label>Base Cost</label>
                    <span>{currency} {liveBreakdown.base}</span>
                  </div>
                  {parseFloat(liveBreakdown.ot) > 0 && (
                    <div className="preview-item highlight">
                      <label>OT Premium</label>
                      <span>+ {currency} {liveBreakdown.ot}</span>
                    </div>
                  )}
                  {parseFloat(liveBreakdown.ooh) > 0 && (
                    <div className="preview-item highlight">
                      <label>OOH Premium</label>
                      <span>+ {currency} {liveBreakdown.ooh}</span>
                    </div>
                  )}
                  {parseFloat(liveBreakdown.special) > 0 && (
                    <div className="preview-item highlight-gold">
                      <label>Wknd/Hol Premium</label>
                      <span>+ {currency} {liveBreakdown.special}</span>
                    </div>
                  )}
                  <div className="preview-item total">
                    <label>Grand Total</label>
                    <span>{currency} {liveBreakdown.total}</span>
                  </div>
                </div>
                <p className="preview-note">Note: Final calculation is performed by the server upon saving.</p>
              </div>
            )}

            <button
              type="button"
              className="tickets-secondary-btn"
              onClick={() => {
                resetForm()
                setViewMode('list')
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="tickets-primary-btn" disabled={saving || !canSubmit}>
              {saving ? (editingTicketId ? 'Saving Changes...' : 'Creating Ticket...') : (editingTicketId ? 'Save Changes' : 'Create Ticket')}
            </button>
          </div>
        </form >
      </section >
    )
  }

  const handleDeleteAllTickets = async () => {
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE ALL TICKETS? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tickets`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setTickets([]);
        setSummary({ total: 0, open: 0, inProgress: 0, resolved: 0 });
        alert('All tickets deleted successfully.');
      } else {
        alert('Failed to delete tickets.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting tickets.');
    } finally {
      setLoading(false);
      loadTickets(); // Refresh just in case
    }
  };

  // LIST VIEW
  return (
    <section className="tickets-page">
      <header className="tickets-header">
        <div>
          <h1 className="tickets-title">Support Tickets</h1>
          <p className="tickets-subtitle">Manage customer support requests.</p>
        </div>
        <div />
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
        <div style={{ padding: '0 20px 10px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="tickets-primary-btn"
            style={{ backgroundColor: '#10B981', borderColor: '#10B981', marginRight: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => window.location.href = `${API_BASE_URL}/reports/tickets/export`}
          >
            <FiDownload /> EXPORT REPORT
          </button>
          <button
            className="tickets-primary-btn"
            style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}
            onClick={handleDeleteAllTickets}
          >
            DELETE ALL TICKETS
          </button>
        </div>
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

        {/* Pagination Logic */}
        {(() => {
          const totalPages = Math.ceil(tickets.length / itemsPerPage)
          const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

          const Pagination = ({ total, current, onChange }) => {
            if (total <= 1) return null
            let pages = []
            for (let i = 1; i <= total; i++) pages.push(i)

            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '24px', background: '#fafafc', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="tickets-secondary-btn"
                  disabled={current === 1}
                  onClick={() => onChange(current - 1)}
                  style={{ minWidth: '80px', padding: '8px 16px' }}
                >
                  Prev
                </button>
                {pages.map(p => (
                  <button
                    key={p}
                    className="tickets-secondary-btn"
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
                  className="tickets-secondary-btn"
                  disabled={current === totalPages}
                  onClick={() => onChange(current + 1)}
                  style={{ minWidth: '80px', padding: '8px 16px' }}
                >
                  Next
                </button>
              </div>
            )
          }

          return (
            <>
              <div className="tickets-table-wrapper">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>ID</th>
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
                    ) : paginatedTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="tickets-empty">
                          No tickets found.
                        </td>
                      </tr>
                    ) : (
                      paginatedTickets.map((ticket) => (
                        <tr key={ticket.id} className={ticket.unreadNotesCount > 0 ? 'ticket-row--unread' : ''}>
                          <td>#AIM-T-{ticket.id}</td>
                          <td>{ticket.taskName}</td>
                          <td>
                            {ticket.city}, {ticket.country}
                          </td>
                          <td>
                            {ticket.taskStartDate ? String(ticket.taskStartDate).split('T')[0] : ''} - {ticket.taskEndDate ? String(ticket.taskEndDate).split('T')[0] : ''} {ticket.taskTime}
                          </td>
                          <td>{ticket.customerName}</td>
                          <td>
                            {ticket.engineerName || '-'}
                            {ticket.unreadNotesCount > 0 && (
                              <span className="unread-dot-wow" title={`${ticket.unreadNotesCount} unread notes from engineer`}></span>
                            )}
                          </td>
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
              <Pagination total={totalPages} current={currentPage} onChange={setCurrentPage} />
            </>
          )
        })()}
      </section>

      {isTicketModalOpen && selectedTicket && (
        <div className="ticket-modal-backdrop" onClick={handleCloseTicketModal} role="dialog" aria-modal="true">
          <div className="ticket-modal ticket-modal--details" onClick={e => e.stopPropagation()}>
            <header className="ticket-modal-header">
              <div className="ticket-modal-header-info">
                <h2>Ticket Details</h2>
                <div className="ticket-badge-id">#AIM-T-{String(selectedTicket.id).padStart(3, '0')}</div>
              </div>
              <p className="ticket-modal-subtitle">{selectedTicket.taskName}</p>
              <button type="button" className="ticket-modal-close-btn" onClick={handleCloseTicketModal}>×</button>
            </header>

            <div className="ticket-modal-content">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Customer</label>
                  <span>{selectedTicket.customerName}</span>
                </div>
                <div className="detail-item">
                  <label>Assigned Engineer</label>
                  <span>{selectedTicket.engineerName || '--'}</span>
                </div>
                <div className="detail-item">
                  <label>Start Date</label>
                  <span>{selectedTicket.taskStartDate ? String(selectedTicket.taskStartDate).split('T')[0] : '--'}</span>
                </div>
                <div className="detail-item">
                  <label>End Date</label>
                  <span>{selectedTicket.taskEndDate ? String(selectedTicket.taskEndDate).split('T')[0] : '--'}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{selectedTicket.taskTime}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-pill ${selectedTicket.status?.toLowerCase().replace(' ', '-')}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                {selectedTicket.engineerStatus === 'Declined' && (
                  <div className="detail-item--full" style={{ marginTop: '8px' }}>
                    <label style={{ color: '#ef4444' }}>Decline Reason</label>
                    <div className="scope-text" style={{ borderColor: '#ef4444', color: '#991b1b', background: '#fef2f2' }}>
                      {selectedTicket.declineReason || 'No reason provided'}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <label>City / Country</label>
                  <span>{selectedTicket.city}, {selectedTicket.country}</span>
                </div>
                <div className="detail-item">
                  <label>Timezone</label>
                  <span>{selectedTicket.timezone || '--'}</span>
                </div>

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Address</label>
                  <span>
                    {selectedTicket.apartment && `${selectedTicket.apartment}, `}
                    {selectedTicket.addressLine1}
                    {selectedTicket.addressLine2 && `, ${selectedTicket.addressLine2}`}
                    {` - ${selectedTicket.zipCode}`}
                  </span>
                </div>

                <div className="detail-item--full">
                  <label>Scope of Work</label>
                  <p className="scope-text">{selectedTicket.scopeOfWork}</p>
                </div>

                {/* Billing Configuration Section */}
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
                    {selectedTicket.billingType || 'Hourly'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Currency</label>
                  <span style={{ fontWeight: '600' }}>{selectedTicket.currency || 'USD'}</span>
                </div>

                {/* Pricing & Rates Section */}
                <div className="detail-item--full divider"></div>
                <div className="detail-item--full" style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Pricing & Rates</label>
                </div>
                <div className="detail-item">
                  <label>Hourly Rate</label>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.hourlyRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Half Day Rate</label>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.halfDayRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Full Day Rate</label>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.fullDayRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Monthly Rate</label>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.monthlyRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Agreed / Fixed Rate</label>
                  <span style={{ fontWeight: '600', color: '#059669' }}>{selectedTicket.agreedRate || '--'}</span>
                </div>

                {/* Additional Costs Section */}
                <div className="detail-item--full divider"></div>
                <div className="detail-item--full" style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Additional Costs</label>
                </div>
                <div className="detail-item">
                  <label>Tool Cost</label>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>{selectedTicket.currency} {selectedTicket.toolCost || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Travel Cost / Day</label>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>{selectedTicket.currency} {selectedTicket.travelCostPerDay || '0.00'}</span>
                </div>

                <div className="detail-item--full divider"></div>

                {selectedTicket.leadType === 'Dispatch' && (
                  <div className="detail-item--full" style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Multi-day Time Logs</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="date"
                          value={newExtendEndDate}
                          onChange={e => setNewExtendEndDate(e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <button className="btn-wow-secondary" onClick={handleExtendJob} disabled={isExtending} style={{ padding: '4px 12px', fontSize: '11px' }}>
                          {isExtending ? 'Extending...' : 'Extend Job'}
                        </button>
                      </div>
                    </div>

                    <div className="dispatch-logs-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>In / Out / Break</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Total</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeLogs.map(log => {
                            const dur = (log.start_time && log.end_time)
                              ? (new Date(log.end_time) - new Date(log.start_time)) / 3600000 - (log.break_time_mins / 60)
                              : 0;
                            return (
                              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px' }}>
                                  <div style={{ fontWeight: '600' }}>{new Date(log.task_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{log.is_weekend ? 'Weekend' : 'Weekday'}</div>
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                      <input type="time" defaultValue={log.start_time ? new Date(log.start_time).toTimeString().slice(0, 5) : ''} onBlur={e => handleUpdateLog(log.id, { startTime: log.task_date.split('T')[0] + ' ' + e.target.value })} />
                                      <input type="time" defaultValue={log.end_time ? new Date(log.end_time).toTimeString().slice(0, 5) : ''} onBlur={e => handleUpdateLog(log.id, { endTime: log.task_date.split('T')[0] + ' ' + e.target.value })} />
                                    </div>
                                    <input type="number" placeholder="Break mins" style={{ width: '80px' }} defaultValue={log.break_time_mins} onBlur={e => handleUpdateLog(log.id, { breakTimeMins: parseInt(e.target.value) })} />
                                  </div>
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: 'var(--primary-color)' }}>
                                  {dur > 0 ? dur.toFixed(2) + 'h' : '--'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  <button
                                    className="btn-wow-secondary"
                                    style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #ef4444', color: '#ef4444' }}
                                    onClick={() => handleResolveEarly(log.task_date.split('T')[0])}
                                  >
                                    Resolve Here
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="detail-item--full divider"></div>

                {selectedTicket.leadType !== 'Dispatch' && (
                  <>
                    <div className="detail-item--full" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Time Log (Engineer Activity)</label>
                    </div>

                    {isInlineEditing ? (
                      <div className="detail-item--full" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                        <div style={{ marginBottom: '16px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Current Recorded Values:</p>
                          <div style={{ display: 'flex', gap: '15px', marginTop: '4px', fontSize: '12px', color: '#b45309' }}>
                            <span><strong>Start:</strong> {selectedTicket.start_time ? new Date(selectedTicket.start_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                            <span><strong>End:</strong> {selectedTicket.end_time ? new Date(selectedTicket.end_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                            <span><strong>Break:</strong> {selectedTicket.break_time ? `${Math.floor(selectedTicket.break_time / 60)}m` : '0m'}</span>
                          </div>
                        </div>
                        <div className="tickets-grid" style={{ marginBottom: '16px' }}>
                          <label className="tickets-field">
                            <span>New Start Time</span>
                            <input type="datetime-local" value={inlineStartTime} onChange={e => setInlineStartTime(e.target.value)} />
                          </label>
                          <label className="tickets-field">
                            <span>New End Time</span>
                            <input type="datetime-local" value={inlineEndTime} onChange={e => setInlineEndTime(e.target.value)} />
                          </label>
                          <label className="tickets-field">
                            <span>New Break Time (Mins)</span>
                            <input type="number" value={inlineBreakTime} onChange={e => setInlineBreakTime(e.target.value)} />
                          </label>
                        </div>
                        <button
                          className="btn-wow-primary"
                          style={{ width: '100%' }}
                          onClick={handleUpdateInlineTime}
                          disabled={isUpdatingTime}
                        >
                          {isUpdatingTime ? 'Updating...' : 'Save Time Changes'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="detail-item">
                          <label>Actual Start Time</label>
                          <span style={{ fontWeight: '600' }}>{selectedTicket.startTime ? new Date(selectedTicket.startTime).toLocaleString() : '--'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Actual End Time</label>
                          <span style={{ fontWeight: '600' }}>{selectedTicket.endTime ? new Date(selectedTicket.endTime).toLocaleString() : '--'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Break Time</label>
                          <span style={{ fontWeight: '600' }}>{selectedTicket.breakTime ? `${Math.floor(selectedTicket.breakTime / 60)} mins` : '0 mins'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Total Bilable Time</label>
                          <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{selectedTicket.totalTime ? `${(selectedTicket.totalTime / 3600).toFixed(2)} hours` : '0.00 hours'}</span>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="detail-item--full divider"></div>
                <div className="detail-item--full" style={{ background: 'var(--primary-bg, #f5f3ff)', padding: '15px', borderRadius: '10px', border: '1px solid var(--primary-color, #a78bfa)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-color, #7c3aed)', margin: 0 }}>Grand Total (Receivable)</label>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-color, #7c3aed)' }}>{selectedTicket.currency} {parseFloat(selectedTicket.totalCost || 0).toFixed(2)}</span>
                </div>

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Customer Documents</label>
                  <div className="ticket-docs-list" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTicket.documentsLabel ? (
                      selectedTicket.documentsLabel.split(', ').map((docName, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-lighter)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.9rem' }}>{docName}</span>
                          <button
                            type="button"
                            onClick={() => handleViewDocument(docName)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            title="View"
                          >
                            <FiEye size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No documents linked.</span>
                    )}
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                {/* Notes Section */}
                <div className="detail-item--full">
                  <label>Service Notes / Timeline</label>
                  <div className="admin-notes-list" style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {ticketNotes.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No notes yet.</p>
                    ) : (
                      ticketNotes.map((n, idx) => (
                        <div key={n.id || idx} style={{ marginBottom: '10px', padding: '10px', background: n.author_type === 'admin' ? '#f0f9ff' : '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: n.author_type === 'admin' ? '#0369a1' : '#334155' }}>
                              {n.author_type === 'admin' ? 'ADMIN (YOU)' : 'ENGINEER'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Add a reply..."
                      value={newAdminNote}
                      onChange={e => setNewAdminNote(e.target.value)}
                      style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                    />
                    <button
                      onClick={handleAddAdminNote}
                      disabled={addingNote || !newAdminNote}
                      style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {addingNote ? '...' : 'Reply'}
                    </button>
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                {/* Attachments Section */}
                <div className="detail-item--full">
                  <label>Engineer Uploads</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {ticketAttachments.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No attachments uploaded yet.</span>
                    ) : (
                      ticketAttachments.map((a, idx) => (
                        <a key={a.id || idx} href={`https://awokta.com/${a.file_url}`} target="_blank" rel="noreferrer" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden', display: 'block' }}>
                          <img src={`https://awokta.com/${a.file_url}`} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      ))
                    )}
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                {/* Expenses Section */}
                <div className="detail-item--full">
                  <label>Reported Expenses</label>
                  <div style={{ marginTop: '8px' }}>
                    {ticketExpenses.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No expenses reported.</span>
                    ) : (
                      ticketExpenses.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '4px', border: '1px solid var(--border-subtle)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{ex.description}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(ex.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.9rem' }}>{selectedTicket.currency} {parseFloat(ex.amount).toFixed(2)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="ticket-modal-footer">
              <button className="btn-wow-secondary" onClick={handleCloseTicketModal}>Close</button>
              <button
                className="btn-wow-primary"
                onClick={() => {
                  if (selectedTicket.leadType === 'Dispatch') {
                    const el = document.querySelector('.dispatch-logs-table-wrapper');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    if (!isInlineEditing) {
                      // Reset state when ENTERING edit mode
                      setInlineStartTime(selectedTicket.startTime ? formatForInput(selectedTicket.startTime) : (selectedTicket.start_time ? formatForInput(selectedTicket.start_time) : ''));
                      setInlineEndTime(selectedTicket.endTime ? formatForInput(selectedTicket.endTime) : (selectedTicket.end_time ? formatForInput(selectedTicket.end_time) : ''));
                      const bt = selectedTicket.breakTime !== undefined ? selectedTicket.breakTime : selectedTicket.break_time;
                      setInlineBreakTime(bt ? Math.floor(Number(bt) / 60) : '0');
                    }
                    setIsInlineEditing(!isInlineEditing);
                  }
                }}
              >
                {selectedTicket.leadType === 'Dispatch' ? 'Edit Time' : (isInlineEditing ? 'Cancel Edit' : 'Edit Time')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default TicketsPage
