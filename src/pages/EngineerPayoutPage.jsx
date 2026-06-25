/* EngineerPayoutPage.jsx */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    FiDollarSign, FiFileText, FiCalendar, FiCheckCircle,
    FiAlertCircle, FiX, FiSearch, FiArrowRight, FiUser,
    FiBriefcase, FiHash, FiClock, FiEye, FiFilter, FiDownload,
    FiCreditCard, FiCheck, FiRefreshCw, FiGlobe
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import aimbotLogoSrc from '../assets/aimbot-logo.png';
import './EngineerPayoutPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CURRENCIES = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' }
];

const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹'
};

const MONTHS = [
    "All Months", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = ["All Years", "2024", "2025", "2026"];

const EngineerPayoutPage = () => {
    const [stats, setStats] = useState({ unpaidCount: 0, totalUnpaidAmount: 0 });
    const aimbotLogoBase64Ref = useRef(null);
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            aimbotLogoBase64Ref.current = canvas.toDataURL('image/png');
        };
        img.src = aimbotLogoSrc;
    }, []);

    const getTargetTimezone = (ticket) => {
        return (calcTimezone && calcTimezone !== 'Ticket Local')
            ? calcTimezone
            : (ticket?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    };

    const formatTimeZoned = (str, ticket) => {
        if (!str) return '—';
        const d = new Date(str.includes('T') || str.endsWith('Z') ? str : str.replace(' ', 'T') + 'Z');
        if (isNaN(d.getTime())) return str.slice(0, 5);
        try {
            const tz = getTargetTimezone(ticket);
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
        } catch (e) {
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    };

    const formatDateZoned = (str, ticket) => {
        if (!str) return '—';
        const d = new Date(str.includes('T') || str.endsWith('Z') ? str : str.replace(' ', 'T') + 'Z');
        if (isNaN(d.getTime())) return str.slice(0, 10);
        try {
            const tz = getTargetTimezone(ticket);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz });
        } catch (e) {
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    };

    const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'history'
    const [engineersList, setEngineersList] = useState([]);
    const [unpaidTickets, setUnpaidTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcTimezone, setCalcTimezone] = useState('Ticket Local');
    const [processing, setProcessing] = useState(false);
    const [selectedEngineerProfile, setSelectedEngineerProfile] = useState(null);
    const [displayCurrencySymbol, setDisplayCurrencySymbol] = useState('$');

    // Filter states
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [selectedPayoutLevel, setSelectedPayoutLevel] = useState('All Payouts');
    const [selectedTicketCountRange, setSelectedTicketCountRange] = useState('All Tickets');
    const [sortBy, setSortBy] = useState('name-asc');
    
    // Ticket level filter states
    const [ticketSearchTerm, setTicketSearchTerm] = useState('');
    const [selectedBillingType, setSelectedBillingType] = useState('All Types');
    const [selectedYear, setSelectedYear] = useState('All Years');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [selectedEngineerId, setSelectedEngineerId] = useState(null);

    // Selection for payment
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);

    // Modals
    const [detailTicket, setDetailTicket] = useState(null);
    const [adjustments, setAdjustments] = useState([]);
    const [adjLabel, setAdjLabel] = useState('');
    const [adjAmount, setAdjAmount] = useState('');
    const [adjType, setAdjType] = useState('add');
    const [adjLoading, setAdjLoading] = useState(false);

    // Fetch manual adjustments when detailTicket opens
    useEffect(() => {
        if (!detailTicket) { setAdjustments([]); return; }
        fetch(`${API_BASE_URL}/tickets/${detailTicket.id}/payout-adjustments`)
            .then(r => r.json())
            .then(d => {
                const adjs = d.adjustments || [];
                setAdjustments(adjs);
                // Sync with the unpaidTickets list so that calculations elsewhere reflect it!
                setUnpaidTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, adjustments: adjs } : t));
            })
            .catch(() => setAdjustments([]));
        // Reset form
        setAdjLabel(''); setAdjAmount(''); setAdjType('add');
    }, [detailTicket?.id]);

    const handleAddAdjustment = async () => {
        if (!adjLabel.trim() || !adjAmount) return;
        const finalAmount = adjType === 'deduct' ? -Math.abs(parseFloat(adjAmount)) : Math.abs(parseFloat(adjAmount));
        if (isNaN(finalAmount) || finalAmount === 0) return;
        setAdjLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${detailTicket.id}/payout-adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: adjLabel.trim(), amount: finalAmount })
            });
            if (res.ok) {
                const data = await res.json();
                const newAdj = data.adjustment;
                setAdjustments(prev => {
                    const next = [...prev, newAdj];
                    setUnpaidTickets(prevUnb => prevUnb.map(t => t.id === detailTicket.id ? { ...t, adjustments: next } : t));
                    return next;
                });
                setAdjLabel(''); setAdjAmount('');
            }
        } catch (e) { console.error(e); }
        setAdjLoading(false);
    };

    const handleDeleteAdjustment = async (adjId) => {
        try {
            await fetch(`${API_BASE_URL}/tickets/payout-adjustments/${adjId}`, { method: 'DELETE' });
            setAdjustments(prev => {
                const next = prev.filter(a => a.id !== adjId);
                setUnpaidTickets(prevUnb => prevUnb.map(t => t.id === detailTicket.id ? { ...t, adjustments: next } : t));
                return next;
            });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchEngineersSummary(activeTab);
    }, [activeTab]);

    const fetchEngineersSummary = async (status = activeTab) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/engineers/unpaid?status=${status === 'history' ? 'Paid' : 'Unpaid'}`);
            if (res.ok) {
                const data = await res.json();
                setEngineersList(data.engineers || []);
                
                // Update stats
                const totalAmount = (data.engineers || []).reduce((sum, eng) => sum + parseFloat(eng.total_payout_estimated || 0), 0);
                const uniqueCurrencies = [...new Set((data.engineers || []).map(e => e.currency || 'USD'))];
                const commonCurrency = uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : 'USD';
                setDisplayCurrencySymbol(CURRENCY_SYMBOLS[commonCurrency] || '$');
                setStats({
                  unpaidCount: (data.engineers || []).length,
                  totalUnpaidAmount: totalAmount.toFixed(2)
                });
            }
        } catch (e) {
            console.error("Fetch Engineers Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchEngineerTickets = async (engineerId, status = activeTab) => {
        setLoading(true);
        setSelectedEngineerId(engineerId);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/engineer/${engineerId}/tickets?status=${status === 'history' ? 'Paid' : 'Unpaid'}`);
            if (res.ok) {
                const data = await res.json();
                setUnpaidTickets(data.tickets || []);
                setSelectedEngineerProfile(data.engineer || null);
                setSelectedTicketIds([]); // Clear selection when switching engineers
            }
        } catch (e) {
            console.error("Fetch Tickets Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToEngineers = () => {
        setSelectedEngineerId(null);
        setUnpaidTickets([]);
        fetchEngineersSummary(activeTab);
    };

    const toggleTicketSelection = (id) => {
        setSelectedTicketIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleProcessPayout = async () => {
        if (selectedTicketIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to mark ${selectedTicketIds.length} tickets as PAID?`)) return;

        setProcessing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payouts/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketIds: selectedTicketIds,
                    engineerId: selectedEngineerId
                })
            });

            if (res.ok) {
                alert('Payout processed successfully!');
                // Success - Fetch both summary AND tickets to keep everything in sync
                await fetchEngineersSummary(activeTab);
                await fetchEngineerTickets(selectedEngineerId, activeTab);
            } else {
                alert('Failed to process payout.');
            }
        } catch (e) {
            console.error(e);
            alert('Error processing payout.');
        } finally {
            setProcessing(false);
        }
    };

    // Modal Helper
    const handleOpenDetails = (ticket) => setDetailTicket(ticket);
    const handleCloseDetails = () => setDetailTicket(null);

    const generatePayoutPDF = (engId) => {
        const engineer = engineersList.find(e => e.id === engId);
        if (!engineer || filteredTickets.length === 0) return;

        const doc = new jsPDF();
        const cur = selectedCurrency;
        const today = new Date().toLocaleDateString('en-GB');
        
        // ── Logo ─────────────────────────────────────────────────────────────
        if (aimbotLogoBase64Ref.current) {
            doc.addImage(aimbotLogoBase64Ref.current, 'PNG', 12, 8, 24, 24);
        }

        // ── Header Details ───────────────────────────────────────────────────
        const rx = 115;
        doc.setFontSize(14);
        doc.setTextColor(100, 80, 200);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYOUT SHEET', rx, 14);
        
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        doc.text('Payout Ref:', rx, 22);  doc.setFont('helvetica', 'bold'); doc.text(`PAY-${engId}-${new Date().getTime().toString().slice(-6)}`, rx + 28, 22);
        doc.setFont('helvetica', 'normal');
        doc.text('Date of issue:', rx, 28);  doc.text(today, rx + 28, 28);

        // ── Supplier / Engineer ──────────────────────────────────────────────
        autoTable(doc, {
            startY: 42,
            head: [['Payer', 'Engineer']],
            body: [[
                'AIMBOT BUSINESS SERVICES\nAleja Jana Pawla II\nNumber 43A, Lokal 37B, Warszawa 01-001\nKRS: 0000933886',
                `${engineer.name}\n${engineer.email}\n${engineer.phone || ''}\n${engineer.city || ''}`
            ]],
            theme: 'plain',
            headStyles: { fillColor: [210, 210, 210], textColor: [40, 40, 40], fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, textColor: [50, 50, 50], cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
        });

        // ── Service Table (Detailed Breakdown per Log) ─────────────────────────
        const serviceRows = [];
        let grandTotal = 0;

        filteredTickets.forEach(t => {
            const logs = t.time_logs || [];
            const displayLogs = logs.length > 0 ? logs : [{ task_date: t.task_start_date, start_time: t.start_time, end_time: t.end_time }];
            
            displayLogs.forEach(log => {
                const tzForTicket = getTargetTimezone(t);
                const d = new Date(log.task_date || t.task_start_date).toLocaleDateString('en-GB', { timeZone: tzForTicket });
                
                // Detailed Description
                const desc = `Customer: ${t.customer_name || '-'}\nTask: ${t.task_name || '-'}\nTkt: #${t.id}`;
                
                // Times
                const checkIn = log.start_time ? formatTimeZoned(log.start_time, t) : '-';
                const checkOut = log.end_time ? formatTimeZoned(log.end_time, t) : '-';

                const pd = calculateEngineerPayoutFrontend({
                    ...t,
                    time_logs: [], 
                    adjustments: [], // Exclude adjustments from log row
                    start_time: log.start_time,
                    end_time: log.end_time,
                    task_start_date: log.task_date,
                    _is_log_aggregation: false 
                }, calcTimezone);

                serviceRows.push([
                    d,
                    desc,
                    checkIn,
                    checkOut,
                    `${parseFloat(pd.base || 0).toFixed(2)}`,
                    `${parseFloat(pd.ot || 0).toFixed(2)}`,
                    `${parseFloat(pd.sp || 0).toFixed(2)}`,
                    `${parseFloat(pd.totalPayout || 0).toFixed(2)}`
                ]);
                grandTotal += parseFloat(pd.totalPayout || 0);
            });
        });

        // ── Manual Adjustments ──
        let totalAdjustments = 0;
        filteredTickets.forEach(t => {
            let adjs = t.adjustments || [];
            adjs.forEach(adj => {
                const amt = parseFloat(adj.amount) || 0;
                totalAdjustments += amt;
                serviceRows.push([
                    '', // Date
                    `Ticket #${t.id} Adj: ${adj.label}`, // Description
                    '', // In
                    '', // Out
                    '', // Base
                    '', // OT
                    '', // Bonus/Special
                    `${amt.toFixed(2)}` // Amount
                ]);
            });
        });
        grandTotal += totalAdjustments;

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [[
                { content: 'Date', styles: { halign: 'center' } },
                { content: 'Description', styles: { halign: 'left' } },
                { content: 'In', styles: { halign: 'center' } },
                { content: 'Out', styles: { halign: 'center' } },
                { content: 'Base', styles: { halign: 'right' } },
                { content: 'OT', styles: { halign: 'right' } },
                { content: 'Bonus', styles: { halign: 'right' } },
                { content: 'Amount', styles: { halign: 'right' } }
            ]],
            body: serviceRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 80, 200], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
            bodyStyles: { fontSize: 7, textColor: [40, 40, 40], cellPadding: 2 },
            columnStyles: { 
                0: { cellWidth: 18, halign: 'center' }, 
                1: { cellWidth: 55 }, 
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 15, halign: 'right' },
                6: { cellWidth: 15, halign: 'right' },
                7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' } 
            },
            foot: [[
                { content: 'TOTAL PAYOUT', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${cur} ${grandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]],
            footStyles: { fillColor: [245, 245, 245], fontSize: 8 }
        });

        // ── Footer ─────────────────────────────────────────────────────────────
        const footY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text('This is an automated payout breakdown sheet.', 14, footY);
        doc.text('Generated by Ticky ERP System.', 14, footY + 5);

        doc.save(`Payout_Sheet_${engineer.name.replace(/\s+/g, '_')}.pdf`);
    };

    // Filter engineers by currency first (for stats)
    const currencyFilteredEngineers = useMemo(() => {
        return engineersList.filter(eng => (eng.currency || 'USD') === selectedCurrency);
    }, [engineersList, selectedCurrency]);

    const uniqueLocations = useMemo(() => {
        const locations = currencyFilteredEngineers
            .map(e => e.city)
            .filter((city, index, self) => city && self.indexOf(city) === index);
        return ['All Locations', ...locations.sort()];
    }, [currencyFilteredEngineers]);

    // Apply search and advanced filters, then sort for the table display
    const filteredEngineers = useMemo(() => {
        let result = currencyFilteredEngineers.filter(eng => {
            // Search filter (Name, Email, or City)
            const matchesSearch = 
                eng.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                eng.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (eng.city || '').toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            // Location filter
            if (selectedLocation !== 'All Locations') {
                if (eng.city !== selectedLocation) return false;
            }

            // Payout level filter
            const estPayout = parseFloat(eng.total_payout_estimated || 0);
            if (selectedPayoutLevel !== 'All Payouts') {
                if (selectedPayoutLevel === '> 100' && estPayout <= 100) return false;
                if (selectedPayoutLevel === '> 500' && estPayout <= 500) return false;
                if (selectedPayoutLevel === '> 1000' && estPayout <= 1000) return false;
                if (selectedPayoutLevel === '> 2000' && estPayout <= 2000) return false;
            }

            // Ticket count filter
            const count = parseInt(eng.ticket_count || 0);
            if (selectedTicketCountRange !== 'All Tickets') {
                if (selectedTicketCountRange === '1-5' && (count < 1 || count > 5)) return false;
                if (selectedTicketCountRange === '6-15' && (count < 6 || count > 15)) return false;
                if (selectedTicketCountRange === '> 15' && count <= 15) return false;
            }

            return true;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'name-asc') {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === 'name-desc') {
                return b.name.localeCompare(a.name);
            }
            if (sortBy === 'payout-desc') {
                return parseFloat(b.total_payout_estimated || 0) - parseFloat(a.total_payout_estimated || 0);
            }
            if (sortBy === 'payout-asc') {
                return parseFloat(a.total_payout_estimated || 0) - parseFloat(b.total_payout_estimated || 0);
            }
            if (sortBy === 'tickets-desc') {
                return parseInt(b.ticket_count || 0) - parseInt(a.ticket_count || 0);
            }
            if (sortBy === 'tickets-asc') {
                return parseInt(a.ticket_count || 0) - parseInt(b.ticket_count || 0);
            }
            return 0;
        });

        return result;
    }, [currencyFilteredEngineers, searchTerm, selectedLocation, selectedPayoutLevel, selectedTicketCountRange, sortBy]);

    const statsForSelectedCurrency = useMemo(() => {
        const unpaidCount = filteredEngineers.length;
        const totalAmount = filteredEngineers.reduce(
            (sum, eng) => sum + parseFloat(eng.total_payout_estimated || 0),
            0
        );
        return {
            unpaidCount,
            totalUnpaidAmount: totalAmount.toFixed(2)
        };
    }, [filteredEngineers]);

    const filteredTickets = useMemo(() => {
        return unpaidTickets.filter(ticket => {
            // 1. Search text filter (Ticket ID, Customer Name, Task Name)
            const matchesSearch = 
                String(ticket.id).includes(ticketSearchTerm) ||
                (ticket.customer_name || '').toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
                (ticket.task_name || '').toLowerCase().includes(ticketSearchTerm.toLowerCase());
            if (!matchesSearch) return false;

            // 2. Billing Type filter
            const bType = (ticket.eng_billing_type || ticket.billing_type || 'Hourly').toLowerCase();
            if (selectedBillingType !== 'All Types') {
                if (!bType.includes(selectedBillingType.toLowerCase())) return false;
            }

            // 3. Month & Year filter
            if (ticket.end_time) {
                const date = new Date(ticket.end_time);
                if (selectedYear !== 'All Years') {
                    if (date.getFullYear().toString() !== selectedYear) return false;
                }
                if (selectedMonth !== 'All Months') {
                    const monthIndex = MONTHS.indexOf(selectedMonth); // "All Months", "January", ...
                    if (monthIndex > 0 && date.getMonth() + 1 !== monthIndex) return false;
                }
            } else {
                // If there's no resolved date (end_time), but they filter month/year, skip it
                if (selectedYear !== 'All Years' || selectedMonth !== 'All Months') return false;
            }

            return true;
        });
    }, [unpaidTickets, ticketSearchTerm, selectedBillingType, selectedMonth, selectedYear]);

    // Proper Calculation Logic for Engineers
    const calculateEngineerPayoutFrontend = (ticket, forcedTZ) => {
        if (!ticket) return { totalPayout: "0.00", totalHours: 0, base: "0.00", ot: "0.00", sp: "0.00", trav: "0.00", tool: "0.00" };
        const tz = (forcedTZ && forcedTZ !== 'Ticket Local') ? forcedTZ : (ticket.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // Resolve the target engineer ID (this is the engineer being viewed/calculated)
        const targetEngId = Number(selectedEngineerId);
        const engProfile = selectedEngineerProfile || engineersList.find(e => Number(e.id) === targetEngId);

        let hr = parseFloat(ticket.eng_hourly_rate || 0);
        let hd = parseFloat(ticket.eng_half_day_rate || 0);
        let fd = parseFloat(ticket.eng_full_day_rate || 0);
        let billingType = ticket.eng_billing_type || 'Hourly';
        let oohRate = parseFloat(ticket.eng_ooh_rate || ticket.oohRate || ticket.ooh_rate || 0);

        // FALLBACK: If pay type is DEFAULT, pull rates from the engineer's master profile
        if ((ticket.eng_pay_type === 'Default' || !ticket.eng_pay_type) && engProfile) {
            hr = parseFloat(engProfile.hourly_rate ?? engProfile.hourlyRate ?? 0);
            hd = parseFloat(engProfile.half_day_rate ?? engProfile.halfDayRate ?? 0);
            fd = parseFloat(engProfile.full_day_rate ?? engProfile.fullDayRate ?? 0);
            billingType = engProfile.billing_type ?? engProfile.billingType ?? 'Hourly';
            oohRate = parseFloat(engProfile.ooh_rate ?? engProfile.oohRate ?? 0);
        }

        const getZonedInfo = (date) => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
                const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
                return { dateStr, day: new Date(dateStr).getDay(), hour: parseInt(parts.hour) };
            } catch (e) { return { dateStr: '', day: date.getDay(), hour: date.getHours() }; }
        };

        let logs = [];
        try { logs = typeof ticket.time_logs === 'string' ? JSON.parse(ticket.time_logs) : (ticket.time_logs || []); } catch (e) { }

        if (logs.length > 0) {
            let totalRec = 0; let totalHrs = 0; let baseC = 0; let otP = 0; let oohP = 0; let spP = 0; let travC = 0; let toolC = 0;
            let combinedBaseBD = "";
            let combinedOtBD = "";
            let combinedOohBD = "";

            // Resolve the current target engineer ID. 
            const targetEngId = Number(selectedEngineerId);

            logs.forEach(log => {
                const logEngId = Number(log.engineer_id || log.engineerId || ticket.engineer_id || ticket.engineerId);
                
                // CRITICAL: Only process logs that belong to THIS engineer
                if (logEngId !== targetEngId) return;

                const logDate = (log.task_date || '').split('T')[0];
                if (logDate) {
                    const dObj = new Date(`${logDate}T00:00:00Z`);
                    const isWeekend = dObj.getUTCDay() === 0 || dObj.getUTCDay() === 6;
                    const HOLIDAYS_BY_COUNTRY = {
                        'India': ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'],
                        'Poland': ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25', '2026-12-26'],
                        'Other': []
                    };
                    const activeHols = HOLIDAYS_BY_COUNTRY[ticket.country] || HOLIDAYS_BY_COUNTRY['India'] || [];
                    const isHoliday = activeHols.includes(logDate);
                    if ((isWeekend || isHoliday) && (!log.start_time || !log.end_time)) return;
                }

                let sTime = log.start_time;
                let eTime = log.end_time;
                let brk = (log.break_time_mins || 0) * 60;

                if (!sTime || !eTime) {
                    const dStr = (log.task_date || log.start_time || '').split('T')[0];
                    if (!dStr) return;
                    const ct = String(ticket.task_time || '09:00').slice(0, 5);
                    const sDT = new Date(`${dStr}T${ct}:00Z`);
                    if (isNaN(sDT.getTime())) return;
                    sTime = sDT.toISOString();
                    const eDT = new Date(sDT.getTime() + 8 * 3600000);
                    eTime = eDT.toISOString();
                    brk = 0;
                }

                // Recursive call for single day logic
                const res = calculateEngineerPayoutFrontend({ ...ticket, start_time: sTime, end_time: eTime, break_time: brk, time_logs: [], _is_log_aggregation: true }, tz);
                
                totalHrs += parseFloat(res.totalHours || 0);
                
                // Flexible matching for billing types
                const bType = billingType.toLowerCase();
                if (bType.includes('hourly') || bType.includes('half') || bType.includes('full') || bType.includes('mixed') || bType.includes('monthly')) {
                    baseC += parseFloat(res.base || 0);
                    if (res.baseBreakdown) combinedBaseBD += (combinedBaseBD ? " + " : "") + res.baseBreakdown;
                }
                otP += parseFloat(res.ot || 0);
                if (res.otBreakdown) combinedOtBD += (combinedOtBD ? " + " : "") + res.otBreakdown;
                
                oohP += parseFloat(res.ooh || 0);
                if (res.oohBreakdown) combinedOohBD += (combinedOohBD ? " + " : "") + res.oohBreakdown;
                
                spP += parseFloat(res.sp || 0);
                // Travel and Tool costs are excluded from Engineer Payout
                travC = 0;
                toolC = 0;
            });

            // ── One-Time Fees Attribution ──────────────────────────────────
            const primaryEngId = Number(ticket.engineer_id || ticket.engineerId);
            const isPrimary = targetEngId === primaryEngId;

            if (isPrimary) {
               if (billingType === 'Agreed Rate') {
                   baseC = parseFloat(ticket.eng_agreed_rate || 0);
                   combinedBaseBD = "Fixed Agreed Rate";
               } else if (billingType === 'Cancellation') {
                   baseC = parseFloat(ticket.eng_cancellation_fee || 0);
                   combinedBaseBD = "Fixed Cancellation Fee";
               }
            }

            totalRec = baseC + otP + oohP + spP; // Excluded travC and toolC
            let adjSum = 0;
            if (!ticket._is_log_aggregation && ticket.adjustments && Array.isArray(ticket.adjustments)) {
                adjSum = ticket.adjustments.reduce((sum, adj) => sum + parseFloat(adj.amount || 0), 0);
            }
            totalRec += adjSum;
            return {
                totalPayout: totalRec.toFixed(2),
                base: baseC.toFixed(2), ot: otP.toFixed(2), ooh: oohP.toFixed(2), sp: spP.toFixed(2), trav: travC.toFixed(2), tool: toolC.toFixed(2),
                baseBreakdown: combinedBaseBD || "N/A", otBreakdown: combinedOtBD || "", oohBreakdown: combinedOohBD || "",
                totalHours: isNaN(totalHrs) ? 0 : totalHrs, otHours: isNaN(totalHrs) ? 0 : (totalHrs > 8 ? totalHrs - 8 : 0),
                adjustmentsSum: adjSum.toFixed(2)
            };
        }

        const sStr = ticket.start_time || ticket.task_start_date;
        const eStr = ticket.end_time || ticket.task_end_date || ticket.start_time;
        if (!sStr || !eStr) return { totalPayout: "0.00", totalHours: 0, base: "0.00", ot: "0.00", ooh: "0.00", sp: "0.00", trav: "0.00", tool: "0.00" };

        const parseDateSafe = (str, defaultTimeSuffix) => {
            if (!str) return new Date();
            if (str.length <= 10) {
                return new Date(`${str}T${defaultTimeSuffix}Z`);
            }
            if (str.includes('T') || str.includes('Z') || str.includes('+')) {
                return new Date(str);
            }
            return new Date(str.replace(' ', 'T') + 'Z');
        };

        const s = parseDateSafe(sStr, '09:00:00');
        const e = parseDateSafe(eStr, '17:00:00');
        const brk = parseInt(ticket.break_time || (ticket.break_time_mins ? ticket.break_time_mins * 60 : 0) || 0);
        const rawDiffMsEng = e.getTime() - s.getTime();
        let hrs = isNaN(rawDiffMsEng) ? 0 : Math.max(0, rawDiffMsEng / 1000 - brk) / 3600;
        if (!ticket.start_time && !ticket.end_time && hrs > 8) hrs = 8;
        if (isNaN(hrs)) hrs = 0;

        const info = getZonedInfo(s);
        const endInfo = getZonedInfo(e);
        let startHr = info.hour;
        let endHr = endInfo.hour;
        if ((sStr.includes('T') || sStr.includes(' ')) && !sStr.includes('Z') && !sStr.includes('+')) {
            const parts = sStr.split(/[T ]/);
            if (parts[1]) startHr = parseInt(parts[1].split(':')[0], 10);
        }
        if ((eStr.includes('T') || eStr.includes(' ')) && !eStr.includes('Z') && !eStr.includes('+')) {
            const parts = eStr.split(/[T ]/);
            if (parts[1]) endHr = parseInt(parts[1].split(':')[0], 10);
        }

        const isWK = info.day === 0 || info.day === 6 || endInfo.day === 0 || endInfo.day === 6;
        const HOLS = ['2026-01-26', '2026-03-21', '2026-03-31', '2026-04-03', '2026-04-14', '2026-05-01', '2026-05-27', '2026-06-26', '2026-08-15', '2026-08-26', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25'];
        const isH = HOLS.includes(info.dateStr) || HOLS.includes(endInfo.dateStr);
        const isSpecialDay = isWK || isH;
        const workIsOOH = false; // OOH is completely disabled per request

        let base = 0, ot = 0, ooh = 0, sp = 0;
        let baseBD = "", otBD = "", oohBD = "";

        // Custom Rates
        const customOTRate = parseFloat(ticket.eng_overtime_rate) || (hr * 1.5);
        const customWeekendRate = parseFloat(ticket.eng_weekend_rate) || (hr * 2.0);
        const customHolidayRate = parseFloat(ticket.eng_holiday_rate) || (hr * 2.0);
        const customOOHRate = oohRate || (hr * 1.5);

        const bType = billingType.toLowerCase();
        if (bType.includes('hourly') && !bType.includes('half') && !bType.includes('full')) {
            const b = Math.max(2, hrs); 
            base = b * hr; 
            baseBD = `${b.toFixed(2)}h @ ${hr}`;
        } else if (bType.includes('half') && bType.includes('hourly')) {
            base = hrs <= 4 ? hd : hd + (hrs - 4) * hr;
            baseBD = hrs <= 4 ? `Half Day` : `Half Day + Extra`;
        } else if (bType.includes('full') && bType.includes('ot')) {
            base = fd; baseBD = `Full Day`;
            if (hrs > 8) { ot = (hrs - 8) * customOTRate; otBD = `OT`; }
        } else if (bType.includes('mixed')) {
            if (hrs <= 4) base = hd;
            else if (hrs <= 8) base = fd;
            else { base = fd; ot = (hrs - 8) * customOTRate; }
        } else if (bType.includes('monthly')) {
            base = (parseFloat(ticket.eng_monthly_rate || ticket.monthly_rate || 0)) / 30;
            if (hrs > 8) ot = (hrs - 8) * customOTRate;
        } else if (bType.includes('agreed')) {
            base = ticket._is_log_aggregation ? 0 : parseFloat(ticket.eng_agreed_rate || 0);
        } else if (bType.includes('cancellation')) {
            base = ticket._is_log_aggregation ? 0 : parseFloat(ticket.eng_cancellation_fee || 0);
        }

        if (workIsOOH && bType !== 'agreed' && bType !== 'cancellation') {
            ooh = hrs * customOOHRate;
            oohBD = `${hrs.toFixed(2)}h OOH @ ${customOOHRate.toFixed(2)}`;
        }

        if (isH) {
            sp = customHolidayRate;
        } else if (isWK) {
            sp = customWeekendRate;
        }

        // Engineer payouts should EXCLUDE travel and tool costs as per user requirement
        const trav = 0;
        const tool = 0;

        let adjSum = 0;
        if (!ticket._is_log_aggregation && ticket.adjustments && Array.isArray(ticket.adjustments)) {
            adjSum = ticket.adjustments.reduce((sum, adj) => sum + parseFloat(adj.amount || 0), 0);
        }
        const total = base + ot + ooh + sp + trav + tool + adjSum;
        return {
            totalPayout: total.toFixed(2),
            base: base.toFixed(2), ot: ot.toFixed(2), ooh: ooh.toFixed(2), sp: sp.toFixed(2), trav: trav.toFixed(2), tool: tool.toFixed(2),
            baseBreakdown: baseBD, otBreakdown: otBD, oohBreakdown: oohBD,
            totalHours: isNaN(hrs) ? 0 : hrs, otHours: isNaN(hrs) ? 0 : (hrs > 8 ? hrs - 8 : 0),
            isSpecialDay,
            isOOH: workIsOOH,
            adjustmentsSum: adjSum.toFixed(2)
        };
    };

    return (
        <div className="payout-page">
            <header className="payout-header">
                <div className="header-title">
                    {selectedEngineerId ? (
                        <button className="btn-back" onClick={handleBackToEngineers}>
                            <FiArrowRight style={{ transform: 'rotate(180deg)' }} /> Back to Engineers
                        </button>
                    ) : null}
                    <h1>
                        {selectedEngineerId 
                          ? engineersList.find(e => e.id === selectedEngineerId)?.name || 'Engineer Detail'
                          : 'Engineer Payouts'}
                    </h1>
                    <p>
                        {selectedEngineerId 
                          ? (activeTab === 'history' ? 'Displaying paid tickets history for this engineer' : 'Displaying unpaid tickets for this engineer')
                          : (activeTab === 'history' ? 'View and track processed payments for engineers' : 'Manage and process payments for engineers')
                        }
                    </p>
                </div>
                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {selectedEngineerId && (
                        <div className="calc-timezone-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <FiGlobe size={14} style={{ color: '#6366f1' }} />
                            <select 
                                value={calcTimezone} 
                                onChange={(e) => setCalcTimezone(e.target.value)}
                                style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', color: '#475569', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="Ticket Local">Ticket Local (Auto)</option>
                                <option value="Asia/Kolkata">India (IST)</option>
                                <option value="Europe/Warsaw">Poland (CET)</option>
                                <option value="UTC">UTC (Universal)</option>
                            </select>
                        </div>
                    )}
                    <button 
                        className="btn-refresh" 
                        onClick={selectedEngineerId ? () => fetchEngineerTickets(selectedEngineerId, activeTab) : () => fetchEngineersSummary(activeTab)}
                        disabled={loading}
                    >
                        <FiRefreshCw className={loading ? 'spin' : ''} />
                    </button>
                    {selectedEngineerId && filteredTickets.length > 0 && (
                        <button 
                            className="btn-download-premium" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }}
                            onClick={() => generatePayoutPDF(selectedEngineerId)}
                        >
                            <FiDownload /> Payout Breakdown
                        </button>
                    )}
                </div>
                <div className="header-stats">
                    <div className="stat-card blue">
                        <FiUser className="stat-icon" />
                        <div className="stat-info">
                            <span className="stat-label">{activeTab === 'history' ? 'Paid Engineers' : 'Unpaid Engineers'}</span>
                            <span className="stat-value">{selectedEngineerId ? 1 : statsForSelectedCurrency.unpaidCount}</span>
                        </div>
                    </div>
                    <div className="stat-card green">
                        <FiDollarSign className="stat-icon" />
                        <div className="stat-info">
                            <span className="stat-label">{activeTab === 'history' ? 'Total Paid Out' : 'Est. Total Payout'}</span>
                            <span className="stat-value">
                                {(() => {
                                    if (selectedEngineerId && filteredTickets.length > 0) {
                                        // Dynamically sum all ticket payouts for this engineer
                                        const total = filteredTickets.reduce((sum, t) => {
                                            const backendAmt = parseFloat(t.eng_total_cost || 0);
                                            if (backendAmt > 0) return sum + backendAmt;
                                            // Fallback to frontend calculation
                                            const pd = calculateEngineerPayoutFrontend(t, calcTimezone);
                                            return sum + parseFloat(pd.totalPayout || 0);
                                        }, 0);
                                        const firstTicket = filteredTickets[0];
                                        const curSymbol = CURRENCY_SYMBOLS[firstTicket?.eng_currency || firstTicket?.currency || 'USD'] || '$';
                                        return `${curSymbol}${total.toFixed(2)}`;
                                    }
                                    return `${CURRENCY_SYMBOLS[selectedCurrency] || '$'}${statsForSelectedCurrency.totalUnpaidAmount}`;
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* View Switching */}
            {!selectedEngineerId ? (
                /* ENGINEER LIST VIEW */
                <main className="payout-content">
                    <div className="payout-tabs-container">
                        <button 
                            className={`payout-tab ${activeTab === 'unpaid' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('unpaid');
                                setSearchTerm('');
                            }}
                        >
                            <FiAlertCircle className="tab-icon" /> Unpaid Payouts
                        </button>
                        <button 
                            className={`payout-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('history');
                                setSearchTerm('');
                            }}
                        >
                            <FiCheckCircle className="tab-icon" /> Paid History
                        </button>
                    </div>

                    <div className="content-controls">
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search by name, email, or city..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} title="Currency">
                                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} title="Location">
                                {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                            <select value={selectedPayoutLevel} onChange={(e) => setSelectedPayoutLevel(e.target.value)} title="Payout Level">
                                <option value="All Payouts">All Payout Levels</option>
                                <option value="> 100">&gt; 100 ({displayCurrencySymbol})</option>
                                <option value="> 500">&gt; 500 ({displayCurrencySymbol})</option>
                                <option value="> 1000">&gt; 1000 ({displayCurrencySymbol})</option>
                                <option value="> 2000">&gt; 2000 ({displayCurrencySymbol})</option>
                            </select>
                            <select value={selectedTicketCountRange} onChange={(e) => setSelectedTicketCountRange(e.target.value)} title="Tickets Count">
                                <option value="All Tickets">All Tickets Count</option>
                                <option value="1-5">1 - 5 Tickets</option>
                                <option value="6-15">6 - 15 Tickets</option>
                                <option value="> 15">&gt; 15 Tickets</option>
                            </select>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Sort By">
                                <option value="name-asc">Sort: Name (A-Z)</option>
                                <option value="name-desc">Sort: Name (Z-A)</option>
                                <option value="payout-desc">Sort: Payout (High to Low)</option>
                                <option value="payout-asc">Sort: Payout (Low to High)</option>
                                <option value="tickets-desc">Sort: Tickets (High to Low)</option>
                                <option value="tickets-asc">Sort: Tickets (Low to High)</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="payout-table">
                            <thead>
                                <tr>
                                    <th>Engineer</th>
                                    <th>Contact</th>
                                    <th>Location</th>
                                    <th>{activeTab === 'history' ? 'Paid Tickets' : 'Pending Tickets'}</th>
                                    <th>{activeTab === 'history' ? 'Total Paid' : 'Est. Payout'}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEngineers.length > 0 ? (
                                    filteredEngineers.map(eng => (
                                        <tr key={eng.id}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar">{eng.name.charAt(0)}</div>
                                                    <span className="user-name">{eng.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="contact-info">
                                                    <span>{eng.email}</span>
                                                    <small>{eng.phone}</small>
                                                </div>
                                            </td>
                                            <td>{eng.city || 'N/A'}</td>
                                            <td>
                                                <span className="badge-ticket" style={activeTab === 'history' ? { background: '#eafaf1', color: '#2ec4b6' } : {}}>{eng.ticket_count} tickets</span>
                                            </td>
                                            <td className="amount-cell">
                                                {CURRENCY_SYMBOLS[eng.currency || 'USD'] || '$'}{parseFloat(eng.total_payout_estimated || 0).toFixed(2)}
                                            </td>
                                            <td>
                                                <button className="btn-action" onClick={() => fetchEngineerTickets(eng.id)}>
                                                    View History <FiArrowRight />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="empty-row" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <FiAlertCircle style={{ fontSize: '20px', marginBottom: '6px', display: 'block', margin: '0 auto' }} />
                                            {activeTab === 'history' 
                                              ? 'No engineers with paid tickets found.'
                                              : 'No engineers with unpaid tickets found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            ) : (
                /* ENGINEER TICKETS VIEW */
                <main className="payout-content">
                    {/* Ticket filter controls */}
                    <div className="content-controls ticket-controls" style={{ marginTop: '10px', marginBottom: '20px' }}>
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search ticket by ID, customer, or task..." 
                                value={ticketSearchTerm}
                                onChange={(e) => setTicketSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <select value={selectedBillingType} onChange={(e) => setSelectedBillingType(e.target.value)} title="Billing Type">
                                <option value="All Types">All Billing Types</option>
                                <option value="Hourly">Hourly</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Full Day">Full Day</option>
                                <option value="Agreed">Agreed Rate</option>
                                <option value="Mixed">Mixed</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Cancellation">Cancellation</option>
                            </select>

                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} title="Month">
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} title="Year">
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            {(ticketSearchTerm || selectedBillingType !== 'All Types' || selectedMonth !== 'All Months' || selectedYear !== 'All Years') && (
                                <button 
                                    className="btn-clear-filters"
                                    onClick={() => {
                                        setTicketSearchTerm('');
                                        setSelectedBillingType('All Types');
                                        setSelectedMonth('All Months');
                                        setSelectedYear('All Years');
                                    }}
                                    style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {activeTab === 'unpaid' ? (
                        <div className="selection-bar">
                            <div className="selection-info">
                                <span className="count">{selectedTicketIds.length} tickets selected</span>
                                <span className="total">Total to Pay: <strong>{(() => {
                                    const firstSelected = filteredTickets.find(t => selectedTicketIds.includes(t.id));
                                    const curSymbol = CURRENCY_SYMBOLS[firstSelected?.eng_currency || firstSelected?.currency || 'USD'] || '$';
                                    const total = filteredTickets
                                        .filter(t => selectedTicketIds.includes(t.id))
                                        .reduce((sum, t) => {
                                            // Use backend-calculated eng_total_cost (includes adjustments & single-day fix)
                                            const backendAmt = parseFloat(t.eng_total_cost || 0);
                                            if (backendAmt > 0) return sum + backendAmt;
                                            // Fallback to frontend calculation
                                            const pd = calculateEngineerPayoutFrontend(t, calcTimezone);
                                            return sum + parseFloat(pd.totalPayout || 0);
                                        }, 0).toFixed(2);
                                    return `${curSymbol}${total}`;
                                })()}</strong></span>
                            </div>
                            <button 
                                className="btn-primary" 
                                disabled={selectedTicketIds.length === 0 || processing}
                                onClick={handleProcessPayout}
                            >
                                {processing ? 'Processing...' : <><FiCheck /> Mark as Paid</>}
                            </button>
                        </div>
                    ) : (
                        <div className="selection-bar" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', boxShadow: 'none', padding: '16px 24px' }}>
                            <div className="selection-info">
                                <span className="count" style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                    <FiCheckCircle /> Paid Payout History
                                </span>
                                <span className="total" style={{ marginLeft: '12px', fontSize: '15px' }}>Total Processed: <strong>{(() => {
                                    const total = filteredTickets.reduce((sum, t) => {
                                        const backendAmt = parseFloat(t.eng_total_cost || 0);
                                        if (backendAmt > 0) return sum + backendAmt;
                                        const pd = calculateEngineerPayoutFrontend(t, calcTimezone);
                                        return sum + parseFloat(pd.totalPayout || 0);
                                    }, 0);
                                    const firstTicket = filteredTickets[0];
                                    const curSymbol = CURRENCY_SYMBOLS[firstTicket?.eng_currency || firstTicket?.currency || 'USD'] || '$';
                                    return `${curSymbol}${total.toFixed(2)}`;
                                })()}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Fully Settled
                            </div>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="payout-table">
                            <thead>
                                <tr>
                                    {activeTab === 'unpaid' ? (
                                        <th width="40">
                                            <input 
                                                type="checkbox" 
                                                checked={filteredTickets.length > 0 && filteredTickets.every(t => selectedTicketIds.includes(t.id))}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedTicketIds(filteredTickets.map(t => t.id));
                                                    else setSelectedTicketIds([]);
                                                }} 
                                            />
                                        </th>
                                    ) : (
                                        <th width="60" style={{ textAlign: 'center' }}>Status</th>
                                    )}
                                    <th>Ticket ID</th>
                                    <th>Customer</th>
                                    <th>Task Name</th>
                                    <th>Hours</th>
                                    <th>Resolved Date</th>
                                    <th>Payout</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTickets.length > 0 ? (
                                    filteredTickets.map(ticket => (
                                        <tr key={ticket.id} className={selectedTicketIds.includes(ticket.id) ? 'selected' : ''}>
                                            {activeTab === 'unpaid' ? (
                                                <td><input 
                                                    type="checkbox" 
                                                    checked={selectedTicketIds.includes(ticket.id)}
                                                    onChange={() => toggleTicketSelection(ticket.id)}
                                                /></td>
                                            ) : (
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="badge-paid" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold' }}>
                                                        <FiCheck size={12} /> Paid
                                                    </span>
                                                </td>
                                            )}
                                            <td><span className="ticket-id">#{ticket.id}</span></td>
                                            <td>{ticket.customer_name}</td>
                                            <td>{ticket.task_name}</td>
                                            <td>{(() => {
                                                 const pd = calculateEngineerPayoutFrontend(ticket, calcTimezone);
                                                 return (isNaN(pd.totalHours) ? 0 : pd.totalHours).toFixed(2) + 'h';
                                             })()}</td>
                                            <td>{ticket.end_time ? formatDateZoned(ticket.end_time, ticket) : 'N/A'}</td>
                                            <td className="amount-cell">{(() => {
                                                 const curSymbol = CURRENCY_SYMBOLS[ticket.eng_currency || ticket.currency || 'USD'] || '$';
                                                 const backendAmt = parseFloat(ticket.eng_total_cost || 0);
                                                 if (backendAmt > 0) return curSymbol + backendAmt.toFixed(2);
                                                 const pd = calculateEngineerPayoutFrontend(ticket, calcTimezone);
                                                 return curSymbol + parseFloat(pd.totalPayout || 0).toFixed(2);
                                             })()}</td>
                                            <td>
                                                <button className="btn-view" onClick={() => handleOpenDetails(ticket)}>
                                                    <FiEye />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-row" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                            <FiAlertCircle style={{ fontSize: '24px', marginBottom: '8px', display: 'block', margin: '0 auto' }} />
                                            {activeTab === 'history' 
                                              ? 'No paid resolved tickets found for this engineer.'
                                              : 'No unpaid resolved tickets found for this engineer.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            )}

            {/* ─── PREMIUM TICKET DETAIL MODAL ─────────────────────────────────── */}
            {detailTicket && (() => {
                const ticketWithAdjustments = { ...detailTicket, adjustments };
                const pd = calculateEngineerPayoutFrontend(ticketWithAdjustments, calcTimezone);
                const curCode = detailTicket.eng_currency || detailTicket.currency || 'USD';
                const cur = CURRENCY_SYMBOLS[curCode] || '$';

                // Format time helper (respecting calcTimezone dropdown)
                const fmtTime = (str) => formatTimeZoned(str, detailTicket);
                const fmtDate = (str) => formatDateZoned(str, detailTicket);

                const totalHrs = isNaN(pd.totalHours) ? 0 : parseFloat(pd.totalHours);
                const breakMins = parseInt(detailTicket.break_time || 0);
                const hh = Math.floor(totalHrs);
                const mm = Math.round((totalHrs - hh) * 60);
                const durationStr = `${hh}h ${mm}m`;
                const billingType = detailTicket.eng_billing_type || 'Hourly';
                const payType = detailTicket.eng_pay_type || 'Default';

                return (
                    <div className="pm-overlay" onClick={handleCloseDetails}>
                        <div className="pm-modal" onClick={e => e.stopPropagation()}>

                            {/* ── Header ── */}
                            <div className="pm-header">
                                <div className="pm-header-left">
                                    <div className="pm-ticket-chip">
                                        <FiHash size={12} />
                                        Ticket {detailTicket.id}
                                    </div>
                                    <h2 className="pm-title">{detailTicket.task_name}</h2>
                                    <p className="pm-subtitle">
                                        <FiBriefcase size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                        {detailTicket.customer_name}
                                    </p>
                                </div>
                                <button className="pm-close-btn" onClick={handleCloseDetails}>
                                    <FiX size={18} />
                                </button>
                            </div>

                            {/* ── Scrollable Body ── */}
                            <div className="pm-body">

                                {/* ── Time Timeline ── */}
                                <div className="pm-section-title"><FiClock size={14} /> Time Log</div>
                                <div className="pm-timeline">
                                    <div className="pm-tl-item">
                                        <div className="pm-tl-icon start"><FiArrowRight /></div>
                                        <div className="pm-tl-label">Start Time</div>
                                        <div className="pm-tl-value">{fmtTime(detailTicket.start_time)}</div>
                                        <div className="pm-tl-date">{fmtDate(detailTicket.start_time)}</div>
                                    </div>
                                    <div className="pm-tl-line" />
                                    <div className="pm-tl-item">
                                        <div className="pm-tl-icon break"><FiClock /></div>
                                        <div className="pm-tl-label">Break</div>
                                        <div className="pm-tl-value">{breakMins > 0 ? `${breakMins}m` : '—'}</div>
                                        <div className="pm-tl-date">deducted</div>
                                    </div>
                                    <div className="pm-tl-line" />
                                    <div className="pm-tl-item">
                                        <div className="pm-tl-icon end"><FiCheckCircle /></div>
                                        <div className="pm-tl-label">End Time</div>
                                        <div className="pm-tl-value">{fmtTime(detailTicket.end_time)}</div>
                                        <div className="pm-tl-date">{fmtDate(detailTicket.end_time)}</div>
                                    </div>
                                    <div className="pm-tl-line" />
                                    <div className="pm-tl-item">
                                        <div className="pm-tl-icon duration"><FiCalendar /></div>
                                        <div className="pm-tl-label">Duration</div>
                                        <div className="pm-tl-value duration-val">{durationStr}</div>
                                        <div className="pm-tl-date">net worked</div>
                                    </div>
                                </div>

                                {/* ── Billing Info ── */}
                                <div className="pm-billing-row">
                                    <div className="pm-billing-chip">
                                        <FiCreditCard size={12} />
                                        {billingType}
                                    </div>
                                    <div className="pm-billing-chip secondary">
                                        {payType} Rate
                                    </div>
                                    {pd.isSpecialDay && (
                                        <div className="pm-billing-chip special">
                                            ★ Special Day
                                        </div>
                                    )}
                                    {pd.isOOH && (
                                        <div className="pm-billing-chip special" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                            ☾ Out of Hours
                                        </div>
                                    )}
                                </div>

                                {/* ── Payment Breakdown ── */}
                                <div className="pm-section-title"><FiDollarSign size={14} /> Payment Breakdown</div>
                                <div className="pm-breakdown">

                                    {/* Base */}
                                    <div className="pm-bd-row">
                                        <div className="pm-bd-left">
                                            <div className="pm-bd-dot base" />
                                            <div>
                                                <div className="pm-bd-name">Base Labour Payout</div>
                                                {pd.baseBreakdown && pd.baseBreakdown !== 'N/A' && (
                                                    <div className="pm-bd-sub">{pd.baseBreakdown}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pm-bd-amount base-color">{cur} {parseFloat(pd.base).toFixed(2)}</div>
                                    </div>

                                    {/* Overtime */}
                                    {parseFloat(pd.ot) > 0 && (
                                        <div className="pm-bd-row">
                                            <div className="pm-bd-left">
                                                <div className="pm-bd-dot ot" />
                                                <div>
                                                    <div className="pm-bd-name">Overtime (OT)</div>
                                                    {pd.otBreakdown && <div className="pm-bd-sub">{pd.otBreakdown}</div>}
                                                </div>
                                            </div>
                                            <div className="pm-bd-amount ot-color">{cur} {parseFloat(pd.ot).toFixed(2)}</div>
                                        </div>
                                    )}

                                    {/* Special Day */}
                                    {parseFloat(pd.sp) > 0 && (
                                        <div className="pm-bd-row">
                                            <div className="pm-bd-left">
                                                <div className="pm-bd-dot sp" />
                                                <div>
                                                    <div className="pm-bd-name">Special Day Bonus</div>
                                                    <div className="pm-bd-sub">Weekend / Holiday rate</div>
                                                </div>
                                            </div>
                                            <div className="pm-bd-amount sp-color">{cur} {parseFloat(pd.sp).toFixed(2)}</div>
                                        </div>
                                    )}

                                    {/* Travel */}
                                    {parseFloat(pd.trav) > 0 && (
                                        <div className="pm-bd-row">
                                            <div className="pm-bd-left">
                                                <div className="pm-bd-dot trav" />
                                                <div className="pm-bd-name">Travel Reimbursement</div>
                                            </div>
                                            <div className="pm-bd-amount">{cur} {parseFloat(pd.trav).toFixed(2)}</div>
                                        </div>
                                    )}

                                    {/* Divider */}
                                    <div className="pm-bd-divider" />

                                    {/* ── Manual Adjustments Panel ─────────────────────── */}
                                    <div style={{ marginTop: '16px', background: '#fafafa', border: '1.5px dashed #c7d2fe', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>⚙️ Manual Adjustments</div>

                                        {/* Existing adjustments list */}
                                        {adjustments.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                                {adjustments.map(adj => (
                                                    <div key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: parseFloat(adj.amount) >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${parseFloat(adj.amount) >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '8px 12px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{adj.label}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(adj.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: '800', color: parseFloat(adj.amount) >= 0 ? '#16a34a' : '#ef4444' }}>
                                                                {parseFloat(adj.amount) >= 0 ? '+' : ''}{cur} {parseFloat(adj.amount).toFixed(2)}
                                                            </span>
                                                            {activeTab === 'unpaid' && (
                                                                <button
                                                                    onClick={() => handleDeleteAdjustment(adj.id)}
                                                                    title="Delete adjustment"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '2px 4px', borderRadius: '4px', lineHeight: 1 }}
                                                                >🗑</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add new adjustment form */}
                                        {activeTab === 'unpaid' ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                <div style={{ flex: '2', minWidth: '140px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>LABEL / REASON</div>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Parking, Penalty, Bonus..."
                                                        value={adjLabel}
                                                        onChange={e => setAdjLabel(e.target.value)}
                                                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c7d2fe', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ flex: '1', minWidth: '100px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>AMOUNT ({cur})</div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={adjAmount}
                                                        onChange={e => setAdjAmount(e.target.value)}
                                                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c7d2fe', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ minWidth: '100px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>TYPE</div>
                                                    <select
                                                        value={adjType}
                                                        onChange={e => setAdjType(e.target.value)}
                                                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c7d2fe', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                                    >
                                                        <option value="add">➕ Add</option>
                                                        <option value="deduct">➖ Deduct</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={handleAddAdjustment}
                                                    disabled={adjLoading || !adjLabel.trim() || !adjAmount}
                                                    style={{ padding: '8px 18px', background: (!adjLabel.trim() || !adjAmount) ? '#e2e8f0' : '#6366f1', color: (!adjLabel.trim() || !adjAmount) ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: (!adjLabel.trim() || !adjAmount) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', height: '36px' }}
                                                >
                                                    {adjLoading ? '...' : '+ Add'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', textAlign: 'center', padding: '6px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                                                🔒 This ticket has been marked as PAID. Manual adjustments cannot be modified.
                                            </div>
                                        )}

                                        {/* Adjusted total summary */}
                                        {adjustments.length > 0 && (() => {
                                            const adjTotal = adjustments.reduce((s, a) => s + parseFloat(a.amount), 0);
                                            const baseTotal = parseFloat(pd.totalPayout) - adjTotal;
                                            return (
                                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', borderRadius: '10px', padding: '12px 16px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' }}>Subtotal & Adjustments</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            {cur} {baseTotal.toFixed(2)} {adjTotal >= 0 ? '+' : '–'} {cur} {Math.abs(adjTotal).toFixed(2)} adjustments
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '22px', fontWeight: '900', color: parseFloat(pd.totalPayout) >= 0 ? '#6366f1' : '#ef4444' }}>
                                                        {cur} {parseFloat(pd.totalPayout).toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Net Total Hero */}
                                    <div className="pm-net-payout">
                                        <div className="pm-net-label">
                                            <FiCheckCircle size={16} />
                                            Net Payout
                                        </div>
                                        <div className="pm-net-amount">
                                            <span className="pm-net-currency">{cur}</span>
                                            <span className="pm-net-value">{parseFloat(pd.totalPayout).toFixed(2)}</span>
                                        </div>
                                    </div>

                                </div>{/* /pm-breakdown */}

                            </div>{/* /pm-body */}
                        </div>{/* /pm-modal */}
                    </div>
                );
            })()}

        </div>
    );
};

export default EngineerPayoutPage;
