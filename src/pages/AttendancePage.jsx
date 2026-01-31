import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiCalendar, FiClock, FiUserCheck, FiChevronLeft, FiChevronRight, FiActivity, FiArrowRight, FiX, FiCheckCircle, FiMinusCircle, FiTarget, FiSearch, FiFilter, FiDownload, FiGlobe, FiAlertCircle } from 'react-icons/fi';
import './AttendancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Country Configurations
const COUNTRY_CONFIG = {
    'IN': { name: 'India', flag: '🇮🇳', weekend: [0, 6], holidays: ['2026-01-26', '2026-08-15', '2026-10-02', '2026-10-31', '2026-12-25'] },
    'US': { name: 'USA', flag: '🇺🇸', weekend: [0, 6], holidays: ['2026-01-01', '2026-07-04', '2026-11-26', '2026-12-25'] },
    'GB': { name: 'UK', flag: '🇬🇧', weekend: [0, 6], holidays: ['2026-01-01', '2026-12-25', '2026-12-26'] },
    'AE': { name: 'UAE', flag: '🇦🇪', weekend: [0, 6], holidays: ['2026-12-02'] },
    'DEFAULT': { name: 'Global', flag: '🌍', weekend: [0, 6], holidays: [] }
};

// Hardcoded Public Holidays for Header Highlighting (Sync with Mobile)
const PUBLIC_HOLIDAYS = [
    '2026-01-26', '2026-03-08', '2026-03-25', '2026-04-11', '2026-04-14',
    '2026-04-21', '2026-05-01', '2026-08-15', '2026-08-26', '2026-10-02',
    '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-25'
];

const AttendancePage = ({ user }) => {
    const [viewMode, setViewMode] = useState('daily');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [records, setRecords] = useState([]);
    const [monthlyRecords, setMonthlyRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEngineer, setSelectedEngineer] = useState(null);

    const tableContainerRef = useRef(null);
    const todayColRef = useRef(null);
    const currentUserEmail = user?.email;

    // --- Helpers ---
    const getEngineerConfig = (countryCode) => COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['DEFAULT'];

    const isWeekend = (y, m, d, countryCode = 'IN') => {
        const dateObj = new Date(y, m - 1, d);
        return getEngineerConfig(countryCode).weekend.includes(dateObj.getDay());
    };

    const isPublicHoliday = (y, m, d, countryCode = 'IN') => {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return getEngineerConfig(countryCode).holidays.includes(dateStr);
    };

    const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

    // --- Effects ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const endpoint = viewMode === 'daily'
                    ? `${API_BASE_URL}/attendance?date=${date}`
                    : `${API_BASE_URL}/attendance/monthly?year=${year}&month=${month}`;

                const res = await fetch(endpoint, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch data');
                const data = await res.json();

                if (viewMode === 'daily') setRecords(Array.isArray(data) ? data : []);
                else setMonthlyRecords(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [date, month, year, viewMode]);

    // Auto-scroll logic for montly view
    useEffect(() => {
        if (viewMode === 'monthly' && !loading && tableContainerRef.current && todayColRef.current) {
            setTimeout(() => {
                const container = tableContainerRef.current;
                const element = todayColRef.current;
                if (!container || !element) return;

                const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }, 300);
        }
    }, [viewMode, loading, monthlyRecords]);

    // --- Stats Calculation ---
    const dailyStats = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'Present').length;
        const absent = records.filter(r => r.status === 'Absent').length;
        const leave = records.filter(r => r.status === 'Leave').length; // Assuming 'Leave' status exists in daily
        return { total, present, absent, leave };
    }, [records]);

    const monthlyStats = useMemo(() => {
        if (viewMode !== 'monthly') return null;
        const today = new Date();
        const d = today.getDate();
        const m = today.getMonth() + 1;
        const y = today.getFullYear();

        // Only calculate "Today's Pulse" if we are viewing the current month
        if (m !== month || y !== year) return null;

        let present = 0, absent = 0, leave = 0;
        monthlyRecords.forEach(r => {
            const status = r.attendance[d];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
            else if (status === 'Half Day') present += 0.5;
        });
        return { present, absent, leave };
    }, [monthlyRecords, month, year]);

    // --- Renderers ---

    const renderDailyView = () => (
        <div className="daily-view-container fade-in">
            {/* Summary Cards */}
            <div className="stats-row">
                <div className="stat-card full-gradient">
                    <div className="stat-icon-wrapper"><FiTarget /></div>
                    <div>
                        <h3>{loading ? '-' : dailyStats.total}</h3>
                        <p>Total Engineers Assigned</p>
                    </div>
                </div>
                <div className="stat-card success-gradient">
                    <div className="stat-icon-wrapper"><FiCheckCircle /></div>
                    <div>
                        <h3>{loading ? '-' : dailyStats.present}</h3>
                        <p>Present Today</p>
                    </div>
                </div>
                <div className="stat-card danger-gradient">
                    <div className="stat-icon-wrapper"><FiMinusCircle /></div>
                    <div>
                        <h3>{loading ? '-' : dailyStats.absent}</h3>
                        <p>Absent</p>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="table-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Engineer</th>
                            <th>Status</th>
                            <th>Arrival Time</th>
                            <th>Late Arrival</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Break Time</th>
                            <th>Duration</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.length === 0 ? (
                            <tr><td colSpan="11" className="empty-state">No records found for {date}</td></tr>
                        ) : (
                            records.map(r => {
                                const start = r.check_in_time ? new Date(r.check_in_time) : null;
                                const end = r.check_out_time ? new Date(r.check_out_time) : null;
                                const arrival = r.arrival_time ? new Date(r.arrival_time) : null;

                                let duration = '-';
                                if (start && end) {
                                    duration = `${((end - start) / 1000 / 3600).toFixed(1)} hrs`;
                                } else if (start) {
                                    duration = 'Active';
                                }

                                const formatBreakTime = (seconds) => {
                                    if (!seconds) return '0m';
                                    const mins = Math.floor(seconds / 60);
                                    if (mins < 60) return `${mins}m`;
                                    const hrs = (mins / 60).toFixed(1);
                                    return `${hrs}h`;
                                };

                                return (
                                    <tr key={r.id || r.engineer_id}>
                                        <td>
                                            <div className="user-info">
                                                <div className="avatar">{r.engineer_name?.charAt(0)}</div>
                                                <div>
                                                    <span className="name">{r.engineer_name}</span>
                                                    <span className="email">{r.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`status-badge ${r.status?.toLowerCase()}`}>{r.status}</span></td>
                                        <td className="mono-text">{arrival ? arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                        <td className="text-secondary">{r.late_time || '-'}</td>
                                        <td className="mono-text">{start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                        <td className="mono-text">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                        <td>{formatBreakTime(r.break_time)}</td>
                                        <td className={`duration ${duration === 'Active' ? 'text-green' : ''}`}>{duration}</td>
                                        <td>
                                            <button className="icon-btn" onClick={async () => {
                                                // Fetch monthly data for this specific engineer to show in modal
                                                try {
                                                    const currentYear = new Date().getFullYear();
                                                    const currentMonth = new Date().getMonth() + 1;

                                                    // We need to fetch monthly data to show the calendar
                                                    // Since we don't have it in daily view, we fetch it now
                                                    // Optimistically set a temp loading state or just fetch
                                                    setLoading(true);
                                                    const res = await fetch(`${API_BASE_URL}/attendance/monthly?year=${currentYear}&month=${currentMonth}`, { credentials: 'include' });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        if (Array.isArray(data)) {
                                                            const engData = data.find(e => e.email === r.email);
                                                            if (engData) {
                                                                setSelectedEngineer(engData);
                                                                setMonth(currentMonth);
                                                                setYear(currentYear);
                                                            } else {
                                                                alert("No monthly data found for this engineer.");
                                                            }
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}>
                                                <FiCalendar />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderMonthlyView = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const filtered = monthlyRecords.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="monthly-view-container fade-in">
                {/* Today's Pulse Ribbon */}
                {monthlyStats && (
                    <div className="pulse-ribbon">
                        <div className="pulse-header">
                            <FiActivity className="pulse-icon" />
                            <span>Today's Overview</span>
                        </div>
                        <div className="pulse-metrics">
                            <div className="p-metric present"><strong>{monthlyStats.present}</strong> Present</div>
                            <div className="p-metric absent"><strong>{monthlyStats.absent}</strong> Absent</div>
                            <div className="p-metric leave"><strong>{monthlyStats.leave}</strong> Leave</div>
                        </div>
                        <button className="jump-btn" onClick={() => {
                            if (tableContainerRef.current && todayColRef.current) {
                                todayColRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                            }
                        }}>
                            Jump to Today <FiArrowRight />
                        </button>
                    </div>
                )}

                <div className="table-card no-pad">
                    <div className="table-responsive" ref={tableContainerRef}>
                        <table className="grid-table">
                            <thead>
                                <tr>
                                    <th className="sticky-col col-1">#</th>
                                    <th className="sticky-col col-2">Engineer</th>
                                    {days.map(d => {
                                        const isToday = new Date().getDate() === d && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
                                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const isGlobalHoliday = PUBLIC_HOLIDAYS.includes(dateStr);
                                        // Header visual: mark Saturday and Sunday as weekend
                                        const dayOfWk = new Date(year, month - 1, d).getDay();
                                        const isWeekendHeader = dayOfWk === 0 || dayOfWk === 6;

                                        return (
                                            <th key={d} ref={isToday ? todayColRef : null} className={`day-col ${isToday ? 'today' : ''} ${isWeekendHeader ? 'sunday' : ''} ${isGlobalHoliday ? 'holiday' : ''}`}>
                                                <div className="d-num">{d}</div>
                                                {isToday && <div className="today-tag">Today</div>}
                                            </th>
                                        );
                                    })}
                                    <th className="stat-col">P</th>
                                    <th className="stat-col">A</th>
                                    <th className="stat-col">L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={days.length + 5} className="empty-state">No engineers found</td></tr>
                                ) : (
                                    filtered.map((r, idx) => {
                                        // Calculate row stats
                                        let p = 0, a = 0, l = 0;
                                        days.forEach(d => {
                                            const s = r.attendance[d];
                                            if (s === 'Present') p++;
                                            else if (s === 'Absent') a++;
                                            else if (s === 'Leave') l++;
                                            else if (s === 'Half Day') p += 0.5;
                                        });

                                        return (
                                            <tr key={r.id}>
                                                <td className="sticky-col col-1 center">{idx + 1}</td>
                                                <td className="sticky-col col-2 clickable" onClick={() => setSelectedEngineer(r)}>
                                                    <div className="user-compact">
                                                        <div className="avatar small">{r.name?.charAt(0)}</div>
                                                        <div className="details">
                                                            <span className="u-name">
                                                                {r.name}
                                                                <span title={getEngineerConfig(r.country || 'IN').name}>{getEngineerConfig(r.country || 'IN').flag}</span>
                                                            </span>
                                                            <span className="u-id">ID: #AIM-E-{r.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {days.map(d => {
                                                    const s = r.attendance[d];
                                                    const country = r.country || 'IN';
                                                    const isOff = isWeekend(year, month, d, country);
                                                    const isHoli = isPublicHoliday(year, month, d, country);
                                                    const isToday = new Date().getDate() === d && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

                                                    let cellClass = "";
                                                    let content = "";

                                                    if (s === 'Present') { cellClass = "present"; content = "P"; }
                                                    else if (s === 'Absent') { cellClass = "absent"; content = "A"; }
                                                    else if (s === 'Leave') { cellClass = "leave"; content = "L"; }
                                                    else if (s === 'Half Day') { cellClass = "half"; content = "H"; }
                                                    else if (isHoli) { cellClass = "holiday"; content = "H"; }
                                                    else if (isOff) { cellClass = "weekend"; content = "OFF"; }

                                                    return (
                                                        <td key={d} className={`grid-cell ${cellClass} ${isToday ? 'today-cell' : ''}`}>
                                                            {content}
                                                        </td>
                                                    );
                                                })}
                                                <td className="stat-cell">{p}</td>
                                                <td className="stat-cell">{a}</td>
                                                <td className="stat-cell">{l}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="legend-row">
                    <div className="l-item"><span className="dot present"></span> Present</div>
                    <div className="l-item"><span className="dot absent"></span> Absent</div>
                    <div className="l-item"><span className="dot leave"></span> Leave</div>
                    <div className="l-item"><span className="dot half"></span> Half Day</div>
                    <div className="l-item"><span className="dot weekend"></span> Week Off</div>
                    <div className="l-item"><span className="dot holiday"></span> Holiday</div>
                </div>
            </div>
        );
    };

    return (
        <div className="attendance-page-container">
            {/* Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Attendance Tracking</h1>
                    <p className="page-subtitle">Monitor daily check-ins and monthly attendance performance.</p>
                </div>
                <div className="view-switcher" style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="tickets-primary-btn"
                        style={{ height: '40px', padding: '0 15px', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                        onClick={() => window.location.href = `${API_BASE_URL}/reports/attendance/export`}
                    >
                        <FiDownload /> Export
                    </button>
                    <button className={viewMode === 'daily' ? 'active' : ''} onClick={() => setViewMode('daily')}>Daily</button>
                    <button className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>Monthly</button>
                </div>
            </header>

            {/* Controls */}
            <div className="controls-bar">
                {viewMode === 'daily' ? (
                    <div className="date-controller">
                        <button className="icon-btn" onClick={() => {
                            const d = new Date(date); d.setDate(d.getDate() - 1);
                            setDate(d.toISOString().split('T')[0]);
                        }}><FiChevronLeft /></button>

                        <div className="date-display">
                            <FiCalendar />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>

                        <button className="icon-btn" onClick={() => {
                            const d = new Date(date); d.setDate(d.getDate() + 1);
                            setDate(d.toISOString().split('T')[0]);
                        }}><FiChevronRight /></button>

                        <button className="today-btn" onClick={() => setDate(new Date().toISOString().split('T')[0])}>Today</button>
                    </div>
                ) : (
                    <div className="month-controller">
                        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="search-wrapper">
                            <FiSearch />
                            <input type="text" placeholder="Search engineer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {/* Error / Loading */}
            {error && <div className="error-banner"><FiAlertCircle /> {error}</div>}

            {/* Content */}
            <div className="page-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading attendance data...</p>
                    </div>
                ) : (
                    viewMode === 'daily' ? renderDailyView() : renderMonthlyView()
                )}
            </div>

            {/* Engineer Modal */}
            {selectedEngineer && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <div className="modal-header">
                            <div>
                                <h2>{selectedEngineer.name}</h2>
                                <p>Attendance ID: #AIM-E-{selectedEngineer.id} • {getEngineerConfig(selectedEngineer.country || 'IN').name}</p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedEngineer(null)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="calendar-grid-view">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-head">{d}</div>)}
                                {/* Empty slots for start of month */}
                                {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => <div key={`e-${i}`} className="cal-cell empty"></div>)}

                                {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1).map(d => {
                                    const s = selectedEngineer.attendance[d];
                                    const isOff = isWeekend(year, month, d, selectedEngineer.country || 'IN');
                                    const isHoli = isPublicHoliday(year, month, d, selectedEngineer.country || 'IN');

                                    let statusClass = "";
                                    let label = "";
                                    if (s === 'Present') { statusClass = 'present'; label = 'P'; }
                                    else if (s === 'Absent') { statusClass = 'absent'; label = 'A'; }
                                    else if (s === 'Leave') { statusClass = 'leave'; label = 'L'; }
                                    else if (s === 'Half Day') { statusClass = 'half'; label = 'H'; }
                                    else if (isHoli) { statusClass = 'holiday'; label = 'H'; }
                                    else if (isOff) { statusClass = 'weekend'; label = 'OFF'; }

                                    return (
                                        <div key={d} className={`cal-cell ${statusClass}`}>
                                            <span className="cal-date">{d}</span>
                                            {label && <span className="cal-status">{label}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
