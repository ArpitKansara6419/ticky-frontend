import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiCalendar, FiClock, FiUser, FiUserCheck, FiChevronLeft, FiChevronRight, FiActivity, FiArrowRight, FiX, FiCheckCircle, FiMinusCircle, FiTarget } from 'react-icons/fi';
import './AttendancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Hardcoded Public Holidays for Header Highlighting (Sync with Mobile)
const PUBLIC_HOLIDAYS = [
    '2026-01-26', // Republic Day
    '2026-03-08', // Maha Shivaratri
    '2026-03-25', // Holi
    '2026-04-11', // Eid ul-Fitr
    '2026-04-14', // Ambedkar Jayanti
    '2026-04-21', // Ram Navami
    '2026-05-01', // May Day
    '2026-08-15', // Independence Day
    '2026-08-26', // Janmashtami
    '2026-10-02', // Gandhi Jayanti
    '2026-10-12', // Dussehra
    '2026-10-31', // Diwali
    '2026-11-01', // Diwali (Day 2)
    '2026-12-25', // Christmas
];

// AttendancePage.jsx - Global Edition
import { FiInfo, FiGlobe } from 'react-icons/fi';

// Country Configurations (Holidays & Weekends)
const COUNTRY_CONFIG = {
    'IN': {
        name: 'India',
        flag: '🇮🇳',
        weekend: [0], // Sunday
        holidays: ['2026-01-26', '2026-08-15', '2026-10-02', '2026-10-31', '2026-12-25']
    },
    'US': {
        name: 'USA',
        flag: '🇺🇸',
        weekend: [0, 6], // Sat, Sun
        holidays: ['2026-01-01', '2026-07-04', '2026-11-26', '2026-12-25']
    },
    'GB': {
        name: 'UK',
        flag: '🇬🇧',
        weekend: [0, 6],
        holidays: ['2026-01-01', '2026-12-25', '2026-12-26']
    },
    'AE': {
        name: 'UAE',
        flag: '🇦🇪',
        weekend: [5, 6], // Fri, Sat (Traditional) or Sat, Sun (Modern) - using Fri/Sat for demo variety
        holidays: ['2026-12-02']
    },
    'DEFAULT': {
        name: 'Global',
        flag: '🌍',
        weekend: [0],
        holidays: []
    }
};

const AttendancePage = ({ user }) => {
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [records, setRecords] = useState([]);
    const [monthlyRecords, setMonthlyRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEngineer, setSelectedEngineer] = useState(null); // For individual calendar view

    const tableContainerRef = useRef(null);
    const todayColRef = useRef(null);

    const currentUserEmail = user?.email;

    // Auto-scroll to today in monthly view
    useEffect(() => {
        if (viewMode === 'monthly' && !loading && tableContainerRef.current && todayColRef.current) {
            setTimeout(() => {
                const container = tableContainerRef.current;
                const todayHeader = todayColRef.current;
                const containerWidth = container.offsetWidth;
                const scrollLeft = todayHeader.offsetLeft - (containerWidth / 2) + (todayHeader.offsetWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }, 500);
        }
    }, [viewMode, loading, monthlyRecords]);

    // Calculate Today's Stats from Monthly Data
    const todayStats = useMemo(() => {
        if (viewMode !== 'monthly') return null;
        const currentDay = new Date().getDate();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        if (month !== currentMonth || year !== currentYear) return null;

        let present = 0, absent = 0, leave = 0, onHold = 0;
        monthlyRecords.forEach(r => {
            const status = r.attendance[currentDay];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
            else if (status === 'Half Day') present += 0.5;
            else onHold++;
        });

        return { present, absent, leave, total: monthlyRecords.length };
    }, [monthlyRecords, month, year, viewMode]);

    useEffect(() => {
        if (viewMode === 'daily') {
            fetchAttendance();
        } else {
            fetchMonthlyAttendance();
        }
    }, [date, month, year, viewMode]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE_URL}/attendance?date=${date}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(Array.isArray(data) ? data : []);
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch attendance data');
            }
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyAttendance = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE_URL}/attendance/monthly?year=${year}&month=${month}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setMonthlyRecords(Array.isArray(data) ? data : []);
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch monthly data');
            }
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        const today = new Date();
        setDate(today.toISOString().split('T')[0]);
        setMonth(today.getMonth() + 1);
        setYear(today.getFullYear());
    };

    const getEngineerConfig = (countryCode) => {
        return COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['DEFAULT'];
    };

    const isWeekend = (y, m, d, countryCode = 'IN') => {
        const dateObj = new Date(y, m - 1, d);
        const day = dateObj.getDay();
        const config = getEngineerConfig(countryCode);
        return config.weekend.includes(day);
    };

    const isPublicHoliday = (y, m, d, countryCode = 'IN') => {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const config = getEngineerConfig(countryCode);
        return config.holidays.includes(dateStr);
    };

    const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
    const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

    const filteredMonthly = monthlyRecords.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const presentCount = records.filter(r => r.status === 'Present').length;

    const renderDailyTable = () => (
        <div className="daily-view-premium">
            <div className="daily-status-banner">
                <div className="banner-item">
                    <FiCheckCircle className="icon present" />
                    <div className="details">
                        <span className="label">Present</span>
                        <span className="value">{presentCount}</span>
                    </div>
                </div>
                <div className="banner-item">
                    <FiMinusCircle className="icon absent" />
                    <div className="details">
                        <span className="label">Absent</span>
                        <span className="value">{records.filter(r => r.status === 'Absent').length}</span>
                    </div>
                </div>
                <div className="banner-item">
                    <FiTarget className="icon total" />
                    <div className="details">
                        <span className="label">Scheduled</span>
                        <span className="value">{records.length}</span>
                    </div>
                </div>
            </div>

            <table className="premium-table modern">
                <thead>
                    <tr>
                        <th>Engineer Profile</th>
                        <th>Attendance Status</th>
                        <th>Timing Log</th>
                        <th>Work Duration</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {records.length === 0 ? (
                        <tr><td colSpan="5" className="table-empty">No attendance records for {new Date(date).toLocaleDateString()}.</td></tr>
                    ) : (
                        records.map(r => {
                            const start = r.check_in_time ? new Date(r.check_in_time) : null;
                            const end = r.check_out_time ? new Date(r.check_out_time) : null;
                            let duration = '-';
                            if (start && end) {
                                const diff = (end - start) / 1000 / 3600;
                                duration = `${diff.toFixed(1)} hrs`;
                            } else if (start) {
                                duration = 'Active Now';
                            }

                            return (
                                <tr key={r.id} className={r.email === currentUserEmail ? 'is-current-user' : ''}>
                                    <td>
                                        <div className="engineer-profile-sm">
                                            {r.avatar_url ?
                                                <img src={r.avatar_url} alt="" className="avatar-img" /> :
                                                <div className="avatar-placeholder">{r.engineer_name?.charAt(0)}</div>
                                            }
                                            <div className="eng-text-info">
                                                <span className="engineer-name">
                                                    {r.engineer_name}
                                                    <span className="country-flag" title={`Based in ${getEngineerConfig(r.country).name}`}>
                                                        {getEngineerConfig(r.country || 'IN').flag}
                                                    </span>
                                                </span>
                                                <span className="engineer-email-small">{r.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-pill modern status-pill--${r.status.toLowerCase()}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="timing-log">
                                            <span className="time in">In: {start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                            <span className="time out">Out: {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                        </div>
                                    </td>
                                    <td className={`duration-cell ${duration === 'Active Now' ? 'active' : ''}`}>
                                        {duration}
                                    </td>
                                    <td>
                                        <button className="view-log-btn" onClick={() => {
                                            const engData = monthlyRecords.find(m => m.email === r.email);
                                            if (engData) setSelectedEngineer(engData);
                                        }}>
                                            Full Calendar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderMonthlyTable = () => (
        <div className="monthly-grid-container" ref={tableContainerRef}>
            <table className="monthly-grid-table">
                <thead>
                    <tr>
                        <th className="sticky-col first-col">SR NO.</th>
                        <th className="sticky-col second-col">ENGINEER</th>
                        <th className="sticky-col third-col">JOB TYPE</th>
                        {days.map(d => {
                            const dateObj = new Date(year, month - 1, d);
                            const isToday = new Date().toDateString() === dateObj.toDateString();
                            const isSunday = dateObj.getDay() === 0;
                            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isHoliday = PUBLIC_HOLIDAYS.includes(dateStr);

                            return (
                                <th
                                    key={d}
                                    ref={isToday ? todayColRef : null}
                                    className={`day-col ${isToday ? 'is-today' : ''} ${isSunday ? 'is-sunday' : ''} ${isHoliday ? 'is-holiday' : ''}`}
                                >
                                    {d}
                                    {isToday && <span className="today-badge">Today</span>}
                                </th>
                            );
                        })}
                        <th className="summary-col present">P</th>
                        <th className="summary-col absent">A</th>
                        <th className="summary-col leave">L</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMonthly.length === 0 ? (
                        <tr><td colSpan={days.length + 6} className="table-empty">No engineers found.</td></tr>
                    ) : (
                        filteredMonthly.map((r, idx) => {
                            let pCount = 0, aCount = 0, lCount = 0;
                            days.forEach(d => {
                                const status = r.attendance[d];
                                if (status === 'Present') pCount++;
                                else if (status === 'Absent') aCount++;
                                else if (status === 'Leave') lCount++;
                                else if (status === 'Half Day') pCount += 0.5;
                            });

                            return (
                                <tr key={r.id} className={r.email === currentUserEmail ? 'is-current-user' : ''}>
                                    <td className="sticky-col first-col center-text">{idx + 1}</td>
                                    <td className="sticky-col second-col">
                                        <div className="engineer-profile-sm">
                                            {r.avatar_url ?
                                                <img src={r.avatar_url} alt="" className="avatar-img" /> :
                                                <div className="avatar-placeholder">{r.name?.charAt(0)}</div>
                                            }
                                            <div className="eng-details pointer" onClick={() => setSelectedEngineer(r)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="engineer-name">{r.name}</span>
                                                    <span title={getEngineerConfig(r.country || 'IN').name}>{getEngineerConfig(r.country || 'IN').flag}</span>
                                                </div>
                                                <span className="engineer-id-small">#AIM-E-{r.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="sticky-col third-col">{r.employment_type}</td>
                                    {days.map(d => {
                                        const countryCode = r.country || 'IN'; // Default to IN if missing
                                        const status = r.attendance[d];
                                        const dateObj = new Date(year, month - 1, d);
                                        const isToday = new Date().toDateString() === dateObj.toDateString();
                                        const isSun = isWeekend(year, month, d, countryCode);
                                        const isHoli = isPublicHoliday(year, month, d, countryCode);

                                        let char = '-';
                                        let statusClass = 'empty';

                                        if (status === 'Present') { char = 'P'; statusClass = 'present'; }
                                        else if (status === 'Absent') { char = 'A'; statusClass = 'absent'; }
                                        else if (status === 'Leave') { char = 'L'; statusClass = 'leave'; }
                                        else if (status === 'Half Day') { char = 'H'; statusClass = 'half'; }
                                        else if (isSun) { char = 'OFF'; statusClass = 'weekoff'; }
                                        else if (isHoli) { char = 'H'; statusClass = 'holiday'; }

                                        return (
                                            <td key={d} className={`day-cell ${statusClass} ${isToday ? 'is-today' : ''}`}>
                                                {char}
                                            </td>
                                        );
                                    })}
                                    <td className="summary-cell present">{pCount}</td>
                                    <td className="summary-cell absent">{aCount}</td>
                                    <td className="summary-cell leave">{lCount}</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <section className="dashboard-section attendance-page">
            <header className="dashboard-header-row">
                <div>
                    <h2 className="section-title">Engineer Attendance</h2>
                    <p className="section-subtitle">
                        {viewMode === 'daily' ? 'Daily check-in and working hours.' : 'Monthly attendance with global holiday tracking.'}
                    </p>
                    <div className="info-badge">
                        <FiGlobe /> <span>Location-based Holidays Active</span>
                    </div>
                </div>

                <div className="attendance-view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
                        onClick={() => setViewMode('daily')}
                    >
                        Daily View
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                        onClick={() => setViewMode('monthly')}
                    >
                        Monthly View
                    </button>
                </div>
            </header>

            <div className="attendance-controls section-spacer">
                {viewMode === 'daily' ? (
                    <>
                        <div className="date-navigation">
                            <button onClick={handlePrevDay} className="nav-btn"><FiChevronLeft /></button>
                            <button onClick={handleToday} className="today-btn">Today</button>
                            <button onClick={handleNextDay} className="nav-btn"><FiChevronRight /></button>
                        </div>
                        <div className="date-picker-custom">
                            <FiCalendar className="calendar-icon" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    <div className="monthly-controls">
                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="control-select">
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="control-select">
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <div className="search-box-custom">
                            <input
                                type="text"
                                placeholder="Search engineer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {viewMode === 'monthly' && todayStats && (
                <div className="today-overview-ribbon section-spacer">
                    <div className="ribbon-content">
                        <div className="ribbon-label">
                            <FiActivity className="ribbon-icon" />
                            <span>Today's Pulse</span>
                        </div>
                        <div className="ribbon-stats">
                            <div className="r-stat present"><strong>{todayStats.present}</strong> Present</div>
                            <div className="r-stat absent"><strong>{todayStats.absent}</strong> Absent</div>
                            <div className="r-stat leave"><strong>{todayStats.leave}</strong> Leave</div>
                        </div>
                        <button
                            className="jump-today-btn"
                            onClick={() => {
                                const container = tableContainerRef.current;
                                const todayHeader = todayColRef.current;
                                if (container && todayHeader) {
                                    const scrollLeft = todayHeader.offsetLeft - (container.offsetWidth / 2) + (todayHeader.offsetWidth / 2);
                                    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                                }
                            }}
                        >
                            Jump to Today <FiArrowRight />
                        </button>
                    </div>
                </div>
            )}

            {viewMode === 'daily' && (
                <div className="attendance-stats-grid section-spacer">
                    <div className="att-stat-card premium-card">
                        <div className="stat-icon present"><FiUserCheck /></div>
                        <div className="stat-info">
                            <h3>{loading ? '...' : presentCount}</h3>
                            <p>Engineers Present</p>
                        </div>
                    </div>
                    <div className="att-stat-card premium-card">
                        <div className="stat-icon loading"><FiClock /></div>
                        <div className="stat-info">
                            <h3>{loading ? '...' : records.length}</h3>
                            <p>Total Scheduled</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-card-full">
                {loading ? (
                    <div className="loader-container">
                        <div className="spinner"></div>
                        <p>Fetching attendance records...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p className="error-message">{error}</p>
                        <button onClick={viewMode === 'daily' ? fetchAttendance : fetchMonthlyAttendance} className="retry-btn">Retry</button>
                    </div>
                ) : (
                    <>
                        <div className="att-table-wrapper">
                            {viewMode === 'daily' ? renderDailyTable() : renderMonthlyTable()}
                        </div>
                        {viewMode === 'monthly' && (
                            <div className="attendance-legend section-spacer">
                                <div className="legend-item"><span className="legend-box present">P</span> Present</div>
                                <div className="legend-item"><span className="legend-box absent">A</span> Absent</div>
                                <div className="legend-item"><span className="legend-box leave">L</span> Leave</div>
                                <div className="legend-item"><span className="legend-box half">H</span> Half Day</div>
                                <div className="legend-item"><span className="legend-box weekoff">OFF</span> Week Off</div>
                                <div className="legend-item"><span className="legend-box holiday">H</span> Public Holiday</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedEngineer && (
                <div className="modal-overlay active">
                    <div className="engineer-calendar-modal">
                        <header className="modal-header">
                            <div className="header-left">
                                <div className="avatar-placeholder big">{selectedEngineer.name?.charAt(0)}</div>
                                <div>
                                    <h3>{selectedEngineer.name}'s Attendance</h3>
                                    <p>{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1]} {year}</p>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setSelectedEngineer(null)}><FiX /></button>
                        </header>

                        <div className="modal-body">
                            <div className="calendar-grid">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="calendar-day-header">{day}</div>
                                ))}
                                {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className="calendar-cell empty"></div>
                                ))}
                                {days.map(d => {
                                    const countryCode = selectedEngineer.country || 'IN';
                                    const status = selectedEngineer.attendance[d];
                                    const weekend = isWeekend(year, month, d, countryCode);
                                    const holiday = isPublicHoliday(year, month, d, countryCode);
                                    const isToday = new Date().getDate() === d && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

                                    return (
                                        <div key={d} className={`calendar-cell ${isToday ? 'is-today' : ''} ${weekend ? 'weekend' : ''} ${holiday ? 'holiday' : ''}`}>
                                            <span className="day-num">{d}</span>
                                            <div className="status-indicator">
                                                {status === 'Present' && <span className="p-dot present">P</span>}
                                                {status === 'Absent' && <span className="p-dot absent">A</span>}
                                                {status === 'Leave' && <span className="p-dot leave">L</span>}
                                                {status === 'Half Day' && <span className="p-dot half">H</span>}
                                                {!status && weekend && <span className="p-dot weekoff">OFF</span>}
                                                {!status && holiday && <span className="p-dot holi">H</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="modal-footer-stats">
                                <div className="f-stat"><FiCheckCircle color="#16a34a" /> <span>Present: <strong>{
                                    Object.values(selectedEngineer.attendance).filter(v => v === 'Present').length +
                                    (Object.values(selectedEngineer.attendance).filter(v => v === 'Half Day').length * 0.5)
                                }</strong></span></div>
                                <div className="f-stat"><FiMinusCircle color="#e11d48" /> <span>Absent: <strong>{Object.values(selectedEngineer.attendance).filter(v => v === 'Absent').length}</strong></span></div>
                                <div className="f-stat"><FiCalendar color="#ca8a04" /> <span>Leave: <strong>{Object.values(selectedEngineer.attendance).filter(v => v === 'Leave').length}</strong></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AttendancePage;
