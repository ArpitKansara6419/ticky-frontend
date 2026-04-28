// TicketsPage.jsx - Support Tickets list + Create / Edit Ticket form
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { FiEye, FiEdit2, FiTrash2, FiX, FiDownload, FiClock, FiGlobe, FiDollarSign, FiInfo } from 'react-icons/fi'
import Autocomplete from 'react-google-autocomplete'
import './TicketsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDLND9h_AWApPg9gQVYZhhsPmIHMuN-6fg'

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

const getWorkingDaysInMonth = (dateStr, countryName) => {
  if (!dateStr) return 22;
  const date = new Date(dateStr);
  const month = date.getMonth();
  const year = date.getFullYear();
  const holidays = HOLIDAYS_CALC[countryName] || HOLIDAYS_CALC['India'] || [];
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

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
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
  const [statusFilter, setStatusFilter] = useState('All Status')

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

  // Smart Auto-Sync for Start & End Time based on Task Details
  // TIMEZONE-SAFE: builds wall-clock strings directly without new Date() to avoid local TZ shifts
  const autoSyncTime = (startDate, endDate, timeStr) => {
    if (viewMode === 'form' && startDate && timeStr) {
      const time = timeStr.padStart(5, '0');
      setStartTime(`${startDate}T${time}`);

      if (endDate) {
        if (startDate === endDate) {
          // Add 8 hours as default working block — pure string arithmetic, no TZ conversion
          const [hStr, mStr] = time.split(':');
          const pad = (n) => String(n).padStart(2, '0');
          let h = parseInt(hStr, 10) + 8;
          let d = endDate;
          if (h >= 24) {
            // Overflow to next day
            const baseDate = new Date(`${endDate}T00:00:00Z`);
            baseDate.setUTCDate(baseDate.getUTCDate() + 1);
            d = `${baseDate.getUTCFullYear()}-${pad(baseDate.getUTCMonth() + 1)}-${pad(baseDate.getUTCDate())}`;
            h = h - 24;
          }
          setEndTime(`${d}T${pad(h)}:${mStr}`);
        } else {
          setEndTime(`${endDate}T${time}`);
        }
      }
    }
  }

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

  const getDatesInRange = (start, end) => {
    const dates = [];
    if (!start || !end) return dates;

    // Use UTC midnights to avoid local offset shifts for YYYY-MM-DD strings
    let curr = new Date(`${start}T00:00:00Z`);
    const stop = new Date(`${end}T00:00:00Z`);

    // Safety cap to prevent infinity if dates are invalid
    let count = 0;
    while (curr <= stop && count < 366) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setUTCDate(curr.getUTCDate() + 1);
      count++;
    }
    return dates;
  };

  // Returns the count of working days (Mon-Fri, non-holiday) in the month of the given dateStr
  const getWorkingDaysInMonth = (dateStr, countryName) => {
    if (!dateStr) return 22; // safe fallback
    const HOLIDAYS_BY_COUNTRY = {
      'India': ['2026-01-26','2026-03-21','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-27','2026-06-26','2026-08-15','2026-08-26','2026-10-02','2026-10-20','2026-11-08','2026-11-24','2026-12-25'],
      'Poland': ['2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-03','2026-06-04','2026-08-15','2026-11-01','2026-11-11','2026-12-25','2026-12-26'],
      'Other': []
    };
    const holidays = HOLIDAYS_BY_COUNTRY[countryName] || HOLIDAYS_BY_COUNTRY['India'] || [];
    const d = new Date(`${dateStr}T00:00:00Z`);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    // First and last day of month
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay  = new Date(Date.UTC(year, month + 1, 0));
    let workingDays = 0;
    let cur = new Date(firstDay);
    while (cur <= lastDay) {
      const dayOfWeek = cur.getUTCDay();
      const iso = cur.toISOString().split('T')[0];
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(iso)) {
        workingDays++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return workingDays || 22;
  };

  // Pure calculation function for reuse
  const calculateTicketTotal = (opts) => {
    const {
      startTime: sParam, endTime: eParam, breakTime: bParam,
      hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
      travelCostPerDay, toolCost, billingType, timezone, calcTimezone, country,
      overtimeRate, oohRate, weekendRate, holidayRate,
      _isLogAggregation
    } = opts;

    if (!sParam || !eParam) return null;

    try {
      // Use parameters, fallback to strings if needed
      const sStr = String(sParam);
      const eStr = String(eParam);

      // Parse as UTC to treat as 'wall-clock' time
      const s = new Date(sStr.includes('Z') || sStr.includes('+') ? sStr : sStr.replace(' ', 'T') + 'Z');
      const e = new Date(eStr.includes('Z') || eStr.includes('+') ? eStr : eStr.replace(' ', 'T') + 'Z');
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

      const brkSec = (parseInt(bParam) || 0) * 60;
      const totSec = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brkSec);
      const hrs = totSec / 3600;

      const targetTZ = (calcTimezone && calcTimezone !== 'Ticket Local') ? calcTimezone : (timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

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
      const activeHols = HOLIDAYS_BY_COUNTRY[country] || HOLIDAYS_BY_COUNTRY['India'] || [];
      const isHoliday = activeHols.includes(startInfo.dateStr) || activeHols.includes(endInfo.dateStr);
      // FORCE UTC check for deterministic weekend logic
      const dSafe = new Date(`${startInfo.dateStr}T00:00:00Z`);
      const isWeekend = dSafe.getUTCDay() === 0 || dSafe.getUTCDay() === 6;
      
      // Visual hours check for OOH
      let startHr = startInfo.hour;
      let endHr = endInfo.hour;
      if (opts.startTime && opts.startTime.includes('T')) {
        startHr = parseInt(opts.startTime.split('T')[1].split(':')[0], 10);
      }
      if (opts.endTime && opts.endTime.includes('T')) {
        endHr = parseInt(opts.endTime.split('T')[1].split(':')[0], 10);
      }
      const workIsOOH = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

      let base = 0, ot = 0, ooh = 0, special = 0;
      const hr = parseFloat(opts.hourlyRate) || 0;
      const hd = parseFloat(opts.halfDayRate) || 0;
      const fd = parseFloat(opts.fullDayRate) || 0;
      const bil = opts.billingType;

      // Rate Overrides from Engineer Profile if provided
      const customOTRate = parseFloat(overtimeRate) || (hr * 1.5);
      const customOOHRate = parseFloat(oohRate) || (hr * 1.5);
      const customWeekendRate = parseFloat(weekendRate) || (hr * 2.0);
      const customHolidayRate = parseFloat(holidayRate) || (hr * 2.0);

      if (bil === 'Hourly') {
        const b = Math.max(2, hrs);
        base = b * hr;

      } else if (bil === 'Half Day + Hourly') {
        if (hrs <= 4) {
          base = hd;
        } else {
          base = hd + ((hrs - 4) * hr);
        }

      } else if (bil === 'Full Day + OT') {
        base = fd;
        if (hrs > 8) {
          ot = (hrs - 8) * customOTRate;
        }

      } else if (bil === 'Mixed Mode') {
        if (hrs <= 4) {
          base = hd;
        } else if (hrs <= 8) {
          base = fd;
        } else {
          base = fd;
          ot = (hrs - 8) * customOTRate;
        }

      } else if (bil.includes('Monthly')) {
        const fullRate = parseFloat(opts.monthlyRate) || 0;
        const divisor = (opts.monthlyDivisor && opts.monthlyDivisor > 0) ? opts.monthlyDivisor : 22; 
        base = fullRate / divisor;
        if (hrs > 8) ot = (hrs - 8) * customOTRate;
        
        opts._perDayRate    = base;
        opts._workingDays   = divisor;
        opts._monthlyFull   = fullRate;

      } else if (bil === 'Agreed Rate') {
        base = parseFloat(opts.agreedRate) || 0;

      } else if (bil === 'Cancellation') {
        base = parseFloat(opts.cancellationFee) || 0;
      }

      // Add Special Day premium if applicable
      if (isWeekend) {
        special = customWeekendRate;
      } else if (isHoliday) {
        special = customHolidayRate;
      }

      // Add OOH premium if applicable
      if (workIsOOH && bil !== 'Agreed Rate' && bil !== 'Cancellation') {
        ooh = hrs * customOOHRate;
      }
      const travelVal = parseFloat(opts.travelCostPerDay || 0);
      const toolCostRaw = parseFloat(opts.toolCost || 0);
      const toolsVal = _isLogAggregation ? 0 : toolCostRaw; // Skip tools in multi-day aggregation loop

      // If this is a log entry in a multi-day job, Agreed Rate and Cancellation Fee are calculated once in the parent loop
      let effectiveBase = base;
      if (_isLogAggregation && (bil === 'Agreed Rate' || bil === 'Cancellation')) {
        effectiveBase = 0;
      }

      const grand = effectiveBase + ot + ooh + special + travelVal + toolsVal;

      return {
        hrs: hrs.toFixed(2),
        base: base.toFixed(2),
        ot: ot.toFixed(2),
        ooh: ooh.toFixed(2),
        specialDay: special.toFixed(2),
        tools: toolsVal.toFixed(2),
        travel: travelVal.toFixed(2),
        grandTotal: grand.toFixed(2),
        isOOH: workIsOOH,
        isSpecialDay: isWeekend || isHoliday,
        perDayRate:   opts._perDayRate   != null ? parseFloat(opts._perDayRate).toFixed(2)   : null,
        workingDays:  opts._workingDays  != null ? opts._workingDays                          : null,
        monthlyFull:  opts._monthlyFull  != null ? parseFloat(opts._monthlyFull).toFixed(2)   : null,
      };
    } catch (err) { return null; }
  };

  useEffect(() => {
    // Enable live calculations for both view mode AND creation/editing mode
    // if (isFillingForm) return; <--- REMOVED TO ALLOW LIVE SUMMARIES WHILE FILLING FORM
    // Also treat Monthly billing as multi-day calendar view even if start==end
    const isMultiDay = (taskStartDate && taskEndDate && taskStartDate !== taskEndDate) || (billingType.includes('Monthly') && taskStartDate && taskEndDate);
    const daysArr = isMultiDay ? getDatesInRange(taskStartDate, taskEndDate) : [];
    const numDays = daysArr.length || 1;

    if (isMultiDay) {
      // Pre-compute working days within ticket date range for Monthly per-day rate
      const calcHols = HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || [];
      const monthlyDivisor = getWorkingDaysInMonth(taskStartDate, country);

      let totalReceivable = 0;
      let totalPayout = 0;
      let totalHrs = 0;
      let validDaysCount = 0;
      let combinedBreakdown = { hrs: '0.00', grandTotal: '0.00', base: '0.00', ot: '0.00', ooh: '0.00', specialDay: '0.00', tools: '0.00', travel: '0.00', days: 0, perDayRate: null, workingDays: null, monthlyFull: null };
      let engSummaryMap = {};

      daysArr.forEach((d) => {
        const existing = (timeLogs || []).find(l => {
          const rawDate = l.task_date || l.taskDate || '';
          if (!rawDate) return false;
          // Clean the date strings to ensure perfect matching (YYYY-MM-DD)
          const dateOnly = rawDate.toString().split('T')[0].split(' ')[0].trim();
          return dateOnly === d;
        });

        // Skip Weekends/Holidays unless an existing log was manually recorded for that day
        // FORCE UTC to avoid local timezone shifting "YYYY-MM-DD" to the previous day
        const dObj = new Date(`${d}T00:00:00Z`);
        const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
        const activeHols = HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || [];
        const isHoliday = activeHols.includes(d);

        // FORCE skip Weekends and Holidays completely as per user requirement
        if (isWeekend || isHoliday) {
          return;
        }

        let sTime, eTime, bMins = 0, specificEngId = null;
        if (existing) {
          specificEngId = existing.engineer_id || existing.engineerId || null;
        }

        if (existing && (existing.start_time || existing.startTime)) {
          sTime = existing.start_time || existing.startTime;
          eTime = existing.end_time || existing.endTime;
          bMins = existing.break_time_mins || existing.breakTime || 0;
        } else {
          const cleanTime = (taskTime && taskTime.includes(':')) ? taskTime.padStart(5, '0') : '09:00';
          sTime = `${d}T${cleanTime}:00Z`;
          const sDate = new Date(sTime);
          if (isNaN(sDate.getTime())) return;
          const eTimeDate = new Date(sDate.getTime() + (8 * 3600 * 1000));
          eTime = eTimeDate.toISOString().replace('Z', '');
        }

        const dayMonthlyDivisor = getWorkingDaysInMonth(d, country);

        const currentEngId = Number(specificEngId || engineerId);
        const isNoEngDay = currentEngId === 0;

        // ── CUSTOMER RECEIVABLE RATES ─────────────────────────────────────────────
        let rRates = {
          hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate,
          ar: agreedRate, cf: cancellationFee, bt: billingType
        };
        if (isNoEngDay) {
          rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
        } else if (specificEngId && Number(specificEngId) !== Number(engineerId)) {
          const subEng = engineers.find(en => Number(en.id) === currentEngId);
          if (subEng) {
            rRates = {
              hr: subEng.hourly_rate   || 0,
              hd: subEng.half_day_rate || 0,
              fd: subEng.full_day_rate || 0,
              mr: subEng.monthly_rate  || 0,
              ar: subEng.agreed_rate   || 0,
              cf: subEng.cancellation_fee || 0,
              bt: subEng.billing_type  || billingType
            };
          }
        }

        const res = calculateTicketTotal({
          startTime: sTime, endTime: eTime, breakTime: bMins,
          hourlyRate: rRates.hr, halfDayRate: rRates.hd, fullDayRate: rRates.fd, 
          monthlyRate: rRates.mr, agreedRate: rRates.ar, cancellationFee: rRates.cf,
          travelCostPerDay, toolCost: toolCostInput, billingType: rRates.bt, 
          timezone, calcTimezone, country, monthlyDivisor: dayMonthlyDivisor,
          _isLogAggregation: true
        });

        // ── ENGINEER PAYOUT RATES ────────────────────────────────────────────────
        let pRates = {
          hourlyRate: engHourlyRate || 0, halfDayRate: engHalfDayRate || 0, fullDayRate: engFullDayRate || 0,
          monthlyRate: engMonthlyRate || 0, agreedRate: engAgreedRate || 0, cancellationFee: engCancellationFee || 0,
          billingType: engBillingType,
          overtimeRate: 0, oohRate: 0, weekendRate: 0, holidayRate: 0
        };
        
        // Find rates for the main engineer if using Default or Custom
        if (engPayType === 'Custom') {
           pRates.overtimeRate = engOvertimeRate || 0;
           pRates.oohRate      = engOohRate      || 0;
           pRates.weekendRate  = engWeekendRate  || 0;
           pRates.holidayRate  = engHolidayRate  || 0;
        } else {
           const mainEng = engineers.find(e => Number(e.id) === Number(engineerId));
           if (mainEng) {
             pRates.overtimeRate = mainEng.overtime_rate || 0;
             pRates.oohRate      = mainEng.ooh_rate      || 0;
             pRates.weekendRate  = mainEng.weekend_rate  || 0;
             pRates.holidayRate  = mainEng.holiday_rate  || 0;
           }
        }

        if (isNoEngDay) {
          pRates = { hourlyRate: 0, halfDayRate: 0, fullDayRate: 0, monthlyRate: 0, agreedRate: 0, cancellationFee: 0, billingType: 'Hourly', overtimeRate: 0, oohRate: 0, weekendRate: 0, holidayRate: 0 };
        } else if (specificEngId && Number(specificEngId) !== Number(engineerId)) {
          const currentEng = engineers.find(e => Number(e.id) === currentEngId);
          if (currentEng) {
            pRates = {
              hourlyRate: currentEng.hourly_rate || 0, halfDayRate: currentEng.half_day_rate || 0, fullDayRate: currentEng.full_day_rate || 0,
              monthlyRate: currentEng.monthly_rate || 0, agreedRate: currentEng.agreed_rate || 0, cancellationFee: currentEng.cancellation_fee || 0,
              billingType: currentEng.billing_type || 'Hourly',
              overtimeRate: currentEng.overtime_rate || 0,
              oohRate:      currentEng.ooh_rate      || 0,
              weekendRate:  currentEng.weekend_rate  || 0,
              holidayRate:  currentEng.holiday_rate  || 0
            };
          }
        }

        const payRes = calculateTicketTotal({
          startTime: sTime, endTime: eTime, breakTime: bMins,
          hourlyRate: pRates.hourlyRate, halfDayRate: pRates.halfDayRate, fullDayRate: pRates.fullDayRate,
          monthlyRate: pRates.monthlyRate, agreedRate: pRates.agreedRate, cancellationFee: pRates.cancellationFee,
          overtimeRate: pRates.overtimeRate, oohRate: pRates.oohRate, weekendRate: pRates.weekendRate, holidayRate: pRates.holidayRate,
          travelCostPerDay: 0, toolCost: 0, billingType: pRates.billingType, timezone, calcTimezone,
          monthlyDivisor: dayMonthlyDivisor, country,
          _isLogAggregation: true
        });

        if (res) {
          totalReceivable += parseFloat(res.grandTotal);
          totalHrs += parseFloat(res.hrs);
          combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + parseFloat(res.base)).toFixed(2);
          combinedBreakdown.ot = (parseFloat(combinedBreakdown.ot) + parseFloat(res.ot)).toFixed(2);
          combinedBreakdown.ooh = (parseFloat(combinedBreakdown.ooh) + parseFloat(res.ooh)).toFixed(2);
          combinedBreakdown.specialDay = (parseFloat(combinedBreakdown.specialDay) + parseFloat(res.specialDay)).toFixed(2);
          combinedBreakdown.travel = (parseFloat(combinedBreakdown.travel) + parseFloat(res.travel)).toFixed(2);
          combinedBreakdown.tools = (parseFloat(combinedBreakdown.tools) + parseFloat(res.tools)).toFixed(2);
          validDaysCount += 1;
          
          // Track monthly divisors for the summary bar
          const mKey = d.substring(0, 7);
          if (!combinedBreakdown.monthlyRecords) combinedBreakdown.monthlyRecords = [];
          let mRec = combinedBreakdown.monthlyRecords.find(r => r.month === mKey);
          if (!mRec) {
            mRec = { month: mKey, divisor: dayMonthlyDivisor, rate: monthlyRate, workedDaysCount: 0 };
            combinedBreakdown.monthlyRecords.push(mRec);
          }
          mRec.workedDaysCount += 1;
        }
        if (payRes) {
          const pVal = parseFloat(payRes.grandTotal);
          totalPayout += pVal;
          // Use specificEngId from the log, fallback to the main ticket engineer
          const currentEngId = (specificEngId !== null && specificEngId !== undefined) ? Number(specificEngId) : Number(engineerId);
          
          if (!isNaN(currentEngId)) {
            const currentEng = engineers.find(e => Number(e.id) === currentEngId);
            
            let eName = 'Substitute Engineer';
            if (currentEng) {
              eName = currentEng.name;
            } else if (currentEngId === Number(engineerId) && engineerName) {
              eName = engineerName;
            } else if (existing && (existing.engineer_name || existing.engineerName)) {
              eName = existing.engineer_name || existing.engineerName;
            } else if (currentEngId === 0) {
              eName = 'No Engineer / Absent';
            } else {
              eName = `Engineer (ID: ${currentEngId})`;
            }
            
            if (!engSummaryMap[currentEngId]) {
              engSummaryMap[currentEngId] = { name: eName, total: 0, isNoEng: currentEngId === 0 };
            }
            engSummaryMap[currentEngId].total += pVal;
          }
        }
      });

      combinedBreakdown.days = validDaysCount;
      
      // Add one-time costs after the loop
      if (billingType === 'Agreed Rate') {
        const arVal = parseFloat(agreedRate) || 0;
        totalReceivable += arVal;
        combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + arVal).toFixed(2);
      } else if (billingType === 'Cancellation') {
        const cfVal = parseFloat(cancellationFee) || 0;
        totalReceivable += cfVal;
        combinedBreakdown.base = (parseFloat(combinedBreakdown.base) + cfVal).toFixed(2);
      }
      
      // Add Tool Cost per working day
      const tCost = parseFloat(toolCostInput) || 0;
      const totalToolCost = tCost * validDaysCount;
      totalReceivable += totalToolCost;
      combinedBreakdown.tools = (parseFloat(combinedBreakdown.tools) + totalToolCost).toFixed(2);

      // Engineer Payout One-Time costs
      Object.keys(engSummaryMap).forEach(eid => {
        // If it's the main engineer, or if we have engRates state for them
        // For simplicity, we add the Agreed/Tool cost to the main engineer or split it?
        // Usually, Agreed Rate is for the WHOLE TICKET. We'll add it once to the engSummary.
        // If there are multiple engineers, we might need a better logic, but for now we'll add it to the first one found or main.
        // Actually, let's add it to the totalPayout once.
      });

      // Tool Cost & Travel Cost are customer-side charges — excluded from engineer payout
      const pOneTime = (billingType === 'Agreed Rate' ? (parseFloat(engAgreedRate) || 0) : (billingType === 'Cancellation' ? (parseFloat(engCancellationFee) || 0) : 0));
      totalPayout += pOneTime;

      // Attribute one-time fees (Agreed Rate, Tool Cost) to the main ticket engineer in the summary
      if (engineerId && engSummaryMap[engineerId]) {
        engSummaryMap[engineerId].total += pOneTime;
      } else if (engineerId && !engSummaryMap[engineerId]) {
         const eng = engineers.find(e => Number(e.id) === Number(engineerId));
         engSummaryMap[engineerId] = { name: eng ? eng.name : engineerName || 'Main Engineer', total: pOneTime };
      }

      const finalGrandTotal = totalReceivable.toFixed(2);
      setLiveBreakdown({ ...combinedBreakdown, hrs: totalHrs.toFixed(2), grandTotal: finalGrandTotal });
      setTotalCost(finalGrandTotal);
      setPayoutLiveBreakdown({ grandTotal: totalPayout.toFixed(2), engSummary: Object.values(engSummaryMap) });

    } else {
      const singleDayDivisor = getWorkingDaysInMonth(taskStartDate, country);
      const res = calculateTicketTotal({
        startTime, endTime, breakTime,
        hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
        travelCostPerDay, toolCost: toolCostInput, billingType, timezone, calcTimezone,
        monthlyDivisor: singleDayDivisor, country
      });
      setLiveBreakdown({ 
        ...res, 
        days: 1, 
        monthlyRecords: [{ month: taskStartDate.substring(0, 7), divisor: singleDayDivisor, rate: monthlyRate }] 
      });
      if (res && res.grandTotal) {
        setTotalCost(res.grandTotal);
      }

      // Find rates for the main engineer if using Default or Custom
      let pRates = { ot: 0, ooh: 0, we: 0, hol: 0 };
      if (engPayType === 'Custom') {
        pRates.ot = engOvertimeRate || 0;
        pRates.ooh = engOohRate || 0;
        pRates.we = engWeekendRate || 0;
        pRates.hol = engHolidayRate || 0;
      } else {
         const mainE = engineers.find(e => Number(e.id) === Number(engineerId));
         if (mainE) {
           pRates.ot = mainE.overtime_rate || 0;
           pRates.ooh = mainE.ooh_rate || 0;
           pRates.we = mainE.weekend_rate || 0;
           pRates.hol = mainE.holiday_rate || 0;
         }
      }

      const payRes = calculateTicketTotal({
        startTime, endTime, breakTime,
        hourlyRate: engHourlyRate || 0,
        halfDayRate: engHalfDayRate || 0,
        fullDayRate: engFullDayRate || 0,
        monthlyRate: engMonthlyRate || 0,
        agreedRate: engAgreedRate || 0,
        cancellationFee: engCancellationFee || 0,
        overtimeRate: pRates.ot, oohRate: pRates.ooh, weekendRate: pRates.we, holidayRate: pRates.hol,
        travelCostPerDay: 0, toolCost: 0, billingType: engBillingType, timezone, calcTimezone,
        country // Travel & Tool Cost excluded from engineer payout
      });

      if (payRes) {
        const eng = engineers.find(e => Number(e.id) === Number(engineerId));
        const eName = eng ? eng.name : (engineerName || 'Lead Engineer');
        setPayoutLiveBreakdown({ 
          grandTotal: payRes.grandTotal, 
          engSummary: [{ name: eName, total: parseFloat(payRes.grandTotal) }] 
        });
      }
    }
  }, [
    startTime, endTime, breakTime, taskStartDate, taskEndDate, taskTime,
    hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee,
    engHourlyRate, engHalfDayRate, engFullDayRate, engMonthlyRate, engAgreedRate, engCancellationFee,
    engOvertimeRate, engOohRate, engWeekendRate, engHolidayRate,
    travelCostPerDay, toolCostInput, billingType, engBillingType, engPayType, timezone, calcTimezone, timeLogs, isFillingForm, country
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
        engBillingType: t.engBillingType ?? t.eng_billing_type ?? 'Hourly',
        engPayType: t.engPayType ?? t.eng_pay_type ?? 'Default'
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

      const validDates = dates.filter(dStr => {
        const dObj = new Date(`${dStr}T00:00:00Z`);
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
        if (existing) return existing;

        const sTime = `${dStr}T${ct}:00.000Z`;
        const startD = new Date(sTime);
        let eTime = '';
        if (!isNaN(startD.getTime())) {
          eTime = new Date(startD.getTime() + (8 * 3600 * 1000)).toISOString();
        }
        return {
          task_date: dStr,
          start_time: sTime,
          end_time: eTime,
          break_time_mins: 0,
          engineer_id: engineerId || null
        };
      });

      // Simple deep equality check or just check length/dates to avoid infinite loops
      const currentDates = timeLogs.filter(l => l.task_date).map(l => l.task_date.split('T')[0]).join(',');
      const targetDates = validDates.join(',');
      if (currentDates !== targetDates) {
        setTimeLogs(newLogs);
      }
    }
  }, [taskStartDate, taskEndDate, taskTime, editingTicketId, leadType, engineerId]);

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
    if (statusFilter !== 'All Status') {
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
    if (!canSubmit) {
      setError('Please fill all required fields.')
      return
    }

    try {
      setSaving(true)
      setSuccess('')

      // BACKFILL: If activity times are empty, sync them with scheduled details before sending
      let finalStartTime = startTime;
      let finalEndTime = endTime;

      if (!finalStartTime && taskStartDate && taskTime) {
        finalStartTime = `${taskStartDate}T${taskTime.padStart(5, '0')}`;
      }
      if (!finalEndTime && taskEndDate && taskTime) {
        // Default to finish same day + 8 hours if no explicit end time
        const d = new Date(`${taskEndDate}T${taskTime.padStart(5, '0')}`);
        d.setHours(d.getHours() + 8);
        const pad = (n) => String(n).padStart(2, '0');
        finalEndTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
        agreedRate: agreedRate !== '' && agreedRate !== null ? Number(agreedRate) : 0,
        travelCostPerDay: travelCostPerDay !== '' ? Number(travelCostPerDay) : null,
        toolCost: toolCostInput !== '' ? Number(toolCostInput) : 0, // Dedicated tool cost — server auto-calculates grand total
        billingType,
        leadType,
        cancellationFee: cancellationFee !== '' && cancellationFee !== null ? Number(cancellationFee) : 0,
        status: status,
        taskStartDate: finalTaskStartDate ? String(finalTaskStartDate).split('T')[0] : null,
        taskEndDate: finalTaskEndDate ? String(finalTaskEndDate).split('T')[0] : null,
        startTime: finalStartTime,
        endTime: finalEndTime,
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
        totalCost: Number(totalCost) || 0,
        engTotalCost: Number(payoutLiveBreakdown?.grandTotal) || 0,
        timeLogs: (leadType === 'Dispatch' || (taskStartDate && taskEndDate && (taskStartDate !== taskEndDate || billingType.includes('Monthly')))) ? timeLogs : []
      }

      // --- EARLY RESOLVE APPROVAL LOGIC ---
      // If user tries to manually set status to 'Resolved' but the task end date is in the future
      if (status === 'Resolved' && taskEndDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledEnd = new Date(taskEndDate);
        scheduledEnd.setHours(0, 0, 0, 0);

        if (scheduledEnd > today) {
          const reason = window.prompt("You are resolving this ticket earlier than the scheduled end date. Please provide a reason for the approval request:", "Job completed early");
          if (reason === null) {
            setSaving(false);
            return; // User cancelled
          }
          payload.status = 'Approval Pending';
          payload.reason = reason;
          payload.resolveDate = today.toISOString().split('T')[0];
        }
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

      // LEAD SYNC: If this ticket is linked to a lead, update the lead's dates too
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
            let cur = new Date(stStart + 'T00:00:00Z');
            const end = new Date(stEnd + 'T00:00:00Z');
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
    // The DB stores snake_case; the UI sends camelCase. We must mirror BOTH
    // directions so that every renderer (Edit form, View modal) updates instantly.
    const patch = { ...data };
    if ('engineerId'    in data) patch.engineer_id      = Number(data.engineerId);
    if ('startTime'     in data) patch.start_time       = data.startTime;
    if ('endTime'       in data) patch.end_time         = data.endTime;
    if ('breakTimeMins' in data) patch.break_time_mins  = Number(data.breakTimeMins);
    if ('taskDate'      in data) patch.task_date        = data.taskDate;

    // ── OPTIMISTIC LOCAL UPDATE ──────────────────────────────────────────────
    // Apply normalised patch immediately so the UI reflects the change with
    // no flicker and no focus loss.
    const applyPatch = prev =>
      (prev || []).map(l => l.id === logId ? { ...l, ...patch } : l);

    setTimeLogs(applyPatch);

    // Mirror into selectedTicket so View Details modal stays in sync
    if (selectedTicket && Number(selectedTicket.id) === Number(ticketId)) {
      setSelectedTicket(prev => ({
        ...prev,
        time_logs: applyPatch(prev.time_logs || [])
      }));
    }

    // ── CREATE MODE — no DB call ─────────────────────────────────────────────
    if (isFillingForm && !editingTicketId) {
      if (!logId) {
        setTimeLogs(prev => {
          const next = [...prev];
          const dMatch = patch.task_date;
          if (!dMatch) return prev;
          const idx = next.findIndex(l =>
            (l.task_date || '').split('T')[0] === dMatch.split('T')[0]
          );
          if (idx > -1) next[idx] = { ...next[idx], ...patch };
          else next.push({ ...patch });
          return next;
        });
      }
      return;
    }

    // ── EDIT MODE — persist to server ────────────────────────────────────────
    if (!logId) return;

    setIsUpdatingLog(logId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/tickets/${ticketId}/time-logs/${logId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)   // send original camelCase to API
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Server update failed');
      }

      // ── RE-FETCH & NORMALISE ─────────────────────────────────────────────
      // After a successful save, pull fresh logs from the server so that
      // engineer rates, times, etc. are perfectly up-to-date in BOTH the
      // Edit form AND the View Details modal.
      const refreshRes = await fetch(
        `${API_BASE_URL}/tickets/${ticketId}/time-logs`,
        { credentials: 'include' }
      );
      if (refreshRes.ok) {
        const raw = await refreshRes.json();
        const freshLogs = Array.isArray(raw)
          ? raw
          : (raw.timeLogs || raw.logs || []);

        const normalized = freshLogs.map(l => ({
          ...l,
          // Guarantee both snake_case and camelCase exist for every renderer
          engineer_id:     l.engineer_id     != null ? Number(l.engineer_id)     : (l.engineerId != null ? Number(l.engineerId) : null),
          start_time:      l.start_time      ?? l.startTime      ?? null,
          end_time:        l.end_time        ?? l.endTime        ?? null,
          break_time_mins: l.break_time_mins ?? l.breakTimeMins  ?? l.breakTime  ?? 0,
          task_date:       l.task_date       ?? l.taskDate       ?? null,
        }));

        setTimeLogs(normalized);

        // Sync into View Details modal if it is open
        if (selectedTicket && Number(selectedTicket.id) === Number(ticketId)) {
          setSelectedTicket(prev => ({ ...prev, time_logs: normalized }));
        }
      }

      // Auto-hold: silently flag ticket if shift > 8 h
      if (data.startTime && data.endTime) {
        const hrs =
          (new Date(data.endTime) - new Date(data.startTime)) / 3_600_000
          - ((data.breakTimeMins || 0) / 60);
        if (hrs > 8) {
          fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'On Hold' })
          });
        }
      }

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
          let cur = new Date(sStr + 'T00:00:00Z');
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
    setIsFillingForm(true);
    setLiveBreakdown(null);
    setPayoutLiveBreakdown(null);
    setCustomerId(normalized.customerId ? String(normalized.customerId) : '')
    setLeadId(normalized.leadId ? String(normalized.leadId) : '')
    setClientName(normalized.clientName || '')
    setTaskName(normalized.taskName || '')
    setTaskStartDate(normalized.taskStartDate)
    setTaskEndDate(normalized.taskEndDate)
    setTaskTime(normalized.taskTime || '00:00')
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
        setEngineerId(parsedLead.engineerId ? String(parsedLead.engineerId) : '')
        setEngineerName(parsedLead.engineerName || '')
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
          autoSyncTime(sDateOnly, eDateOnly, lTime);
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
        autoSyncTime(sDateOnly, eDateOnly, lTime);
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

  const syncProfileRates = useCallback(() => {
    if (engineerId && engineers.length > 0 && engPayType === 'Default') {
      const eng = engineers.find(e => String(e.id) === String(engineerId));
      if (eng) {
        console.log(`[SYNC] Auto-populating profile rates for ${eng.name}`);
        setEngBillingType(eng.billing_type || 'Hourly');
        setEngHourlyRate(String(eng.hourly_rate != null ? eng.hourly_rate : '0.00'));
        setEngHalfDayRate(String(eng.half_day_rate != null ? eng.half_day_rate : '0.00'));
        setEngFullDayRate(String(eng.full_day_rate != null ? eng.full_day_rate : '0.00'));
        setEngMonthlyRate(String(eng.monthly_rate != null ? eng.monthly_rate : '0.00'));
        setEngAgreedRate(String(eng.agreed_rate || '0.00'));
        setEngCancellationFee(String(eng.cancellation_fee != null ? eng.cancellation_fee : '0.00'));
        setEngCurrency(eng.currency || 'USD');
      }
    }
  }, [engineerId, engineers, engPayType]);

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
    const daysInRange = getDatesInRange(taskStartDate, taskEndDate);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)' }}>{editingTicketId ? '⚒️' : '🆕'}</div>
            <div>
              <h1 className="tickets-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em' }}>
                {editingTicketId ? 'Edit Ticket' : 'Create Ticket'}
              </h1>
              <p className="tickets-subtitle" style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>
                {editingTicketId ? `Refining details for #AIM-T-${editingTicketId}` : 'Initiate a new support session'}
              </p>
            </div>
          </div>
        </header>

        <form className="tickets-form" onSubmit={handleSubmitTicket}>
          {leadId && (
            <div className="lead-sync-alert" style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#1e40af',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '20px' }}>ℹ️</span>
              <div>
                This ticket is linked to <strong>Lead #L-{leadId}</strong>.
                <span style={{ display: 'block', fontSize: '12px', color: '#60a5fa', marginTop: '4px' }}>
                  Fully Automatic Sync Active: Any changes made here will automatically update the linked Lead.
                </span>
              </div>
            </div>
          )}
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
                  onChange={(e) => {
                    setTaskStartDate(e.target.value);
                    autoSyncTime(e.target.value, taskEndDate, taskTime);
                  }}
                />
              </label>

              <label className="tickets-field">
                <span>
                  Task End Date <span className="field-required">*</span>
                </span>
                <input
                  type="date"
                  value={taskEndDate}
                  onChange={(e) => {
                    setTaskEndDate(e.target.value);
                    autoSyncTime(taskStartDate, e.target.value, taskTime);
                  }}
                />
              </label>

              <label className="tickets-field">
                <span>
                  Task Time <span className="field-required">*</span>
                </span>
                <input type="time" value={taskTime} onChange={(e) => {
                  setTaskTime(e.target.value);
                  autoSyncTime(taskStartDate, taskEndDate, e.target.value);
                }} />
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
                    if (eng) {
                      setEngineerName(eng.name)
                      // Auto-sync Engineer's default billing type if not already overridden
                      if (engPayType === 'Default') {
                        setEngBillingType(eng.billing_type || 'Hourly')
                        setEngHourlyRate(eng.hourly_rate != null ? String(eng.hourly_rate) : '')
                        setEngHalfDayRate(eng.half_day_rate != null ? String(eng.half_day_rate) : '')
                        setEngFullDayRate(eng.full_day_rate != null ? String(eng.full_day_rate) : '')
                        setEngMonthlyRate(eng.monthly_rate != null ? String(eng.monthly_rate) : '')
                        setEngAgreedRate(eng.agreed_rate || '')
                        setEngCancellationFee(eng.cancellation_fee != null ? String(eng.cancellation_fee) : '')
                        setEngOvertimeRate(eng.overtime_rate != null ? String(eng.overtime_rate) : '')
                        setEngOohRate(eng.ooh_rate != null ? String(eng.ooh_rate) : '')
                        setEngWeekendRate(eng.weekend_rate != null ? String(eng.weekend_rate) : '')
                        setEngHolidayRate(eng.holiday_rate != null ? String(eng.holiday_rate) : '')
                        setEngCurrency(eng.currency || 'USD')
                      }
                    }
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

              {engineerId && (
                <div style={{ marginTop: '20px', gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiDollarSign style={{ color: '#2563eb' }} /> Engineer Payout Configuration
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="payout-type-selector" style={{ background: engPayType === 'Default' ? '#eff6ff' : 'white', padding: '12px', borderRadius: '10px', border: '1px solid', borderColor: engPayType === 'Default' ? '#3b82f6' : '#e2e8f0', cursor: 'pointer' }} onClick={() => {
                      setEngPayType('Default');
                      const eng = engineers.find(en => String(en.id) === String(engineerId));
                      if (eng) {
                        setEngBillingType(eng.billing_type || 'Hourly')
                        setEngHourlyRate(eng.hourly_rate != null ? String(eng.hourly_rate) : '')
                        setEngHalfDayRate(eng.half_day_rate != null ? String(eng.half_day_rate) : '')
                        setEngFullDayRate(eng.full_day_rate != null ? String(eng.full_day_rate) : '')
                        setEngMonthlyRate(eng.monthly_rate != null ? String(eng.monthly_rate) : '')
                        setEngAgreedRate(eng.agreed_rate || '')
                        setEngCancellationFee(eng.cancellation_fee != null ? String(eng.cancellation_fee) : '')
                        setEngOvertimeRate(eng.overtime_rate != null ? String(eng.overtime_rate) : '')
                        setEngOohRate(eng.ooh_rate != null ? String(eng.ooh_rate) : '')
                        setEngWeekendRate(eng.weekend_rate != null ? String(eng.weekend_rate) : '')
                        setEngHolidayRate(eng.holiday_rate != null ? String(eng.holiday_rate) : '')
                        setEngCurrency(eng.currency || 'USD')
                      }
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e40af', fontWeight: '700' }}>
                        <input type="radio" name="engPayType" value="Default" checked={engPayType === 'Default'} readOnly />
                        Engineers Profile Rates
                      </label>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', paddingLeft: '24px' }}>Automatically use rates from the engineer's profile.</p>
                    </div>
                    <div className="payout-type-selector" style={{ background: engPayType === 'Custom' ? '#fdf2f8' : 'white', padding: '12px', borderRadius: '10px', border: '1px solid', borderColor: engPayType === 'Custom' ? '#db2777' : '#e2e8f0', cursor: 'pointer' }} onClick={() => setEngPayType('Custom')}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#831843', fontWeight: '700' }}>
                        <input type="radio" name="engPayType" value="Custom" checked={engPayType === 'Custom'} readOnly />
                        Custom Ticket Rates
                      </label>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', paddingLeft: '24px' }}>Manually override rates and billing type for this ticket.</p>
                    </div>
                  </div>

                  {engPayType === 'Custom' && (
                    <div className="tickets-grid" style={{ paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <label className="tickets-field">
                        <span>Payout Billing Type</span>
                        <select value={engBillingType} onChange={(e) => setEngBillingType(e.target.value)}>
                          <option value="Hourly">1) Hourly Only (min 2 hrs)</option>
                          <option value="Half Day + Hourly">2) Half Day + Hourly</option>
                          <option value="Full Day + OT">3) Full Day + OT (OT = Rate × 1.5)</option>
                          <option value="Monthly + OT + Weekend">4) Monthly + OT + Weekend/Holidays (Weekend = 2x)</option>
                          <option value="Mixed Mode">5) Mixed (Half/Full/OT Tier)</option>
                          <option value="Agreed Rate">6) Agreed/Fixed Rate</option>
                          <option value="Cancellation">7) Cancellation Fee</option>
                        </select>
                      </label>

                      <label className="tickets-field">
                        <span>Payout Currency</span>
                        <select value={engCurrency} onChange={(e) => setEngCurrency(e.target.value)}>
                          {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </label>

                      <div className="tickets-grid" style={{ gridColumn: '1 / -1' }}>
                        {engBillingType !== 'Agreed Rate' && engBillingType !== 'Cancellation' && (
                          <>
                            <label className="tickets-field">
                              <span>Hourly Rate</span>
                              <input type="number" value={engHourlyRate} onChange={(e) => setEngHourlyRate(e.target.value)} placeholder="0.00" />
                            </label>
                            <label className="tickets-field">
                              <span>Half Day Rate</span>
                              <input type="number" value={engHalfDayRate} onChange={(e) => setEngHalfDayRate(e.target.value)} placeholder="0.00" />
                            </label>
                            <label className="tickets-field">
                              <span>Full Day Rate</span>
                              <input type="number" value={engFullDayRate} onChange={(e) => setEngFullDayRate(e.target.value)} placeholder="0.00" />
                            </label>
                            {engBillingType === 'Monthly + OT + Weekend' && (
                              <label className="tickets-field">
                                <span>Monthly Rate</span>
                                <input type="number" value={engMonthlyRate} onChange={(e) => setEngMonthlyRate(e.target.value)} placeholder="0.00" />
                              </label>
                            )}
                            <label className="tickets-field">
                              <span>Overtime Rate</span>
                              <input type="number" value={engOvertimeRate} onChange={(e) => setEngOvertimeRate(e.target.value)} placeholder="Default (Rate × 1.5)" />
                            </label>
                            <label className="tickets-field">
                              <span>OOH Rate (Per Hr)</span>
                              <input type="number" value={engOohRate} onChange={(e) => setEngOohRate(e.target.value)} placeholder="0.00" />
                            </label>
                            <label className="tickets-field">
                              <span>Weekend Premium</span>
                              <input type="number" value={engWeekendRate} onChange={(e) => setEngWeekendRate(e.target.value)} placeholder="Default (Rate × 2.0)" />
                            </label>
                            <label className="tickets-field">
                              <span>Holiday Premium</span>
                              <input type="number" value={engHolidayRate} onChange={(e) => setEngHolidayRate(e.target.value)} placeholder="Default (Rate × 2.0)" />
                            </label>
                          </>
                        )}
                        {engBillingType === 'Agreed Rate' && (
                          <label className="tickets-field">
                            <span>Agreed Rate</span>
                            <input type="number" value={engAgreedRate} onChange={(e) => setEngAgreedRate(e.target.value)} placeholder="0.00" />
                          </label>
                        )}
                        {engBillingType === 'Cancellation' && (
                          <label className="tickets-field">
                            <span>Cancellation Penalty</span>
                            <input type="number" value={engCancellationFee} onChange={(e) => setEngCancellationFee(e.target.value)} placeholder="0.00" />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                  {engPayType === 'Default' && (
                    <div style={{ marginTop: '12px', background: '#f1f5f9', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiInfo style={{ color: '#64748b' }} /> Current Profile Rates:
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Billing:</b><br /> {engBillingType}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Hourly:</b><br /> {engCurrency} {engHourlyRate || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Half Day:</b><br /> {engCurrency} {engHalfDayRate || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Full Day:</b><br /> {engCurrency} {engFullDayRate || '0.00'}</div>
                        {engBillingType === 'Monthly + OT + Weekend' && (
                          <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Monthly:</b><br /> {engCurrency} {engMonthlyRate || '0.00'}</div>
                        )}
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Cancellation:</b><br /> {engCurrency} {engCancellationFee || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>OT:</b><br /> {engCurrency} {engOvertimeRate || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>OOH:</b><br /> {engCurrency} {engOohRate || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>W-End:</b><br /> {engCurrency} {engWeekendRate || '0.00'}</div>
                        <div style={{ fontSize: '11px' }}><b style={{ color: '#64748b' }}>Holiday:</b><br /> {engCurrency} {engHolidayRate || '0.00'}</div>
                      </div>
                      <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                        These rates are pulled from the engineer's profile. Switch to "Custom Ticket Rates" above to override.
                      </p>
                    </div>
                  )}
                </div>
              )}
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

          {/* Conditional Time Adjustment Section */}
          {(() => {
            const isDispatch = (leadType === 'Dispatch') || billingType.includes('Monthly') || (taskStartDate && taskEndDate && taskStartDate !== taskEndDate);

            if (!isDispatch) {
              // Same Day Task
              return (
                <section className="tickets-card">
                  <h2 className="tickets-section-title">Time Log (Manual Override)</h2>
                  <p className="tickets-subtitle" style={{ marginBottom: '16px', fontSize: '13px' }}>
                    Adjust working hours for a single-day task.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button
                      type="button"
                      className="tickets-secondary-btn"
                      style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
                      onClick={() => autoSyncTime(taskStartDate, taskEndDate, taskTime)}
                    >
                      Sync with Scheduled
                    </button>
                  </div>
                  <div className="tickets-grid">
                    <label className="tickets-field">
                      <span>Start Time (Override)</span>
                      <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </label>
                    <label className="tickets-field">
                      <span>End Time (Override)</span>
                      <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </label>
                    <label className="tickets-field">
                      <span>Break Time (Minutes)</span>
                      <input type="number" min="0" value={breakTime} onChange={(e) => setBreakTime(e.target.value)} placeholder="0" />
                    </label>
                  </div>
                </section>
              );
            } else {
              // Multi-Day Task
              return (
                <section className="tickets-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📅</span>
                        Daily Shift Logs
                        {billingType.includes('Monthly') && (
                          <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', fontWeight: '700' }}>MONTHLY MODE</span>
                        )}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Manage engineer assignments and shift timings per day</p>
                    </div>
                  </div>

                  {/* Edit Mode Live Summary Banner */}
                  {editingTicketId && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Revenue</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
                          {currency} {(() => {
                            let total = 0;
                            const days = getDatesInRange(taskStartDate, taskEndDate);
                            days.forEach(d => {
                              const dw = new Date(`${d}T00:00:00Z`).getUTCDay();
                              if (dw === 0 || dw === 6) return;
                              const lg = (timeLogs || []).find(l => (l.task_date || '').split('T')[0] === d) || {};
                              const calc = calculateTicketTotal({
                                startTime: lg.start_time || `${d}T08:00:00Z`, endTime: lg.end_time || `${d}T16:00:00Z`, breakTime: Number(lg.break_time_mins || 0),
                                hourlyRate, halfDayRate, fullDayRate, monthlyRate, agreedRate, cancellationFee, travelCostPerDay, toolCost: toolCostInput,
                                billingType, timezone, calcTimezone, monthlyDivisor: getWorkingDaysInMonth(d, country), country
                              });
                              total += parseFloat(calc?.grandTotal || 0);
                            });
                            return total.toFixed(2);
                          })()}
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Payout</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
                          {currency} {(() => {
                            let total = 0;
                            const days = getDatesInRange(taskStartDate, taskEndDate);
                            days.forEach(d => {
                              const dw = new Date(`${d}T00:00:00Z`).getUTCDay();
                              if (dw === 0 || dw === 6) return;
                              const lg = (timeLogs || []).find(l => (l.task_date || '').split('T')[0] === d) || {};
                              const lEngId = lg.engineer_id || lg.engineerId || engineerId;
                              let pRates = { hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate, bt: billingType };
                              if (Number(lEngId) === 0) pRates = { hr: 0, hd: 0, fd: 0, mr: 0, bt: 'Hourly' };
                              else if (lEngId && String(lEngId) !== String(engineerId)) {
                                const eng = engineers.find(en => String(en.id) === String(lEngId));
                                if (eng) pRates = { hr: eng.hourly_rate || 0, hd: eng.half_day_rate || 0, fd: eng.full_day_rate || 0, mr: eng.monthly_rate || 0, bt: eng.billing_type || 'Hourly' };
                              }
                              const calc = calculateTicketTotal({
                                startTime: lg.start_time || `${d}T08:00:00Z`, endTime: lg.end_time || `${d}T16:00:00Z`, breakTime: Number(lg.break_time_mins || 0),
                                hourlyRate: pRates.hr, halfDayRate: pRates.hd, fullDayRate: pRates.fd, monthlyRate: pRates.mr,
                                billingType: pRates.bt, timezone, calcTimezone, travelCostPerDay: 0, toolCost: 0,
                                monthlyDivisor: getWorkingDaysInMonth(d, country), country
                              });
                              total += parseFloat(calc?.grandTotal || 0);
                            });
                            return total.toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="tickets-table-wrapper" style={{ boxShadow: 'none', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table className="tickets-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '10px' }}>Date</th>
                          <th style={{ padding: '10px' }}>Engineer</th>
                          <th style={{ padding: '10px' }}>Shift (In / Out / Break)</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Hrs</th>
                          {billingType.includes('Monthly') && <th style={{ padding: '10px', textAlign: 'right' }}>Per Day Rate</th>}
                          <th style={{ padding: '10px', textAlign: 'right' }}>Travel</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Tools</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#6366f1' }}>Day Total (Cust)</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>Payout (Eng)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const daysInRange = getDatesInRange(taskStartDate, taskEndDate);
                          
                          // Group days by month for the accordion-style display
                          const monthGroups = {};
                          daysInRange.forEach(d => {
                            const mKey = d.substring(0, 7);
                            if (!monthGroups[mKey]) monthGroups[mKey] = [];
                            monthGroups[mKey].push(d);
                          });

                          return Object.keys(monthGroups).sort().map(mKey => {
                            const monthDays = monthGroups[mKey];
                            const isMonthCollapsed = collapsedMonths.has(mKey + '-modal'); // unique key for modal collapse
                            const monthLabel = new Date(mKey + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

                            return (
                              <React.Fragment key={mKey}>
                                {/* Month Section Header */}
                                <tr 
                                  onClick={() => {
                                    setCollapsedMonths(prev => {
                                      const next = new Set(prev);
                                      if (next.has(mKey + '-modal')) next.delete(mKey + '-modal');
                                      else next.add(mKey + '-modal');
                                      return next;
                                    });
                                  }}
                                  style={{ background: '#f1f5f9', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <td colSpan={billingType.includes('Monthly') ? 8 : 7} style={{ padding: '8px 12px', fontWeight: '800', color: '#475569', fontSize: '13px' }}>
                                    <span style={{ marginRight: '8px' }}>{isMonthCollapsed ? '▶' : '▼'}</span>
                                    {monthLabel} 
                                    <span style={{ marginLeft: '8px', fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>({monthDays.length} days)</span>
                                  </td>
                                </tr>
                                
                                {!isMonthCollapsed && monthDays.map((dStr, idx) => {
                                  const existingLog = (timeLogs || []).find(l => (l.task_date || '').split('T')[0] === dStr) || {};
                                  const cleanTaskTime = (taskTime || '09:00').padStart(5, '0');
                                  
                                  const _tblHolsList = (HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || []);
                                  
                                  const dObj = new Date(dStr);
                                  const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                                  const activeHols = (HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || []);
                                  const isHoliday = activeHols.includes(dStr);
                                  
                                  if (isWeekend || isHoliday) return null;

                                  const actualStartStr = existingLog.start_time || existingLog.startTime;
                                  const actualEndStr = existingLog.end_time || existingLog.endTime;
                                  const actualBreak = existingLog.break_time_mins != null ? Number(existingLog.break_time_mins) : (existingLog.breakTime != null ? Number(existingLog.breakTime) : 0);

                                  const lStart = safeExtractTime(actualStartStr) || cleanTaskTime;
                                  let lEnd = safeExtractTime(actualEndStr);
                                  if (!lEnd) {
                                    const [h, m] = (lStart || '09:00').split(':');
                                    let endH = parseInt(h, 10) + 8;
                                    if (endH >= 24) endH = 23;
                                    lEnd = `${String(endH).padStart(2, '0')}:${m || '00'}`;
                                  }

                                  const dur = calculateDuration(lStart, lEnd, actualBreak);
                                  const dayMonthlyDivisor = getWorkingDaysInMonth(dStr, country);
                                  // AUTOMATIC SUBSTITUTE ENGINEER RATES
                                  const curEngId = Number(existingLog.engineer_id ?? existingLog.engineerId ?? engineerId);
                                  const isNoEng = Number(curEngId) === 0;
                                  let effectiveRates = {
                                    hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate, ar: agreedRate, cf: cancellationFee
                                  };

                                  if (isNoEng) {
                                    effectiveRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0 };
                                  } else if (curEngId && curEngId !== Number(engineerId)) {
                                    const subEng = engineers.find(en => Number(en.id) === curEngId);
                                    if (subEng) {
                                      effectiveRates = {
                                        hr: subEng.hourly_rate || 0,
                                        hd: subEng.half_day_rate || 0,
                                        fd: subEng.full_day_rate || 0,
                                        mr: subEng.monthly_rate || 0,
                                        ar: subEng.agreed_rate || '',
                                        cf: subEng.cancellation_fee || 0
                                      };
                                    }
                                  }

                                  const dayCostBreakdown = calculateTicketTotal({
                                    startTime: `${dStr}T${lStart}:00.000Z`,
                                    endTime: `${dStr}T${lEnd}:00.000Z`,
                                    breakTime: actualBreak,
                                    hourlyRate: effectiveRates.hr, 
                                    halfDayRate: effectiveRates.hd, 
                                    fullDayRate: effectiveRates.fd, 
                                    monthlyRate: effectiveRates.mr, 
                                    agreedRate: effectiveRates.ar, 
                                    cancellationFee: effectiveRates.cf,
                                    travelCostPerDay, toolCost: toolCostInput, billingType, timezone, calcTimezone,
                                    monthlyDivisor: dayMonthlyDivisor, country
                                  });

                                  return (
                                    <tr key={dStr} className={isNoEng ? 'row-no-engineer' : ''} style={{ background: dur > 8 ? 'rgba(239, 68, 68, 0.05)' : (existingLog.id ? 'rgba(99, 102, 241, 0.03)' : undefined) }}>
                                      <td style={{ padding: '10px' }}>
                                        <div style={{ fontWeight: '700', color: '#475569' }}>{new Date(`${dStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{[0, 6].includes(new Date(`${dStr}T00:00:00`).getDay()) ? 'Weekend' : 'Weekday'}</div>
                                      </td>
                                      <td style={{ padding: '10px' }}>
                                        {/* Dropdowns for BOTH Create and Edit modes */}
                                        {(isFillingForm || editingTicketId) ? (
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <select
                                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#fff', minWidth: '120px' }}
                                                value={curEngId}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value);
                                                  if (existingLog.id) {
                                                    handleUpdateLog(existingLog.id, { engineerId: val });
                                                  } else {
                                                    setTimeLogs(prev => {
                                                      const next = [...prev];
                                                      const lgIdx = next.findIndex(l => (l.task_date || '').split('T')[0] === dStr);
                                                      if (lgIdx > -1) {
                                                        next[lgIdx].engineer_id = val;
                                                      } else {
                                                        next.push({
                                                          task_date: dStr,
                                                          engineer_id: val,
                                                          start_time: `${dStr}T${lStart}:00.000Z`,
                                                          end_time: `${dStr}T${lEnd}:00.000Z`,
                                                          break_time_mins: actualBreak
                                                        });
                                                      }
                                                      return next;
                                                    });
                                                  }
                                                }}
                                              >
                                                <optgroup label="Core Team">
                                                  {engineers.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                                                </optgroup>
                                                <optgroup label="Special Cases">
                                                  <option value="0" style={{ color: '#ef4444', fontWeight: '800' }}>❌ No Engineer / Absent</option>
                                                </optgroup>
                                              </select>

                                              {/* Premium Rates Tooltip */}
                                              {(() => {
                                                const selectedEng = engineers.find(e => Number(e.id) === Number(curEngId));
                                                if (!selectedEng) return null;
                                                const tooltipContent = `Rates for ${selectedEng.name}:\n• Hourly: ${currency} ${selectedEng.hourly_rate || 0}\n• Half Day: ${currency} ${selectedEng.half_day_rate || 0}\n• Full Day: ${currency} ${selectedEng.full_day_rate || 0}\n• Monthly: ${currency} ${selectedEng.monthly_rate || 0}\n• Agreed: ${currency} ${selectedEng.agreed_rate || 0}\n• Cancellation: ${currency} ${selectedEng.cancellation_fee || 0}`;

                                                return (
                                                  <div className="tooltip-container" style={{ position: 'relative', display: 'inline-block' }}>
                                                    <span style={{ fontSize: '14px', cursor: 'help', color: '#6366f1' }}>ℹ️</span>
                                                    <div className="tooltip-text" style={{
                                                      visibility: 'hidden', width: '220px', backgroundColor: '#1e293b', color: '#fff', textAlign: 'left',
                                                      borderRadius: '12px', padding: '14px', position: 'absolute', zIndex: 9999, top: '-20px', right: '35px',
                                                      opacity: 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '11px', lineHeight: '1.6',
                                                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)', pointerEvents: 'none', whiteSpace: 'pre-line',
                                                      border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                      <div style={{ fontWeight: '800', color: '#818cf8', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Rate Card: {selectedEng.name}</div>
                                                      {tooltipContent.split('\n').slice(1).join('\n')}
                                                      <div style={{
                                                        position: 'absolute', top: '24px', left: '100%',
                                                        borderWidth: '6px', borderStyle: 'solid', borderColor: 'transparent transparent transparent #1e293b'
                                                      }}></div>
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                              <style>{`.tooltip-container:hover .tooltip-text { visibility: visible !important; opacity: 1 !important; }`}</style>
                                            </div>
                                        ) : (
                                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                                            {engineers.find(e => String(e.id) === String(existingLog.engineer_id || existingLog.engineerId || engineerId))?.name || engineerName || 'Primary Engineer'}
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '10px' }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <input
                                            type="time"
                                            id={`fst-${dStr}`}
                                            value={lStart}
                                            style={{ padding: '2px', fontSize: '11px' }}
                                            onChange={(e) => {
                                              const nt = e.target.value;
                                              if (editingTicketId && existingLog.id) {
                                                handleUpdateLog(existingLog.id, { startTime: `${dStr}T${nt}:00.000Z` });
                                              } else {
                                                setTimeLogs(prev => prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, start_time: `${dStr}T${nt}:00.000Z` } : l));
                                              }
                                            }}
                                          />
                                          <span>to</span>
                                          <input
                                            type="time"
                                            id={`fet-${dStr}`}
                                            value={lEnd}
                                            style={{ padding: '2px', fontSize: '11px' }}
                                            onChange={(e) => {
                                              const nt = e.target.value;
                                              if (editingTicketId && existingLog.id) {
                                                handleUpdateLog(existingLog.id, { endTime: `${dStr}T${nt}:00.000Z` });
                                              } else {
                                                setTimeLogs(prev => prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, end_time: `${dStr}T${nt}:00.000Z` } : l));
                                              }
                                            }}
                                          />
                                          <input
                                            type="number"
                                            id={`fbr-${dStr}`}
                                            placeholder="Break"
                                            value={actualBreak}
                                            style={{ width: '45px', padding: '2px', fontSize: '11px' }}
                                            onChange={(e) => {
                                              const brVal = parseInt(e.target.value) || 0;
                                              if (editingTicketId && existingLog.id) {
                                                handleUpdateLog(existingLog.id, { breakTimeMins: brVal });
                                              } else {
                                                setTimeLogs(prev => prev.map(l => (l.task_date || '').split('T')[0] === dStr ? { ...l, break_time_mins: brVal } : l));
                                              }
                                            }}
                                          />
                                          {editingTicketId && existingLog.id && (
                                            <span style={{
                                              fontSize: '10px',
                                              fontWeight: '700',
                                              padding: '2px 8px',
                                              borderRadius: '20px',
                                              color: isUpdatingLog === existingLog.id ? '#f59e0b' : '#10b981',
                                              background: isUpdatingLog === existingLog.id ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                              border: `1px solid ${isUpdatingLog === existingLog.id ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                              transition: 'all 0.3s ease',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {isUpdatingLog === existingLog.id ? '⏳ Saving…' : '✓ Saved'}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {billingType.includes('Monthly') && (
                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px', color: '#6366f1', fontWeight: '700' }}>
                                          {dayCostBreakdown ? (
                                            <span title={`${currency}${monthlyRate} ÷ ${dayMonthlyDivisor} days`}>{currency} {dayCostBreakdown.perDayRate}</span>
                                          ) : '--'}
                                        </td>
                                      )}
                                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px', color: '#0891b2', fontWeight: '600' }}>
                                        {dayCostBreakdown ? `${currency} ${dayCostBreakdown.travel}` : '--'}
                                      </td>
                                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>
                                        {dayCostBreakdown ? `${currency} ${dayCostBreakdown.tools}` : '--'}
                                      </td>
                                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#1e293b' }}>
                                        {currency} {dayCostBreakdown ? dayCostBreakdown.grandTotal : '0.00'}
                                      </td>
                                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#059669', background: 'rgba(5, 150, 105, 0.04)' }}>
                                        {currency} {(() => {
                                           const lEngId = curEngId;
                                           let pRates = {
                                             hr: hourlyRate, hd: halfDayRate, fd: fullDayRate, mr: monthlyRate, bt: billingType
                                           };
                                           if (Number(lEngId) === 0) {
                                             pRates = { hr: 0, hd: 0, fd: 0, mr: 0, bt: 'Hourly' };
                                           } else if (lEngId && Number(lEngId) !== Number(engineerId)) {
                                             const eng = engineers.find(en => Number(en.id) === lEngId);
                                             if (eng) pRates = { hr: eng.hourly_rate || 0, hd: eng.half_day_rate || 0, fd: eng.full_day_rate || 0, mr: eng.monthly_rate || 0, bt: eng.billing_type || billingType };
                                           }
                                           const engCalc = calculateTicketTotal({
                                             startTime: `${dStr}T${lStart}:00.000Z`,
                                             endTime: `${dStr}T${lEnd}:00.000Z`,
                                             breakTime: actualBreak,
                                             hourlyRate: pRates.hr, halfDayRate: pRates.hd, fullDayRate: pRates.fd, monthlyRate: pRates.mr,
                                             billingType: pRates.bt, timezone, calcTimezone,
                                             travelCostPerDay: 0, toolCost: 0, // Payout usually excludes client-charged travel/tools unless specified
                                             monthlyDivisor: dayMonthlyDivisor, country
                                           });
                                           return engCalc ? engCalc.grandTotal : '0.00';
                                        })()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {!editingTicketId && (
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', background: '#fef3c7', padding: '10px', borderRadius: '8px' }}>
                      💡 <strong>Note:</strong> Daily logs with individual times/engineers can be managed in detail once the ticket is created or while editing.
                    </div>
                  )}
                </section>
              );
            }
          })()}

          {/* Pricing & Rates */}
          <section className="tickets-card">
            <h2 className="tickets-section-title">Pricing &amp; Rates</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
              ≡ƒôî <strong>Rate Multipliers:</strong> OT/OOH = 1.5x | Weekend/Holiday = 2.0x
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
                <select value={(billingType || '').trim()} onChange={(e) => setBillingType(e.target.value)}>
                  <option value="Hourly">Hourly Only</option>
                  <option value="Half Day + Hourly">Half Day + Hourly</option>
                  <option value="Full Day + OT">Full Day + OT</option>
                  <option value="Mixed Mode">Mixed Mode (Half/Full/OT)</option>
                  <option value="Monthly + OT + Weekend">Monthly + OT + Weekend or Holidays</option>
                  <option value="Agreed Rate">Agreed rate</option>
                  <option value="Cancellation">Cancellation / Reschedule charges</option>
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
                <span>Tool Cost / Day</span>
                <input
                  type="number"
                  step="0.01"
                  value={toolCostInput}
                  onChange={(e) => setToolCostInput(e.target.value)}
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
                  {TICKET_STATUSES.filter(s => s !== 'Approval Pending').map((s) => (
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
              <div className="calculation-preview-card" style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', background: '#6366f1', borderRadius: '50%', boxShadow: '0 0 8px #6366f1' }}></div>
                      Live Cost Breakdown
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                      {billingType} · {liveBreakdown.hrs}h billable
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Grand Total</div>
                    <div style={{ fontSize: '30px', fontWeight: '900', color: '#a5b4fc', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {currency} {liveBreakdown.grandTotal}
                    </div>
                  </div>
                </div>

                {/* Premium Alerts */}
                {liveBreakdown.isSpecialDay && (
                  <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: '#fbbf24', fontWeight: '600' }}>
                    <span>📅</span>
                    <span>{liveBreakdown.isHoliday ? '🎉 Public Holiday' : '🏖️ Weekend'} — Special day rate (2×) applied.</span>
                  </div>
                )}
                {!liveBreakdown.isSpecialDay && liveBreakdown.isOOH && parseFloat(liveBreakdown.ooh) > 0 && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: '#a5b4fc', fontWeight: '600' }}>
                    <span>🌙</span>
                    <span><strong>OOH Premium</strong> — Work is outside normal hours (08:00—18:00).</span>
                  </div>
                )}
                {!liveBreakdown.isSpecialDay && parseFloat(liveBreakdown.ot) > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: '#fcd34d', fontWeight: '600' }}>
                    <span>⏱️</span>
                    <span><strong>Overtime</strong> — Work exceeded 8h standard shift.</span>
                  </div>
                )}

                {/* Breakdown Lines */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Monthly Formula Banner */}
                  {billingType.includes('Monthly') && liveBreakdown.monthlyRecords && (
                    <div style={{ background: 'rgba(99,102,241,0.13)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Rate Formula Breakdown</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                        {liveBreakdown.monthlyRecords.map((rec, i) => {
                          const monthName = new Date(rec.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                          const dRate = (parseFloat(rec.rate) / rec.divisor).toFixed(2);
                          
                          return (
                            <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '2px' }}>{monthName}</div>
                              <div style={{ fontSize: '12px', color: '#c7d2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Rate: <strong>{currency} {rec.rate}</strong> ÷ <strong>{rec.divisor}</strong> days = <strong>{currency} {dRate}/day</strong></span>
                                <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: '#fff', fontWeight: '800', fontSize: '11px' }}>
                                  {currency} {dRate} × {rec.workedDaysCount} days = {currency} {(parseFloat(dRate) * rec.workedDaysCount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Base */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '500' }}>
                      Base ({billingType === 'Hourly' ? `${liveBreakdown.hrs}h × ${currency}${hourlyRate}/hr`
                        : billingType === 'Half Day + Hourly' ? 'Half Day flat'
                          : billingType === 'Full Day + OT' ? 'Full Day flat'
                            : billingType.includes('Monthly') ? `Monthly Pro-rata (${liveBreakdown.days} days)`
                              : billingType === 'Agreed Rate' ? 'Fixed rate'
                                : 'Cancellation fee'})
                    </span>
                    <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '700' }}>{currency} {liveBreakdown.base}</span>
                  </div>

                  {/* OT */}
                  {parseFloat(liveBreakdown.ot) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fcd34d', fontWeight: '500' }}>
                        Overtime Premium (1.5×)
                      </span>
                      <span style={{ fontSize: '14px', color: '#fcd34d', fontWeight: '700' }}>+ {currency} {liveBreakdown.ot}</span>
                    </div>
                  )}

                  {/* OOH */}
                  {parseFloat(liveBreakdown.ooh) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: '500' }}>
                        OOH Premium (1.5×)
                      </span>
                      <span style={{ fontSize: '14px', color: '#a5b4fc', fontWeight: '700' }}>+ {currency} {liveBreakdown.ooh}</span>
                    </div>
                  )}

                  {/* Special Day */}
                  {parseFloat(liveBreakdown.specialDay) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '500' }}>
                        Weekend/Holiday Premium (2×)
                      </span>
                      <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: '700' }}>+ {currency} {liveBreakdown.specialDay}</span>
                    </div>
                  )}

                  {/* Travel & Tool Costs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7dd3fc', fontWeight: '600', marginBottom: '4px' }}>
                    <span>✈ Travel Cost{liveBreakdown.days > 1 ? ` (${liveBreakdown.days} days × ${currency}${travelCostPerDay || '0'})` : ' / Day'}</span>
                    <span>+ {currency} {liveBreakdown.travel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#c4b5fd', fontWeight: '600', marginBottom: '12px' }}>
                    <span>🔧 Tool Cost{liveBreakdown.days > 1 ? ` (${liveBreakdown.days} days × ${currency}${toolCostInput || '0'})` : ''}</span>
                    <span>+ {currency} {liveBreakdown.tools}</span>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1.5px dashed rgba(99, 102, 241, 0.3)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Grand Total (Receivable)
                    </span>
                    <span style={{ fontSize: '22px', color: '#a5b4fc', fontWeight: '900', letterSpacing: '-0.02em' }}>
                      {currency} {liveBreakdown.grandTotal}
                    </span>
                  </div>

                  {payoutLiveBreakdown && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #10b981', marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.05em' }}>Engineer Payout Estimation</span>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Based on {engBillingType || 'Profile'} Rates (+ Travel & Tool)</span>
                        </div>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>{engCurrency || currency} {payoutLiveBreakdown.grandTotal}</span>
                        </div>

                        {/* UPGRADED: Professional Engineer Cards in Edit Page */}
                        {payoutLiveBreakdown.engSummary && payoutLiveBreakdown.engSummary.filter(s => !s.isNoEng).length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(16,185,129,0.2)', paddingTop: '16px', marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                            {payoutLiveBreakdown.engSummary.filter(es => !es.isNoEng).map((es, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                                    {es.name.charAt(0)}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#ecfdf5' }}>{es.name}</span>
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>Individual Payout</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>
                                  {engCurrency || currency} {es.total.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Summary Total for Payout (All Engineers Combined) */}
                        <div style={{ borderTop: '1.5px dashed rgba(16,185,129,0.3)', marginTop: '20px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Combined Engineer Payout</span>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>{engCurrency || currency} {payoutLiveBreakdown.grandTotal}</span>
                        </div>
                      </div>
                  )}
                </div>

                <p style={{ fontSize: '11px', color: '#475569', marginTop: '12px', textAlign: 'center' }}>
                  ⚡ Live preview — Final total is confirmed on save.
                </p>
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
            <input type="text" placeholder="Search tickets..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="tickets-filter-row">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All Status">All Status</option>
              {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="tickets-message tickets-message--error tickets-message--inline">{error}</div>}

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

                              // Check if any single day exceeds 8hrs
                              const hasExceeded8h = parsedLogs.some(log => {
                                if (!log.start_time || !log.end_time) return false;
                                const hrs = (new Date(log.end_time) - new Date(log.start_time)) / 3600000 - ((log.break_time_mins || 0) / 60);
                                return hrs > 8;
                              });

                              const mainRow = (
                                <tr key={ticket.id} style={{ background: isExpanded ? 'rgba(99,102,241,0.04)' : undefined }}>
                                  <td style={{ paddingLeft: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                      {isDispatch && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedTicketRows(prev => {
                                              const next = new Set(prev);
                                              if (next.has(ticket.id)) next.delete(ticket.id);
                                              else next.add(ticket.id);
                                              return next;
                                            });
                                          }}
                                          style={{ flexShrink: 0, marginTop: '3px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '2px 6px', fontSize: '11px', color: '#6366f1', fontWeight: '700', lineHeight: 1.4 }}
                                          title={isExpanded ? 'Collapse days' : 'Expand days'}
                                        >
                                          {isExpanded ? '▲' : '▼'} {parsedLogs.length}d
                                        </button>
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
                                    {ticket.engineerName && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>👷 {ticket.engineerName}</div>}
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
                                      <button type="button" className={`status-badge status-badge--${(ticket.status || 'open').toLowerCase().replace(' ', '-')}`}>
                                        <span className="status-dot"></span>
                                        {ticket.status}
                                      </button>
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
                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                      {ticket.city}, {ticket.country}
                                    </div>
                                  </td>
                                  <td style={{ paddingRight: '24px' }}>
                                    <div className="action-icons">
                                      <button className="action-btn view" onClick={() => openTicketModal(ticket.id)} title="View Detail"><FiEye /></button>
                                      <button className="action-btn edit" onClick={() => startEditTicket(ticket.id)} title="Edit"><FiEdit2 /></button>
                                      <button className="action-btn delete" onClick={() => handleDeleteTicket(ticket.id)} title="Delete"><FiTrash2 /></button>
                                    </div>
                                  </td>
                                </tr>
                              );

                              // NEW: Smart Date Logic for List View (Matching Modal)
                              let displayLogs = [];
                              if (isExpanded) {
                                const hols = HOLIDAYS_CALC[ticket.country] || HOLIDAYS_CALC['India'] || [];
                                const s = ticket.taskStartDate ? String(ticket.taskStartDate).split('T')[0] : '';
                                const e = ticket.taskEndDate ? String(ticket.taskEndDate).split('T')[0] : '';
                                if (s && e) {
                                  const allDates = getDatesInRange(s, e);
                                  displayLogs = allDates.filter(d => {
                                    const dw = new Date(`${d}T00:00:00Z`).getUTCDay();
                                    return dw !== 0 && dw !== 6 && !hols.includes(d);
                                  }).map((dStr, sidx) => {
                                    const existing = parsedLogs.find(l => (l.task_date || '').split('T')[0] === dStr) || {};
                                    return { ...existing, logDateStr: dStr };
                                  });
                                } else {
                                  displayLogs = parsedLogs.map((l, sidx) => ({ ...l, logDateStr: (l.task_date || '').split('T')[0] }));
                                }
                              }

                              const subRows = isExpanded ? displayLogs.map((log, sidx) => {
                                const logDate = log.logDateStr
                                  ? new Date(log.logDateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
                                  : `Day ${sidx + 1}`;
                                const rawHrs = (log.start_time && log.end_time)
                                  ? (new Date(log.end_time) - new Date(log.start_time)) / 3600000 - ((log.break_time_mins || 0) / 60)
                                  : null;
                                const hrs = rawHrs !== null ? rawHrs.toFixed(2) : '--';
                                const exceeded = rawHrs !== null && rawHrs > 8;
                                const isWeekend = log.logDateStr ? [0, 6].includes(new Date(log.logDateStr).getDay()) : false;
                                return (
                                  <tr key={`${ticket.id}-log-${log.id || sidx}`} style={{ background: exceeded ? '#fffcec' : '#f8fafc', borderLeft: '4px solid #6366f1' }}>
                                    <td style={{ paddingLeft: '36px', fontSize: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#6366f1', fontWeight: '700' }}>↳</span>
                                        <span style={{ fontWeight: '600', color: '#374151' }}>{logDate}</span>
                                        {isWeekend && <span style={{ background: '#fde68a', color: '#92400e', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: '700' }}>WKND</span>}
                                        {hrs !== '--' && exceeded && <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: '700' }}>⏱ {hrs}h</span>}
                                      </div>
                                    </td>
                                    <td style={{ fontSize: '12px', color: '#64748b' }} colSpan={2}>
                                      <div style={{ display: 'flex', gap: '12px' }}>
                                        <span>In: <strong>{(() => {
                                          if (!log.start_time) return '--';
                                          const match = String(log.start_time).match(/(\d{2}):(\d{2})/);
                                          return match ? `${match[1]}:${match[2]}` : '--';
                                        })()}</strong></span>
                                        <span>Out: <strong>{(() => {
                                          if (!log.end_time) return '--';
                                          const match = String(log.end_time).match(/(\d{2}):(\d{2})/);
                                          return match ? `${match[1]}:${match[2]}` : '--';
                                        })()}</strong></span>
                                      </div>
                                    </td>
                                    <td colSpan={4}></td>
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
                      alert(`Ticket successfully re-assigned to ${newEng.name}`);
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
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)' }}>🎟️</div>
                <div>
                  <h2 className="ticket-modal-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em' }}>
                    Ticket <span style={{ color: '#6366f1' }}>#AIM-T-{selectedTicket.id}</span>
                  </h2>
                  <p className="ticket-modal-subtitle" style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>{selectedTicket.taskName}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className="btn-wow-primary"
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    handleCloseTicketModal();
                    startEditTicket(selectedTicket.id);
                  }}
                >
                  <FiEdit2 /> Edit Full Ticket
                </button>
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

            <div className="ticket-modal-content">
              <div className="details-grid">
                {/* --- Row 1: Basic Info --- */}
                <div className="detail-item">
                  <label>Customer</label>
                  <span style={{ fontWeight: '700' }}>{selectedTicket.customerName}</span>
                </div>
                <div className="detail-item">
                  <label>Assigned Engineer</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedTicket.engineerName || '--'}</span>
                    <button className="btn-wow-secondary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => { setReassignTicketId(selectedTicket.id); setReassignModalOpen(true); }}>Change</button>
                    {selectedTicket.engineerStatus === 'Declined' && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '800' }}>[DECLINED]</span>}
                  </div>
                </div>

                {/* --- Row 2: Dates & Status --- */}
                <div className="detail-item--full">
                  <label>Service Date</label>
                  <span style={{ fontWeight: '800', color: '#10b981', fontSize: '15px' }}>
                    {(() => {
                      const formatDate = (ds) => { if (!ds) return ''; const d = new Date(ds); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
                      const s = selectedTicket.taskStartDate ? String(selectedTicket.taskStartDate).split('T')[0] : '';
                      const e = selectedTicket.taskEndDate ? String(selectedTicket.taskEndDate).split('T')[0] : '';
                      if (!e || s === e) return formatDate(s); return `${formatDate(s)} - ${formatDate(e)}`;
                    })()}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-pill ${selectedTicket.status?.toLowerCase().replace(' ', '-')}`}>{selectedTicket.status}</span>
                </div>
                <div className="detail-item">
                  <label>Scheduled Time</label>
                  <span style={{ fontWeight: '600' }}>{selectedTicket.taskTime}</span>
                </div>

                {/* --- Row 3: Location --- */}
                <div className="detail-item">
                  <label>City / Country</label>
                  <span style={{ fontWeight: '600' }}>{selectedTicket.city}, {selectedTicket.country}</span>
                </div>
                <div className="detail-item">
                  <label>Timezone</label>
                  <span style={{ fontWeight: '600' }}>{selectedTicket.timezone || '--'}</span>
                </div>
                <div className="detail-item--full">
                  <label>Address</label>
                  <span style={{ fontSize: '13px' }}>{selectedTicket.addressLine1} {selectedTicket.addressLine2 && `, ${selectedTicket.addressLine2}`} - {selectedTicket.zipCode}</span>
                </div>
                <div className="detail-item--full">
                  <label>Scope of Work</label>
                  <p className="scope-text" style={{ fontSize: '13px', lineHeight: '1.5' }}>{selectedTicket.scopeOfWork}</p>
                </div>

                <div className="detail-item--full divider"></div>

                {/* --- Row 4: Pricing Config --- */}
                <div className="detail-item">
                  <label>Billing Type</label>
                  <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.billingType || 'Hourly'}</span>
                </div>
                <div className="detail-item">
                  <label>Currency</label>
                  <span style={{ fontWeight: '700' }}>{selectedTicket.currency || 'USD'}</span>
                </div>
                <div className="detail-item">
                  <label>Hourly Rate</label>
                  <span style={{ fontWeight: '700', color: '#059669' }}>{selectedTicket.currency} {selectedTicket.hourlyRate || '0.00'}</span>
                </div>
                <div className="detail-item">
                  <label>Monthly Rate</label>
                  <span style={{ fontWeight: '700', color: '#6366f1' }}>{selectedTicket.currency} {parseFloat(selectedTicket.monthlyRate || 0).toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <label>✈ Travel / Day</label>
                  <span style={{ fontWeight: '700', color: '#0891b2' }}>{selectedTicket.currency} {parseFloat(selectedTicket.travelCostPerDay || 0).toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <label>🔧 Tools / Day</label>
                  <span style={{ fontWeight: '700', color: '#7c3aed' }}>{selectedTicket.currency} {parseFloat(selectedTicket.toolCost || 0).toFixed(2)}</span>
                </div>

                <div className="detail-item--full divider"></div>

                {/* --- Financial Breakdown --- */}
                {(() => {
                  const stBil = (selectedTicket.billingType || 'Hourly').trim();
                  const stStart = selectedTicket.taskStartDate ? String(selectedTicket.taskStartDate).split('T')[0] : '';
                  const stEnd   = selectedTicket.taskEndDate   ? String(selectedTicket.taskEndDate).split('T')[0]   : '';
                  const isMonthly = stBil.includes('Monthly');
                  const isMulti   = (stStart && stEnd && stStart !== stEnd) || (isMonthly && stStart && stEnd);

                  if (isMulti) {
                    // Pre-compute ticket working days for Monthly per-day rate
                    const _vmHols = {
                      'India':  ['2026-01-26','2026-03-21','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-27','2026-06-26','2026-08-15','2026-08-26','2026-10-02','2026-10-20','2026-11-08','2026-11-24','2026-12-25'],
                      'Poland': ['2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-03','2026-06-04','2026-08-15','2026-11-01','2026-11-11','2026-12-25','2026-12-26'],
                      'Other':  []
                    };
                    const vmHolsList = _vmHols[selectedTicket.country] || _vmHols['India'] || [];
                    const vmAllDates = getDatesInRange(stStart, stEnd);
                    const vmWorkingDates = vmAllDates.filter(d => {
                      const dw = new Date(`${d}T00:00:00Z`).getUTCDay();
                      return dw !== 0 && dw !== 6 && !vmHolsList.includes(d);
                    });
                    const engSummaryMap = {};
                    const cleanTaskTime = (selectedTicket.taskTime || '08:00').toString().slice(0, 5);
                    let totalR = 0, totalP = 0;

                    const logs = vmWorkingDates.map((dStr, i) => {
                      const logDateStr = dStr;
                      const existingLog = (timeLogs || []).find(l => (l.task_date || '').split('T')[0] === logDateStr) || {};

                      let ls = existingLog.start_time || existingLog.startTime;
                      let le = existingLog.end_time || existingLog.endTime;
                      let lb = existingLog.break_time_mins != null ? Number(existingLog.break_time_mins) : (existingLog.breakTime != null ? Number(existingLog.breakTime) : 0);

                      if (!ls || !le) {
                        ls = `${logDateStr}T${cleanTaskTime}:00`;
                        const ed = new Date(`${ls}Z`);
                        ed.setUTCHours(ed.getUTCHours() + 8);
                        le = ed.toISOString();
                        lb = 0;
                      }

                      const dayMonthlyDivisor = getWorkingDaysInMonth(logDateStr, selectedTicket.country);

                      // ── Determine which engineer is on this day ──────────────────────────
                      // lEngId is the actual engineer assigned to THIS specific day's log.
                      // We MUST resolve this BEFORE calculating any rates.
                      const lEngId = Number(
                        existingLog.engineer_id ?? existingLog.engineerId ?? selectedTicket.engineerId
                      );
                      const isNoEngDay = lEngId === 0;

                      // ── Build CUSTOMER RECEIVABLE rates for this day ─────────────────────
                      // Default to ticket rates; override with the assigned engineer's own
                      // rate card if it's a substitute (different engineer than primary).
                      let rRates = {
                        hr: selectedTicket.hourlyRate,
                        hd: selectedTicket.halfDayRate,
                        fd: selectedTicket.fullDayRate,
                        mr: selectedTicket.monthlyRate,
                        ar: selectedTicket.agreedRate,
                        cf: selectedTicket.cancellationFee,
                        bt: stBil
                      };
                      if (isNoEngDay) {
                        rRates = { hr: 0, hd: 0, fd: 0, mr: 0, ar: 0, cf: 0, bt: 'Hourly' };
                      } else if (lEngId && lEngId !== Number(selectedTicket.engineerId)) {
                        const subEng = engineers.find(en => Number(en.id) === lEngId);
                        if (subEng) {
                          rRates = {
                            hr: subEng.hourly_rate   || 0,
                            hd: subEng.half_day_rate || 0,
                            fd: subEng.full_day_rate || 0,
                            mr: subEng.monthly_rate  || 0,
                            ar: subEng.agreed_rate   || 0,
                            cf: subEng.cancellation_fee || 0,
                            bt: subEng.billing_type  || stBil
                          };
                        }
                      }

                      const resR = calculateTicketTotal({
                        startTime: ls, endTime: le, breakTime: lb,
                        hourlyRate:      rRates.hr, halfDayRate:     rRates.hd,
                        fullDayRate:     rRates.fd, monthlyRate:     rRates.mr,
                        agreedRate:      rRates.ar, cancellationFee: rRates.cf,
                        travelCostPerDay: selectedTicket.travelCostPerDay,
                        toolCost:         selectedTicket.toolCost,
                        billingType: rRates.bt, timezone: selectedTicket.timezone,
                        calcTimezone: 'Ticket Local', monthlyDivisor: dayMonthlyDivisor,
                        _isLogAggregation: true
                      });

                      // ── Build ENGINEER PAYOUT rates for this day ─────────────────────────
                      let pRates = {
                        hr: selectedTicket.engHourlyRate  || 0,
                        hd: selectedTicket.engHalfDayRate || 0,
                        fd: selectedTicket.engFullDayRate || 0,
                        mr: selectedTicket.engMonthlyRate || 0,
                        bt: selectedTicket.engBillingType || 'Hourly',
                        ot: 0, ooh: 0, we: 0, hol: 0
                      };
                      
                      // If Default pay type, pull ALL rates from MAIN engineer's profile
                      if (selectedTicket.eng_pay_type === 'Default') {
                         const mainE = engineers.find(e => Number(e.id) === Number(selectedTicket.engineerId));
                         if (mainE) {
                           pRates.hr = mainE.hourly_rate || 0;
                           pRates.hd = mainE.half_day_rate || 0;
                           pRates.fd = mainE.full_day_rate || 0;
                           pRates.mr = mainE.monthly_rate || 0;
                           pRates.bt = mainE.billing_type || 'Hourly';
                           pRates.ot = mainE.overtime_rate || 0;
                           pRates.ooh = mainE.ooh_rate || 0;
                           pRates.we = mainE.weekend_rate || 0;
                           pRates.hol = mainE.holiday_rate || 0;
                         }
                      }

                      if (isNoEngDay) {
                        pRates = { hr: 0, hd: 0, fd: 0, mr: 0, bt: 'Hourly', ot: 0, ooh: 0, we: 0, hol: 0 };
                      } else if (lEngId && lEngId !== Number(selectedTicket.engineerId)) {
                        const eng = engineers.find(en => Number(en.id) === lEngId);
                        if (eng) {
                          pRates = {
                            hr: eng.hourly_rate   || 0,
                            hd: eng.half_day_rate || 0,
                            fd: eng.full_day_rate || 0,
                            mr: eng.monthly_rate  || 0,
                            bt: eng.billing_type  || 'Hourly',
                            ot: eng.overtime_rate || 0,
                            ooh: eng.ooh_rate || 0,
                            we: eng.weekend_rate || 0,
                            hol: eng.holiday_rate || 0
                          };
                        }
                      }

                      const resP = calculateTicketTotal({
                        startTime: ls, endTime: le, breakTime: lb,
                        hourlyRate: pRates.hr, halfDayRate: pRates.hd,
                        fullDayRate: pRates.fd, monthlyRate: pRates.mr,
                        overtimeRate: pRates.ot, oohRate: pRates.ooh,
                        weekendRate: pRates.we, holidayRate: pRates.hol,
                        billingType: pRates.bt, timezone: selectedTicket.timezone,
                        calcTimezone: 'Ticket Local',
                        travelCostPerDay: selectedTicket.travelCostPerDay,
                        toolCost: selectedTicket.toolCost,
                        monthlyDivisor: dayMonthlyDivisor,
                        _isLogAggregation: true
                      });

                      const rV  = parseFloat(resR?.grandTotal || 0);
                      const pV  = parseFloat(resP?.grandTotal || 0);
                      const trv = parseFloat(resR?.travel || 0);
                      const tol = parseFloat(resR?.tools  || 0);
                      const base= parseFloat(resR?.base   || 0);
                      totalR += rV; totalP += pV;

                      // Engineer tracking
                      const currentEngineer = engineers.find(en => Number(en.id) === Number(lEngId));
                      const isNoEng = Number(lEngId) === 0;
                      const eName = isNoEng ? 'No Engineer Assigned' : (currentEngineer ? currentEngineer.name : (selectedTicket.engineerName || 'Assigned Eng'));
                      if (!engSummaryMap[lEngId]) engSummaryMap[lEngId] = { name: eName, total: 0, hours: 0, isNoEng };
                      if (!isNoEng) {
                        engSummaryMap[lEngId].total += pV;
                        engSummaryMap[lEngId].hours += parseFloat(resP?.hrs || 0);
                      }

                      return { ...existingLog, rV, pV, trv, tol, base, dur: parseFloat(resR?.hrs || 0), logDateStr };
                    });

                    // ── Attribute One-Time Fees to Primary Engineer ──────────────────────
                    const primaryId = Number(selectedTicket.engineerId);
                    const otBil = (selectedTicket.billingType || 'Hourly').trim();
                    let oneTimeR = 0, oneTimeP = 0;
                    
                    if (otBil === 'Agreed Rate') {
                      oneTimeR += (parseFloat(selectedTicket.agreedRate) || 0);
                      oneTimeP += (parseFloat(selectedTicket.engAgreedRate) || 0);
                    } else if (otBil === 'Cancellation') {
                      oneTimeR += (parseFloat(selectedTicket.cancellationFee) || 0);
                      oneTimeP += (parseFloat(selectedTicket.engCancellationFee) || 0);
                    }
                    
                    // Add Tool Cost once
                    const tc = (parseFloat(selectedTicket.toolCost || 0));
                    oneTimeR += tc;
                    oneTimeP += tc;

                    totalR += oneTimeR;
                    totalP += oneTimeP;

                    if (primaryId && engSummaryMap[primaryId]) {
                      engSummaryMap[primaryId].total += oneTimeP;
                    } else if (primaryId && !engSummaryMap[primaryId]) {
                      const eng = engineers.find(e => Number(e.id) === primaryId);
                      engSummaryMap[primaryId] = { name: eng ? eng.name : (selectedTicket.engineerName || 'Primary'), total: oneTimeP, hours: 0 };
                    }

                    const engSummary = Object.values(engSummaryMap);

                    const cur = selectedTicket.currency || 'USD';

                    return (
                      <div className="detail-item--full">

                        {/* Monthly Formula banner */}
                        {isMonthly && (
                          <div style={{ marginBottom: '14px', padding: '12px 16px', background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#6366f1' }}>📊 Monthly Billing Breakdown</span>
                            <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '600' }}>
                              Monthly Rate: <strong>{cur} {parseFloat(selectedTicket.monthlyRate || 0).toFixed(2)}</strong>
                            </span>
                            <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '600' }}>
                              Working Days Summary: <strong>{vmWorkingDates.length} days</strong>
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>Calculated using month-specific divisors (approx {cur}{(parseFloat(selectedTicket.monthlyRate||0)/22).toFixed(2)}/day)</span>
                            <span style={{ fontSize: '12px', color: '#0891b2', fontWeight: '600' }}>
                              ✈ Travel/day: <strong>{cur} {parseFloat(selectedTicket.travelCostPerDay || 0).toFixed(2)}</strong>
                            </span>
                            <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>
                              🔧 Tool Cost: <strong>{cur} {parseFloat(selectedTicket.toolCost || 0).toFixed(2)}</strong>
                            </span>
                          </div>
                        )}

                        {/* Premium Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '16px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
                            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Revenue (Receivable)</div>
                            <div style={{ fontSize: '24px', fontWeight: '900' }}>{cur} {totalR.toFixed(2)}</div>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '16px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Engineer Payout</div>
                            <div style={{ fontSize: '24px', fontWeight: '900' }}>{selectedTicket.eng_currency || cur} {totalP.toFixed(2)}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Estimated Margin</div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: (totalR - totalP) >= 0 ? '#059669' : '#ef4444' }}>
                              {cur} {(totalR - totalP).toFixed(2)}
                              <span style={{ fontSize: '14px', marginLeft: '8px', opacity: 0.6 }}>({totalR > 0 ? (((totalR - totalP) / totalR) * 100).toFixed(0) : 0}%)</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📅</span>
                            Shift History & Logs
                          </h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" value={newExtendEndDate} onChange={e => setNewExtendEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <button className="btn-wow-secondary" onClick={handleExtendJob} disabled={isExtending} style={{ padding: '4px 12px', fontSize: '11px' }}>{isExtending ? 'Wait...' : '+ Add Day'}</button>
                            <button 
                              className="btn-wow-secondary" 
                              onClick={() => handleResolveEarly(newExtendEndDate)} 
                              disabled={isResolvingEarly || !newExtendEndDate} 
                              style={{ padding: '4px 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            >
                              {isResolvingEarly ? 'Wait...' : 'Resolve Early'}
                            </button>
                          </div>
                        </div>

                        <div className="dispatch-logs-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <tr>
                                <th style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Engineer / Shift</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>Hrs</th>
                                {isMonthly && <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6366f1', whiteSpace: 'nowrap' }}>Per Day Rate</th>}
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#0891b2', whiteSpace: 'nowrap' }}>✈ Travel</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#7c3aed', whiteSpace: 'nowrap' }}>🔧 Tools</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6366f1', whiteSpace: 'nowrap' }}>Day Total</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#059669', whiteSpace: 'nowrap' }}>Payout</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Group logs by month for accordion display
                                const monthGroups = {};
                                logs.forEach((L, i) => {
                                  const mKey = L.logDateStr.substring(0, 7); // "2026-04"
                                  if (!monthGroups[mKey]) monthGroups[mKey] = [];
                                  monthGroups[mKey].push({ ...L, _origIdx: i });
                                });

                                const totalColSpan = isMonthly ? 8 : 7;

                                return Object.keys(monthGroups).sort().map(mKey => {
                                  const monthLogs = monthGroups[mKey];
                                  const collapseKey = mKey + '-view';
                                  const isCollapsed = collapsedMonths.has(collapseKey);
                                  const monthLabel = new Date(mKey + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                                  
                                  // Calculate month subtotals
                                  const mTotalR = monthLogs.reduce((s, l) => s + l.rV, 0);
                                  const mTotalP = monthLogs.reduce((s, l) => s + l.pV, 0);
                                  const mTotalHrs = monthLogs.reduce((s, l) => s + l.dur, 0);

                                  return (
                                    <React.Fragment key={mKey}>
                                      {/* Month Accordion Header */}
                                      <tr
                                        onClick={() => {
                                          setCollapsedMonths(prev => {
                                            const next = new Set(prev);
                                            if (next.has(collapseKey)) next.delete(collapseKey);
                                            else next.add(collapseKey);
                                            return next;
                                          });
                                        }}
                                        style={{ background: 'linear-gradient(135deg, #f1f5f9, #eef2ff)', cursor: 'pointer', userSelect: 'none', borderBottom: '2px solid #c7d2fe' }}
                                      >
                                        <td colSpan={totalColSpan} style={{ padding: '10px 12px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontSize: '14px', color: '#6366f1', fontWeight: '900', transition: 'transform 0.2s', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                                              <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '13px' }}>{monthLabel}</span>
                                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', background: '#e2e8f0', padding: '2px 8px', borderRadius: '20px' }}>{monthLogs.length} days</span>
                                              <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: '600', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: '20px' }}>{mTotalHrs.toFixed(1)}h</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#6366f1' }}>{cur} {mTotalR.toFixed(2)}</span>
                                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>{selectedTicket.eng_currency || cur} {mTotalP.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Month Rows (visible when expanded) */}
                                      {!isCollapsed && monthLogs.map((L, mIdx) => {
                                        const i = L._origIdx;
                                        const viewEngId = Number(L.engineer_id ?? L.engineerId ?? selectedTicket.engineerId);
                                        const isNoEngRow = viewEngId === 0;
                                        return (
                                          <tr key={L.id || i} className={isNoEngRow ? 'row-no-engineer' : ''} style={{ borderBottom: '1px solid #f1f5f9', background: mIdx % 2 === 0 ? '#fff' : '#fafafa', position: 'relative' }}>
                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                              <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '11px' }}>
                                                {new Date(`${L.logDateStr}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                              </div>
                                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Weekday</div>
                                            </td>
                                            <td style={{ padding: '8px 10px', minWidth: '180px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <select
                                                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: isNoEngRow ? '800' : '500', color: isNoEngRow ? '#ef4444' : 'inherit', background: 'white' }}
                                                  value={viewEngId}
                                                  onChange={(e) => handleUpdateLog(L.id, { engineerId: Number(e.target.value) })}
                                                >
                                                  <optgroup label="Core Team">
                                                    {engineers.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                                                  </optgroup>
                                                  <optgroup label="Special Cases">
                                                    <option value="0" style={{ color: '#ef4444', fontWeight: '800' }}>❌ No Engineer / Absent</option>
                                                  </optgroup>
                                                </select>

                                                {/* Bulk Assign: set this engineer for ALL days on this ticket */}
                                                <button
                                                  type="button"
                                                  title={`Assign ${engineers.find(e => Number(e.id) === viewEngId)?.name || 'this engineer'} to all days`}
                                                  style={{ padding: '4px 6px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap', fontWeight: '700' }}
                                                  onClick={() => {
                                                    const tStart = selectedTicket.taskStartDate ? String(selectedTicket.taskStartDate).split('T')[0] : '';
                                                    const tEnd   = selectedTicket.taskEndDate   ? String(selectedTicket.taskEndDate).split('T')[0]   : '';
                                                    const allDays = getDatesInRange(tStart, tEnd);
                                                    const newEngId = viewEngId;
                                                    // Update all existing logs (those with an id) for this ticket
                                                    (timeLogs || []).forEach(l => {
                                                      if (l.id) handleUpdateLog(l.id, { engineerId: newEngId });
                                                    });
                                                  }}
                                                >
                                                  🚀 All Days
                                                </button>
                                                {/* Rate Card Tooltip */}
                                                {(() => {
                                                  const selectedEng = engineers.find(e => Number(e.id) === viewEngId);
                                                  if (!selectedEng) return null;
                                                  const tooltipContent = `Rates for ${selectedEng.name}:\n• Hourly: ${cur} ${selectedEng.hourly_rate || 0}\n• Half Day: ${cur} ${selectedEng.half_day_rate || 0}\n• Full Day: ${cur} ${selectedEng.full_day_rate || 0}\n• Monthly: ${cur} ${selectedEng.monthly_rate || 0}`;

                                                  return (
                                                    <div className="tooltip-container" style={{ position: 'relative', display: 'inline-block' }}>
                                                      <span style={{ fontSize: '13px', cursor: 'help', color: '#6366f1' }}>ℹ️</span>
                                                      <div className="tooltip-text" style={{
                                                        visibility: 'hidden', width: '220px', backgroundColor: '#1e293b', color: '#fff', textAlign: 'left',
                                                        borderRadius: '12px', padding: '14px', position: 'absolute', zIndex: 9999, top: '-20px', right: '35px',
                                                        opacity: 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '11px', lineHeight: '1.6',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)', pointerEvents: 'none', whiteSpace: 'pre-line',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                      }}>
                                                        <div style={{ fontWeight: '800', color: '#818cf8', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Rate Card: {selectedEng.name}</div>
                                                        {tooltipContent.split('\n').slice(1).join('\n')}
                                                        <div style={{
                                                          position: 'absolute', top: '24px', left: '100%',
                                                          borderWidth: '6px', borderStyle: 'solid', borderColor: 'transparent transparent transparent #1e293b'
                                                        }}></div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                                </div>
                                               <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                                                  <input
                                                    type="time"
                                                    value={safeExtractTime(L.start_time)}
                                                    style={{ fontSize: '10px', padding: '3px 4px', width: '76px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    onChange={(e) => handleUpdateLog(L.id, { startTime: `${L.logDateStr}T${e.target.value}:00.000Z` })}
                                                  />
                                                  <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700' }}>→</span>
                                                  <input
                                                    type="time"
                                                    value={safeExtractTime(L.end_time)}
                                                    style={{ fontSize: '10px', padding: '3px 4px', width: '76px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                                    onChange={(e) => handleUpdateLog(L.id, { endTime: `${L.logDateStr}T${e.target.value}:00.000Z` })}
                                                  />
                                                  <span style={{
                                                    fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', whiteSpace: 'nowrap',
                                                    color: isUpdatingLog === L.id ? '#f59e0b' : '#10b981',
                                                    background: isUpdatingLog === L.id ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                    border: `1px solid ${isUpdatingLog === L.id ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                                    transition: 'all 0.3s ease'
                                                  }}>
                                                    {isUpdatingLog === L.id ? '⏳ Saving…' : '✓ Saved'}
                                                  </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '700', color: L.dur > 8 ? '#ef4444' : '#6366f1', whiteSpace: 'nowrap' }}>
                                              {L.dur > 0 ? L.dur.toFixed(1) + 'h' : '--'}
                                            </td>
                                            {isMonthly && (
                                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#6366f1', whiteSpace: 'nowrap' }}>
                                                <div>{cur} {L.base.toFixed(2)}</div>
                                                <div style={{ fontSize: '9px', color: '#94a3b8' }}>Divisor: {getWorkingDaysInMonth(L.logDateStr, selectedTicket.country)}</div>
                                              </td>
                                            )}
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#0891b2', whiteSpace: 'nowrap' }}>
                                              {cur} {L.trv.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#7c3aed', whiteSpace: 'nowrap' }}>
                                              {cur} {L.tol.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#1e293b', fontSize: '12px', whiteSpace: 'nowrap', background: 'rgba(99,102,241,0.04)' }}>
                                              {cur} {L.rV.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                              {selectedTicket.eng_currency || cur} {L.pV.toFixed(2)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                });
                              })()}
                              {/* Totals row: colspan = total_cols - 2 (Day Total + Payout shown separately) */}
                              <tr style={{ background: 'linear-gradient(135deg,#f8fafc,#eef2ff)', borderTop: '2px solid #c7d2fe' }}>
                                <td colSpan={isMonthly ? 6 : 5} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '12px', color: '#6366f1', fontWeight: '900', letterSpacing: '0.04em' }}>
                                  GRAND TOTAL &nbsp;·&nbsp; {logs.length} working day{logs.length !== 1 ? 's' : ''}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '15px', color: '#6366f1', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                  {cur} {totalR > 0 ? totalR.toFixed(2) : parseFloat(selectedTicket.totalCost || 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '15px', color: '#059669', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                  {selectedTicket.eng_currency || cur} {totalP > 0 ? totalP.toFixed(2) : parseFloat(selectedTicket.eng_total_cost || selectedTicket.engTotalCost || 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* UPGRADED: Always show Engineer-wise Breakdown */}
                        {engSummary.filter(s => !s.isNoEng).length > 0 && (
                          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>👷 Engineer-wise Breakdown (Payout)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                              {engSummary.map((es, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                                      {es.name.charAt(0)}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{es.name}</span>
                                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{es.hours.toFixed(2)} hours logged</span>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>
                                    {selectedTicket.eng_currency || cur} {es.total.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* View Modal Combined Payout Summary */}
                            <div style={{ borderTop: '1.5px dashed rgba(16,185,129,0.3)', marginTop: '20px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Combined Engineer Payout</span>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>{selectedTicket.eng_currency || cur} {totalP.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                          <div style={{ background: 'linear-gradient(135deg,#f8fafc,#eef2ff)', padding: '16px', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Grand Total (Receivable)</label>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#6366f1', marginTop: '6px' }}>{cur} {totalR > 0 ? totalR.toFixed(2) : parseFloat(selectedTicket.totalCost || 0).toFixed(2)}</div>
                            {isMonthly && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Combined monthly pro-rata + travel + tools</div>}
                          </div>
                          <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Grand Total (Payout)</label>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#059669', marginTop: '6px' }}>{selectedTicket.eng_currency || cur} {totalP > 0 ? totalP.toFixed(2) : parseFloat(selectedTicket.eng_total_cost || selectedTicket.engTotalCost || 0).toFixed(2)}</div>
                          </div>
                        </div>

                      </div>
                    );
                  } else {
                    // Single-day view
                    const cur = selectedTicket.currency || 'USD';
                    return (
                      <div className="detail-item--full">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                          <div style={{ background: 'linear-gradient(135deg,#f8fafc,#eef2ff)', padding: '16px', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total (Receivable)</label>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#6366f1', marginTop: '6px' }}>{cur} {parseFloat(selectedTicket.totalCost || 0).toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              Travel: {cur} {parseFloat(selectedTicket.travel_cost_per_day || selectedTicket.travelCostPerDay || 0).toFixed(2)} · Tools: {cur} {parseFloat(selectedTicket.tool_cost || selectedTicket.toolCost || 0).toFixed(2)}
                            </div>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total (Payout)</label>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#059669', marginTop: '6px' }}>{selectedTicket.eng_currency || cur} {parseFloat(selectedTicket.eng_total_cost || selectedTicket.engTotalCost || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Professional Engineer Card for Single Day */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800' }}>
                              {(selectedTicket.engineerName || 'E').charAt(0)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedTicket.engineerName || 'Assigned Engineer'}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Main Assignee</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>
                            {selectedTicket.eng_currency || cur} {parseFloat(selectedTicket.eng_total_cost || selectedTicket.engTotalCost || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Linked Documents</label>
                  <div className="ticket-docs-list" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTicket.documentsLabel ? (
                      selectedTicket.documentsLabel.split(', ').map((docName, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-lighter)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.9rem' }}>{docName}</span>
                          <button type="button" onClick={() => handleViewDocument(docName)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} title="View"><FiEye size={16} /></button>
                        </div>
                      ))
                    ) : (<span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No documents linked.</span>)}
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Service Notes / Timeline</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
                    {ticketNotes.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>No notes yet.</p> : ticketNotes.map((n, idx) => (
                      <div key={n.id || idx} style={{ marginBottom: '10px', padding: '10px', background: n.author_type === 'admin' ? '#f0f9ff' : '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: n.author_type === 'admin' ? '#0369a1' : '#334155' }}>{n.author_type === 'admin' ? 'ADMIN' : 'ENGINEER'}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{n.content}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input type="text" placeholder="Reply..." value={newAdminNote} onChange={e => setNewAdminNote(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.85rem' }} />
                    <button onClick={handleAddAdminNote} disabled={addingNote || !newAdminNote} className="btn-wow-primary" style={{ padding: '0 16px' }}>{addingNote ? '...' : 'Send'}</button>
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Engineer Uploads</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {ticketAttachments.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No attachments.</span> : ticketAttachments.map((a, idx) => (
                      <a key={a.id || idx} href={`https://awokta.com/${a.file_url}`} target="_blank" rel="noreferrer" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <img src={`https://awokta.com/${a.file_url}`} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="detail-item--full divider"></div>

                <div className="detail-item--full">
                  <label>Reported Expenses</label>
                  <div style={{ marginTop: '8px' }}>
                    {ticketExpenses.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No expenses.</span> : ticketExpenses.map((ex, idx) => (
                      <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '6px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{ex.description}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(ex.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.9rem' }}>{selectedTicket.currency} {parseFloat(ex.amount).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ticket-modal-footer">
                <button className="btn-wow-secondary" onClick={handleCloseTicketModal}><FiX /> Close Details</button>
                <button
                  className="btn-wow-primary"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                  onClick={() => {
                    handleCloseTicketModal();
                    startEditTicket(selectedTicket.id);
                  }}
                >
                  <FiEdit2 /> Edit Full Ticket
                </button>
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
