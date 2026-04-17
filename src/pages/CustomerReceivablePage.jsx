/* CustomerReceivablePage.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiFileText, FiCalendar, FiCheckCircle,
    FiAlertCircle, FiX, FiSearch, FiArrowRight, FiUser,
    FiBriefcase, FiHash, FiClock, FiEye, FiFilter, FiDownload
} from 'react-icons/fi';
import './CustomerReceivablePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CURRENCIES = [
    { value: 'All', label: 'All Currencies' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' }
];

const EXCHANGE_RATES = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.0
};

const MONTHS = [
    "All Months", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = ["All Years", "2024", "2025", "2026"];
const HOLIDAYS_CALC = {
    'India':  ['2026-01-26','2026-03-21','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-27','2026-06-26','2026-08-15','2026-08-26','2026-10-02','2026-10-20','2026-11-08','2026-11-24','2026-12-25'],
    'Poland': ['2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-03','2026-06-04','2026-08-15','2026-11-01','2026-11-11','2026-12-25','2026-12-26'],
    'Other':  []
};
const getWorkingDaysInMonth = (dateStr, country = 'India') => {
    if (!dateStr) return 22;
    const d = new Date(dateStr);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const totalDays = new Date(yr, mo + 1, 0).getDate();
    const holidays = HOLIDAYS_CALC[country] || HOLIDAYS_CALC['India'] || [];
    let count = 0;
    for (let i = 1; i <= totalDays; i++) {
        const checkStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const checkDate = new Date(`${checkStr}T00:00:00Z`);
        const day = checkDate.getUTCDay();
        if (day !== 0 && day !== 6 && !holidays.includes(checkStr)) {
            count++;
        }
    }
    return count || 22;
};

const CustomerReceivablePage = () => {
    const [stats, setStats] = useState({ unbilled: 0, unpaid: 0, overdue: 0 });
    const [activeTab, setActiveTab] = useState('unbilled');
    const [unbilledList, setUnbilledList] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcTimezone, setCalcTimezone] = useState('Ticket Local');

    // --- FRONTEND CALCULATION ENGINE (Consistent with Tickets/Engineers Page) ---
    const calculateTicketCostFrontend = (ticket, forcedTZ, targetCurrency = 'USD') => {
        if (!ticket) return {};
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        const rateMultiplier = 1;

        const hr = parseFloat(ticket.hourly_rate || 0) * rateMultiplier;
        const hd = parseFloat(ticket.half_day_rate || 0) * rateMultiplier;
        const fd = parseFloat(ticket.full_day_rate || 0) * rateMultiplier;
        const billingType = ticket.billing_type || 'Hourly';

        // Helper for zoned time
        const getZonedInfo = (date) => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
                const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
                return { dateStr, day: new Date(dateStr).getDay(), hour: parseInt(parts.hour) };
            } catch (e) { return { dateStr: '', day: date.getDay(), hour: date.getHours() }; }
        };

        const cur = ticket.currency || 'USD';
        const bil = ticket.billing_type || 'Hourly';

        let logs = [];
        try { logs = typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs) : (ticket.time_logs || []); } catch (e) { }

        if (logs.length > 0 && !ticket.is_recursive_call) {
            let totalRec = 0; let totalHrs = 0; let baseC = 0; let otP = 0; let oohP = 0; let spP = 0; let travC = 0; let toolC = 0;
            logs.forEach(log => {
                const logDate = (log.task_date || '').split('T')[0];
                if (logDate) {
                    const dObj = new Date(`${logDate}T00:00:00Z`);
                    const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
                    const activeHols = HOLIDAYS_CALC[ticket.country] || HOLIDAYS_CALC['India'] || [];
                    const isHoliday = activeHols.includes(logDate);
                    if ((isWeekend || isHoliday) && (!log.start_time || !log.endTime)) return;
                }

                let sTime = log.start_time;
                let eTime = log.end_time;
                let brk = (log.break_time_mins || 0) * 60;

                if (!sTime || !eTime) {
                    if (!log.task_date) return;
                    const dStr = (log.task_date || '').split('T')[0];
                    const ct = String(ticket.task_time || '09:00').slice(0, 5);
                    const sDT = new Date(`${dStr}T${ct}:00Z`);
                    if (isNaN(sDT.getTime())) return;
                    sTime = sDT.toISOString();
                    const eDT = new Date(sDT.getTime() + 8 * 3600000);
                    eTime = eDT.toISOString();
                    brk = 0;
                }

                const res = calculateTicketCostFrontend({ ...ticket, start_time: sTime, end_time: eTime, break_time: brk, time_logs: [], is_recursive_call: true }, forcedTZ, targetCurrency);
                totalHrs += parseFloat(res.totalHours || 0);
                if (bil === 'Hourly' || bil === 'Half Day + Hourly' || bil === 'Full Day + OT' || bil === 'Mixed Mode') {
                    baseC += parseFloat(res.baseCost || 0);
                }
                otP += parseFloat(res.otPremium || 0);
                oohP += parseFloat(res.oohPremium || 0);
                spP += parseFloat(res.specialDayPremium || 0);
                travC += parseFloat(res.travelCost || 0);
                toolC += parseFloat(res.toolCost || 0);
            });
            if (bil.includes('Monthly')) {
                const fullRate = parseFloat(ticket.monthly_rate || ticket.monthlyRate) || 0;
                baseC = 0;
                logs.forEach(l => {
                    const lDate = (l.task_date || l.start_time || '').split('T')[0];
                    if (lDate) {
                        const divisor = getWorkingDaysInMonth(lDate, ticket.country);
                        baseC += fullRate / divisor;
                    }
                });
            } else if (bil === 'Agreed Rate' || bil === 'Cancellation') {
                const dummy = calculateTicketCostFrontend({ ...ticket, time_logs: [], is_recursive_call: true }, forcedTZ, targetCurrency);
                baseC = parseFloat(dummy.baseCost || 0);
            }
            totalRec = baseC + otP + oohP + spP + travC + toolC;
            return {
                totalReceivable: totalRec.toFixed(2),
                baseCost: baseC.toFixed(2), baseBreakdown: `Aggregate of ${logs.length} days`,
                otPremium: otP.toFixed(2), oohPremium: oohP.toFixed(2), specialDayPremium: spP.toFixed(2),
                totalHours: totalHrs, formattedHours: `${Math.floor(totalHrs)}h ${Math.round((totalHrs % 1) * 60)}m`,
                travelCost: travC, toolCost: toolC,
                isOOH: oohP > 0, isSpecialDay: spP > 0
            };
        }

        const sStr = ticket.start_time || ticket.task_start_date;
        const eStr = ticket.end_time || ticket.task_end_date || ticket.start_time;
        if (!sStr || !eStr) return {};

        // If it's a date-only string from task_start_date, force a standard 8-hour shift default
        const s = new Date(sStr.includes('T') ? sStr : `${sStr}T09:00:00Z`);
        const e = new Date(eStr.includes('T') ? eStr : `${eStr}T17:00:00Z`);
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);

        // Final protection: if time is not explicitly logged, default to 8 hours max.
        let hrs = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brk) / 3600;
        if (!ticket.start_time && !ticket.end_time && hrs > 8) hrs = 8;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if (sStr.includes('T')) startHr = parseInt(sStr.split('T')[1].split(':')[0], 10);
        if (eStr.includes('T')) endHr = parseInt(eStr.split('T')[1].split(':')[0], 10);

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const activeHols = HOLIDAYS_CALC[ticket.country] || HOLIDAYS_CALC['India'] || [];
        const isH = activeHols.includes(info.dateStr) || activeHols.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;
        const isO = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

        let base = 0, ot = 0, ooh = 0, sp = 0;
        let baseBreakdown = "";
        let otBreakdown = "";
        let spBreakdown = "";
        let oohBreakdown = "";

        if (bil === 'Hourly') {
            const b = Math.max(2, hrs); 
            base = b * hr; 
            baseBreakdown = `Billed ${b.toFixed(2)}h @ ${cur} ${hr.toFixed(2)} (Min 2h)`;
        } else if (bil === 'Half Day + Hourly') {
            if (hrs <= 4) {
                base = hd;
                baseBreakdown = `Fixed Half Day Rate (≤ 4h) = ${cur} ${hd.toFixed(2)}`;
            } else {
                const extra = hrs - 4;
                base = hd + (extra * hr);
                baseBreakdown = `Half Day Rate (${cur} ${hd.toFixed(2)}) + Extra ${extra.toFixed(2)}h @ ${cur} ${hr.toFixed(2)}`;
            }
        } else if (bil === 'Full Day + OT') {
            base = fd;
            baseBreakdown = `Fixed Full Day Rate (≤ 8h) = ${cur} ${fd.toFixed(2)}`;
            if (hrs > 8) {
                const otHrs = hrs - 8;
                ot = otHrs * (hr * 1.5);
                otBreakdown = `${otHrs.toFixed(2)}h Overtime @ ${cur} ${(hr * 1.5).toFixed(2)} (1.5x)`;
            }
        } else if (bil.includes('Monthly')) {
            const divisor = getWorkingDaysInMonth(sStr, ticket.country);
            base = parseFloat(ticket.monthly_rate || ticket.monthlyRate || 0) / divisor;
            baseBreakdown = `Pro-rata Monthly (1 day) = ${cur} ${base.toFixed(2)} (Divisor: ${divisor})`;
            // Non-premium days covering normal hours + OT > 8
            if (hrs > 8) {
                const otHrs = hrs - 8;
                ot = otHrs * (hr * 1.5); 
                otBreakdown = `${otHrs.toFixed(2)}h Overtime @ ${cur} ${(hr * 1.5).toFixed(2)} (1.5x)`;
            }
        } else if (bil === 'Agreed Rate') { 
            base = parseFloat(ticket.agreed_rate) || 0;
            baseBreakdown = `Agreed / Fixed Rate = ${cur} ${base.toFixed(2)}`;
        } else if (bil === 'Cancellation') { 
            base = parseFloat(ticket.cancellation_fee) || 0; 
            baseBreakdown = `Fixed Cancellation Fee = ${cur} ${base.toFixed(2)}`;
        } else if (bil === 'Mixed Mode') {
            if (hrs <= 4) {
                base = hd;
                baseBreakdown = `Billed as Half Day (≤ 4h) = ${cur} ${hd.toFixed(2)}`;
            } else if (hrs <= 8) {
                base = fd;
                baseBreakdown = `Billed as Full Day (4-8h) = ${cur} ${fd.toFixed(2)}`;
            } else {
                base = fd;
                baseBreakdown = `Full Day Base (8h) = ${cur} ${fd.toFixed(2)}`;
                const otHrs = hrs - 8;
                ot = otHrs * (hr * 1.5);
                otBreakdown = `${otHrs.toFixed(2)}h Overtime @ ${cur} ${(hr * 1.5).toFixed(2)} (1.5x)`;
            }
        }

        const trav = parseFloat(ticket.travel_cost_per_day || ticket.travelCostPerDay || 0);
        const tool = parseFloat(ticket.tool_cost || ticket.toolCost || 0);
        const total = base + ot + ooh + sp + trav + tool;

        // Always use live calculation to ensure correctness, especially after fixing the 0.06 bug.
        // If we need to support manual overrides in the future, we can re-add prioritization logic here.
        let finalReceivable = total;
        let billingGap = 0;

        return {
            totalReceivable: finalReceivable.toFixed(2), 
            baseCost: (base + billingGap).toFixed(2),
            baseBreakdown,
            otPremium: ot.toFixed(2), 
            otBreakdown,
            oohPremium: ooh.toFixed(2), 
            oohBreakdown,
            specialDayPremium: sp.toFixed(2),
            spBreakdown,
            totalHours: hrs, 
            formattedHours: `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`,
            travelCost: trav, 
            toolCost: tool,
            isOOH: isO,
            isSpecialDay,
            ooh: isO ? 'Yes' : 'No',
            ww: sp > 0 ? 'Yes' : 'No',
            hw: sp > 0 ? 'Yes' : 'No'
        };
    };

    const calculateEngineerPayoutFrontend = (ticket, forcedTZ) => {
        if (!ticket) return {};
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // Helper for zoned time
        const getZonedInfo = (date) => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
                const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
                return { dateStr, day: new Date(`${dateStr}T00:00:00Z`).getUTCDay(), hour: parseInt(parts.hour) };
            } catch (e) { return { dateStr: '', day: date.getDay(), hour: date.getHours() }; }
        };

        const hr = parseFloat(ticket.eng_hourly_rate || 0);
        const hd = parseFloat(ticket.eng_half_day_rate || 0);
        const fd = parseFloat(ticket.eng_full_day_rate || 0);
        const billingType = ticket.eng_billing_type || 'Hourly';

        let logs = [];
        try { logs = typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs) : (ticket.time_logs || []); } catch (e) { }

        if (logs.length > 0 && !ticket.is_recursive_call) {
            let totalRec = 0; let totalHrs = 0; let baseC = 0; let otP = 0; let oohP = 0; let spP = 0; let travC = 0; let toolC = 0;
            logs.forEach(log => {
                const logDate = (log.task_date || '').split('T')[0];
                if (logDate) {
                    const dObj = new Date(`${logDate}T00:00:00Z`);
                    const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
                    const activeHols = HOLIDAYS_CALC[ticket.country] || HOLIDAYS_CALC['India'] || [];
                    const isHoliday = activeHols.includes(logDate);
                    if ((isWeekend || isHoliday) && (!log.start_time || !log.endTime)) return;
                }

                let sTime = log.start_time;
                let eTime = log.end_time;
                let brk = (log.break_time_mins || 0) * 60;

                if (!sTime || !eTime) {
                    if (!log.task_date) return;
                    const dStr = (log.task_date || '').split('T')[0];
                    const ct = String(ticket.task_time || '09:00').slice(0, 5);
                    const sDT = new Date(`${dStr}T${ct}:00Z`);
                    if (isNaN(sDT.getTime())) return;
                    sTime = sDT.toISOString();
                    const eDT = new Date(sDT.getTime() + 8 * 3600000);
                    eTime = eDT.toISOString();
                    brk = 0;
                }

                const res = calculateEngineerPayoutFrontend({ ...ticket, start_time: sTime, end_time: eTime, break_time: brk, time_logs: [], is_recursive_call: true }, tz);
                totalHrs += parseFloat(res.totalHours || 0);
                if (billingType === 'Hourly' || billingType === 'Half Day + Hourly' || billingType === 'Full Day + OT' || billingType === 'Mixed Mode') {
                    baseC += parseFloat(res.baseCost || 0);
                }
                otP += parseFloat(res.otPremium || 0);
                oohP += parseFloat(res.oohPremium || 0);
                spP += parseFloat(res.specialDayPremium || 0);
                travC += parseFloat(res.travelCost || 0);
                toolC += parseFloat(res.toolCost || 0);
            });
            if (billingType.includes('Monthly')) {
                const fullRate = parseFloat(ticket.eng_monthly_rate || ticket.monthly_rate) || 0;
                baseC = 0;
                logs.forEach(l => {
                    const lDate = (l.task_date || l.start_time || '').split('T')[0];
                    if (lDate) {
                        const divisor = getWorkingDaysInMonth(lDate, ticket.country);
                        baseC += fullRate / divisor;
                    }
                });
            } else if (billingType === 'Agreed Rate' || billingType === 'Cancellation') {
                const dummy = calculateEngineerPayoutFrontend({ ...ticket, time_logs: [], is_recursive_call: true }, tz);
                baseC = parseFloat(dummy.baseCost);
            }
            totalRec = baseC + otP + oohP + spP + travC + toolC;
            return {
                totalPayout: totalRec.toFixed(2),
                baseCost: baseC.toFixed(2), otPremium: otP.toFixed(2), oohPremium: oohP.toFixed(2), specialDayPremium: spP.toFixed(2),
                totalHours: totalHrs, otHours: totalHrs > 8 ? totalHrs - 8 : 0,
                travelCost: travC.toFixed(2), toolCost: toolC.toFixed(2)
            };
        }

        const sStr = ticket.start_time || ticket.task_start_date;
        const eStr = ticket.end_time || ticket.task_end_date || ticket.start_time;
        if (!sStr || !eStr) return {};

        const s = new Date(sStr.includes('T') ? sStr : `${sStr}T09:00:00Z`);
        const e = new Date(eStr.includes('T') ? eStr : `${eStr}T17:00:00Z`);
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);
        const hrs = Math.max(0, (e.getTime() - s.getTime()) / 1000 - brk) / 3600;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if (sStr.includes('T')) startHr = parseInt(sStr.split('T')[1].split(':')[0], 10);
        if (eStr.includes('T')) endHr = parseInt(eStr.split('T')[1].split(':')[0], 10);

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const HOLS = ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'];
        const isH = HOLS.includes(info.dateStr) || HOLS.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;
        const isO = (startHr < 8 || startHr >= 18 || endHr > 18) && hrs > 0;

        let base = 0, ot = 0, ooh = 0, sp = 0;
        if (billingType === 'Hourly') {
            const b = Math.max(2, hrs); 
            base = b * hr; 
        } else if (billingType === 'Half Day + Hourly') {
            if (hrs <= 4) {
                base = hd;
            } else {
                base = hd + ((hrs - 4) * hr);
            }
        } else if (billingType === 'Full Day + OT') {
            if (hrs <= 8) {
                base = fd;
            } else {
                ot = (hrs - 8) * (hr * 1.5);
                base = fd;
            }
        } else if (billingType.includes('Monthly')) {
            const divisor = getWorkingDaysInMonth(sStr, ticket.country);
            base = parseFloat(ticket.eng_monthly_rate || 0) / divisor;
            // Removed special premium for Monthly per request
            if (hrs > 8) { 
                ot = (hrs - 8) * (hr * 1.5); 
            }
        } else if (billingType === 'Agreed Rate') { 
            base = parseFloat(ticket.eng_agreed_rate) || 0;
        } else if (billingType === 'Cancellation') { 
            base = parseFloat(ticket.eng_cancellation_fee) || 0; 
        } else if (billingType === 'Mixed Mode') {
            if (hrs <= 4) {
                base = hd;
            } else if (hrs <= 8) {
                base = fd;
            } else {
                base = fd;
                ot = (hrs - 8) * (hr * 1.5);
            }
        }

        const total = base + ot + ooh + sp;
        return {
            totalPayout: total.toFixed(2), 
            baseCost: base.toFixed(2), 
            otPremium: ot.toFixed(2), 
            oohPremium: ooh.toFixed(2), 
            specialDayPremium: sp.toFixed(2),
            totalHours: hrs, 
            otHours: hrs > 8 ? hrs - 8 : 0,
            isSpecialDay,
            isOOH: isO
        };
    };

    // Table Filters & Pagination
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth() + 1]);
    const [filterCustomer, setFilterCustomer] = useState('All Customers');
    const [filterEngineer, setFilterEngineer] = useState('All Engineers');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [hoveredCostTicketId, setHoveredCostTicketId] = useState(null);

    // Modal / Selection
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [creating, setCreating] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
    });

    const [detailTicket, setDetailTicket] = useState(null);

    const handleOpenDetails = (ticket) => {
        setDetailTicket(ticket);
    };


    useEffect(() => {
        console.log("Receivable Page Loaded. Hub Status: Unbilled Work");
        fetchStats();
        fetchUnbilled();
        fetchInvoices();
    }, []);

    useEffect(() => {
        if (activeTab === 'unbilled') fetchUnbilled();
        else fetchInvoices();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error("Stats Fetch Error:", e); }
    };

    const fetchUnbilled = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/receivables/tickets/unbilled`);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetched Unbilled Tickets:", data.length);
                setUnbilledList(data);
            }
        } catch (e) { console.error("Unbilled Fetch Error:", e); }
        setLoading(false);
    };

    const fetchInvoices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/invoices`);
            if (res.ok) setInvoiceList(await res.json());
        } catch (e) { console.error("Invoice Fetch Error:", e); }
    };

    // Calculate Dynamic Unbilled Total based on Context (uses filteredUnbilled which already filters by currency)
    const dynamicUnbilledTotal = useMemo(() => {
        const isAll = selectedCurrency === 'All';
        return unbilledList
            .filter(item => isAll || (item.currency || 'USD').toUpperCase() === selectedCurrency.toUpperCase())
            .reduce((sum, item) => {
                const cur = (item.currency || 'USD').toUpperCase();
                const bd = calculateTicketCostFrontend(item, calcTimezone, cur);
                const val = parseFloat(bd.totalReceivable) || 0;
                
                if (isAll) {
                    // Convert to USD base
                    const rate = EXCHANGE_RATES[cur] || 1;
                    return sum + (val / rate);
                }
                return sum + val;
            }, 0);
    }, [unbilledList, calcTimezone, selectedCurrency]);

    const toggleTicket = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const calculateSelectedTotal = () => {
        return unbilledList
            .filter(t => selectedTicketIds.includes(t.id))
            .reduce((sum, t) => {
                const bd = calculateTicketCostFrontend(t, calcTimezone, selectedCurrency);
                return sum + parseFloat(bd.totalReceivable);
            }, 0)
            .toFixed(2);
    };

    const handleCreateInvoice = async () => {
        if (selectedTicketIds.length === 0) return;

        const selectedTickets = unbilledList.filter(t => selectedTicketIds.includes(t.id));
        const firstCustId = selectedTickets[0].customer_id;
        const isMixed = selectedTickets.some(t => t.customer_id !== firstCustId);

        if (isMixed) {
            alert('Selection Error: You cannot generate a single invoice for multiple customers. Please select tickets from ONLY one customer.');
            return;
        }

        setCreating(true);
        try {
            const amount = calculateSelectedTotal();
            const res = await fetch(`${API_BASE_URL}/invoices/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: firstCustId,
                    amount,
                    due_date: invoiceForm.dueDate,
                    notes: invoiceForm.notes,
                    ticket_ids: selectedTicketIds
                })
            });

            if (res.ok) {
                setSelectedTicketIds([]);
                fetchStats();
                fetchUnbilled();
                setActiveTab('invoices');
            } else { alert('Failed to generate invoice.'); }
        } catch (e) { console.error(e); }
        setCreating(false);
    };

    const handleMarkPaid = async (id) => {
        if (!confirm('Mark invoice as paid?')) return;
        try {
            await fetch(`${API_BASE_URL}/invoices/${id}/pay`, { method: 'POST' });
            fetchStats();
            fetchInvoices();
        } catch (e) { console.error(e); }
    };

    const handleUpdateTicketRates = async () => {
        if (!detailTicket) return;
        
        const bd = calculateTicketCostFrontend(detailTicket, calcTimezone, selectedCurrency);
        
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${detailTicket.id}/rates`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hourlyRate: detailTicket.hourly_rate,
                    halfDayRate: detailTicket.half_day_rate,
                    fullDayRate: detailTicket.full_day_rate,
                    monthlyRate: detailTicket.monthly_rate,
                    agreedRate: detailTicket.agreed_rate,
                    cancellationFee: detailTicket.cancellation_fee,
                    travelCost: detailTicket.travel_cost_per_day,
                    toolCost: detailTicket.tool_cost,
                    totalCost: bd.totalReceivable
                })
            });
            if (res.ok) {
                alert('Rates updated successfully.');
                fetchUnbilled();
                fetchInvoices();
            } else {
                alert('Failed to update rates.');
            }
        } catch (e) { console.error("Error updating rates:", e); }
    };

    const handlePrintInvoice = (invoice) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice #${invoice.invoice_number}</title>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
                    .invoice-title { font-size: 32px; font-weight: bold; text-align: right; }
                    .meta { text-align: right; color: #666; font-size: 14px; margin-top: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    th { text-align: left; border-bottom: 2px solid #ddd; padding: 10px; color: #555; }
                    td { border-bottom: 1px solid #eee; padding: 10px; }
                    .total-box { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
                    .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">Awokta.</div>
                    <div>
                        <div class="invoice-title">INVOICE</div>
                        <div class="meta">#${invoice.invoice_number}<br>Date: ${new Date(invoice.issue_date).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 40px;">
                    <strong>Bill To:</strong><br>
                    ${invoice.customer_name}<br>
                    ${invoice.customer_company || ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Professional Services (Consolidated)</td>
                            <td>${selectedCurrency} ${parseFloat(invoice.amount).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total-box">
                    Total: ${selectedCurrency} ${parseFloat(invoice.amount).toFixed(2)}
                </div>

                <div class="footer">
                    Thank you for your business.<br>
                    Payment is due within 30 days.
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Reset pagination when filters or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedYear, selectedMonth, activeTab]);

    const filteredUnbilled = useMemo(() => {
        const search = searchTerm.toLowerCase().trim();
        return unbilledList.filter(item => {
            // 1. Currency filter
            if (selectedCurrency !== 'All') {
                const ticketCurrency = (item.currency || 'USD').toUpperCase();
                const filterCurrency = selectedCurrency.toUpperCase();
                if (ticketCurrency !== filterCurrency) return false;
            }

            // 2. Search filter
            const custName = (item.customer_name || '').toLowerCase();
            const compName = (item.customer_company || '').toLowerCase();
            const engName = (item.engineer_name || '').toLowerCase();
            const ticketId = (item.id || '').toString();

            const matchesSearch = !search ||
                custName.includes(search) ||
                compName.includes(search) ||
                engName.includes(search) ||
                ticketId.includes(search);

            if (!matchesSearch) return false;

            // 3. Date filter (Permissive)
            if (selectedYear === 'All Years' && selectedMonth === 'All Months') return true;

            const tDate = new Date(item.task_start_date);
            const y = tDate.getFullYear().toString();
            const m = MONTHS[tDate.getMonth() + 1];

            const matchesYear = (selectedYear === 'All Years' || y === selectedYear);
            const matchesMonth = (selectedMonth === 'All Months' || m === selectedMonth);
            
            const matchesCustFilter = filterCustomer === 'All Customers' || (item.customer_name === filterCustomer);
            const matchesEngFilter = filterEngineer === 'All Engineers' || (item.engineer_name === filterEngineer);

            return matchesYear && matchesMonth && matchesCustFilter && matchesEngFilter;
        });
    }, [unbilledList, searchTerm, selectedYear, selectedMonth, selectedCurrency, filterCustomer, filterEngineer]);

    const uniqueCustomers = useMemo(() => {
        const custs = new Set(unbilledList.map(t => t.customer_name).filter(Boolean));
        return ['All Customers', ...Array.from(custs).sort()];
    }, [unbilledList]);

    const uniqueEngineers = useMemo(() => {
        const engs = new Set(unbilledList.map(t => t.engineer_name).filter(Boolean));
        return ['All Engineers', ...Array.from(engs).sort()];
    }, [unbilledList]);

    // Filtered logic for Invoices
    const filteredInvoices = useMemo(() => {
        const search = searchTerm.toLowerCase().trim();
        return invoiceList.filter(inv => {
            // 1. Search filter
            const custName = (inv.customer_name || '').toLowerCase();
            const invNum = (inv.invoice_number || '').toLowerCase();
            const matchesSearch = !search || custName.includes(search) || invNum.includes(search);
            if (!matchesSearch) return false;

            // 2. Customer filter
            const matchesCustFilter = filterCustomer === 'All Customers' || (inv.customer_name === filterCustomer);
            if (!matchesCustFilter) return false;

            // 3. Date filter (Year/Month)
            const date = new Date(inv.created_at);
            const y = date.getFullYear().toString();
            const m = MONTHS[date.getMonth() + 1];
            const matchesYear = (selectedYear === 'All Years' || y === selectedYear);
            const matchesMonth = (selectedMonth === 'All Months' || m === selectedMonth);

            return matchesYear && matchesMonth;
        });
    }, [invoiceList, searchTerm, filterCustomer, selectedYear, selectedMonth]);

    // Pagination Logic for Unbilled
    const totalUnbilledPages = Math.ceil(filteredUnbilled.length / itemsPerPage);
    const displayedUnbilled = filteredUnbilled.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Pagination Logic for Invoices
    const totalInvoicePages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const displayedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const Pagination = ({ total, current, onChange }) => {
        if (total <= 1) return null;
        let pages = [];
        for (let i = 1; i <= total; i++) pages.push(i);

        return (
            <div className="pagination-container-premium">
                <button
                    className="pagination-btn"
                    disabled={current === 1}
                    onClick={() => onChange(current - 1)}
                >
                    Prev
                </button>
                {pages.map(p => (
                    <button
                        key={p}
                        className={`pagination-btn ${current === p ? 'active' : ''}`}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    className="pagination-btn"
                    disabled={current === total}
                    onClick={() => onChange(current + 1)}
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="receivable-page">
            <header className="receivable-header-premium">
                <div className="header-top-premium">
                    <div className="breadcrumb-premium">Accounting &gt; Receivables</div>
                    <div className="user-badge-premium">
                        <FiUser className="u-icon" />
                        <span>Admin Portal</span>
                        <div className="status-dot-active"></div>
                    </div>
                </div>

                <div className="header-main-premium">
                    <div className="receivable-title-premium">
                        <h2><FiDollarSign className="title-icon-glow" /> Customer Receivables</h2>
                        <p>Real-time financial tracking for all resolved tickets and generated invoices.</p>
                    </div>

                    <div className="header-actions-premium">
                        <div className="search-box-premium">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Client, Ticket OR Engineer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="receivable-filters-premium">
                            <select className="filter-select" value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <select className="filter-select" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                                {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="filter-select" value={filterEngineer} onChange={e => setFilterEngineer(e.target.value)}>
                                {uniqueEngineers.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select className="filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <div className="stats-grid-premium">
                <div className="stat-card-premium">
                    <div className="stat-icon blue"><FiClock /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency} {dynamicUnbilledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Work To Be Billed</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Pending invoice generation</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon amber"><FiFileText /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency === 'All' ? 'USD' : selectedCurrency} {((parseFloat(stats.unpaid) || 0) * (EXCHANGE_RATES[selectedCurrency === 'All' ? 'USD' : selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Unpaid Invoices</p>
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Awaiting client payment</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon emerald"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency === 'All' ? 'USD' : selectedCurrency} {((parseFloat(stats.overdue) || 0) * (EXCHANGE_RATES[selectedCurrency === 'All' ? 'USD' : selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Total Overdue</p>
                        <small style={{ color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>Requires immediate action</small>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon blue" style={{ background: '#f0f9ff', color: '#0369a1' }}><FiDollarSign /></div>
                    <div className="stat-content">
                        <h3>{selectedCurrency === 'All' ? 'USD' : selectedCurrency} {((parseFloat(stats.paid) || 0) * (EXCHANGE_RATES[selectedCurrency === 'All' ? 'USD' : selectedCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>Collected Revenue</p>
                        <small style={{ color: '#059669', fontSize: '11px', fontWeight: '700' }}>Total for {new Date().getFullYear()}</small>
                    </div>
                </div>
            </div>

            <div className="tabs-container-premium">
                <button className={`tab-btn-premium ${activeTab === 'unbilled' ? 'active' : ''}`} onClick={() => setActiveTab('unbilled')}>
                    <FiClock /> Unbilled Work <span className="tab-badge">{unbilledList.length}</span>
                </button>
                <button className={`tab-btn-premium ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                    <FiFileText /> Invoice History
                </button>
            </div>

            {loading ? (
                <div className="loader-container">
                    <div className="spinner-premium"></div>
                    <p>Syncing financial records...</p>
                </div>
            ) : (
                <div className="table-card-premium">
                    {activeTab === 'unbilled' ? (
                        <>
                            <div className="table-wrapper-premium">
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input type="checkbox"
                                                    checked={selectedTicketIds.length === filteredUnbilled.length && filteredUnbilled.length > 0}
                                                    onChange={(e) => setSelectedTicketIds(e.target.checked ? filteredUnbilled.map(t => t.id) : [])}
                                                />
                                            </th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Engineer</th>
                                            <th>Ticket</th>
                                            <th>Location</th>
                                            <th>Work Time</th>
                                            <th className="text-right">Expenses</th>
                                            <th className="text-right">Receivable</th>
                                            <th className="text-right">Payout</th>
                                            <th className="text-right">Profit</th>
                                            <th style={{ textAlign: 'center' }}>Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedUnbilled.map((item, idx) => {
                                            const bd = calculateTicketCostFrontend(item, calcTimezone, selectedCurrency);
                                            const pd = calculateEngineerPayoutFrontend(item, calcTimezone);
                                            const firstLetter = (item.engineer_name || 'N').charAt(0);
                                            return (
                                                <tr key={item.id} className={selectedTicketIds.includes(item.id) ? 'selected' : ''}>
                                                    <td><input type="checkbox" checked={selectedTicketIds.includes(item.id)} onChange={() => toggleTicket(item.id)} /></td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{new Date(item.task_start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(item.task_start_date).getFullYear()}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.customer_name || 'N/A'}</div>
                                                    </td>
                                                    <td>
                                                        <div className="engineer-cell">
                                                            <div className="engineer-avatar">{firstLetter}</div>
                                                            <div style={{ fontWeight: '700' }}>{item.engineer_name || 'N/A'}</div>
                                                        </div>
                                                    </td>
                                                    <td><span className="ticket-id-tag">#{item.id}</span></td>
                                                    <td>
                                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                                            {item.city || '-'}, {item.country || '-'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '700' }}>{bd.formattedHours || '00:00'}</div>
                                                    </td>
                                                    <td className="text-right">
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Travel: {parseFloat(bd.travelCost || 0).toFixed(0)}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Tools: {parseFloat(bd.toolCost || 0).toFixed(0)}</div>
                                                    </td>
                                                    <td className="receivable-amount" style={{ color: '#6366f1' }}>
                                                        {item.currency || 'USD'} {parseFloat(bd.totalReceivable).toFixed(2)}
                                                    </td>
                                                    <td className="receivable-amount" style={{ color: '#059669' }}>
                                                        {item.eng_currency || item.currency || 'USD'} {parseFloat(pd.totalPayout).toFixed(2)}
                                                    </td>
                                                    <td className="receivable-amount" style={{ color: '#0f172a', fontWeight: '800' }}>
                                                        {item.currency || 'USD'} {(parseFloat(bd.totalReceivable) - parseFloat(pd.totalPayout)).toFixed(2)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', position: 'relative' }}>
                                                        <button 
                                                            className="eye-btn-v3" 
                                                            title="View Detailed Breakdown" 
                                                            onClick={() => handleOpenDetails(item)}
                                                            onMouseEnter={() => setHoveredCostTicketId(item.id)}
                                                            onMouseLeave={() => setHoveredCostTicketId(null)}
                                                        >
                                                            <FiEye />
                                                        </button>

                                                        {hoveredCostTicketId === item.id && (
                                                            <div className="hover-breakdown-tooltip">
                                                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', marginBottom: '8px' }}>Cost Breakdown</div>
                                                                <div className="breakdown-row highlight-premium">
                                                                    <span>Subtotal</span>
                                                                    <span>{item.currency || 'USD'} {parseFloat(bd.baseCost || 0).toFixed(2)}</span>
                                                                </div>
                                                                {parseFloat(bd.otPremium) > 0 && <div className="breakdown-row"><span>OT Premium</span><span>+ {item.currency || 'USD'} {parseFloat(bd.otPremium).toFixed(2)}</span></div>}
                                                                {parseFloat(bd.oohPremium) > 0 && <div className="breakdown-row"><span>OOH</span><span>+ {item.currency || 'USD'} {parseFloat(bd.oohPremium).toFixed(2)}</span></div>}
                                                                {parseFloat(bd.specialDayPremium) > 0 && <div className="breakdown-row"><span>Special Day</span><span>+ {item.currency || 'USD'} {parseFloat(bd.specialDayPremium).toFixed(2)}</span></div>}
                                                                {parseFloat(bd.travelCost) > 0 && <div className="breakdown-row"><span>Travel</span><span>+ {item.currency || 'USD'} {parseFloat(bd.travelCost).toFixed(2)}</span></div>}
                                                                {parseFloat(bd.toolCost) > 0 && <div className="breakdown-row"><span>Tools</span><span>+ {item.currency || 'USD'} {parseFloat(bd.toolCost).toFixed(2)}</span></div>}
                                                                <div className="breakdown-row" style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0', padding: 0 }}></div>
                                                                <div className="breakdown-row highlight-premium" style={{ marginBottom: 0 }}>
                                                                    <span>Net Total</span>
                                                                    <span>{item.currency || 'USD'} {bd.totalReceivable}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUnbilled.length === 0 && (
                                            <tr><td colSpan="11" className="empty-state">No unbilled work found to match your criteria.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                total={totalUnbilledPages}
                                current={currentPage}
                                onChange={setCurrentPage}
                            />

                            {selectedTicketIds.length > 0 && (
                                <div className="selection-action-bar">
                                    <div className="selection-count">
                                        <strong>{selectedTicketIds.length}</strong>
                                        <span>Tickets selected for billing</span>
                                    </div>
                                    <div className="invoice-summary">
                                        <span>Consolidated Total</span>
                                        <div className="invoice_amount_wrap">
                                            <span className="amount-currency">{selectedCurrency}</span>
                                            <span className="amount-value">{calculateSelectedTotal()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                                        <button className="btn-wow-secondary" onClick={() => setSelectedTicketIds([])}>Cancel</button>
                                        <button
                                            className="btn-generate-premium"
                                            onClick={handleCreateInvoice}
                                            disabled={selectedTicketIds.length === 0}
                                        >
                                            {creating ? 'Creating Invoice...' : 'Generate Invoice'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="table-wrapper-premium">
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Issued Date</th>
                                            <th>Customer</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedInvoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td><span className="ticket-id-tag">{inv.invoice_number}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: '700' }}>{new Date(inv.issue_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(inv.issue_date).getFullYear()}</div>
                                                </td>
                                                <td style={{ fontWeight: '700', color: '#0f172a' }}>{inv.customer_name}</td>
                                                <td className="receivable-amount" style={{ color: '#1e293b' }}>{selectedCurrency} {parseFloat(inv.amount).toFixed(2)}</td>
                                                <td>
                                                    <span className={`status-badge ${inv.status.toLowerCase()}`}>
                                                        {inv.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="eye-btn-v3"
                                                            onClick={() => handlePrintInvoice(inv)}
                                                            title="Print Invoice"
                                                        >
                                                            <FiDownload />
                                                        </button>
                                                        {inv.status !== 'Paid' && (
                                                            <button
                                                                className="btn-primary-premium"
                                                                style={{ padding: '8px 16px', fontSize: '12px', height: '36px' }}
                                                                onClick={() => handleMarkPaid(inv.id)}
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoiceList.length === 0 && (
                                            <tr><td colSpan="6" className="empty-state">No past invoices found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                total={totalInvoicePages}
                                current={currentPage}
                                onChange={setCurrentPage}
                            />
                        </>
                    )}
                </div>
            )}

            {/* --- Ticket Detail Modal --- */}
            {detailTicket && (() => {
                const bd = calculateTicketCostFrontend(detailTicket, calcTimezone, selectedCurrency);
                const cur = detailTicket.currency || 'USD';
                const fmtTime = (v) => {
                    if (!v) return '—';
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
                };
                const fmtDate = (v) => {
                    if (!v) return '—';
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return '—';
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                };
                const savedTotal = parseFloat(detailTicket.total_cost) > 0 ? parseFloat(detailTicket.total_cost) : parseFloat(bd.totalReceivable);
                const adjustment = savedTotal - parseFloat(bd.totalReceivable);

                return (
                    <div className="modal-overlay-premium" onClick={() => setDetailTicket(null)}>
                        <div className="modal-content-premium" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header-premium">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="title-icon-glow" style={{ padding: '8px' }}><FiFileText size={20} /></div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>Ticket Cost Breakdown</h3>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{detailTicket.id} — {detailTicket.task_name}</span>
                                    </div>
                                </div>
                                <button className="close-btn-premium" onClick={() => setDetailTicket(null)}><FiX size={18} /></button>
                            </div>
                            <div className="modal-body-premium">

                                {/* Section 1: Overview */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    {[
                                        { label: 'Customer', value: detailTicket.customer_name || '—' },
                                        { label: 'Engineer', value: detailTicket.engineer_name || '—' },
                                        { label: 'Billing Type', value: detailTicket.billing_type || 'Hourly', highlight: true },
                                        { label: 'Currency', value: cur },
                                        { label: 'Service Date', value: fmtDate(detailTicket.task_start_date) + (detailTicket.task_end_date && detailTicket.task_end_date !== detailTicket.task_start_date ? ` → ${fmtDate(detailTicket.task_end_date)}` : '') },
                                        { label: 'Location', value: [detailTicket.city, detailTicket.country].filter(Boolean).join(', ') || '—' },
                                    ].map(item => (
                                        <div key={item.label} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: item.highlight ? 'var(--crm-primary, #7c3aed)' : '#1e293b' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Section 2: Time Logs */}
                                {(detailTicket.start_time || detailTicket.end_time) && (
                                    <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', border: '1px solid #c7d2fe', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#6d28d9', textTransform: 'uppercase', marginBottom: '12px' }}>⏱ Activity Time Log</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>TIME IN</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{fmtTime(detailTicket.start_time)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>TIME OUT</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{fmtTime(detailTicket.end_time)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>BREAK</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{detailTicket.break_time ? `${Math.floor(detailTicket.break_time / 60)} min` : '0 min'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>BILLABLE HRS</div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed' }}>{bd.formattedHours || `${parseFloat(bd.totalHours || 0).toFixed(2)}h`}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 3: Rates */}
                                <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>💰 Rate Card</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                        {[
                                            { label: 'Hourly Rate', key: 'hourly_rate', value: detailTicket.hourly_rate },
                                            { label: 'Half Day Rate', key: 'half_day_rate', value: detailTicket.half_day_rate },
                                            { label: 'Full Day Rate', key: 'full_day_rate', value: detailTicket.full_day_rate },
                                            { label: 'Monthly Rate', key: 'monthly_rate', value: detailTicket.monthly_rate },
                                            { label: 'Agreed / Fixed', key: 'agreed_rate', value: detailTicket.agreed_rate },
                                            { label: 'Cancellation Fee', key: 'cancellation_fee', value: detailTicket.cancellation_fee },
                                            { label: 'Travel Cost / Day', key: 'travel_cost_per_day', value: detailTicket.travel_cost_per_day },
                                            { label: 'Tool Cost', key: 'tool_cost', value: detailTicket.tool_cost },
                                        ].map(r => (
                                            <div key={r.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>{r.label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', background: '#fff' }}>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '4px', fontWeight: 'bold' }}>{cur}</span>
                                                    <input 
                                                        type="number" 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#1e293b', fontWeight: '600', textAlign: 'center' }}
                                                        value={r.value === 0 ? 0 : (r.value || '')}
                                                        onChange={(e) => setDetailTicket({ ...detailTicket, [r.key]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 4: Cost Breakdown */}
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>📊 Cost Breakdown</div>
                                    <div className="breakdown-list-premium">
                                        {detailTicket.billing_type === 'Cancellation' ? (
                                            <div className="breakdown-row highlight-premium">
                                                <span>Cancellation Penalty</span>
                                                <span>{cur} {parseFloat(bd.baseCost || 0).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="breakdown-row highlight-premium">
                                                    <div>
                                                        <span>Labor &amp; Service Subtotal</span>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '2px' }}>{bd.baseBreakdown}</div>
                                                    </div>
                                                    <span>{cur} {parseFloat(bd.baseCost || 0).toFixed(2)}</span>
                                                </div>
                                                {parseFloat(bd.otPremium) > 0 && (
                                                    <div className="breakdown-row">
                                                        <div>
                                                            <span>Overtime Premium (OT)</span>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{bd.otBreakdown}</div>
                                                        </div>
                                                        <span>+ {cur} {parseFloat(bd.otPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {parseFloat(bd.oohPremium) > 0 && (
                                                    <div className="breakdown-row">
                                                        <div>
                                                            <span>Out of Hours (OOH)</span>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{bd.oohBreakdown}</div>
                                                        </div>
                                                        <span>+ {cur} {parseFloat(bd.oohPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {parseFloat(bd.specialDayPremium) > 0 && (
                                                    <div className="breakdown-row">
                                                        <div>
                                                            <span>Weekend/Holiday Premium</span>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>{bd.spBreakdown}</div>
                                                        </div>
                                                        <span>+ {cur} {parseFloat(bd.specialDayPremium).toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {parseFloat(bd.travelCost) > 0 && (
                                            <div className="breakdown-row">
                                                <span>Travel &amp; Logistics (Per Day Fee)</span>
                                                <span>+ {cur} {parseFloat(bd.travelCost).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {parseFloat(bd.toolCost) > 0 && (
                                            <div className="breakdown-row">
                                                <span>Tools &amp; Material (Total)</span>
                                                <span>+ {cur} {parseFloat(bd.toolCost).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="breakdown-total-premium" style={{ borderTop: '2px solid #6366f1', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#6366f1', fontSize: '18px', fontWeight: '700' }}>Net Receivable</span>
                                            <span style={{ color: '#6366f1', fontSize: '18px', fontWeight: '800' }}>{cur} {bd.totalReceivable}</span>
                                        </div>
                                        {detailTicket.total_cost && parseFloat(detailTicket.total_cost) !== parseFloat(bd.totalReceivable) && (
                                            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>
                                                Note: Includes manually saved adjustments ({cur} {parseFloat(detailTicket.total_cost).toFixed(2)})
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Scope of Work */}
                                {detailTicket.scope_of_work && (
                                    <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Scope of Work</div>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{detailTicket.scope_of_work}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer-premium" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px' }}>
                                <button className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setDetailTicket(null)}>Dismiss Breakdown</button>
                                <button className="btn-primary-premium" style={{ padding: '10px 16px', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }} onClick={handleUpdateTicketRates}>Update Costs & Rates</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CustomerReceivablePage;
