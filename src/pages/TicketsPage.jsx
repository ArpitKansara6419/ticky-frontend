// TicketsPage.jsx - Support Tickets list + Create / Edit Ticket form
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { FiEye, FiEdit2, FiTrash2, FiX, FiDownload, FiClock, FiGlobe, FiDollarSign, FiInfo, FiUser, FiCpu, FiCalendar, FiCheckCircle, FiActivity, FiFileText, FiArrowLeft, FiArrowRight, FiTag, FiNavigation, FiTool, FiMinusCircle } from 'react-icons/fi'
import Autocomplete from 'react-google-autocomplete'
import './TicketsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDLND9h_AWApPg9gQVYZhhsPmIHMuN-6fg'

const parseWallClockDate = (s) => {
  if (!s) return new Date(NaN);
  if (s instanceof Date) return s;
  const str = String(s).trim();
  if (!str) return new Date(NaN);
  
  // Handle ISO format or space instead of T
  let clean = str.replace(' ', 'T');
  // If it doesn't have a timezone, treat as UTC wall-clock
  if (!clean.includes('Z') && !clean.includes('+') && clean.includes('T')) {
    clean += 'Z';
  } else if (!clean.includes('T') && clean.includes('-')) {
     // YYYY-MM-DD format
     clean += 'T00:00:00Z';
  }
  
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d;
  
  // Fallback for DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const [dd, mm, yyyy] = str.split('T')[0].split(' ')[0].split('-');
    const timePart = str.includes('T') ? str.split('T')[1] : (str.includes(' ') ? str.split(' ')[1] : '00:00:00');
    return new Date(`${yyyy}-${mm}-${dd}T${timePart.replace('Z', '')}Z`);
  }
  
  return d;
};

const calculateDuration = (start, end, breakMins = 0) => {
  if (!start || !end) return 0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 1440; // overnight
    return Math.max(0, (diff - (Number(breakMins) || 0)) / 60);
  } catch (e) { return 0; }
};

const formatForInput = (dateStr) => {
  if (!dateStr) return '';
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    // Force UTC for wall-clock strings from DB to prevent local TZ offset shift
    d = new Date(dateStr.replace(' ', 'T') + 'Z');
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');

  // Use UTC components to display exactly what is stored in the DB (wall-clock time)
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const safeExtractTime = (dtStr) => {
  if (!dtStr) return '';
  const str = String(dtStr);
  const match = str.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
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
  { value: 'INR', label: 'Rupee (INR)' },
]

const HOLIDAYS_CALC = {
  'India': ['2026-01-26','2026-03-21','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-27','2026-06-26','2026-08-15','2026-08-26','2026-10-02','2026-10-20','2026-11-08','2026-11-24','2026-12-25'],
  'Poland': ['2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-03','2026-06-04','2026-08-15','2026-11-01','2026-11-11','2026-12-25','2026-12-26'],
  'Other': []
};


const getDatesInRange = (start, end) => {
  const dates = [];
  if (!start || !end) return dates;
  
  const parseFlexible = (s) => {
    if (!s) return new Date(NaN);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(`${s.split('T')[0]}T00:00:00Z`);
    if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
      const [d, m, y] = s.split('T')[0].split(' ')[0].split('-');
      return new Date(`${y}-${m}-${d}T00:00:00Z`);
    }
    return new Date(s.includes('T') ? s : `${s}T00:00:00Z`);
  };

  let curr = parseFlexible(start);
  const stop = parseFlexible(end);
  if (isNaN(curr.getTime()) || isNaN(stop.getTime())) return dates;

  let count = 0;
  while (curr <= stop && count < 366) {
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(curr.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setUTCDate(curr.getUTCDate() + 1);
    count++;
  }
  return dates;
};

const getWorkingDaysInMonth = (dateStr, countryName) => {
  if (!dateStr) return 22;
  const holidays = HOLIDAYS_CALC[countryName] || HOLIDAYS_CALC['India'] || [];
  
  const parseFlexible = (s) => {
    if (!s) return new Date(NaN);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(`${s.split('T')[0]}T00:00:00Z`);
    if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
      const [d, m, y] = s.split('T')[0].split(' ')[0].split('-');
      return new Date(`${y}-${m}-${d}T00:00:00Z`);
    }
    return new Date(s.includes('T') ? s : `${s}T00:00:00Z`);
  };

  const d = parseFlexible(dateStr);
  if (isNaN(d.getTime())) return 22;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay  = new Date(Date.UTC(year, month + 1, 0));
  let workingDaysCount = 0;
  let cur = new Date(firstDay);
  while (cur <= lastDay) {
    const dayOfWeek = cur.getUTCDay();
    const iso = cur.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(iso)) {
      workingDaysCount++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return workingDaysCount || 22;
};

// Pure calculation function moved outside component to prevent stale closure issues
const calculateTicketTotal = (opts) => {
  // Declare rates and totals at the top level to avoid ReferenceErrors in catch block
  let hr = 0, hd = 0, fd = 0, ar = 0, cf = 0, mr = 0;
  let base = 0, ot = 0, ooh = 0, special = 0;
  
  let {
    startTime: sParam, endTime: eParam, breakTime: bParam,
    hourlyRate: hrParam, halfDayRate: hdParam, fullDayRate: fdParam, monthlyRate: mrParam, agreedRate: arParam, cancellationFee: cfParam,
    billingType: bilParam, timezone: tzParam, calcTimezone: ctzParam, country: cntParam,
    overtimeRate: otParam, oohRate: oohParam, weekendRate: weParam, holidayRate: holParam,
    isEngineer: isEngParam,
    _isLogAggregation
  } = opts;

  // For flat-fee billing types (Full Day, Half Day, Agreed Rate, Cancellation),
  // we do NOT need valid start/end times — use synthetic times if missing.
  const billingTypeLower = (opts.billingType || '').toLowerCase();
  const isFlatFee = billingTypeLower.includes('full day') || billingTypeLower.includes('full time') ||
                    billingTypeLower.includes('half day') || billingTypeLower.includes('agreed') ||
                    billingTypeLower.includes('cancellation');

  // Build synthetic times from date fields if actual times not provided
  let sParamFinal = sParam;
  let eParamFinal = eParam;
  if ((!sParamFinal || !eParamFinal) && isFlatFee && opts.startTime) {
    const dateOnly = String(opts.startTime).split('T')[0].split(' ')[0];
    sParamFinal = `${dateOnly}T09:00:00Z`;
    eParamFinal = `${dateOnly}T17:00:00Z`;
  }

  const isEng = (opts.isEngineer === true);
  
  try {
    // Parse rates early to prevent ReferenceErrors in catch/fallback blocks
    hr = parseFloat(hrParam) || 0;
    hd = parseFloat(hdParam) || 0;
    fd = parseFloat(fdParam) || 0;
    ar = parseFloat(arParam) || 0;
    cf = parseFloat(cfParam) || 0;
    mr = parseFloat(mrParam) || 0;

    // Never return null - use defaults to keep UI alive
    const sStr = String(sParamFinal || '2026-01-01T09:00:00Z');
    const eStr = String(eParamFinal || '2026-01-01T17:00:00Z');

    const s = parseWallClockDate(sStr);
    const e = parseWallClockDate(eStr);
    // Fallback if dates are invalid
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
       return { totalHours: '8.00', base: (fd || hr*8 || 0).toFixed(2), ot: '0.00', ooh: '0.00', specialDay: '0.00', tools: '0.00', travel: '0.00', grandTotal: (fd || 0).toFixed(2) };
    }

    const brkSec = (parseInt(bParam) || 0) * 60;
    const totSec = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brkSec);
    const hrs = totSec / 3600;

    const targetTZ = (ctzParam && ctzParam !== 'Ticket Local') ? ctzParam : (tzParam || Intl.DateTimeFormat().resolvedOptions().timeZone);

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

    const HOLIDAYS_BY_COUNTRY = {
      'India': ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'],
      'Poland': ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25', '2026-12-26'],
      'Other': []
    };
    const activeHols = HOLIDAYS_BY_COUNTRY[cntParam] || HOLIDAYS_BY_COUNTRY['India'] || [];
    const isHoliday = activeHols.includes(startInfo.dateStr) || activeHols.includes(endInfo.dateStr);
    const dSafe = new Date(`${startInfo.dateStr}T00:00:00Z`);
    const isWeekend = dSafe.getUTCDay() === 0 || dSafe.getUTCDay() === 6;
    
    let startHr = startInfo.hour;
    let endHr = endInfo.hour;
    if (opts.startTime && opts.startTime.includes('T')) {
      startHr = parseInt(opts.startTime.split('T')[1].split(':')[0], 10);
    }
    if (opts.endTime && opts.endTime.includes('T')) {
      endHr = parseInt(opts.endTime.split('T')[1].split(':')[0], 10);
    }
    const workIsOOH = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

    const customOTRate = parseFloat(otParam) || (hr * 1.5);
    const customOOHRate = parseFloat(oohParam) || (hr * 1.5);
    const customWeekendRate = parseFloat(weParam) || (hr * 2.0);
    const customHolidayRate = parseFloat(holParam) || (hr * 2.0);

    const bil = (bilParam || '').trim();
    const bilMatch = (target) => {
      const b = (bilParam || '').trim().toLowerCase();
      const t = target.toLowerCase();
      
      if (b === t) return true;
      
      // Handle "Full Day + OT" vs "Full Day"
      if (t === 'full day + ot') {
        return b.includes('full') && b.includes('ot');
      }
      if (t === 'full day') {
        // Must have "full", but NOT "ot" and NOT "monthly"
        return b.includes('full') && !b.includes('ot') && !b.includes('monthly');
      }
      
      // Handle "Half Day + Hourly" vs "Hourly"
      if (t === 'half day + hourly') {
        return b.includes('half') && b.includes('hourly');
      }
      if (t === 'hourly') {
        // Must be exactly "hourly" or include "hourly" but NOT "half"
        return b === 'hourly' || (b.includes('hourly') && !b.includes('half'));
      }
      
      if (t === 'monthly + ot + weekend') {
        return b.includes('monthly');
      }
      
      if (t === 'mixed mode') return b.includes('mixed');
      if (t === 'agreed rate') return b.includes('agreed');
      if (t === 'cancellation') return b.includes('cancellation');
      
      return b.includes(t);
    };

    if (bilMatch('Hourly')) {
      const b = Math.max(2, hrs);
      base = b * hr;
    } else if (bilMatch('Half Day + Hourly')) {
      base = hrs <= 4 ? hd : hd + ((hrs - 4) * hr);
    } else if (bilMatch('Full Day')) {
      base = fd;
    } else if (bilMatch('Full Day + OT')) {
      base = fd;
      if (hrs > 8) ot = (hrs - 8) * customOTRate;
    } else if (bilMatch('Mixed Mode')) {
      if (hrs <= 4) base = hd;
      else if (hrs <= 8) base = fd;
      else { base = fd; ot = (hrs - 8) * customOTRate; }
    } else if (bil.toLowerCase().includes('monthly')) {
      const fullRate = parseFloat(mrParam) || 0;
      const divisor = (opts.monthlyDivisor && opts.monthlyDivisor > 0) ? opts.monthlyDivisor : 22; 
      base = fullRate / divisor;
      if (hrs > 8) ot = (hrs - 8) * customOTRate;
    } else if (bilMatch('Agreed Rate')) {
      base = ar;
    } else if (bilMatch('Cancellation')) {
      base = cf;
    }

    if (isWeekend) special = customWeekendRate;
    else if (isHoliday) special = customHolidayRate;

    if (workIsOOH && bil !== 'Agreed Rate' && bil !== 'Cancellation') {
      ooh = hrs * customOOHRate;
    }
    let effectiveBase = Number(base) || 0;
    // Removed the _isLogAggregation zero-out logic for Agreed Rate/Cancellation.
    // We now handle one-time fee logic in the aggregation loop itself if needed,
    // but for most cases, if a log exists, its base cost should be included in its grand total.

    const finalTravel = isEngParam ? 0 : (parseFloat(opts.travelCostPerDay) || 0);
    const finalTools = isEngParam ? 0 : (parseFloat(opts.toolCost) || 0);

    // Safety: ensure all components are valid numbers before summing to prevent NaN
    const grand = (Number(effectiveBase) || 0) + (Number(ot) || 0) + (Number(ooh) || 0) + (Number(special) || 0) + (finalTravel || 0) + (finalTools || 0);

    return {
      hrs: hrs.toFixed(2),
      base: base.toFixed(2),
      ot: ot.toFixed(2),
      ooh: ooh.toFixed(2),
      specialDay: special.toFixed(2),
      tools: finalTools.toFixed(2),
      travel: finalTravel.toFixed(2),
      grandTotal: grand.toFixed(2),
      isOOH: workIsOOH,
      isSpecialDay: isWeekend || isHoliday,
      perDayRate:   opts._perDayRate   != null ? parseFloat(opts._perDayRate).toFixed(2)   : null,
      workingDays:  opts._workingDays  != null ? opts._workingDays                          : null,
      monthlyFull:  opts._monthlyFull  != null ? parseFloat(opts._monthlyFull).toFixed(2)   : null,
    };
  } catch (err) { 
     console.error("Calculation Engine Error:", err);
     return { totalHours: '0.00', base: (fd || 0).toFixed(2), ot: '0.00', ooh: '0.00', specialDay: '0.00', tools: '0.00', travel: '0.00', grandTotal: (fd || 0).toFixed(2) }; 
  }
};


const TICKET_STATUSES = ['Open', 'Assigned', 'On Route', 'In Progress', 'Resolved', 'Break', 'Approval Pending']

const GOOGLE_AUTOCOMPLETE_OPTIONS = {
  types: ['address'],
}

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active Only')
  const [resolvingTicket, setResolvingTicket] = useState(null)
  const [closingNote, setClosingNote] = useState('')

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
  
  // Automatically clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const [customerId, setCustomerId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [clientName, setClientName] = useState('')

  const [taskName, setTaskName] = useState('')
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskTime, setTaskTime] = useState('09:00')
  const [taskEndTime, setTaskEndTime] = useState('17:00')
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
  const [toolsRequired, setToolsRequired] = useState('')
  const [agreedRate, setAgreedRate] = useState('0') // Default 0 as requested
  const [travelCostPerDay, setTravelCostPerDay] = useState('')
  const [totalCost, setTotalCost] = useState('0') // This is actually the FINAL TICKET TOTAL
  const [toolCostInput, setToolCostInput] = useState('') // New state for Tool Cost input
  const [cancellationFee, setCancellationFee] = useState('')

  // Engineer Payout Configuration States
  const [engPayType, setEngPayType] = useState('Default') // 'Default' | 'Custom'
  const [engBillingType, setEngBillingType] = useState('Hourly')
  const [engCurrency, setEngCurrency] = useState('USD')
  const [engHourlyRate, setEngHourlyRate] = useState('')
  const [engHalfDayRate, setEngHalfDayRate] = useState('')
  const [engFullDayRate, setEngFullDayRate] = useState('')
  const [engMonthlyRate, setEngMonthlyRate] = useState('')
  const [engAgreedRate, setEngAgreedRate] = useState('')
  const [engCancellationFee, setEngCancellationFee] = useState('')
  const [engOvertimeRate, setEngOvertimeRate] = useState('')
  const [engOohRate, setEngOohRate] = useState('')
  const [engWeekendRate, setEngWeekendRate] = useState('')
  const [engHolidayRate, setEngHolidayRate] = useState('')

  const [status, setStatus] = useState('Assigned')
  const [closureReason, setClosureReason] = useState('')
  const [resolveDate, setResolveDate] = useState('')
  const [billingType, setBillingType] = useState('Hourly')
  const [isFillingForm, setIsFillingForm] = useState(false)

  // Map / LatLng states
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakTime, setBreakTime] = useState('0') // in minutes

  const [liveBreakdown, setLiveBreakdown] = useState(null);
  const [payoutLiveBreakdown, setPayoutLiveBreakdown] = useState(null);
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
  const [calcTimezone, setCalcTimezone] = useState('Ticket Local');
  const [expandedTicketRows, setExpandedTicketRows] = useState(new Set()); // for multi-day expandable rows
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTicketId, setReassignTicketId] = useState(null);
  const [collapsedMonths, setCollapsedMonths] = useState(new Set()); // Month keys like "2026-04" that are COLLAPSED
  const [activeMainTab, setActiveMainTab] = useState('Tickets'); // 'Tickets' | 'Cost & Breakdown'
  const [activeCostTab, setActiveCostTab] = useState('Customer'); // 'Customer' | 'Engineer'
  
  const parseWallClockDate = useCallback((str) => {
    if (!str) return new Date(NaN);
    const s = String(str).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return new Date(s.includes('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z');
    }
    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
      const [d, m, y] = s.split('T')[0].split(' ')[0].split('-');
      const timePart = s.includes('T') ? s.split('T')[1] : (s.includes(' ') ? s.split(' ')[1] : '00:00:00');
      const iso = `${y}-${m}-${d}T${timePart.replace('Z', '')}Z`;
      return new Date(iso);
    }
    return new Date(s.includes('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z');
  }, []);

  const workingDays = useMemo(() => {
    const all = getDatesInRange(taskStartDate, taskEndDate);
    const hasWeekdays = all.some(d => {
      const dObj = parseWallClockDate(d);
      const dw = dObj.getUTCDay();
      return dw !== 0 && dw !== 6;
    });

    return all.filter(d => {
      const dObj = parseWallClockDate(d);
      const dw = dObj.getUTCDay();
      const isWeekend = dw === 0 || dw === 6;
      // If there are no weekdays in the whole range, show everything (weekend ticket case)
      if (!hasWeekdays) return true;
      // Otherwise, hide weekends by default to keep the view clean
      return !isWeekend;
    });
  }, [taskStartDate, taskEndDate, parseWallClockDate]);

  const isMultiDay = useMemo(() => workingDays.length > 1 || leadType === 'Dispatch' || (billingType && billingType.includes('Monthly')), [workingDays, leadType, billingType]);


  // Smart Auto-Sync for Start & End Time based on Task Details
  // TIMEZONE-SAFE: builds wall-clock strings directly without new Date() to avoid local TZ shifts
  const autoSyncTime = (startDate, endDate, startTimeStr, endTimeStr) => {
    if (viewMode === 'form' && startDate && startTimeStr) {
      const sTime = startTimeStr.padStart(5, '0');
      const eTime = (endTimeStr || '').padStart(5, '0');

      setStartTime(`${startDate}T${sTime}`);

      if (endDate) {
        if (eTime && eTime !== '00:00') {
           setEndTime(`${endDate}T${eTime}`);
        } else {
          // Fallback to 8 hours default if no end time provided
          const [hStr, mStr] = sTime.split(':');
          const pad = (n) => String(n).padStart(2, '0');
          let h = parseInt(hStr, 10) + 8;
          let d = endDate;
          if (h >= 24) {
            const baseDate = parseWallClockDate(endDate);
            baseDate.setUTCDate(baseDate.getUTCDate() + 1);
            d = `${baseDate.getUTCFullYear()}-${pad(baseDate.getUTCMonth() + 1)}-${pad(baseDate.getUTCDate())}`;
            h = h - 24;
          }
          setEndTime(`${d}T${pad(h)}:${mStr}`);
        }
      }
    }
  };

  // Reverse Sync: Update Task Details from Time Log Overrides
  const reverseSyncTime = (startVal, endVal) => {
    if (startVal && startVal.includes('T')) {
      const [date, time] = startVal.split('T');
      if (taskStartDate !== date) setTaskStartDate(date);
      const shortTime = time.slice(0, 5);
      if (taskTime !== shortTime) setTaskTime(shortTime);
    }
    if (endVal && endVal.includes('T')) {
      const [date] = endVal.split('T');
      if (taskEndDate !== date) setTaskEndDate(date);
    }
  }

  // Effect to keep Task Details in sync with Overrides in Full Form
  useEffect(() => {
    if (viewMode === 'form' && (startTime || endTime)) {
      reverseSyncTime(startTime, endTime);
    }
  }, [startTime, endTime, viewMode]);


  useEffect(() => {
    // Enable live calculations for both view mode AND creation/editing mode
    // if (isFillingForm) return; <--- REMOVED TO ALLOW LIVE SUMMARIES WHILE FILLING FORM
    // Also treat Monthly billing as multi-day calendar view even if start==end
    const isMultiDayEffect = isMultiDay;
    const daysArr = isMultiDayEffect ? (workingDays.length > 0 ? workingDays : [taskStartDate]) : [];
    const numDays = daysArr.length || 1;

    if (isMultiDay) {
      // Pre-compute working days within ticket date range for Monthly per-day rate
      const calcHols = HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || [];
      const monthlyDivisor = getWorkingDaysInMonth(taskStartDate, country);

      let totalReceivable = 0;
      let totalPayout = 0;
      let totalHrs = 0;
      let validDaysCount = 0;
      const engSummaryMap = {};
      let combinedBreakdown = { hrs: '0.00', grandTotal: '0.00', base: '0.00', ot: '0.00', ooh: '0.00', specialDay: '0.00', tools: '0.00', travel: '0.00', days: 0, perDayRate: null, workingDays: null, monthlyFull: null };
      let engBreakdown = { base: '0.00', ot: '0.00', ooh: '0.00', special: '0.00', agreed: '0.00' };

      daysArr.forEach((d) => {
        const existing = (timeLogs || []).find(l => {
          const rawDate = l.task_date || l.taskDate || '';
          if (!rawDate) return false;
          const dateOnly = rawDate.toString().split('T')[0].split(' ')[0].trim();
          return dateOnly === d;
        });

        const dObj = parseWallClockDate(d);
        const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
        const activeHols = HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || [];
        const isHoliday = activeHols.includes(d);

        // Smart Skip: If it's a weekend or holiday, ONLY count it if explicit times are provided.
        // This handles long-term tickets correctly while still allowing weekend-only tickets.
        if ((isWeekend || isHoliday) && (!existing || (!existing.start_time && !existing.startTime))) return;

        let sTime, eTime, bMins = 0, specificEngId = null;
        if (existing) specificEngId = existing.engineer_id || existing.engineerId || null;

        if (existing && (existing.start_time || existing.startTime)) {
          sTime = existing.start_time || existing.startTime;
          eTime = existing.end_time || existing.endTime;
          bMins = existing.break_time_mins || existing.breakTime || 0;
        } else {
          const cleanTime = (taskTime && taskTime.includes(':')) ? taskTime.padStart(5, '0') : '09:00';
          const cleanEndTime = (taskEndTime && taskEndTime.includes(':')) ? taskEndTime.padStart(5, '0') : '17:00';
          sTime = `${d}T${cleanTime}:00Z`;
          eTime = `${d}T${cleanEndTime}:00Z`;
        }

        const dayMonthlyDivisor = getWorkingDaysInMonth(d, country);
        const currentEngId = Number(specificEngId || engineerId);
        const isNoEngDay = currentEngId === 0;

        // CUSTOMER
        let rRates = { hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate, ar: agreedRate, cf: cancellationFee, bt: billingType };
        if (isNoEngDay) rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
        else if (specificEngId && Number(specificEngId) !== Number(engineerId)) {
          const subEng = engineers.find(en => Number(en.id) === currentEngId);
          if (subEng) {
            rRates = {
              hr: subEng.hourlyRate ?? subEng.hourly_rate ?? 0,
              hd: subEng.halfDayRate ?? subEng.half_day_rate ?? 0,
              fd: subEng.fullDayRate ?? subEng.full_day_rate ?? 0,
              mr: subEng.monthlyRate ?? subEng.monthly_rate ?? 0,
              ar: subEng.agreedRate ?? subEng.agreed_rate ?? 0,
              cf: subEng.cancellationFee ?? subEng.cancellation_fee ?? 0,
              bt: subEng.billingType ?? subEng.billing_type ?? billingType
            };
          }
        }
        const dayStartTime = sTime;
        const dayEndTime = eTime;

        const res = calculateTicketTotal({
          startTime: dayStartTime, endTime: eTime, breakTime: bMins,
          hourlyRate: rRates.hr, halfDayRate: rRates.hd, fullDayRate: rRates.fd, 
          monthlyRate: rRates.mr, agreedRate: rRates.ar, cancellationFee: rRates.cf,
          travelCostPerDay: String(travelCostPerDay), toolCost: String(toolCostInput), billingType: rRates.bt, 
          timezone, calcTimezone, country, monthlyDivisor: dayMonthlyDivisor,
          _isLogAggregation: true,
          isEngineer: false
        });

        // ENGINEER
        let pRates = { 
          hourlyRate: engHourlyRate || 0, halfDayRate: engHalfDayRate || 0, fullDayRate: engFullDayRate || 0,
          monthlyRate: engMonthlyRate || 0, agreedRate: engAgreedRate || 0, cancellationFee: engCancellationFee || 0,
          billingType: engBillingType, overtimeRate: 0, oohRate: 0, weekendRate: 0, holidayRate: 0 
        };
        if (engPayType === 'Custom' && (!specificEngId || Number(specificEngId) === Number(engineerId))) {
           pRates.overtimeRate = engOvertimeRate || 0; pRates.oohRate = engOohRate || 0; pRates.weekendRate = engWeekendRate || 0; pRates.holidayRate = engHolidayRate || 0;
        } else {
           const logEngId = Number(specificEngId || engineerId);
           const currentEng = engineers.find(e => Number(e.id) === logEngId);
           if (currentEng) {
             pRates = {
               hourlyRate: currentEng.hourlyRate ?? currentEng.hourly_rate ?? 0,
               halfDayRate: currentEng.halfDayRate ?? currentEng.half_day_rate ?? 0,
               fullDayRate: currentEng.fullDayRate ?? currentEng.full_day_rate ?? 0,
               monthlyRate: currentEng.monthlyRate ?? currentEng.monthly_rate ?? 0,
               agreedRate: currentEng.agreedRate ?? currentEng.agreed_rate ?? 0,
               cancellationFee: currentEng.cancellationFee ?? currentEng.cancellation_fee ?? 0,
               billingType: engBillingType || billingType,
               overtimeRate: currentEng.overtimeRate ?? currentEng.overtime_rate ?? 0,
               oohRate: currentEng.oohRate ?? currentEng.ooh_rate ?? 0,
               weekendRate: currentEng.weekendRate ?? currentEng.weekend_rate ?? 0,
               holidayRate: currentEng.holidayRate ?? currentEng.holiday_rate ?? 0
             };
           }
        }
        if (isNoEngDay) pRates = { hourlyRate: 0, halfDayRate: 0, fullDayRate: 0, monthlyRate: 0, agreedRate: 0, cancellationFee: 0, billingType: 'Hourly', overtimeRate: 0, oohRate: 0, weekendRate: 0, holidayRate: 0 };
        
        const payRes = calculateTicketTotal({
          startTime: dayStartTime, endTime: dayEndTime, breakTime: bMins,
          hourlyRate: pRates.hourlyRate, halfDayRate: pRates.halfDayRate, fullDayRate: pRates.fullDayRate,
          monthlyRate: pRates.monthlyRate, agreedRate: pRates.agreedRate, cancellationFee: pRates.cancellationFee,
          overtimeRate: pRates.overtimeRate, oohRate: pRates.oohRate, weekendRate: pRates.weekendRate, holidayRate: pRates.holidayRate,
          travelCostPerDay: 0, toolCost: 0, billingType: pRates.billingType, timezone, calcTimezone,
          monthlyDivisor: dayMonthlyDivisor, country, isEngineer: true, _isLogAggregation: true
        });

        if (res) {
          totalReceivable += parseFloat(res.grandTotal);
          totalHrs += parseFloat(res.hrs);
          combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + parseFloat(res.base)).toFixed(2);
          combinedBreakdown.ot = (parseFloat(combinedBreakdown.ot) + parseFloat(res.ot)).toFixed(2);
          combinedBreakdown.ooh = (parseFloat(combinedBreakdown.ooh) + parseFloat(res.ooh)).toFixed(2);
          combinedBreakdown.specialDay = (parseFloat(combinedBreakdown.specialDay) + parseFloat(res.specialDay)).toFixed(2);
          combinedBreakdown.travel = (parseFloat(combinedBreakdown.travel) + (parseFloat(res.travel) || 0)).toFixed(2);
          combinedBreakdown.tools = (parseFloat(combinedBreakdown.tools) + (parseFloat(res.tools) || 0)).toFixed(2);
          validDaysCount += 1;
        }
        if (payRes) {
          const pVal = parseFloat(payRes.grandTotal);
          totalPayout += pVal;
          engBreakdown.base = (parseFloat(engBreakdown.base) + parseFloat(payRes.base)).toFixed(2);
          engBreakdown.ot = (parseFloat(engBreakdown.ot) + parseFloat(payRes.ot)).toFixed(2);
          engBreakdown.ooh = (parseFloat(engBreakdown.ooh) + parseFloat(payRes.ooh)).toFixed(2);
          engBreakdown.special = (parseFloat(engBreakdown.special) + parseFloat(payRes.specialDay)).toFixed(2);
          engBreakdown.travel = '0.00';
          engBreakdown.tools = '0.00';
          
          const currentEngId = Number(specificEngId || engineerId);
          if (!isNaN(currentEngId)) {
            const currentEng = engineers.find(e => Number(e.id) === currentEngId);
            let eName = currentEng ? currentEng.name : (currentEngId === Number(engineerId) ? engineerName : `Engineer ${currentEngId}`);
            if (currentEngId === 0) eName = 'No Engineer / Absent';
            if (!engSummaryMap[currentEngId]) engSummaryMap[currentEngId] = { name: eName, total: 0, isNoEng: currentEngId === 0 };
            engSummaryMap[currentEngId].total += pVal;
          }
        }
      });

      const pOneTime = (billingType === 'Agreed Rate' ? (parseFloat(engAgreedRate) || 0) : (billingType === 'Cancellation' ? (parseFloat(engCancellationFee) || 0) : 0));
      totalPayout += pOneTime;
      engBreakdown.agreed = pOneTime.toFixed(2);
      if (engineerId && engSummaryMap[engineerId]) engSummaryMap[engineerId].total += pOneTime;

      // Wrap up customer-side one-time fees (already handled in loop for tools/travel per day)
      // but Agreed Rate / Cancellation are one-time per ticket
      if (billingType === 'Agreed Rate') {
        const ar = parseFloat(agreedRate) || 0;
        totalReceivable += ar; combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + ar).toFixed(2);
      } else if (billingType === 'Cancellation') {
        const cf = parseFloat(cancellationFee) || 0;
        totalReceivable += cf; combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + cf).toFixed(2);
      }

      const finalLiveTravel = (parseFloat(travelCostPerDay) * numDays).toFixed(2);
      const finalLiveTools = (parseFloat(toolCostInput) * numDays).toFixed(2);
      
      // FIX: Calculate Grand Total as the sum of all aggregated components.
      // This ensures the Grand Total always matches the sum of the breakdown rows.
      const finalGrandTotal = (
        parseFloat(combinedBreakdown.base) + 
        parseFloat(combinedBreakdown.ot) + 
        parseFloat(combinedBreakdown.ooh) + 
        parseFloat(combinedBreakdown.specialDay) + 
        parseFloat(finalLiveTravel) + 
        parseFloat(finalLiveTools)
      ).toFixed(2);

      setLiveBreakdown({ 
        base: Number(combinedBreakdown.base).toFixed(2),
        ot: Number(combinedBreakdown.ot).toFixed(2),
        ooh: Number(combinedBreakdown.ooh).toFixed(2),
        specialDay: Number(combinedBreakdown.specialDay).toFixed(2),
        travel: finalLiveTravel,
        tools: finalLiveTools,
        hrs: totalHrs.toFixed(2), 
        grandTotal: finalGrandTotal, 
        days: numDays,
        effectiveRate: numDays > 0 ? (parseFloat(combinedBreakdown.base) / numDays).toFixed(2) : '0.00'
      });
      setTotalCost(finalGrandTotal);
      
      const finalEngGrandTotal = (
        parseFloat(engBreakdown.base) + 
        parseFloat(engBreakdown.ot) + 
        parseFloat(engBreakdown.ooh) + 
        parseFloat(engBreakdown.special) + 
        parseFloat(engBreakdown.agreed || 0)
      ).toFixed(2);

      setPayoutLiveBreakdown({ 
        ...engBreakdown, 
        grandTotal: finalEngGrandTotal, 
        engSummary: Object.values(engSummaryMap),
        effectiveRate: numDays > 0 ? (parseFloat(engBreakdown.base) / numDays).toFixed(2) : '0.00'
      });

    } else {
      const estStartTime = startTime || (taskStartDate && taskTime ? `${taskStartDate}T${taskTime.padStart(5, '0')}` : '');
      const estEndTime = endTime || (taskEndDate && taskEndTime ? `${taskEndDate}T${taskEndTime.padStart(5, '0')}` : '');
      const singleDayDivisor = getWorkingDaysInMonth(taskStartDate, country);

      // For flat-fee billing types, ensure we always have valid times
      const flatBil = billingType.toLowerCase();
      const isFlatBil = flatBil.includes('full day') || flatBil.includes('full time') ||
                         flatBil.includes('half day') || flatBil.includes('agreed') ||
                         flatBil.includes('cancellation');
      let calcStartTime = estStartTime;
      let calcEndTime = estEndTime;
      if ((!calcStartTime || !calcEndTime) && taskStartDate) {
        const tDate = taskStartDate.includes('-') ? taskStartDate.split('T')[0] : taskStartDate;
        const cleanTime = (taskTime && taskTime.includes(':')) ? taskTime.slice(0, 5) : '09:00';
        const cleanEndT = (taskEndTime && taskEndTime.includes(':')) ? taskEndTime.slice(0, 5) : '17:00';
        const endTDate = (taskEndDate && taskEndDate.split('T')[0]) || tDate;
        calcStartTime = `${tDate}T${cleanTime}:00Z`;
        calcEndTime = `${endTDate}T${cleanEndT}:00Z`;
      }

      const res = calculateTicketTotal({
        startTime: calcStartTime, endTime: calcEndTime, breakTime,
        hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
        travelCostPerDay: String(travelCostPerDay), toolCost: String(toolCostInput), billingType, timezone, calcTimezone,
        monthlyDivisor: singleDayDivisor, country,
        overtimeRate: 0, oohRate: 0, weekendRate: 0, holidayRate: 0,
        isEngineer: false
      });
      const finalLiveTravel = (parseFloat(travelCostPerDay) || 0).toFixed(2);
      const finalLiveTools = (parseFloat(toolCostInput) || 0).toFixed(2);

      // Robust sum of parts logic for single day
      const finalGrandTotal = (
        (parseFloat(res?.base) || 0) + 
        (parseFloat(res?.ot) || 0) + 
        (parseFloat(res?.ooh) || 0) + 
        (parseFloat(res?.specialDay) || 0) + 
        (parseFloat(finalLiveTravel) || 0) + 
        (parseFloat(finalLiveTools) || 0)
      ).toFixed(2);

      setLiveBreakdown({ 
        ...res, 
        travel: finalLiveTravel,
        tools: finalLiveTools,
        grandTotal: finalGrandTotal,
        days: 1, 
        monthlyRecords: [{ month: taskStartDate.substring(0, 7), divisor: singleDayDivisor, rate: monthlyRate }],
        effectiveRate: res?.base || '0.00'
      });
      setTotalCost(finalGrandTotal);

      // Find rates for the main engineer if using Default or Custom
      let pRates = { 
        hr: engHourlyRate || 0,
        hd: engHalfDayRate || 0,
        fd: engFullDayRate || 0,
        mr: engMonthlyRate || 0,
        ar: engAgreedRate || 0,
        cf: engCancellationFee || 0,
        bt: engBillingType,
        ot: 0, ooh: 0, we: 0, hol: 0 
      };

      if (engPayType === 'Custom') {
        pRates.ot = engOvertimeRate || 0;
        pRates.ooh = engOohRate || 0;
        pRates.we = engWeekendRate || 0;
        pRates.hol = engHolidayRate || 0;
      } else {
         const mainE = engineers.find(e => Number(e.id) === Number(engineerId));
         if (mainE) {
           pRates = {
             hr: mainE.hourlyRate ?? mainE.hourly_rate ?? 0,
             hd: mainE.halfDayRate ?? mainE.half_day_rate ?? 0,
             fd: mainE.fullDayRate ?? mainE.full_day_rate ?? 0,
             mr: mainE.monthlyRate ?? mainE.monthly_rate ?? 0,
             ar: mainE.agreedRate ?? mainE.agreed_rate ?? 0,
             cf: mainE.cancellationFee ?? mainE.cancellation_fee ?? 0,
             bt: engBillingType || billingType,
             ot: mainE.overtimeRate ?? mainE.overtime_rate ?? 0,
             ooh: mainE.oohRate ?? mainE.ooh_rate ?? 0,
             we: mainE.weekendRate ?? mainE.weekend_rate ?? 0,
             hol: mainE.holidayRate ?? mainE.holiday_rate ?? 0
           };
         }
      }

      const payRes = calculateTicketTotal({
        startTime: estStartTime, endTime: estEndTime, breakTime,
        hourlyRate: pRates.hr,
        halfDayRate: pRates.hd,
        fullDayRate: pRates.fd,
        monthlyRate: pRates.mr,
        agreedRate: pRates.ar,
        cancellationFee: pRates.cf,
        overtimeRate: pRates.ot, oohRate: pRates.ooh, weekendRate: pRates.we, holidayRate: pRates.hol,
        travelCostPerDay: 0, toolCost: 0, billingType: pRates.bt, timezone, calcTimezone,
        country, 
        isEngineer: true
      });

      if (payRes) {
        const eng = engineers.find(e => Number(e.id) === Number(engineerId));
        const eName = eng ? eng.name : (engineerName || 'Lead Engineer');
        setPayoutLiveBreakdown({ 
          base: payRes.base,
          ot: payRes.ot,
          ooh: payRes.ooh,
          special: payRes.specialDay,
          travel: payRes.travel,
          tools: payRes.tools,
          grandTotal: payRes.grandTotal, 
          engSummary: [{ name: eName, total: parseFloat(payRes.grandTotal) }],
          effectiveRate: payRes.base
        });
      }
    }
  }, [
    startTime, endTime, breakTime, taskStartDate, taskEndDate, taskTime, taskEndTime,
    hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
    engHourlyRate, engHalfDayRate, engFullDayRate, engMonthlyRate, engAgreedRate, engCancellationFee,
    engOvertimeRate, engOohRate, engWeekendRate, engHolidayRate,
    travelCostPerDay, toolCostInput, billingType, engBillingType, engPayType, timezone, calcTimezone,
    timeLogs, isFillingForm, country, engineerId, engineers
  ]);

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
        taskEndTime &&
        scopeOfWork &&
        (engineerName || engineerId)
      ),
    [
      customerId,
      taskName,
      taskStartDate,
      taskEndDate,
      taskTime,
      taskEndTime,
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
    setTaskTime('09:00')
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
    setCancellationFee('')
    setEngPayType('Default')
    setEngBillingType('Hourly')
    setEngCurrency('USD')
    setEngHourlyRate('')
    setEngHalfDayRate('')
    setEngFullDayRate('')
    setEngMonthlyRate('')
    setEngAgreedRate('')
    setEngCancellationFee('')
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
      setTickets((data.tickets || []).map(t => ({
        ...t,
        hourlyRate: t.hourlyRate ?? t.hourly_rate ?? 0,
        halfDayRate: t.halfDayRate ?? t.half_day_rate ?? 0,
        fullDayRate: t.fullDayRate ?? t.full_day_rate ?? 0,
        monthlyRate: t.monthlyRate ?? t.monthly_rate ?? 0,
        agreedRate: t.agreedRate ?? t.agreed_rate ?? '',
        cancellationFee: t.cancellationFee ?? t.cancellation_fee ?? 0,
        travelCostPerDay: t.travelCostPerDay ?? t.travel_cost_per_day ?? 0,
        toolCost: t.toolCost ?? t.tool_cost ?? 0,
        totalCost: t.totalCost ?? t.total_cost ?? 0,
        engTotalCost: t.engTotalCost ?? t.eng_total_cost ?? 0,
        billingType: t.billingType ?? t.billing_type ?? 'Hourly',
        // Engineer Payout Rates
        engBillingType: t.engBillingType ?? t.eng_billing_type ?? 'Hourly',
        engPayType: t.engPayType ?? t.eng_pay_type ?? 'Default',
        engHourlyRate: t.engHourlyRate ?? t.eng_hourly_rate ?? 0,
        engHalfDayRate: t.engHalfDayRate ?? t.eng_half_day_rate ?? 0,
        engFullDayRate: t.engFullDayRate ?? t.eng_full_day_rate ?? 0,
        engMonthlyRate: t.engMonthlyRate ?? t.eng_monthly_rate ?? 0,
        engAgreedRate: t.engAgreedRate ?? t.eng_agreed_rate ?? 0,
        engCancellationFee: t.engCancellationFee ?? t.eng_cancellation_fee ?? 0,
        engOvertimeRate: t.engOvertimeRate ?? t.eng_overtime_rate ?? 0,
        engOohRate: t.engOohRate ?? t.eng_ooh_rate ?? 0,
        engWeekendRate: t.engWeekendRate ?? t.eng_weekend_rate ?? 0,
        engHolidayRate: t.engHolidayRate ?? t.eng_holiday_rate ?? 0
      })).sort((a, b) => b.id - a.id))

      // COLLAPSE ALL MONTHS BY DEFAULT on load
      if (data.tickets && data.tickets.length > 0) {
        const initialCollapsed = new Set();
        data.tickets.forEach(t => {
          const d = t.task_start_date || t.taskStartDate;
          const key = d ? String(d).substring(0, 7) : 'Unknown';
          initialCollapsed.add(key);
        });
        setCollapsedMonths(prev => {
          const next = new Set(prev);
          initialCollapsed.forEach(k => next.add(k));
          return next;
        });
      }

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

  // Initialize/Sync Time Logs during CREATE mode for Dispatch or Monthly tickets
  useEffect(() => {
    if (!editingTicketId && (leadType === 'Dispatch' || billingType.includes('Monthly') || (taskStartDate && taskEndDate && taskStartDate !== taskEndDate))) {
      const dates = getDatesInRange(taskStartDate, taskEndDate);
      const ct = (taskTime || '09:00').slice(0, 5);
      const cet = (taskEndTime || '17:00').slice(0, 5);

      const validDates = dates.filter(dStr => {
        const dObj = parseWallClockDate(dStr);
        const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
        const HOLIDAYS_BY_COUNTRY = {
          'India': ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'],
          'Poland': ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25', '2026-12-26'],
          'Other': []
        };
        const activeHols = HOLIDAYS_BY_COUNTRY[country] || HOLIDAYS_BY_COUNTRY['India'] || [];
        const isHoliday = activeHols.includes(dStr);
        return !(isWeekend || isHoliday);
      });

      const newLogs = validDates.map(dStr => {
        const existing = timeLogs.find(l => (l.task_date || '').split('T')[0] === dStr);
        
        const sTime = `${dStr}T${ct}:00.000Z`;
        const eTime = `${dStr}T${cet}:00.000Z`;

        if (existing) {
          return {
            ...existing,
            start_time: sTime,
            end_time: eTime
          };
        }

        return {
          task_date: dStr,
          start_time: sTime,
          end_time: eTime,
          break_time_mins: 0,
          engineer_id: engineerId || null
        };
      });

      // Avoid infinite loop: only update if the serialized logs have actually changed
      const currentStr = JSON.stringify(timeLogs.map(l => ({ d: l.task_date, s: l.start_time, e: l.end_time, eng: l.engineer_id })));
      const nextStr = JSON.stringify(newLogs.map(l => ({ d: l.task_date, s: l.start_time, e: l.end_time, eng: l.engineer_id })));

      if (currentStr !== nextStr) {
        setTimeLogs(newLogs);
      }
    }
  }, [taskStartDate, taskEndDate, taskTime, taskEndTime, editingTicketId, leadType, engineerId, country, billingType]);

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
    let apartment = ''

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
      if (types.includes('subpremise')) apartment = component.long_name
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

    // Set apartment if available
    if (apartment) {
      setApartment(apartment.trim())
    }

    // Set city with fallback logic
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
        setCountry(matchedCountry.name)
        if (matchedCountry.timezones && matchedCountry.timezones.length > 0) {
          setAvailableTimezones(matchedCountry.timezones)
          setTimezone(matchedCountry.timezones[0])
        }
      } else {
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
          setAvailableTimezones(prev => {
            const newList = Array.from(new Set([data.timezone, ...prev]))
            return newList
          })
        }
      } catch (e) {
        console.error('Timezone detection failed', e)
      }
    }
  }, [countriesList])

  useEffect(() => {
    loadTickets()
    fetchCountries()
    loadDropdowns() // Ensure engineers are loaded for inline editing
  }, [])

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase().trim()
      result = result.filter(t =>
        String(t.id).includes(lower) ||
        (t.clientName || '').toLowerCase().includes(lower) ||
        (t.engineerName || '').toLowerCase().includes(lower) ||
        (t.taskName || '').toLowerCase().includes(lower)
      )
    }
    if (statusFilter === 'Active Only') {
      result = result.filter(t => t.status !== 'Resolved')
    } else if (statusFilter !== 'All Status') {
      result = result.filter(t => t.status === statusFilter)
    }
    return result;
  }, [tickets, searchTerm, statusFilter])

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
    
    // Detailed validation to inform user exactly what is missing
    const missingFields = [];
    if (!customerId) missingFields.push("Customer");
    if (!taskName) missingFields.push("Task Name");
    if (!taskStartDate) missingFields.push("Start Date");
    if (!taskEndDate) missingFields.push("End Date");
    if (!taskTime) missingFields.push("Task Start Time");
    if (!taskEndTime) missingFields.push("Task End Time");
    if (!scopeOfWork) missingFields.push("Scope of Work");
    if (!engineerName && !engineerId) missingFields.push("Engineer Selection");

    if (missingFields.length > 0) {
      setError(`Please fill these required fields: ${missingFields.join(', ')}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true)
      setSuccess('')

      // BACKFILL: If activity times are empty, sync them with scheduled details before sending
      let finalStartTime = startTime;
      let finalEndTime = endTime;

      if (!finalStartTime && taskStartDate && taskTime) {
        const dObj = parseWallClockDate(taskStartDate);
        const y = dObj.getUTCFullYear();
        const m = String(dObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dObj.getUTCDate()).padStart(2, '0');
        finalStartTime = `${y}-${m}-${d}T${taskTime.padStart(5, '0')}`;
      }
      if (!finalEndTime) {
        if (taskEndDate && taskEndTime) {
          const dObj = parseWallClockDate(taskEndDate);
          const y = dObj.getUTCFullYear();
          const m = String(dObj.getUTCMonth() + 1).padStart(2, '0');
          const d = String(dObj.getUTCDate()).padStart(2, '0');
          finalEndTime = `${y}-${m}-${d}T${taskEndTime.padStart(5, '0')}`;
        } else if (taskEndDate && taskTime) {
          // Default to finish same day + 8 hours if no explicit end time
          const d = parseWallClockDate(`${taskEndDate}T${taskTime.padStart(5, '0')}`);
          if (!isNaN(d.getTime())) {
            d.setUTCHours(d.getUTCHours() + 8);
            const pad = (n) => String(n).padStart(2, '0');
            finalEndTime = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
          }
        }
      }

      // SYNC: If activity times are provided, synchronize the scheduled task details to match
      let finalTaskStartDate = taskStartDate;
      let finalTaskEndDate = taskEndDate;
      let finalTaskTimeValue = taskTime;

      if (finalStartTime && finalStartTime.includes('T')) {
        finalTaskStartDate = finalStartTime.split('T')[0];
        finalTaskTimeValue = finalStartTime.split('T')[1].slice(0, 5);
      }
      if (finalEndTime && finalEndTime.includes('T')) {
        finalTaskEndDate = finalEndTime.split('T')[0];
      }

      const payload = {
        customerId: Number(customerId),
        leadId: leadId ? Number(leadId) : null,
        clientName,
        taskName,
        taskTime: finalTaskTimeValue,
        taskEndTime: taskEndTime,
        scopeOfWork,
        tools,
        engineerName: engineerName || 'Unassigned',
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
        agreedRate: agreedRate !== '' && agreedRate !== null ? Number(agreedRate) : 0,
        travelCostPerDay: travelCostPerDay !== '' ? Number(travelCostPerDay) : null,
        toolCost: toolCostInput !== '' ? Number(toolCostInput) : 0, // Dedicated tool cost — server auto-calculates grand total
        billingType,
        leadType,
        cancellationFee: cancellationFee !== '' && cancellationFee !== null ? Number(cancellationFee) : 0,
        status: status,
        taskStartDate: (() => {
          const d = parseWallClockDate(finalTaskStartDate);
          if (isNaN(d.getTime())) return null;
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        })(),
        taskEndDate: (() => {
          const d = parseWallClockDate(finalTaskEndDate);
          if (isNaN(d.getTime())) return null;
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        })(),
        startTime: (() => {
          const d = parseWallClockDate(finalStartTime);
          if (isNaN(d.getTime())) return finalStartTime;
          const timePart = finalStartTime.includes('T') ? finalStartTime.split('T')[1] : (finalStartTime.includes(' ') ? finalStartTime.split(' ')[1] : '00:00:00');
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${timePart.replace('Z', '')}`;
        })(),
        endTime: (() => {
          const d = parseWallClockDate(finalEndTime);
          if (isNaN(d.getTime())) return finalEndTime;
          const timePart = finalEndTime.includes('T') ? finalEndTime.split('T')[1] : (finalEndTime.includes(' ') ? finalEndTime.split(' ')[1] : '00:00:00');
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${timePart.replace('Z', '')}`;
        })(),
        breakTime: Number(breakTime) || 0,
        latitude,
        longitude,
        // Engineer Payout Fields
        engPayType,
        engBillingType,
        engCurrency,
        engHourlyRate: engHourlyRate !== '' ? Number(engHourlyRate) : null,
        engHalfDayRate: engHalfDayRate !== '' ? Number(engHalfDayRate) : null,
        engFullDayRate: engFullDayRate !== '' ? Number(engFullDayRate) : null,
        engMonthlyRate: engMonthlyRate !== '' ? Number(engMonthlyRate) : null,
        engAgreedRate: engAgreedRate !== '' ? Number(engAgreedRate) : null,
        engCancellationFee: engCancellationFee !== '' ? Number(engCancellationFee) : null,
        totalCost: Number(liveBreakdown?.grandTotal) || 0,
        engTotalCost: Number(payoutLiveBreakdown?.grandTotal) || 0,
        timeLogs: (leadType === 'Dispatch' || (taskStartDate && taskEndDate && (taskStartDate !== taskEndDate || billingType.includes('Monthly')))) ? timeLogs : []
      }

      const isEditing = Boolean(editingTicketId)
      const url = isEditing ? `${API_BASE_URL}/tickets/${editingTicketId}` : `${API_BASE_URL}/tickets`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          status: status, // Force the current local status state
          reason: closureReason,
          resolveDate: resolveDate
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const errMsg = data.details ? `${data.message}: ${data.details}` : (data.message || 'Error occurred');
        alert('Creation Error: ' + errMsg);
        throw new Error(errMsg);
      }

      if (data.earlyResolve) {
        setSuccess('Early closure requested. This ticket is now in "Approval Pending" status.');
      } else {
        setSuccess(isEditing ? 'Ticket updated successfully.' : 'Ticket created successfully.');
      }

      // UPLOAD DOCUMENTS
      const finalTicketId = isEditing ? editingTicketId : data.ticket?.id || data.ticketId;
      if (finalTicketId && documents.length > 0) {
        for (const file of documents) {
          const formData = new FormData();
          formData.append('file', file);
          try {
            await fetch(`${API_BASE_URL}/tickets/${finalTicketId}/attachments`, {
              method: 'POST',
              credentials: 'include',
              body: formData
            });
          } catch (err) {
            console.error('Failed to upload attachment:', file.name, err);
          }
        }
        setDocuments([]);
        setDocumentsLabel('');
      }
      if (payload.leadId) {
        try {
          const leadSyncRes = await fetch(`${API_BASE_URL}/leads/${payload.leadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              customerId: payload.customerId,
              taskName: payload.taskName,
              leadType: payload.leadType,
              clientTicketNumber: payload.clientTicketNumber || '',
              taskStartDate: payload.taskStartDate,
              taskEndDate: payload.taskEndDate,
              taskTime: payload.taskTime,
              scopeOfWork: payload.scopeOfWork,
              apartment: payload.apartment || '',
              addressLine1: payload.addressLine1,
              addressLine2: payload.addressLine2 || '',
              city: payload.city,
              country: payload.country,
              zipCode: payload.zipCode,
              timezone: payload.timezone,
              currency: payload.currency,
              hourlyRate: payload.hourlyRate,
              halfDayRate: payload.halfDayRate,
              fullDayRate: payload.fullDayRate,
              monthlyRate: payload.monthlyRate,
              toolsRequired: payload.tools || '',
              agreedRate: payload.agreedRate || 0,
              travelCostPerDay: payload.travelCostPerDay,
              toolCost: payload.toolCost || 0,
              totalCost: payload.totalCost || 0,
              status: payload.status,
              isRecurring: 'No',
              recurringStartDate: null,
              recurringEndDate: null,
              totalWeeks: null,
              recurringDays: '',
              billingType: payload.billingType,
              latitude: payload.latitude,
              longitude: payload.longitude,
              followUpDate: null,
              statusChangeReason: null,
              followUpHistory: null
            })
          });

          if (!leadSyncRes.ok) {
            const lErr = await leadSyncRes.json();
            throw new Error(lErr.message || "Lead sync failed");
          }
          console.log("Lead fully synchronized successfully.");
        } catch (leadSyncErr) {
          console.error("Failed to sync dates to lead:", leadSyncErr.message);
        }
      }

      // OPTIMISTIC UPDATE: Update the local state immediately so list view is fresh
      const normalizedTicket = {
        ...data.ticket,
        hourlyRate: data.ticket.hourlyRate ?? data.ticket.hourly_rate ?? '',
        halfDayRate: data.ticket.halfDayRate ?? data.ticket.half_day_rate ?? '',
        fullDayRate: data.ticket.fullDayRate ?? data.ticket.full_day_rate ?? '',
        monthlyRate: data.ticket.monthlyRate ?? data.ticket.monthly_rate ?? '',
        agreedRate: data.ticket.agreedRate ?? data.ticket.agreed_rate ?? '',
        cancellationFee: data.ticket.cancellationFee ?? data.ticket.cancellation_fee ?? '',
        travelCostPerDay: data.ticket.travelCostPerDay ?? data.ticket.travel_cost_per_day ?? '',
        toolCost: data.ticket.toolCost ?? data.ticket.tool_cost ?? 0,
        totalCost: data.ticket.totalCost ?? data.ticket.total_cost ?? 0,
        engTotalCost: data.ticket.engTotalCost ?? data.ticket.eng_total_cost ?? 0,
        billingType: data.ticket.billingType ?? data.ticket.billing_type ?? 'Hourly',
        engBillingType: data.ticket.engBillingType ?? data.ticket.eng_billing_type ?? 'Hourly',
        engPayType: data.ticket.engPayType ?? data.ticket.eng_pay_type ?? 'Default'
      }

      setTickets(prev => {
        if (isEditing) {
          return prev.map(t => t.id === normalizedTicket.id ? normalizedTicket : t);
        } else {
          return [normalizedTicket, ...prev];
        }
      });

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
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        let t = data.ticket || data;

        // NORMALIZE
        t = {
          ...t,
          hourlyRate: t.hourlyRate ?? t.hourly_rate ?? 0,
          halfDayRate: t.halfDayRate ?? t.half_day_rate ?? 0,
          fullDayRate: t.fullDayRate ?? t.full_day_rate ?? 0,
          monthlyRate: t.monthlyRate ?? t.monthly_rate ?? 0,
          agreedRate: t.agreedRate ?? t.agreed_rate ?? '',
          cancellationFee: t.cancellationFee ?? t.cancellation_fee ?? 0,
          travelCostPerDay: t.travelCostPerDay ?? t.travel_cost_per_day ?? 0,
          toolCost: t.toolCost ?? t.tool_cost ?? 0,
          totalCost: t.totalCost ?? t.total_cost ?? 0,
          engTotalCost: t.engTotalCost ?? t.eng_total_cost ?? 0,
          billingType: t.billingType ?? t.billing_type ?? 'Hourly',
          engBillingType: t.engBillingType ?? t.eng_billing_type ?? 'Hourly',
          eng_pay_type: t.engPayType ?? t.eng_pay_type ?? 'Default'
        };

        setSelectedTicket(t);
        setTimeLogs(t.time_logs || []);
        setIsTicketModalOpen(true);
        setIsInlineEditing(false);
        if (engineers.length === 0) loadDropdowns();
        fetchTicketExtras(ticketId);

        // Pre-collapse all month accordions in View modal so they start closed
        try {
          const stStart = t.taskStartDate ? String(t.taskStartDate).split('T')[0] : '';
          const stEnd = t.taskEndDate ? String(t.taskEndDate).split('T')[0] : '';
          if (stStart && stEnd && stStart !== stEnd) {
            const viewKeys = new Set();
            let cur = parseWallClockDate(stStart);
            const end = parseWallClockDate(stEnd);
            while (cur <= end) {
              const mKey = cur.toISOString().substring(0, 7) + '-view';
              viewKeys.add(mKey);
              cur.setUTCMonth(cur.getUTCMonth() + 1);
              cur.setUTCDate(1);
            }
            setCollapsedMonths(prev => {
              const next = new Set(prev);
              viewKeys.forEach(k => next.add(k));
              return next;
            });
          }
        } catch (e) { /* ignore date parsing errors */ }

        // SYNC MAIN STATES to trigger live calculations even in View mode
        fillFormFromTicket(t, false); // false = don't switch viewMode to form

        const start = t.startTime || t.start_time;
        const end = t.endTime || t.end_time;
        setInlineStartTime(start ? formatForInput(start) : (t.taskStartDate ? formatForInput(t.taskStartDate) : ''));
        setInlineEndTime(end ? formatForInput(end) : (t.taskEndDate ? formatForInput(t.taskEndDate) : ''));
        const bt = t.breakTime !== undefined ? t.breakTime : t.break_time;
        setInlineBreakTime(bt ? String(Math.floor(Number(bt) / 60)) : '0');
        setNewExtendEndDate(t.taskEndDate ? String(t.taskEndDate).split('T')[0] : '');
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
    }
  }

  const handleUpdateInlineTime = async () => {
    try {
      setIsUpdatingTime(true);
      const tId = selectedTicket?.id || editingTicketId;
      if (!tId) return;

      // Determine payout rates for recalculation
      let pRates = { ot: 0, ooh: 0, we: 0, hol: 0 };
      if (selectedTicket.engPayType === 'Default' || selectedTicket.eng_pay_type === 'Default') {
         const eng = engineers.find(e => Number(e.id) === Number(selectedTicket.engineerId));
         if (eng) {
           pRates.ot = eng.overtime_rate || 0;
           pRates.ooh = eng.ooh_rate || 0;
           pRates.we = eng.weekend_rate || 0;
           pRates.hol = eng.holiday_rate || 0;
         }
      }

      // Calculate new billing status if needed
      const calc = calculateTicketTotal({
        startTime: inlineStartTime,
        endTime: inlineEndTime,
        breakTime: inlineBreakTime,
        hourlyRate: selectedTicket.hourlyRate,
        halfDayRate: selectedTicket.halfDayRate,
        fullDayRate: selectedTicket.fullDayRate,
        monthlyRate: selectedTicket.monthlyRate,
        agreedRate: selectedTicket.agreedRate,
        cancellationFee: selectedTicket.cancellationFee,
        overtimeRate: pRates.ot, oohRate: pRates.ooh, weekendRate: pRates.we, holidayRate: pRates.hol,
        travelCostPerDay: selectedTicket.travelCostPerDay,
        toolCost: selectedTicket.toolCost,
        billingType: selectedTicket.billingType,
        timezone: selectedTicket.timezone,
        calcTimezone: 'Ticket Local',
        country: selectedTicket.country
      });

      const hrsVal = parseFloat(calc?.hrs || 0);
      let newStatus = selectedTicket.status;
      if (hrsVal > 8 && newStatus !== 'On Hold') {
        newStatus = 'On Hold';
        alert('Shift exceeded 8 hours. Ticket has been automatically placed ON HOLD.');
      }

      const payload = {
        startTime: inlineStartTime,
        endTime: inlineEndTime,
        breakTime: Number(inlineBreakTime) || 0,
        status: newStatus,
        taskTime: inlineStartTime && inlineStartTime.includes('T') ? inlineStartTime.split('T')[1].slice(0, 5) : selectedTicket.taskTime,
        taskStartDate: inlineStartTime ? inlineStartTime.split('T')[0] : selectedTicket.taskStartDate?.split('T')[0],
        taskEndDate: inlineEndTime ? inlineEndTime.split('T')[0] : selectedTicket.taskEndDate?.split('T')[0]
      };

      const res = await fetch(`${API_BASE_URL}/tickets/${tId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update time');

      // Refresh everything to ensure UI is perfectly in sync
      await openTicketModal(tId);
      await loadTickets();
      setIsInlineEditing(false);
    } catch (err) {
      console.error(err);
      alert('Error updating time log: ' + err.message);
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const handleUpdateStatus = async (tId, newStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      const ticket = tickets.find(t => t.id === tId);
      if (!ticket) throw new Error('Ticket data not found localy.');

      const res = await fetch(`${API_BASE_URL}/tickets/${tId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...ticket,
          status: newStatus 
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update status');
      }

      setSuccess(`Success! Ticket #${tId} status is now ${newStatus}.`);
      await loadTickets();
      if (selectedTicket && selectedTicket.id === tId) {
        await openTicketModal(tId);
      }
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeResolution = async () => {
    if (!resolvingTicket) return;
    try {
      setLoading(true);
      setError(null);
      
      // 1. Update Status to Resolved with full financial sync
      const res = await fetch(`${API_BASE_URL}/tickets/${resolvingTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...resolvingTicket,
          status: 'Resolved',
          billingStatus: resolvingTicket.billingStatus || 'Unbilled'
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to resolve ticket');
      }

      // 2. Add Closing Note if provided
      if (closingNote.trim()) {
        try {
          await fetch(`${API_BASE_URL}/tickets/${resolvingTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `FINAL CLOSING NOTE: ${closingNote}`, authorType: 'admin' }),
            credentials: 'include'
          });
        } catch (noteErr) {
          console.warn('Closing note failed to save:', noteErr);
        }
      }

      // 3. Cleanup and Refresh
      setResolvingTicket(null);
      setClosingNote('');
      setSuccess(`Success! Ticket #${resolvingTicket.id} is now Resolved.`);
      
      // Force immediate refresh
      await loadTickets();
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      setError(err.message);
      console.error('Resolution Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketExtras = async (ticketId) => {
    if (!ticketId) return;
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
    const ticketId = selectedTicket?.id || editingTicketId;
    if (!ticketId) return;

    // ── NORMALISE PATCH ─────────────────────────────────────────────────────
    const patch = { ...data };
    if ('engineerId'    in data) patch.engineer_id      = Number(data.engineerId);
    if ('startTime'     in data) patch.start_time       = data.startTime;
    if ('endTime'       in data) patch.end_time         = data.endTime;
    if ('breakTimeMins' in data) patch.break_time_mins  = Number(data.breakTimeMins);
    if ('taskDate'      in data) patch.task_date        = data.taskDate;

    // Helper to apply the patch to a logs array
    const applyPatch = prev => (prev || []).map(l => Number(l.id) === Number(logId) ? { ...l, ...patch } : l);

    // ── CREATE MODE (isFillingForm) ──────────────────────────────────────────
    if (isFillingForm && !editingTicketId) {
      setTimeLogs(prev => {
        const next = [...prev];
        const dMatch = patch.task_date || (data.startTime ? data.startTime.split('T')[0] : '');
        if (!dMatch) return prev;
        const idx = next.findIndex(l => (l.task_date || '').split('T')[0] === dMatch.split('T')[0]);
        if (idx > -1) next[idx] = { ...next[idx], ...patch };
        else next.push({ ...patch });
        return next;
      });
      return;
    }

    // ── EDIT MODE — persist to server ────────────────────────────────────────
    if (!logId) return;

    // ── OPTIMISTIC UI UPDATE ────────────────────────────────────────────────
    // 1. Update Modal Logs
    setTimeLogs(applyPatch);
    
    // 2. Update selectedTicket logs if it's the one open
    if (selectedTicket && Number(selectedTicket.id) === Number(ticketId)) {
      setSelectedTicket(prev => ({ ...prev, time_logs: applyPatch(prev.time_logs || []) }));
    }

    // 3. Update main tickets array (LIST VIEW) and RE-CALCULATE TOTAL
    setTickets(prev => prev.map(t => {
      if (Number(t.id) === Number(ticketId)) {
        const nextLogs = applyPatch(t.time_logs || []);
        
        // Optimistic Total Recalculation
        let newTotal = 0;
        nextLogs.forEach(log => {
           const dStr = log.task_date ? String(log.task_date).split('T')[0] : '';
           const sTime = log.start_time || `${dStr}T09:00:00Z`;
           const eTime = log.end_time || `${dStr}T17:00:00Z`;
           
           let rRates = { hr: t.hourlyRate, hd: t.halfDayRate, fd: t.fullDayRate, mr: t.monthlyRate, ar: t.agreedRate, cf: t.cancellationFee, bt: t.billingType };
           const currentLogEngId = log.engineer_id || t.engineer_id;
           if (String(currentLogEngId) === '0') rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
           else if (currentLogEngId && String(currentLogEngId) !== String(t.engineer_id)) {
              const subE = engineers.find(en => String(en.id) === String(currentLogEngId));
              if (subE) {
                rRates = {
                  hr: subE.hourlyRate ?? subE.hourly_rate ?? 0,
                  hd: subE.halfDayRate ?? subE.half_day_rate ?? 0,
                  fd: subE.fullDayRate ?? subE.full_day_rate ?? 0,
                  mr: subE.monthlyRate ?? subE.monthly_rate ?? 0,
                  ar: subE.agreedRate ?? subE.agreed_rate ?? 0,
                  cf: subE.cancellationFee ?? subE.cancellation_fee ?? 0,
                  bt: subE.billingType ?? subE.billing_type ?? t.billingType
                };
              }
           }

           const res = calculateTicketTotal({
              startTime: sTime, endTime: eTime, breakTime: log.break_time_mins || 0,
              hourlyRate: rRates.hr, halfDayRate: rRates.hd, fullDayRate: rRates.fd, 
              monthlyRate: rRates.mr, agreedRate: rRates.ar, cancellationFee: rRates.cf,
              travelCostPerDay: t.travelCostPerDay, toolCost: t.toolCost, billingType: rRates.bt, 
              timezone: t.timezone, country: t.country, monthlyDivisor: getWorkingDaysInMonth(dStr, t.country),
              _isLogAggregation: true
           });
           newTotal += parseFloat(res?.grandTotal || 0);
        });

        if (t.billingType === 'Agreed Rate') newTotal += parseFloat(t.agreedRate || 0);
        else if (t.billingType === 'Cancellation') newTotal += parseFloat(t.cancellationFee || 0);

        return { 
          ...t, 
          time_logs: nextLogs,
          totalCost: newTotal.toFixed(2),
          total_cost: newTotal.toFixed(2)
        };
      }
      return t;
    }));

    setIsUpdatingLog(logId);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/time-logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data) // Original camelCase for server
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || 'Server update failed');

      // Final server sync for costs
      if (resData.total_cost !== undefined) {
        setTickets(prev => prev.map(t => {
           if (Number(t.id) === Number(ticketId)) {
              return { 
                ...t, 
                totalCost: resData.total_cost,
                total_cost: resData.total_cost,
                engTotalCost: resData.eng_total_cost ?? t.engTotalCost,
                eng_total_cost: resData.eng_total_cost ?? t.eng_total_cost
              };
           }
           return t;
        }));
      }

      // Background logs refresh
      const refreshRes = await fetch(`${API_BASE_URL}/tickets/${ticketId}/time-logs`, { credentials: 'include' });
      if (refreshRes.ok) {
        const raw = await refreshRes.json();
        const freshLogs = Array.isArray(raw) ? raw : (raw.timeLogs || raw.logs || []);
        const normalized = freshLogs.map(l => ({
          ...l,
          engineer_id:     l.engineer_id     != null ? Number(l.engineer_id)     : (l.engineerId != null ? Number(l.engineerId) : null),
          start_time:      l.start_time      ?? l.startTime      ?? null,
          end_time:        l.end_time        ?? l.endTime        ?? null,
          break_time_mins: l.break_time_mins ?? l.breakTimeMins  ?? l.breakTime  ?? 0,
          task_date:       l.task_date       ?? l.taskDate       ?? null,
        }));
        setTimeLogs(normalized);
        if (selectedTicket && Number(selectedTicket.id) === Number(ticketId)) setSelectedTicket(prev => ({ ...prev, time_logs: normalized }));
        setTickets(prev => prev.map(t => Number(t.id) === Number(ticketId) ? { ...t, time_logs: normalized } : t));
      }

      // Auto-hold logic if shift > 8h
      if (data.startTime && data.endTime) {
        const h = (new Date(data.endTime) - new Date(data.startTime)) / 3600000 - ((data.breakTimeMins || 0) / 60);
        if (h > 8) fetch(`${API_BASE_URL}/tickets/${ticketId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'On Hold' }) });
      }

      loadTickets();
    } catch (e) {
      console.error('Log update error:', e);
    } finally {
      setIsUpdatingLog(null);
    }
  };

      loadTickets(); // background list refresh (non-blocking)
    } catch (e) {
      console.error('Log sync error:', e);
    } finally {
      setIsUpdatingLog(null);
    }
  }

  const handleResolveEarly = async (date) => {
    const tId = selectedTicket?.id || editingTicketId;
    if (!tId) return;
    if (!window.confirm(`Are you sure you want to resolve this ticket early on ${date}? Future logs will be deleted.`)) return;
    setIsResolvingEarly(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${tId}/resolve-early`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resolveDate: date, reason: "Manual early closure request via logs" })
      });
      if (!res.ok) throw new Error('Action failed');
      const data = await res.json();
      alert(data.message || 'Request submitted');
      handleCloseTicketModal();
      loadTickets();
    } catch (e) { alert(e.message); }
    setIsResolvingEarly(false);
  }

  const handleExtendJob = async () => {
    const tId = selectedTicket?.id || editingTicketId;
    if (!newExtendEndDate || !tId) return;
    setIsExtending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${tId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEndDate: newExtendEndDate })
      });
      if (!res.ok) throw new Error('Extension failed');
      fetchTicketExtras(tId);
      loadTickets();
    } catch (e) { alert(e.message); }
    setIsExtending(false);
  }

  const handleAddAdminNote = async () => {
    const tId = selectedTicket?.id || editingTicketId;
    if (!newAdminNote.trim() || !tId) return;
    setAddingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${tId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newAdminNote, authorType: 'admin' }),
      });

      if (res.ok) {
        setNewAdminNote('');
        fetchTicketExtras(tId);
      }
    } catch (e) {
      console.error('Error adding note', e);
    }
    setAddingNote(false);
  }

  const fillFormFromTicket = (ticket, switchMode = true) => {
    if (!ticket) return;

    const t = ticket;
    // Pre-collapse month groups for the Edit modal as well
    try {
      const s = t.task_start_date || t.taskStartDate;
      const e = t.task_end_date || t.taskEndDate;
      if (s && e) {
        const sStr = String(s).split('T')[0];
        const eStr = String(e).split('T')[0];
        if (sStr !== eStr) {
          const modalKeys = new Set();
          let cur = parseWallClockDate(sStr);
          const end = new Date(eStr + 'T00:00:00Z');
          while (cur <= end) {
            const mKey = cur.toISOString().substring(0, 7) + '-modal';
            modalKeys.add(mKey);
            cur.setUTCMonth(cur.getUTCMonth() + 1);
            cur.setUTCDate(1);
          }
          setCollapsedMonths(prev => {
            const next = new Set(prev);
            modalKeys.forEach(k => next.add(k));
            return next;
          });
        }
      }
    } catch (err) { /* ignore */ }

    const normalized = {
      customerId: t.customer_id || t.customerId || '',
      leadId: t.lead_id || t.leadId || '',
      clientName: t.client_name || t.clientName || '',
      taskName: t.task_name || t.taskName || '',
      taskStartDate: t.task_start_date ? t.task_start_date.split('T')[0] : (t.taskStartDate ? t.taskStartDate.split('T')[0] : ''),
      taskEndDate: t.task_end_date ? t.task_end_date.split('T')[0] : (t.taskEndDate ? t.taskEndDate.split('T')[0] : ''),
      taskTime: t.task_time || t.taskTime || '00:00',
      scopeOfWork: t.scope_of_work || t.scopeOfWork || '',
      tools: t.tools || '',
      engineerName: t.engineer_name || t.engineerName || '',
      engineerId: t.engineer_id || t.engineerId || '',
      apartment: t.apartment || '',
      addressLine1: t.address_line1 || t.addressLine1 || '',
      addressLine2: t.address_line2 || t.addressLine2 || '',
      city: t.city || '',
      country: t.country || '',
      zipCode: t.zip_code || t.zipCode || '',
      timezone: t.timezone || '',
      pocDetails: t.poc_details || t.pocDetails || '',
      reDetails: t.re_details || t.reDetails || '',
      callInvites: t.call_invites || t.callInvites || '',
      documentsLabel: t.documents_label || t.documentsLabel || '',
      signoffLabel: t.signoff_label || t.signoffLabel || '',
      currency: t.currency || 'USD',
      hourlyRate: t.hourlyRate ?? t.hourly_rate ?? '',
      halfDayRate: t.halfDayRate ?? t.half_day_rate ?? '',
      fullDayRate: t.fullDayRate ?? t.full_day_rate ?? '',
      monthlyRate: t.monthlyRate ?? t.monthly_rate ?? '',
      agreedRate: t.agreedRate ?? t.agreed_rate ?? '',
      cancellationFee: t.cancellationFee ?? t.cancellation_fee ?? '',
      travelCostPerDay: t.travelCostPerDay ?? t.travel_cost_per_day ?? '',
      toolCost: t.toolCost ?? t.tool_cost ?? '',
      status: t.status || 'Assigned',
      billingType: t.billingType ?? t.billing_type ?? 'Hourly',
      startTime: t.startTime || t.start_time || '',
      endTime: t.endTime || t.end_time || '',
      breakTime: t.breakTime !== undefined ? t.breakTime : (t.break_time || 0),
      leadType: t.leadType || t.lead_type || 'Full time',
      engPayType: t.engPayType ?? t.eng_pay_type ?? 'Default',
      engBillingType: t.engBillingType ?? t.eng_billing_type ?? 'Hourly',
      engCurrency: t.engCurrency ?? t.eng_currency ?? 'USD',
      engHourlyRate: t.engHourlyRate ?? t.eng_hourly_rate ?? '',
      engHalfDayRate: t.engHalfDayRate ?? t.eng_half_day_rate ?? '',
      engFullDayRate: t.engFullDayRate ?? t.eng_full_day_rate ?? '',
      engMonthlyRate: t.engMonthlyRate ?? t.eng_monthly_rate ?? '',
      engAgreedRate: t.engAgreedRate ?? t.eng_agreed_rate ?? '',
      eng_cancellation_fee: t.engCancellationFee ?? t.eng_cancellation_fee ?? ''
    }
    const isDefaultNoRates = normalized.engPayType === 'Default' && (!normalized.engHourlyRate || normalized.engHourlyRate === '0.00' || normalized.engHourlyRate === 0);
    
    setIsFillingForm(true);
    setLiveBreakdown(null);
    setPayoutLiveBreakdown(null);
    
    // If it's Default and has no rates, we might want to sync immediately if engineers are loaded
    if (isDefaultNoRates && engineers.length > 0) {
      const eng = engineers.find(e => String(e.id) === String(normalized.engineerId));
      if (eng) {
        normalized.engBillingType = eng.billingType ?? eng.billing_type ?? normalized.engBillingType;
        normalized.engHourlyRate = eng.hourlyRate ?? eng.hourly_rate ?? normalized.engHourlyRate;
        normalized.engHalfDayRate = eng.halfDayRate ?? eng.half_day_rate ?? normalized.engHalfDayRate;
        normalized.engFullDayRate = eng.fullDayRate ?? eng.full_day_rate ?? normalized.engFullDayRate;
        normalized.engMonthlyRate = eng.monthlyRate ?? eng.monthly_rate ?? normalized.engMonthlyRate;
        normalized.engAgreedRate = eng.agreedRate ?? eng.agreed_rate ?? normalized.engAgreedRate;
        normalized.eng_cancellation_fee = eng.cancellationFee ?? eng.cancellation_fee ?? normalized.eng_cancellation_fee;
        normalized.engCurrency = eng.currency ?? normalized.engCurrency;
      }
    }
    setCustomerId(normalized.customerId ? String(normalized.customerId) : '')
    setLeadId(normalized.leadId ? String(normalized.leadId) : '')
    setClientName(normalized.clientName || '')
    setTaskName(normalized.taskName || '')
    setTaskStartDate(normalized.taskStartDate)
    setTaskEndDate(normalized.taskEndDate)
    setTaskTime(normalized.taskTime || '09:00')
    setTaskEndTime(t.task_end_time || (t.endTime && t.endTime.includes('T') ? t.endTime.split('T')[1].slice(0, 5) : '17:00'))
    setScopeOfWork(normalized.scopeOfWork || '')
    setTools(normalized.tools || '')
    setEngineerName(normalized.engineerName || '')
    setEngineerId(normalized.engineerId ? String(normalized.engineerId) : '')
    setApartment(normalized.apartment || '')
    setAddressLine1(normalized.addressLine1 || '')
    setAddressLine2(normalized.addressLine2 || '')
    setCity(normalized.city || '')
    setCountry(normalized.country || '')
    setZipCode(normalized.zipCode || '')
    setTimezone(normalized.timezone || '')
    setPocDetails(normalized.pocDetails || '')
    setReDetails(normalized.reDetails || '')
    setCallInvites(normalized.callInvites || '')
    setDocumentsLabel(normalized.documentsLabel || '')
    setSignoffLabel(normalized.signoffLabel || '')
    setCurrency(normalized.currency || 'USD')
    setHourlyRate(normalized.hourlyRate)
    setHalfDayRate(normalized.halfDayRate)
    setFullDayRate(normalized.fullDayRate)
    setMonthlyRate(normalized.monthlyRate)
    setAgreedRate(normalized.agreedRate)
    setTravelCostPerDay(normalized.travelCostPerDay)
    setToolCostInput(normalized.toolCost)
    setCancellationFee(normalized.cancellationFee)
    setStatus(normalized.status)
    setBillingType(normalized.billingType)
    setStartTime(normalized.startTime ? formatForInput(normalized.startTime) : '')
    setEndTime(normalized.endTime ? formatForInput(normalized.endTime) : '')
    setBreakTime(String(Math.floor(Number(normalized.breakTime) / 60)))
    setLeadType(normalized.leadType)
    setEngPayType(normalized.engPayType)
    setEngBillingType(normalized.engBillingType)
    setEngCurrency(normalized.engCurrency)
    setEngHourlyRate(normalized.engHourlyRate)
    setEngHalfDayRate(normalized.engHalfDayRate)
    setEngFullDayRate(normalized.engFullDayRate)
    setEngMonthlyRate(normalized.engMonthlyRate)
    setEngAgreedRate(normalized.engAgreedRate)
    setEngCancellationFee(normalized.eng_cancellation_fee)

    if (switchMode) {
      setEditingTicketId(normalized.id || ticket.id)
      setViewMode('form')
    }

    setTimeout(() => setIsFillingForm(false), 500)
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
      // First, fetch everything while still in list mode for a smooth transition
      const ticketRes = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, { credentials: 'include' });
      if (!ticketRes.ok) throw new Error('Unable to load ticket data');
      const ticketData = await ticketRes.json();
      const ticket = ticketData.ticket || ticketData;

      // Load dropdowns if needed
      await loadDropdowns();

      // Populate form fields BEFORE showing the form
      fillFormFromTicket(ticket);
      setEditingTicketId(ticketId);

      // Fetch fresh extras immediately
      await fetchTicketExtras(ticketId);

      // Finally, switch to form view only after state is ready
      setViewMode('form');
    } catch (err) {
      console.error('Edit ticket error', err);
      setError(err.message || 'Unable to load ticket for edit');
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
    setTimeLogs([])
    setIsInlineEditing(false)
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
        setTaskTime(parsedLead.taskTime?.slice(0, 5) || '09:00')
        setTaskEndTime(parsedLead.taskEndTime?.slice(0, 5) || '17:00')

        setScopeOfWork(parsedLead.scopeOfWork || '')

        // Address & Location
        setApartment(parsedLead.apartment || '')
        setAddressLine1(parsedLead.addressLine1 || '')
        setAddressLine2(parsedLead.addressLine2 || '')
        setCity(parsedLead.city || '')
        setCountry(parsedLead.country || '')
        setZipCode(parsedLead.zipCode || '')
        setTimezone(parsedLead.timezone || '')
        setLatitude(parsedLead.latitude || null)
        setLongitude(parsedLead.longitude || null)

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
        setAgreedRate(parsedLead.agreedRate || '0')
        setTravelCostPerDay(parsedLead.travelCostPerDay != null ? String(parsedLead.travelCostPerDay) : '')
        setToolCostInput(parsedLead.toolCost != null ? String(parsedLead.toolCost) : '0')
        setCancellationFee(parsedLead.cancellationFee != null ? String(parsedLead.cancellationFee) : (parsedLead.cancellation_fee != null ? String(parsedLead.cancellation_fee) : ''))
        setBillingType(parsedLead.billingType || 'Hourly')
        setLeadType(parsedLead.leadType || 'Full time')

        // Engineer Payout Configuration from LeadsPage assignment modal
        const eId = parsedLead.engineerId || parsedLead.engineer_id || '';
        setEngineerId(eId ? String(eId) : '')
        
        let eName = parsedLead.engineerName || '';
        if (!eName && eId && engineers.length > 0) {
          const matchedEng = engineers.find(e => String(e.id) === String(eId));
          if (matchedEng) eName = matchedEng.name;
        }
        setEngineerName(eName)
        setEngPayType(parsedLead.engPayType || 'Default')
        setEngBillingType(parsedLead.engBillingType || 'Hourly')
        setEngMonthlyRate(parsedLead.engMonthlyRate || '')
        setEngHourlyRate(parsedLead.engHourlyRate || '')
        setEngHalfDayRate(parsedLead.engHalfDayRate || '')
        setEngFullDayRate(parsedLead.engFullDayRate || '')
        setEngAgreedRate(parsedLead.engAgreedRate || '')
        setEngCancellationFee(parsedLead.engCancellationFee || '')
        setEngOvertimeRate(parsedLead.engOvertimeRate != null ? String(parsedLead.engOvertimeRate) : '')
        setEngOohRate(parsedLead.engOohRate != null ? String(parsedLead.engOohRate) : '')
        setEngWeekendRate(parsedLead.engWeekendRate != null ? String(parsedLead.engWeekendRate) : '')
        setEngHolidayRate(parsedLead.engHolidayRate != null ? String(parsedLead.engHolidayRate) : '')
        setEngCurrency(parsedLead.engCurrency || 'USD')

        // AUTO SYNC TIME: Automatically populate the manual override times from the scheduled lead details
        const lDate = parsedLead.followUpDate || parsedLead.taskStartDate;
        const lEndDate = parsedLead.taskEndDate || lDate;
        const lTime = parsedLead.taskTime || '09:00';

        if (lDate && lTime) {
          const sDateOnly = String(lDate).split('T')[0];
          const eDateOnly = String(lEndDate).split('T')[0];
          const lEndTime = parsedLead.taskEndTime || '17:00';
          autoSyncTime(sDateOnly, eDateOnly, lTime, lEndTime);
        }

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
    // DO NOT auto-populate if we are editing an existing ticket!
    if (!leadId || editingTicketId) return
    const lead = leads.find(l => String(l.id) === String(leadId))
    if (lead) {
      console.log("Populating ticket form from selected lead:", lead.id)
      setTaskName(lead.taskName || '')
      const latestDate = lead.followUpDate || lead.taskStartDate;
      const latestEndDate = lead.taskEndDate || latestDate;
      setTaskStartDate(latestDate ? String(latestDate).split('T')[0] : '')
      setTaskEndDate(latestEndDate ? String(latestEndDate).split('T')[0] : '')
      setTaskTime(lead.taskTime?.slice(0, 5) || '09:00')
      setTaskEndTime(lead.taskEndTime?.slice(0, 5) || '17:00')
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
      setAgreedRate(lead.agreedRate || '0')
      setTravelCostPerDay(lead.travelCostPerDay != null ? String(lead.travelCostPerDay) : '')
      setToolCostInput(lead.toolCost != null ? String(lead.toolCost) : '0')
      setCancellationFee(lead.cancellationFee != null ? String(lead.cancellationFee) : (lead.cancellation_fee != null ? String(lead.cancellation_fee) : ''))
      setBillingType(lead.billingType || 'Hourly')
      setLeadType(lead.leadType || 'Full time')
      setLatitude(lead.latitude || null)
      setLongitude(lead.longitude || null)

      // AUTO SYNC TIME: Automatically populate the manual override times from the scheduled lead details
      const lDate = latestDate;
      const lEndDate = latestEndDate;
      const lTime = lead.taskTime || '09:00';
      if (lDate && lTime) {
        const sDateOnly = String(lDate).split('T')[0];
        const eDateOnly = String(lEndDate).split('T')[0];
        autoSyncTime(sDateOnly, eDateOnly, lTime, lead.taskEndTime || '17:00');
      }
    }
  }, [leads, leadId])

  // Auto-sync Lead Type based on Date Range
  useEffect(() => {
    if (taskStartDate && taskEndDate && taskStartDate !== taskEndDate) {
      if (leadType !== 'Dispatch') setLeadType('Dispatch')
    } else if (taskStartDate && taskEndDate && taskStartDate === taskEndDate) {
      if (leadType === 'Dispatch') setLeadType('Full time')
    }
  }, [taskStartDate, taskEndDate, leadType])

  // Track the initial engineer ID for the current editing session to prevent auto-syncing over historical rates
  const initialEngIdRef = useRef(null);

  useEffect(() => {
    if (editingTicketId) {
      initialEngIdRef.current = engineerId;
    } else {
      initialEngIdRef.current = null;
    }
  }, [editingTicketId]);

  const syncProfileRates = useCallback(() => {
    // Only auto-sync if:
    // 1. It's a new ticket (editingTicketId is null)
    // 2. The engineer was changed manually (engineerId !== initialEngIdRef.current)
    const isNewTicket = !editingTicketId;
    const isEngChanged = initialEngIdRef.current !== null && String(engineerId) !== String(initialEngIdRef.current);
    const hasNoRates = !engHourlyRate || engHourlyRate === '0.00' || engHourlyRate === '';

    if (engineerId && engineers.length > 0 && engPayType === 'Default' && (isNewTicket || isEngChanged || hasNoRates)) {
      const eng = engineers.find(e => String(e.id) === String(engineerId));
      if (eng) {
        console.log(`[SYNC] Auto-populating profile rates for ${eng.name}`);
        setEngBillingType(eng.billingType ?? eng.billing_type ?? 'Hourly');
        const hRate = eng.hourlyRate ?? eng.hourly_rate;
        setEngHourlyRate(String(hRate != null ? hRate : '0.00'));
        const hdRate = eng.halfDayRate ?? eng.half_day_rate;
        setEngHalfDayRate(String(hdRate != null ? hdRate : '0.00'));
        const fdRate = eng.fullDayRate ?? eng.full_day_rate;
        setEngFullDayRate(String(fdRate != null ? fdRate : '0.00'));
        const mRate = eng.monthlyRate ?? eng.monthly_rate;
        setEngMonthlyRate(String(mRate != null ? mRate : '0.00'));
        setEngAgreedRate(String(eng.agreedRate ?? eng.agreed_rate ?? '0.00'));
        const cfRate = eng.cancellationFee ?? eng.cancellation_fee;
        setEngCancellationFee(String(cfRate != null ? cfRate : '0.00'));
        setEngCurrency(eng.currency || 'USD');
        
        // Update the ref to the new engineer so we don't keep syncing if other fields change
        if (isEngChanged) initialEngIdRef.current = engineerId;
      }
    }
  }, [engineerId, engineers, engPayType, editingTicketId]);

  // Effect to AUTO-POPULATE Engineer Profile Rates
  useEffect(() => {
    syncProfileRates();
  }, [syncProfileRates]);

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
        <header className="tickets-header" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                className="tickets-back"
                style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  resetForm()
                  setViewMode('list')
                }}
              >
                <FiX /> Back
              </button>
              <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)' }}>
                {editingTicketId ? <FiEdit2 /> : <FiFileText />}
              </div>
              <div>
                <h1 className="tickets-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                  {editingTicketId ? 'Edit Ticket' : 'Create Ticket'}
                </h1>
                <p className="tickets-subtitle" style={{ margin: '0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                  {editingTicketId ? `#AIM-T-${editingTicketId}` : 'Initiate new session'}
                </p>
              </div>
            </div>

            {/* Top Status Interactive Switcher */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: '#fff', 
              padding: '6px 12px 6px 16px', 
              borderRadius: '14px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Update Status:</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select 
                  value={status} 
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    if (nextStatus === 'Resolved') {
                      const today = new Date().toISOString().split('T')[0];
                      const end = taskEndDate ? taskEndDate.split('T')[0] : '';
                      if (end && today < end) {
                        const reason = window.prompt(`This ticket's scheduled end date is ${new Date(end).toLocaleDateString()}. To resolve it early, please provide a reason for the Approval queue:`);
                        if (reason) {
                          setStatus('Approval Pending');
                          setClosureReason(reason);
                          setResolveDate(today);
                          
                          // Short delay to ensure state updates before submission
                          setTimeout(() => {
                             handleSubmitTicket();
                          }, 100);
                        } else {
                          // User cancelled prompt
                        }
                        return;
                      }
                    }
                    setStatus(nextStatus);
                  }}
                  style={{
                    padding: '8px 32px 8px 16px', 
                    borderRadius: '10px', 
                    fontSize: '13px', 
                    fontWeight: '800', 
                    color: status === 'Resolved' ? '#059669' : (status === 'In Progress' ? '#d97706' : '#2563eb'),
                    background: status === 'Resolved' ? '#f0fdf4' : (status === 'In Progress' ? '#fffbeb' : '#eff6ff'),
                    border: `2px solid ${status === 'Resolved' ? '#bbf7d0' : (status === 'In Progress' ? '#fef3c7' : '#dbeafe')}`,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: status === 'Resolved' ? '#10b981' : (status === 'In Progress' ? '#f59e0b' : (status === 'Approval Pending' ? '#8b5cf6' : '#3b82f6')),
                  boxShadow: `0 0 8px ${status === 'Resolved' ? '#10b981' : (status === 'In Progress' ? '#f59e0b' : (status === 'Approval Pending' ? '#8b5cf6' : '#3b82f6'))}`
                }}></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '14px', width: 'fit-content' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('Tickets')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeMainTab === 'Tickets' ? '#fff' : 'transparent',
              color: activeMainTab === 'Tickets' ? '#6366f1' : '#64748b',
              boxShadow: activeMainTab === 'Tickets' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <FiFileText /> Tickets
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('POC')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeMainTab === 'POC' ? '#fff' : 'transparent',
              color: activeMainTab === 'POC' ? '#6366f1' : '#64748b',
              boxShadow: activeMainTab === 'POC' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <FiUser /> POC
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('Cost & Breakdown')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeMainTab === 'Cost & Breakdown' ? '#fff' : 'transparent',
              color: activeMainTab === 'Cost & Breakdown' ? '#6366f1' : '#64748b',
              boxShadow: activeMainTab === 'Cost & Breakdown' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <FiDollarSign /> Cost & Breakdown
          </button>
        </div>

        <form className="tickets-form" onSubmit={handleSubmitTicket}>
          {leadId && (
            <div className="lead-sync-alert" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e40af', fontSize: '13px', fontWeight: '500' }}>
              <FiInfo style={{ fontSize: '18px', color: '#3b82f6' }} />
              <div>This ticket is linked to <strong>Lead #L-{leadId}</strong>. Details are synced for accuracy.</div>
            </div>
          )}

          {activeMainTab === 'Tickets' && (
            <>
              {/* Engineer Assignment */}
              <section className="tickets-card">
                <h2 className="tickets-section-title"><FiActivity /> Engineer Assignment</h2>
                <div className="tickets-grid">
                  <label className="tickets-field">
                    <span>Primary Engineer <span className="field-required">*</span></span>
                    <select 
                      value={engineerId} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setEngineerId(val);
                        const eng = engineers.find(en => String(en.id) === String(val));
                        setEngineerName(eng ? eng.name : '');
                      }} 
                      disabled={loadingDropdowns}
                    >
                      <option value="">Select an engineer...</option>
                      {engineers.map((en) => (
                        <option key={en.id} value={en.id}>{en.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="tickets-field">
                    <span>Lead Type</span>
                    <select 
                      value={leadType} 
                      onChange={(e) => setLeadType(e.target.value)}
                      disabled={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Lead Type, please edit the originating Lead.`)}
                    >
                      <option value="Onsite">Onsite</option>
                      <option value="Dispatch">Dispatch (Multi-day)</option>
                    </select>
                  </label>
                </div>
              </section>

              {/* Customer & Lead */}
              <section className="tickets-card">
                <h2 className="tickets-section-title">Customer &amp; Lead</h2>
                <div className="tickets-grid">
                  <label className="tickets-field">
                    <span>Select Customer <span className="field-required">*</span></span>
                    <select 
                      value={customerId} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerId(val);
                        const cust = customers.find(c => String(c.id) === String(val));
                        setClientName(cust ? cust.name : '');
                      }} 
                      disabled={loadingDropdowns || !!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Customer, please edit the originating Lead.`)}
                    >
                      <option value="">Choose a customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.accountEmail ? `(${c.accountEmail})` : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="tickets-field">
                    <span>Select Lead</span>
                    {leadId ? (
                      <input 
                        type="text" 
                        value={`#L-${leadId}`} 
                        readOnly 
                        className="synced-field" 
                        onClick={() => alert(`This ticket is permanently linked to Lead #L-${leadId}.`)} 
                      />
                    ) : (
                      <select 
                        value={leadId} 
                        onChange={(e) => setLeadId(e.target.value)} 
                        disabled={loadingDropdowns || filteredLeads.length === 0}
                      >
                        <option value="">Choose a lead...</option>
                        {filteredLeads.map((lead) => (
                          <option key={lead.id} value={lead.id}>{lead.taskName}</option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="tickets-field tickets-field--full">
                    <span>Client Name</span>
                    <input 
                      type="text" 
                      value={clientName} 
                      onChange={(e) => setClientName(e.target.value)} 
                      placeholder="Enter client name" 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Client Name, please edit the originating Lead.`)}
                    />
                  </label>
                </div>
              </section>

              {/* Task Details */}
              <section className="tickets-card">
                <h2 className="tickets-section-title">Task Details</h2>
                <div className="tickets-grid">
                  <label className="tickets-field tickets-field--full">
                    <span>Task Name <span className="field-required">*</span></span>
                    <input 
                      type="text" 
                      value={taskName} 
                      onChange={(e) => setTaskName(e.target.value)} 
                      placeholder="Enter task name"
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Task Name, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>Start Date <span className="field-required">*</span></span>
                    <input 
                      type="date" 
                      value={taskStartDate} 
                      onChange={(e) => { setTaskStartDate(e.target.value); autoSyncTime(e.target.value, taskEndDate, taskTime, taskEndTime); }} 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Start Date, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>End Date <span className="field-required">*</span></span>
                    <input 
                      type="date" 
                      value={taskEndDate} 
                      onChange={(e) => { setTaskEndDate(e.target.value); autoSyncTime(taskStartDate, e.target.value, taskTime, taskEndTime); }} 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the End Date, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>Start Time <span className="field-required">*</span></span>
                    <input 
                      type="time" 
                      value={taskTime} 
                      onChange={(e) => { setTaskTime(e.target.value); autoSyncTime(taskStartDate, taskEndDate, e.target.value, taskEndTime); }} 
                      className={leadId ? 'synced-field' : ''}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>End Time <span className="field-required">*</span></span>
                    <input 
                      type="time" 
                      value={taskEndTime} 
                      onChange={(e) => { setTaskEndTime(e.target.value); autoSyncTime(taskStartDate, taskEndDate, taskTime, e.target.value); }} 
                      className={leadId ? 'synced-field' : ''}
                    />
                  </label>
                  <label className="tickets-field tickets-field--full">
                    <span>Scope of Work <span className="field-required">*</span></span>
                    <textarea 
                      rows={3} 
                      value={scopeOfWork} 
                      onChange={(e) => setScopeOfWork(e.target.value)} 
                      placeholder="Describe the scope of work"
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Scope of Work, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field tickets-field--full">
                    <span>Tools Required</span>
                    <input 
                      type="text" 
                      value={tools} 
                      onChange={(e) => setTools(e.target.value)} 
                      placeholder="e.g. Drill, Laptop, Console cable" 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Tools Required, please edit the originating Lead.`)}
                    />
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
                      onPlaceSelected={handleGoogleAddressSelect}
                      options={leadId ? [] : GOOGLE_AUTOCOMPLETE_OPTIONS}
                      placeholder={leadId ? "Address is synced from Lead" : "Type to search global address..."}
                      style={{ 
                        width: '100%', 
                        height: '42px', 
                        padding: '0 12px', 
                        borderRadius: '10px', 
                        border: '1px solid #e2e8f0', 
                        fontSize: '13px', 
                        outline: 'none', 
                        background: leadId ? '#f8fafc' : '#fff',
                        cursor: leadId ? 'not-allowed' : 'text'
                      }}
                      disabled={!!leadId}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>Address Line 1 <span className="field-required">*</span></span>
                    <input 
                      type="text" 
                      value={addressLine1} 
                      onChange={(e) => setAddressLine1(e.target.value)} 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Address, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>City <span className="field-required">*</span></span>
                    <input 
                      type="text" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the City, please edit the originating Lead.`)}
                    />
                  </label>
                  <label className="tickets-field">
                    <span>Country <span className="field-required">*</span></span>
                    <select 
                      value={country} 
                      onChange={(e) => handleCountryChange(e.target.value)} 
                      disabled={loadingCountries || !!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Country, please edit the originating Lead.`)}
                    >
                      <option value="">Select country...</option>
                      {countriesList.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="tickets-field">
                    <span>Zip Code <span className="field-required">*</span></span>
                    <input 
                      type="text" 
                      value={zipCode} 
                      onChange={(e) => setZipCode(e.target.value)} 
                      readOnly={!!leadId}
                      className={leadId ? 'synced-field' : ''}
                      onClick={() => leadId && alert(`This ticket is linked to Lead #L-${leadId}. To change the Zip Code, please edit the originating Lead.`)}
                    />
                  </label>
                </div>
              </section>


              {/* Daily Shift Logs */}
              {/* Daily Shift Logs (Only for Multi-day or Dispatch) */}
              {isMultiDay && (
                <section className="tickets-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="tickets-section-title" style={{ margin: 0 }}><FiCalendar /> Daily Shift Logs</h2>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
                      {workingDays.length} Working Days
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Date</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Engineer</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Shift Times</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>Hours</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>Cost Est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workingDays.map((dStr) => {
                          const existingLog = timeLogs.find(l => (l.task_date || '').split('T')[0] === dStr) || {};
                          const lStart = safeExtractTime(existingLog.start_time || existingLog.startTime) || (taskTime || '09:00');
                          const lEnd = safeExtractTime(existingLog.end_time || existingLog.endTime) || (taskEndTime || '17:00');
                          const lBreak = existingLog.break_time_mins || 0;
                          const lEngId = existingLog.engineer_id || existingLog.engineerId || engineerId;
                          
                          const dur = calculateDuration(lStart, lEnd, lBreak);
                          
                          return (
                            <tr key={dStr} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px', fontWeight: '600' }}>{new Date(dStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                              <td style={{ padding: '12px' }}>
                                <select 
                                  value={lEngId} 
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', width: '100%' }}
                                  onChange={(e) => {
                                    const newEngId = e.target.value;
                                    if (existingLog.id) handleUpdateLog(existingLog.id, { engineerId: Number(newEngId) });
                                    else {
                                      setTimeLogs(prev => {
                                        const exists = prev.find(l => (l.task_date || '').split('T')[0] === dStr);
                                        if (exists) return prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, engineer_id: Number(newEngId) } : l);
                                        return [...prev, { task_date: dStr, engineer_id: Number(newEngId), start_time: `${dStr}T${lStart}:00`, end_time: `${dStr}T${lEnd}:00`, break_time_mins: lBreak }];
                                      });
                                    }
                                  }}
                                >
                                  <option value="">Assign...</option>
                                  {engineers.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                                  <option value="0">❌ Absent</option>
                                </select>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input 
                                    type="time" 
                                    value={lStart} 
                                    style={{ fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }} 
                                    onChange={(e) => { 
                                      const newVal = e.target.value;
                                      if (existingLog.id) handleUpdateLog(existingLog.id, { startTime: `${dStr}T${newVal}:00` }); 
                                      else {
                                        setTimeLogs(prev => {
                                          const exists = prev.find(l => (l.task_date || '').split('T')[0] === dStr);
                                          if (exists) return prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, start_time: `${dStr}T${newVal}:00` } : l);
                                          return [...prev, { task_date: dStr, engineer_id: Number(lEngId), start_time: `${dStr}T${newVal}:00`, end_time: `${dStr}T${lEnd}:00`, break_time_mins: lBreak }];
                                        });
                                      }
                                    }} 
                                  />
                                  <span>-</span>
                                  <input 
                                    type="time" 
                                    value={lEnd} 
                                    style={{ fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }} 
                                    onChange={(e) => { 
                                      const newVal = e.target.value;
                                      if (existingLog.id) handleUpdateLog(existingLog.id, { endTime: `${dStr}T${newVal}:00` }); 
                                      else {
                                        setTimeLogs(prev => {
                                          const exists = prev.find(l => (l.task_date || '').split('T')[0] === dStr);
                                          if (exists) return prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, end_time: `${dStr}T${newVal}:00` } : l);
                                          return [...prev, { task_date: dStr, engineer_id: Number(lEngId), start_time: `${dStr}T${lStart}:00`, end_time: `${dStr}T${newVal}:00`, break_time_mins: lBreak }];
                                        });
                                      }
                                    }} 
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#6366f1' }}>{dur.toFixed(1)}h</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>
                                {currency} {(() => {
                                  let rRates = { hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate, ar: agreedRate, cf: cancellationFee, bt: billingType };
                                  if (String(lEngId) === '0') {
                                    rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
                                  } else if (lEngId && String(lEngId) !== String(engineerId)) {
                                    const subEng = engineers.find(en => String(en.id) === String(lEngId));
                                    if (subEng) {
                                      rRates = {
                                        hr: subEng.hourlyRate ?? subEng.hourly_rate ?? 0,
                                        hd: subEng.halfDayRate ?? subEng.half_day_rate ?? 0,
                                        fd: subEng.fullDayRate ?? subEng.full_day_rate ?? 0,
                                        mr: subEng.monthlyRate ?? subEng.monthly_rate ?? 0,
                                        ar: subEng.agreedRate ?? subEng.agreed_rate ?? 0,
                                        cf: subEng.cancellationFee ?? subEng.cancellation_fee ?? 0,
                                        bt: subEng.billingType ?? subEng.billing_type ?? billingType
                                      };
                                    }
                                  }

                                  const calc = calculateTicketTotal({
                                    startTime: `${dStr}T${lStart}:00`, 
                                    endTime: `${dStr}T${lEnd}:00`, 
                                    breakTime: lBreak,
                                    hourlyRate: rRates.hr, 
                                    halfDayRate: rRates.hd, 
                                    fullDayRate: rRates.fd, 
                                    monthlyRate: rRates.mr, 
                                    agreedRate: rRates.ar, 
                                    cancellationFee: rRates.cf, 
                                    travelCostPerDay: travelCostPerDay, 
                                    toolCost: toolCostInput, 
                                    billingType: rRates.bt, 
                                    timezone, 
                                    country, 
                                    monthlyDivisor: getWorkingDaysInMonth(dStr, country),
                                    _isLogAggregation: true
                                  });
                                  return calc ? calc.grandTotal : '0.00';
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          {activeMainTab === 'Tickets' && (
            <div className="tickets-form-actions" style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="tickets-secondary-btn" onClick={() => { resetForm(); setViewMode('list'); }}>Cancel</button>
              <button type="button" className="tickets-primary-btn" onClick={() => setActiveMainTab('POC')}>Next to POC <FiArrowRight /></button>
            </div>
          )}

          {activeMainTab === 'POC' && (
            <div className="fade-in">
              <section className="tickets-card">
                <h2 className="tickets-section-title"><FiUser /> POC & Documents</h2>
                <div className="tickets-grid">
                  <label className="tickets-field">
                    <span>POC details</span>
                    <textarea rows={4} value={pocDetails} onChange={(e) => setPocDetails(e.target.value)} placeholder="Name, Phone, Email etc." />
                  </label>
                  <label className="tickets-field">
                    <span>RE details</span>
                    <textarea rows={4} value={reDetails} onChange={(e) => setReDetails(e.target.value)} placeholder="Relative details..." />
                  </label>
                  <label className="tickets-field tickets-field--full">
                    <span>Attachments / Documents</span>
                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                      <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv" onChange={handleDocumentsChange} id="ticket-files" style={{ display: 'none' }} />
                      <label htmlFor="ticket-files" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 2, position: 'relative' }}>
                        <div style={{ background: '#e0e7ff', padding: '16px', borderRadius: '50%', color: '#4f46e5', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.15)' }}>
                          <FiDownload size={28} />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>Click to Browse or Drag Documents Here</span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>Supports: PDF, Excel, JPG, PNG</span>
                      </label>
                    </div>

                    {ticketAttachments && ticketAttachments.length > 0 && (
                      <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Previously Saved Documents ({ticketAttachments.length})</span>
                          <span style={{ fontSize: '11px', color: '#3b82f6', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px' }}>In Database</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                          {ticketAttachments.map((file, idx) => {
                            const fileName = file.file_name || file.name || 'document';
                            const fileUrl = file.file_url || file.url;
                            const isPdf = fileName.toLowerCase().endsWith('.pdf');
                            const isExcel = fileName.toLowerCase().match(/\.(xls|xlsx|csv)$/);
                            const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
                            let Icon = FiFileText;
                            let iconColor = '#64748b';
                            let bgColor = '#f1f5f9';
                            
                            if (isPdf) { Icon = FiFileText; iconColor = '#ef4444'; bgColor = '#fee2e2'; }
                            else if (isExcel) { Icon = FiActivity; iconColor = '#10b981'; bgColor = '#d1fae5'; }
                            else if (isImage) { Icon = FiEye; iconColor = '#3b82f6'; bgColor = '#dbeafe'; }

                            return (
                              <a key={`saved-${idx}`} href={fileUrl ? `${API_BASE_URL.replace('/api', '')}/${fileUrl}` : '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                                <div style={{ background: bgColor, color: iconColor, padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FiDownload size={10} /> Click to View
                                  </div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {documents.length > 0 && (
                      <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Selected Documents ({documents.length})</span>
                          <span style={{ fontSize: '11px', color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>Ready to Upload</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                          {documents.map((file, idx) => {
                            const isPdf = file.name.toLowerCase().endsWith('.pdf');
                            const isExcel = file.name.toLowerCase().match(/\.(xls|xlsx|csv)$/);
                            const isImage = file.type.startsWith('image/');
                            let Icon = FiFileText;
                            let iconColor = '#64748b';
                            let bgColor = '#f1f5f9';
                            
                            if (isPdf) { Icon = FiFileText; iconColor = '#ef4444'; bgColor = '#fee2e2'; }
                            else if (isExcel) { Icon = FiActivity; iconColor = '#10b981'; bgColor = '#d1fae5'; }
                            else if (isImage) { Icon = FiEye; iconColor = '#3b82f6'; bgColor = '#dbeafe'; }

                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                <div style={{ background: bgColor, color: iconColor, padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                                <button type="button" onClick={() => removeDocument(idx)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }} onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'} onMouseOut={(e) => e.currentTarget.style.color = '#cbd5e1'}>
                                  <FiX size={16} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </section>
              <div className="tickets-form-actions" style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="tickets-secondary-btn" onClick={() => setActiveMainTab('Tickets')}><FiArrowLeft /> Back to Tickets</button>
                <button type="button" className="tickets-primary-btn" onClick={() => setActiveMainTab('Cost & Breakdown')}>Next to Financials <FiArrowRight /></button>
              </div>
            </div>
          )}

          {activeMainTab === 'Cost & Breakdown' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Left: Customer Configuration */}
                <section className="tickets-card">
                  <h2 className="tickets-section-title"><FiDollarSign /> Customer Billing</h2>
                  <div className="tickets-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <label className="tickets-field">
                      <span>Currency</span>
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={!!leadId}
                        className={leadId ? 'synced-field' : ''}
                        onClick={() => leadId && alert(`Currency is synced from Lead #L-${leadId}.`)}
                      >
                        {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </label>
                    <label className="tickets-field">
                      <span>Billing Type</span>
                      <select 
                        value={billingType} 
                        onChange={(e) => setBillingType(e.target.value)}
                        disabled={!!leadId}
                        className={leadId ? 'synced-field' : ''}
                        onClick={() => leadId && alert(`Financial details are synced from Lead #L-${leadId}. Please edit the Lead to change billing configurations.`)}
                      >
                        <option value="Hourly">Hourly Only</option>
                        <option value="Half Day + Hourly">Half Day + Hourly</option>
                        <option value="Full Day">Full Day</option>
                        <option value="Full Day + OT">Full Day + OT</option>
                        <option value="Mixed Mode">Mixed Mode</option>
                        <option value="Monthly + OT + Weekend">Monthly + OT + Weekend</option>
                        <option value="Agreed Rate">Agreed Rate</option>
                        <option value="Cancellation">Cancellation Fee</option>
                      </select>
                    </label>
                    <label className="tickets-field"><span>Hourly Rate</span><input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    <label className="tickets-field"><span>Half Day Rate</span><input type="number" value={halfDayRate} onChange={(e) => setHalfDayRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    <label className="tickets-field"><span>Full Day Rate</span><input type="number" value={fullDayRate} onChange={(e) => setFullDayRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    <label className="tickets-field"><span>Monthly Rate</span><input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    {billingType === 'Agreed Rate' && (
                      <label className="tickets-field"><span>Agreed Rate</span><input type="number" value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    )}
                    {billingType === 'Cancellation' && (
                      <label className="tickets-field"><span>Cancellation Fee</span><input type="number" value={cancellationFee} onChange={(e) => setCancellationFee(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    )}
                    <label className="tickets-field"><span>Travel Cost / Day</span><input type="number" value={travelCostPerDay} onChange={(e) => setTravelCostPerDay(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                    <label className="tickets-field"><span>Tool Cost / Day</span><input type="number" value={toolCostInput} onChange={(e) => setToolCostInput(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Rates are synced from Lead #L-${leadId}.`)} /></label>
                  </div>

                  {/* LIVE BREAKDOWN SUMMARY CARD (NEW) */}
                  <div style={{ marginTop: '24px', padding: '16px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Breakdown Summary</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', background: '#fff', padding: '2px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>{billingType}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Total Hours:</span>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>{liveBreakdown?.hrs || '0.00'} hrs</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Base Service Cost:</span>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>{currency} {liveBreakdown?.base || '0.00'}</span>
                      </div>
                      {(parseFloat(liveBreakdown?.ot || 0) > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Overtime (OT):</span>
                          <span style={{ fontWeight: '700', color: '#f59e0b' }}>+ {currency} {liveBreakdown?.ot}</span>
                        </div>
                      )}
                      {(parseFloat(liveBreakdown?.ooh || 0) > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Out of Hours (OOH):</span>
                          <span style={{ fontWeight: '700', color: '#f59e0b' }}>+ {currency} {liveBreakdown?.ooh}</span>
                        </div>
                      )}
                      {(parseFloat(liveBreakdown?.specialDay || 0) > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Weekend/Holiday:</span>
                          <span style={{ fontWeight: '700', color: '#ef4444' }}>+ {currency} {liveBreakdown?.specialDay}</span>
                        </div>
                      )}
                      <div style={{ margin: '8px 0', borderTop: '1px dashed #cbd5e1' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900' }}>
                        <span style={{ color: '#1e293b' }}>Final Total:</span>
                        <span style={{ color: '#6366f1' }}>{currency} {liveBreakdown?.grandTotal || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Right: Engineer Payout Configuration */}
                <section className="tickets-card">
                  <h2 className="tickets-section-title"><FiActivity /> Engineer Payout</h2>
                  <div className="tickets-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <label className="tickets-field">
                      <span>Pay Type</span>
                      <select 
                        value={engPayType} 
                        onChange={(e) => setEngPayType(e.target.value)}
                        disabled={!!leadId}
                        className={leadId ? 'synced-field' : ''}
                        onClick={() => leadId && alert(`Payout configurations are synced from Lead #L-${leadId}.`)}
                      >
                        <option value="Default">Use Profile Rates</option>
                        <option value="Custom">Custom Ticket Rates</option>
                      </select>
                    </label>
                    <label className="tickets-field">
                      <span>Payout Currency</span>
                      <select value={engCurrency} onChange={(e) => setEngCurrency(e.target.value)} disabled={!!engineerId || !!leadId} className={leadId ? 'synced-field' : ''}>
                        {CURRENCIES.filter(c => {
                          const eng = engineers.find(e => String(e.id) === String(engineerId));
                          const engCur = eng ? (eng.currency || eng.payout_currency || 'USD') : 'USD';
                          return !engineerId || c.value === engCur;
                        }).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </label>
                    {engPayType === 'Custom' && (
                      <>
                        <label className="tickets-field" style={{ gridColumn: 'span 2' }}>
                          <span>Payout Billing Type</span>
                          <select 
                            value={engBillingType} 
                            onChange={(e) => setEngBillingType(e.target.value)}
                            disabled={!!leadId}
                            className={leadId ? 'synced-field' : ''}
                            onClick={() => leadId && alert(`Payout configurations are synced from Lead #L-${leadId}.`)}
                          >
                            <option value="Hourly">Hourly Only</option>
                            <option value="Full Day + OT">Full Day + OT</option>
                            <option value="Agreed Rate">Agreed Rate</option>
                          </select>
                        </label>
                        <label className="tickets-field"><span>Payout Hourly</span><input type="number" value={engHourlyRate} onChange={(e) => setEngHourlyRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Payout rates are synced from Lead #L-${leadId}.`)} /></label>
                        <label className="tickets-field"><span>Payout Full Day</span><input type="number" value={engFullDayRate} onChange={(e) => setEngFullDayRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Payout rates are synced from Lead #L-${leadId}.`)} /></label>
                        {engBillingType === 'Agreed Rate' && (
                          <label className="tickets-field" style={{ gridColumn: 'span 2' }}><span>Payout Agreed Rate</span><input type="number" value={engAgreedRate} onChange={(e) => setEngAgreedRate(e.target.value)} readOnly={!!leadId} className={leadId ? 'synced-field' : ''} onClick={() => leadId && alert(`Payout rates are synced from Lead #L-${leadId}.`)} /></label>
                        )}
                      </>
                    )}
                  </div>
                  {/* Payout Summary Preview */}
                  {payoutLiveBreakdown && (
                    <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Payout Summary:</span>
                      {payoutLiveBreakdown.engSummary && payoutLiveBreakdown.engSummary.map((en, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13px', fontWeight: '600' }}>
                          <span>{en.name}</span>
                          <span style={{ color: '#10b981' }}>{engCurrency || currency} {parseFloat(en.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* UNIFIED FINANCIAL BREAKDOWN TABLE */}
              <section className="tickets-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiActivity /> Financial Breakdown Summary
                  </h2>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                    Based on {liveBreakdown?.days || 0} working days
                  </span>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '700' }}>Breakdown Category</th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontWeight: '700' }}>Customer Revenue ({currency})</th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontWeight: '700' }}>Engineer Payout ({engCurrency || currency})</th>
                      <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontWeight: '700' }}>Net Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: engineerName || 'Engineer', isBaseRow: true, cust: liveBreakdown?.base, eng: payoutLiveBreakdown?.base },
                      { label: 'Overtime (OT)', cust: liveBreakdown?.ot, eng: payoutLiveBreakdown?.ot },
                      { label: 'OOH / Special Premiums', cust: (parseFloat(liveBreakdown?.specialDay || 0) + parseFloat(liveBreakdown?.ooh || 0)).toFixed(2), eng: (parseFloat(payoutLiveBreakdown?.special || 0) + parseFloat(payoutLiveBreakdown?.ooh || 0)).toFixed(2) },
                      { label: 'Travel Expenses', cust: liveBreakdown?.travel, eng: '0.00' },
                      { label: 'Tools & Equipment', cust: liveBreakdown?.tools, eng: '0.00' },
                    ].map((row, i) => {
                      const c = parseFloat(row.cust || 0);
                      const p = parseFloat(row.eng || 0);
                      const margin = c - p;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 24px', fontWeight: '600', color: '#1e293b' }}>
                            {row.label}
                            {row.isBaseRow && (
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '400', marginTop: '4px', fontStyle: 'italic' }}>
                                {billingType} · {liveBreakdown?.days || 0} Working Days
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#1e293b' }}>
                            <div style={{ fontWeight: '700' }}>{c.toFixed(2)}</div>
                            {row.isBaseRow && c > 0 && (
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
                                {currency} {liveBreakdown?.effectiveRate || '0.00'} × {liveBreakdown?.days || 0}d
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#dc2626' }}>
                            <div style={{ fontWeight: '700' }}>{p.toFixed(2)}</div>
                            {row.isBaseRow && p > 0 && (
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
                                {engCurrency || currency} {payoutLiveBreakdown?.effectiveRate || '0.00'} × {liveBreakdown?.days || 0}d
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: margin >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                            {margin >= 0 ? '+' : ''}{margin.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '20px 24px', fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>
                        <div>Grand Total Summary</div>
                        {payoutLiveBreakdown?.engSummary && payoutLiveBreakdown.engSummary.length > 1 && (
                          <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Individual Payouts</div>
                            {payoutLiveBreakdown.engSummary.map((es, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#475569' }}>• {es.name}</span>
                                <span style={{ fontWeight: '700', color: '#dc2626' }}>{engCurrency || currency} {es.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: '18px', fontWeight: '900', color: '#6366f1' }}>
                        {currency} {liveBreakdown?.grandTotal || '0.00'}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>
                        {engCurrency || currency} {payoutLiveBreakdown?.grandTotal || '0.00'}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: '20px', fontWeight: '900', color: '#10b981', background: '#f0fdf4' }}>
                        {currency} {(parseFloat(liveBreakdown?.grandTotal || 0) - parseFloat(payoutLiveBreakdown?.grandTotal || 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>
              <div className="tickets-form-actions" style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="tickets-secondary-btn" onClick={() => setActiveMainTab('POC')}><FiArrowLeft /> Back to POC</button>
                <button type="submit" className="tickets-primary-btn" disabled={saving}>
                  {saving ? (editingTicketId ? 'Saving Changes...' : 'Creating Ticket...') : (editingTicketId ? 'Save Changes' : 'Create Ticket')}
                </button>
              </div>
            </div>
          )}

        </form>
      </section>
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
            <input type="text" placeholder="Search tickets..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="tickets-filter-row">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="Active Only">Active Only</option>
              <option value="All Status">All Status</option>
              {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="tickets-message tickets-message--error tickets-message--inline">{error}</div>}
        {success && <div className="tickets-message tickets-message--success tickets-message--inline" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
          <FiCheckCircle style={{ fontSize: '16px' }} />
          {success}
        </div>}

        {/* Monthly Grouped Accordion List */}
        {(() => {
          if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>Syncing ticket database...</div>
          if (filteredTickets.length === 0) return <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>No tickets found matching your search.</div>

          // Group the current page of tickets by month
          const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
          
          const groups = {};
          paginatedTickets.forEach(t => {
            const d = t.taskStartDate ? String(t.taskStartDate).split('T')[0] : 'Unknown';
            const mKey = d === 'Unknown' ? 'Unknown' : d.substring(0, 7); // "YYYY-MM"
            if (!groups[mKey]) groups[mKey] = [];
            groups[mKey].push(t);
          });

          // Sort months descending
          const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

          return (
            <div className="tickets-monthly-groups">
              {sortedMonthKeys.map(mKey => {
                const ticketsInMonth = groups[mKey];
                const isCollapsed = collapsedMonths.has(mKey);
                
                const formatMonthLabel = (key) => {
                  if (key === 'Unknown') return 'Unscheduled Tickets';
                  const [y, m] = key.split('-');
                  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                };

                return (
                  <div key={mKey} className="month-accordion-block" style={{ marginBottom: '16px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <header 
                      className="month-accordion-header" 
                      onClick={() => {
                        setCollapsedMonths(prev => {
                          const next = new Set(prev);
                          if (next.has(mKey)) next.delete(mKey);
                          else next.add(mKey);
                          return next;
                        });
                      }}
                      style={{ 
                        padding: '16px 24px', 
                        background: isCollapsed ? '#fff' : '#f8fafc',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{formatMonthLabel(mKey)}</span>
                        <span style={{ background: '#6366f1', color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                          {ticketsInMonth.length} {ticketsInMonth.length === 1 ? 'Ticket' : 'Tickets'}
                        </span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>▼</div>
                    </header>

                    {!isCollapsed && (
                      <div className="tickets-table-wrapper" style={{ border: 'none', background: '#fff', padding: '0' }}>
                        <table className="tickets-table">
                          <thead>
                            <tr>
                              <th style={{ paddingLeft: '24px' }}>Ticket Information</th>
                              <th>Customer</th>
                              <th>Service Date</th>
                              <th>Status</th>
                              <th>Reference</th>
                              <th>Total (USD)</th>
                              <th>Location</th>
                              <th style={{ paddingRight: '24px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ticketsInMonth.flatMap(ticket => {
                              // Parse time_logs for multi-day Dispatch tickets
                              let parsedLogs = [];
                              try {
                                if (ticket.time_logs) {
                                  parsedLogs = typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs) : ticket.time_logs;
                                }
                              } catch (e) { parsedLogs = []; }

                              const isDispatch = (ticket.leadType === 'Dispatch') || (parsedLogs.length > 0);
                              const isExpanded = expandedTicketRows.has(ticket.id);
                              const isResolved = ticket.status === 'Resolved';
                              const billingStatus = ticket.billingStatus || ticket.billing_status || 'Unbilled';

                              // Check if any single day exceeds 8hrs
                              const hasExceeded8h = parsedLogs.some(log => {
                                if (!log.start_time || !log.end_time) return false;
                                const hrs = (new Date(log.end_time) - new Date(log.start_time)) / 3600000 - ((log.break_time_mins || 0) / 60);
                                return hrs > 8;
                              });

                              const mainRow = (
                                <tr key={ticket.id} style={{ 
                                  background: isResolved ? '#fcfcfd' : (isExpanded ? 'rgba(99,102,241,0.04)' : undefined),
                                  opacity: isResolved ? 0.75 : 1
                                }}>
                                  <td style={{ paddingLeft: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                      {isDispatch && (
                                        <span style={{ flexShrink: 0, marginTop: '3px', background: isExpanded ? '#e0e7ff' : '#f1f5f9', border: '1px solid ' + (isExpanded ? '#818cf8' : '#e2e8f0'), borderRadius: '6px', padding: '2px 6px', fontSize: '11px', color: '#6366f1', fontWeight: '700', lineHeight: 1.4 }}>
                                          {parsedLogs.length}d
                                        </span>
                                      )}
                                      <div>
                                        <div className="leads-name-main">{ticket.taskName}</div>
                                        <div className="leads-name-sub">#AIM-T-{String(ticket.id).padStart(3, '0')}</div>
                                        {hasExceeded8h && (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px', background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', borderRadius: '5px', padding: '2px 7px', fontSize: '10px', fontWeight: '700' }}>
                                            ⏱ 8hr Shift Exceeded
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{ticket.customerName}</div>
                                  </td>
                                  <td>
                                    <div style={{ color: '#15803d', fontWeight: '600' }}>
                                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.05em' }}>Confirmed For</div>
                                      {(() => {
                                        const formatDate = (ds) => {
                                          if (!ds) return '';
                                          const d = new Date(ds);
                                          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                        };
                                        const s = ticket.taskStartDate ? String(ticket.taskStartDate).split('T')[0] : '';
                                        const e = ticket.taskEndDate ? String(ticket.taskEndDate).split('T')[0] : '';
                                        if (!e || s === e) return formatDate(s);
                                        return `${formatDate(s)} - ${formatDate(e)}`;
                                      })()}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                      <select
                                        value={ticket.status}
                                        onChange={async (e) => {
                                          const nextStatus = e.target.value;
                                          const tId = ticket.id;
                                          let finalStatus = nextStatus;
                                          let reason = '';
                                          let rDate = '';

                                          if (nextStatus === 'Resolved') {
                                            const today = new Date().toISOString().split('T')[0];
                                            const end = ticket.taskEndDate ? String(ticket.taskEndDate).split('T')[0] : '';
                                            if (end && today < end) {
                                              const r = window.prompt(`Ticket #AIM-T-${tId} scheduled end date is ${new Date(end).toLocaleDateString()}. Provide reason for Early Closure:`);
                                              if (r) {
                                                finalStatus = 'Approval Pending';
                                                reason = r;
                                                rDate = today;
                                              } else {
                                                return; // Cancel
                                              }
                                            }
                                          }

                                          try {
                                            const res = await fetch(`${API_BASE_URL}/tickets/${tId}`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              credentials: 'include',
                                              body: JSON.stringify({ ...ticket, status: finalStatus, reason, resolveDate: rDate })
                                            });
                                            if (res.ok) {
                                              await loadTickets();
                                              if (finalStatus === 'Approval Pending') {
                                                alert('Ticket sent to Approval queue for Early Closure.');
                                              }
                                            }
                                          } catch (err) {
                                            console.error('Quick status update failed', err);
                                          }
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          fontSize: '12px',
                                          appearance: 'none',
                                          background: '#fff',
                                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                                          backgroundRepeat: 'no-repeat',
                                          backgroundPosition: 'right 8px center',
                                          border: 'none',
                                          outline: 'none',
                                          fontWeight: '700'
                                        }}
                                      >
                                        {TICKET_STATUSES.map(s => (
                                          <option key={s} value={s} style={{ background: '#fff', color: '#1e293b' }}>{s}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      className="leads-create-ticket-btn"
                                      style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
                                      onClick={() => openTicketModal(ticket.id)}
                                    >
                                      <FiEye /> View Detail
                                    </button>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: '800', color: isResolved ? '#94a3b8' : '#1e293b', fontSize: '14px' }}>
                                      {currency} {parseFloat(ticket.totalCost || 0).toFixed(2)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <div style={{ fontSize: '10px', color: isResolved ? '#cbd5e1' : '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        Receivable
                                      </div>
                                      {isResolved && (
                                        <span style={{ 
                                          fontSize: '8px', 
                                          fontWeight: '800', 
                                          padding: '1px 5px', 
                                          background: billingStatus === 'Invoiced' ? '#dcfce7' : '#fee2e2', 
                                          color: billingStatus === 'Invoiced' ? '#166534' : '#991b1b', 
                                          borderRadius: '4px',
                                          textTransform: 'uppercase'
                                        }}>
                                          {billingStatus === 'Invoiced' ? 'Billed' : 'Ready to Bill'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                      {ticket.city}, {ticket.country}
                                    </div>
                                  </td>
                                  <td style={{ paddingRight: '24px' }}>
                                    <div className="action-icons">
                                      {isDispatch && (
                                        <button
                                          className="action-btn"
                                          onClick={() => {
                                            setExpandedTicketRows(prev => {
                                              const next = new Set(prev);
                                              if (next.has(ticket.id)) next.delete(ticket.id);
                                              else next.add(ticket.id);
                                              return next;
                                            });
                                          }}
                                          style={{
                                            background: isExpanded ? '#fee2e2' : '#f0f9ff',
                                            border: 'none',
                                            color: isExpanded ? '#ef4444' : '#0ea5e9',
                                            borderRadius: '50%',
                                            width: '36px',
                                            height: '36px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: isExpanded ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(14, 165, 233, 0.15)',
                                            margin: '0 4px'
                                          }}
                                          title={isExpanded ? 'Hide Logs' : 'View Daily Shift Logs'}
                                        >
                                          {isExpanded ? (
                                            <FiMinusCircle size={20} style={{ animation: 'fadeIn 0.3s ease' }} />
                                          ) : (
                                            <FiClock size={18} />
                                          )}
                                        </button>
                                      )}
                                      <button className="action-btn edit" onClick={() => startEditTicket(ticket.id)} title="Edit"><FiEdit2 /></button>
                                      <button className="action-btn delete" onClick={() => handleDeleteTicket(ticket.id)} title="Delete"><FiTrash2 /></button>
                                    </div>
                                  </td>
                                </tr>
                              );

                              // NEW: Smart Date Logic for List View (Matching Modal)
                              let displayLogs = [];
                              if (isExpanded) {
                                // Consistency: Only show working days (hide weekends) and sort by date
                                displayLogs = parsedLogs
                                  .filter(l => {
                                    const dStr = l.task_date ? (typeof l.task_date === 'string' ? l.task_date.split('T')[0] : new Date(l.task_date).toISOString().split('T')[0]) : '';
                                    if (!dStr) return false;
                                    
                                    // Only show working days (hide Sat/Sun)
                                    const dObj = new Date(`${dStr}T00:00:00Z`);
                                    const day = dObj.getUTCDay();
                                    return day !== 0 && day !== 6;
                                  })
                                  .map((l, sidx) => {
                                    const dStr = l.task_date ? (typeof l.task_date === 'string' ? l.task_date.split('T')[0] : new Date(l.task_date).toISOString().split('T')[0]) : '';
                                    return { ...l, logDateStr: dStr || `Day ${sidx + 1}` };
                                  });
                                
                                displayLogs.sort((a, b) => new Date(a.logDateStr) - new Date(b.logDateStr));
                              }

                              const subRows = isExpanded ? displayLogs.map((log, sidx) => {
                                const logDate = log.logDateStr
                                  ? new Date(log.logDateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
                                  : `Day ${sidx + 1}`;
                                
                                const logId = log.id;
                                
                                // Default values for display if not yet logged (Matches Modal Logic)
                                const displayIn = log.start_time ? String(log.start_time).match(/(\d{2}):(\d{2})/)?.[0] : (ticket.taskTime || '09:00');
                                const displayOut = log.end_time ? String(log.end_time).match(/(\d{2}):(\d{2})/)?.[0] : '17:00';
                                
                                // Recalculate duration for display
                                const rowHrs = calculateDuration(displayIn, displayOut, log.break_time_mins || 0);
                                const rowExceeded = rowHrs > 8;

                                // Calculate Cost Est for this specific row (Matches Modal Logic - using Engineer Rates)
                                const rowCost = (() => {
                                  // Find the actual engineer assigned to this specific log row
                                  const targetEngId = log.engineer_id || ticket.engineer_id;
                                  
                                  // MATCH GLOBAL CALCULATION LOGIC:
                                  // Use specific engineer rates for the log row if it's a sub-engineer
                                  let rRates = { 
                                    hr: ticket.hourlyRate, 
                                    hd: ticket.halfDayRate, 
                                    fd: ticket.fullDayRate, 
                                    mr: ticket.monthlyRate, 
                                    ar: ticket.agreedRate, 
                                    cf: ticket.cancellationFee, 
                                    bt: ticket.billingType 
                                  };
                                  
                                  if (String(targetEngId) === '0') {
                                    rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
                                  } else if (targetEngId && String(targetEngId) !== String(ticket.engineer_id)) {
                                    const subEng = engineers.find(en => String(en.id) === String(targetEngId));
                                    if (subEng) {
                                      rRates = {
                                        hr: subEng.hourlyRate ?? subEng.hourly_rate ?? 0,
                                        hd: subEng.halfDayRate ?? subEng.half_day_rate ?? 0,
                                        fd: subEng.fullDayRate ?? subEng.full_day_rate ?? 0,
                                        mr: subEng.monthlyRate ?? subEng.monthly_rate ?? 0,
                                        ar: subEng.agreedRate ?? subEng.agreed_rate ?? 0,
                                        cf: subEng.cancellationFee ?? subEng.cancellation_fee ?? 0,
                                        bt: subEng.billingType ?? subEng.billing_type ?? ticket.billingType
                                      };
                                    }
                                  }

                                  const calc = calculateTicketTotal({
                                    startTime: `${log.logDateStr}T${displayIn}:00`, 
                                    endTime: `${log.logDateStr}T${displayOut}:00`, 
                                    breakTime: log.break_time_mins || 0,
                                    hourlyRate: rRates.hr, 
                                    halfDayRate: rRates.hd, 
                                    fullDayRate: rRates.fd, 
                                    monthlyRate: rRates.mr, 
                                    agreedRate: rRates.ar, 
                                    cancellationFee: rRates.cf, 
                                    travelCostPerDay: ticket.travelCostPerDay, 
                                    toolCost: ticket.toolCost,
                                    billingType: rRates.bt,
                                    country: ticket.country,
                                    monthlyDivisor: getWorkingDaysInMonth(log.logDateStr, ticket.country),
                                    _isLogAggregation: true
                                  });
                                  return calc ? calc.grandTotal : '0.00';
                                })();

                                return (
                                  <tr key={`${ticket.id}-log-${logId || sidx}`} style={{ background: rowExceeded ? '#fffcec' : '#f8fafc', borderLeft: '4px solid #6366f1' }}>
                                    <td style={{ paddingLeft: '36px', fontSize: '12px', verticalAlign: 'middle' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#6366f1', fontWeight: '700' }}>↳</span>
                                        <span style={{ fontWeight: '600', color: '#374151' }}>{logDate}</span>
                                      </div>
                                    </td>
                                    
                                    <td style={{ fontSize: '12px', color: '#64748b' }} colSpan={2}>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '700' }}>IN</span>
                                          <input 
                                            type="time" 
                                            value={displayIn} 
                                            style={{ border: 'none', fontSize: '12px', width: '75px', outline: 'none' }}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (logId) handleUpdateLog(logId, { ticketId: ticket.id, startTime: `${log.logDateStr}T${val}:00` });
                                            }}
                                          />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700' }}>OUT</span>
                                          <input 
                                            type="time" 
                                            value={displayOut} 
                                            style={{ border: 'none', fontSize: '12px', width: '75px', outline: 'none' }}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (logId) handleUpdateLog(logId, { ticketId: ticket.id, endTime: `${log.logDateStr}T${val}:00` });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    <td colSpan={2} style={{ fontSize: '12px', color: '#475569' }}>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <select
                                            value={String(log.engineer_id || '')}
                                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', width: '160px', background: '#fff' }}
                                            onChange={(e) => {
                                              const newEngId = e.target.value;
                                              if (logId) handleUpdateLog(logId, { ticketId: ticket.id, engineerId: Number(newEngId) });
                                            }}
                                          >
                                            <option value="">Assign Engineer...</option>
                                            {engineers.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                                          </select>
                                       </div>
                                    </td>
                                    
                                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: rowExceeded ? '#b45309' : '#6366f1' }}>
                                          {rowHrs.toFixed(2)}h
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                                          {currency} {rowCost}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }) : [];

                              return [mainRow, ...subRows];
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div style={{ marginTop: '24px' }}>
                <Pagination total={Math.ceil(filteredTickets.length / itemsPerPage)} current={currentPage} onChange={setCurrentPage} />
              </div>
            </div>
          );
        })()}
      </section >

      {/* ── Re-assign Engineer Modal ── */}
      {reassignModalOpen && reassignTicketId && (
        <div className="ticket-modal-backdrop" onClick={() => { setReassignModalOpen(false); setReassignTicketId(null); }} role="dialog" aria-modal="true">
          <div className="ticket-modal" style={{ maxWidth: '480px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <header className="ticket-modal-header">
              <div className="ticket-modal-header-info">
                <h2>Re-assign Engineer</h2>
                <div className="ticket-badge-id">#AIM-T-{String(reassignTicketId).padStart(3, '0')}</div>
              </div>
              <p className="ticket-modal-subtitle">Select a different engineer to take over this ticket</p>
              <button type="button" className="ticket-modal-close-btn" onClick={() => { setReassignModalOpen(false); setReassignTicketId(null); }}><FiX /></button>
            </header>
            <div className="ticket-modal-content" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Select Replacement Engineer *
                </label>
                <select
                  id="reassign-engineer-select"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500', color: '#1e293b', outline: 'none', background: 'var(--input-bg, #fff)' }}
                  defaultValue=""
                >
                  <option value="" disabled>Choose an engineer...</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name} {eng.city ? `— ${eng.city}` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Reason / Note (optional)
                </label>
                <textarea
                  id="reassign-reason-input"
                  rows={3}
                  placeholder="e.g. Original engineer on leave. Reassigning to backup engineer."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', resize: 'vertical', outline: 'none', background: 'var(--input-bg, #fff)' }}
                />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span>Re-assigning will update the ticket's engineer. The original assignment will remain in the notes for audit trail.</span>
              </div>
            </div>
            <div className="ticket-modal-footer">
              <button className="btn-wow-secondary" onClick={() => { setReassignModalOpen(false); setReassignTicketId(null); }}>
                <FiX /> Cancel
              </button>
              <button
                className="btn-wow-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                onClick={async () => {
                  const sel = document.getElementById('reassign-engineer-select');
                  const reason = document.getElementById('reassign-reason-input');
                  const newEngId = sel?.value;
                  const newEng = engineers.find(e => String(e.id) === String(newEngId));
                  if (!newEngId || !newEng) { alert('Please select an engineer.'); return; }
                  try {
                    const res = await fetch(`${API_BASE_URL}/tickets/${reassignTicketId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        engineerName: newEng.name,
                        engineerId: newEng.id,
                        status: 'Assigned',
                        engPayType: 'Default' // Reset to new engineer's profile rates
                      })
                    });

                    if (res.ok) {
                      // Add a note
                      if (reason?.value) {
                        try {
                          await fetch(`${API_BASE_URL}/tickets/${reassignTicketId}/notes`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ content: `Re-assigned to ${newEng.name}. ${reason.value}`, authorType: 'admin' })
                          });
                        } catch (e) {
                          console.error("Failed to add audit note", e);
                        }
                      }

                      setReassignModalOpen(false);
                      setReassignTicketId(null);

                      // Refresh everything immediately
                      await openTicketModal(reassignTicketId);
                      await loadTickets();
                      setSuccess(`Ticket successfully re-assigned to ${newEng.name}`);
                      setReassignTicketId(null);
                    } else {
                      const errD = await res.json().catch(() => ({}));
                      alert(`Failed to re-assign: ${errD.message || 'Unknown error'}`);
                    }
                  } catch (e) {
                    console.error(e);
                    alert('Error during re-assignment: ' + e.message);
                  }
                }}
              >
                🔄 Confirm Re-assign
              </button>
            </div>
          </div>
        </div>
      )}

      {isTicketModalOpen && selectedTicket && (
        <div className="ticket-modal-backdrop" onClick={handleCloseTicketModal} role="dialog" aria-modal="true">
          <div className="ticket-modal ticket-modal--details" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <header className="ticket-modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)' }}>
                  <FiTag />
                </div>
                <div>
                  <h2 className="ticket-modal-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em' }}>
                    Ticket <span style={{ color: '#6366f1' }}>#AIM-T-{selectedTicket.id}</span>
                  </h2>
                  <p className="ticket-modal-subtitle" style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>{selectedTicket.taskName}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className="ticket-modal-close-btn"
                  onClick={handleCloseTicketModal}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '10px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>
            </header>

            <div className="ticket-modal-content" style={{ padding: '24px' }}>
              <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Customer</label>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{selectedTicket.customerName}</span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Assigned Engineer</label>
                  <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.engineerName || '--'}</span>
                </div>

                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Service Date</label>
                  <span style={{ fontWeight: '700', color: '#10b981' }}>
                    {(() => {
                      const formatDate = (ds) => { if (!ds) return ''; const d = new Date(ds); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
                      const s = selectedTicket.taskStartDate ? String(selectedTicket.taskStartDate).split('T')[0] : '';
                      const e = selectedTicket.taskEndDate ? String(selectedTicket.taskEndDate).split('T')[0] : '';
                      if (!e || s === e) return formatDate(s); return `${formatDate(s)} - ${formatDate(e)}`;
                    })()}
                  </span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Status</label>
                  <span className={`status-pill ${selectedTicket.status?.toLowerCase().replace(' ', '-')}`} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{selectedTicket.status}</span>
                </div>

                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Scheduled Time</label>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>
                    {selectedTicket.taskTime} - {selectedTicket.taskEndTime || (selectedTicket.endTime ? selectedTicket.endTime.split('T')[1].slice(0, 5) : '--:--')}
                  </span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>City</label>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{selectedTicket.city}, {selectedTicket.country}</span>
                </div>

                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Timezone</label>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{selectedTicket.timezone || '--'}</span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Address</label>
                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{selectedTicket.addressLine1} {selectedTicket.addressLine2 && `, ${selectedTicket.addressLine2}`} - {selectedTicket.zipCode}</span>
                </div>

                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Scope of Work</label>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.5', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>{selectedTicket.scopeOfWork}</p>
                </div>

                <div style={{ gridColumn: 'span 2', height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>

                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Billing Type</label>
                  <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.billingType || 'Hourly'}</span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Currency</label>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{selectedTicket.currency || 'USD'}</span>
                </div>

                {/* Conditional Rates */}
                {selectedTicket.billingType === 'Hourly' && (
                  <div className="detail-item">
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Hourly Rate</label>
                    <span style={{ fontWeight: '700', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.hourlyRate || '0.00'}</span>
                  </div>
                )}
                {(selectedTicket.billingType === 'Monthly' || selectedTicket.billingType === 'Mixed Mode (Monthly + Hourly)') && (
                  <div className="detail-item">
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Monthly Rate</label>
                    <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.currency} {parseFloat(selectedTicket.monthlyRate || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedTicket.billingType === 'Agreed Rate' && (
                  <div className="detail-item">
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Agreed Rate</label>
                    <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.currency} {parseFloat(selectedTicket.agreedRate || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedTicket.billingType === 'Cancellation' && (
                  <div className="detail-item">
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Cancellation Fee</label>
                    <span style={{ fontWeight: '700', color: '#ef4444' }}>{selectedTicket.currency} {parseFloat(selectedTicket.cancellationFee || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiNavigation size={12} /> Travel Cost / Day
                  </label>
                  <span style={{ fontWeight: '700', color: '#0891b2' }}>{selectedTicket.currency} {parseFloat(selectedTicket.travelCostPerDay || 0).toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiTool size={12} /> Tool Cost / Day
                  </label>
                  <span style={{ fontWeight: '700', color: '#7c3aed' }}>{selectedTicket.currency} {parseFloat(selectedTicket.toolCost || 0).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '24px 0' }}></div>

              {/* Secondary Sections: Docs, Notes, Uploads, Expenses */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Linked Documents</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTicket.documentsLabel ? (
                      selectedTicket.documentsLabel.split(', ').map((docName, idx) => (
                        <div key={idx} style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600' }}>
                          <span>{docName}</span>
                          <button type="button" onClick={() => handleViewDocument(docName)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '0', display: 'flex' }}><FiEye size={14} /></button>
                        </div>
                      ))
                    ) : (<span style={{ color: '#94a3b8', fontSize: '12px' }}>No documents linked.</span>)}
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: '24px', marginBottom: '12px', display: 'block' }}>Engineer Uploads</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ticketAttachments.length === 0 ? <span style={{ color: '#94a3b8', fontSize: '12px' }}>No attachments.</span> : ticketAttachments.map((a, idx) => {
                      const isImg = a.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                      return (
                        <a 
                          key={a.id || idx} 
                          href={`https://awokta.com/${a.file_url}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ width: '100px', height: '100px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                          onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
                          onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                          {isImg ? (
                            <img src={`https://awokta.com/${a.file_url}`} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px' }}>
                              <div style={{ fontSize: '24px' }}>📄</div>
                              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px', whiteSpace: 'nowrap' }}>
                                {a.file_name || a.file_url.split('/').pop()}
                              </span>
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: '24px', marginBottom: '12px', display: 'block' }}>Reported Expenses</label>
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                    {ticketExpenses.length === 0 ? <span style={{ color: '#94a3b8', fontSize: '12px' }}>No expenses.</span> : ticketExpenses.map((ex, idx) => (
                      <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '8px', marginBottom: '6px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>{ex.description}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(ex.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontWeight: '800', color: '#10b981', fontSize: '13px' }}>{selectedTicket.currency} {parseFloat(ex.amount).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Service Notes</label>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                    {ticketNotes.length === 0 ? <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No notes yet.</p> : ticketNotes.map((n, idx) => (
                      <div key={n.id || idx} style={{ marginBottom: '12px', padding: '10px', background: n.author_type === 'admin' ? '#fff' : '#f1f5f9', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', fontWeight: '800' }}>
                          <span style={{ color: n.author_type === 'admin' ? '#6366f1' : '#64748b' }}>{n.author_type === 'admin' ? 'ADMIN' : 'ENGINEER'}</span>
                          <span style={{ color: '#94a3b8' }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#1e293b', lineHeight: '1.4' }}>{n.content}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input type="text" placeholder="Add a note..." value={newAdminNote} onChange={e => setNewAdminNote(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', outline: 'none' }} />
                    <button onClick={handleAddAdminNote} disabled={addingNote || !newAdminNote} className="btn-wow-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Send</button>
                  </div>
                </div>
              </div>

              {/* Financial Overview - Only shown for resolved or in-progress tickets with costs */}
              {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Approval Pending' || parseFloat(selectedTicket.totalCost) > 0) && (
                <div style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiDollarSign style={{ color: '#6366f1' }} /> Financial & Billing Summary
                    </h3>
                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '4px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: '20px', border: '1px solid #dbeafe', textTransform: 'uppercase' }}>
                      {selectedTicket.billing_status || 'Unbilled'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Customer Revenue</label>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{selectedTicket.currency} {parseFloat(selectedTicket.totalCost || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Engineer Payout</label>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#64748b' }}>{selectedTicket.engCurrency || selectedTicket.currency} {parseFloat(selectedTicket.engTotalCost || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '12px', borderRadius: '12px', border: '1px solid #10b981' }}>
                      <label style={{ fontSize: '9px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Estimated Margin</label>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                        {selectedTicket.currency} {(parseFloat(selectedTicket.totalCost || 0) - parseFloat(selectedTicket.engTotalCost || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {selectedTicket.status === 'Resolved' && (
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => {
                          window.location.href = '/customer-receivable';
                        }}
                        style={{ background: '#6366f1', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FiFileText /> Process Billing & Generate Invoice ➔
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ticket-modal-footer">
              <button className="btn-wow-secondary" onClick={handleCloseTicketModal}><FiX /> Close Details</button>
              {selectedTicket.status === 'Resolved' && (
                <button
                  className="btn-wow-primary"
                  onClick={() => {
                    window.location.href = '/customer-receivable';
                  }}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <FiDollarSign /> Customer Receivable ➔
                </button>
              )}
              <button
                className="btn-wow-secondary"
                onClick={() => {
                  if (!isInlineEditing) {
                    const actualStart = selectedTicket.startTime || selectedTicket.start_time;
                    const actualEnd = selectedTicket.endTime || selectedTicket.end_time;
                    if (actualStart) {
                      setInlineStartTime(formatForInput(actualStart));
                      setInlineEndTime(actualEnd ? formatForInput(actualEnd) : '');
                    } else {
                      const sd = selectedTicket.taskStartDate ? selectedTicket.taskStartDate.split('T')[0] : '';
                      const st = (selectedTicket.taskTime || '08:00').padStart(5, '0');
                      if (sd) {
                        setInlineStartTime(`${sd}T${st}`);
                        let h = parseInt(st.split(':')[0], 10) + 8;
                        let d = sd;
                        if (h >= 24) { d = new Date(new Date(`${sd}T00:00:00Z`).getTime() + 86400000).toISOString().split('T')[0]; h -= 24; }
                        setInlineEndTime(`${d}T${String(h).padStart(2, '0')}:${st.split(':')[1]}`);
                      }
                    }
                    const bt = selectedTicket.breakTime !== undefined ? selectedTicket.breakTime : selectedTicket.break_time;
                    setInlineBreakTime(bt ? Math.floor(Number(bt) / 60) : '0');
                  }
                  setIsInlineEditing(!isInlineEditing);
                }}
              >
                {isInlineEditing ? <><FiX /> Cancel</> : <><FiEdit2 /> Edit Time</>}
              </button>
              {isInlineEditing && <button className="tickets-primary-btn" onClick={handleUpdateInlineTime} disabled={isUpdatingTime}>{isUpdatingTime ? 'Saving...' : 'Confirm Changes'}</button>}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

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
        disabled={total === current}
        onClick={() => onChange(current + 1)}
        style={{ minWidth: '80px', padding: '8px 16px' }}
      >
        Next
      </button>
    </div>
  )
}

export default TicketsPage
