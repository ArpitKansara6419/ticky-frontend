import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiUserCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AttendancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

    const currentUserEmail = user?.email;

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
        setDate(new Date().toISOString().split('T')[0]);
        setMonth(new Date().getMonth() + 1);
        setYear(new Date().getFullYear());
    };

    const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
    const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

    const filteredMonthly = monthlyRecords.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const presentCount = records.filter(r => r.status === 'Present').length;

    const renderDailyTable = () => (
        <table className="premium-table">
            <thead>
                <tr>
                    <th>Engineer</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Duration</th>
                </tr>
            </thead>
            <tbody>
                {records.length === 0 ? (
                    <tr><td colSpan="5" className="table-empty">No attendance records for this date.</td></tr>
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
                                        <span className="engineer-name">{r.engineer_name}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="time-cell">{start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className="time-cell">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className={`duration-cell ${duration === 'Active Now' ? 'active' : ''}`}>
                                    {duration}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );

    const renderMonthlyTable = () => (
        <div className="monthly-grid-container">
            <table className="monthly-grid-table">
                <thead>
                    <tr>
                        <th className="sticky-col first-col">SR NO.</th>
                        <th className="sticky-col second-col">ENGINEER</th>
                        <th className="sticky-col third-col">JOB TYPE</th>
                        {days.map(d => <th key={d} className="day-col">{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {filteredMonthly.length === 0 ? (
                        <tr><td colSpan={days.length + 3} className="table-empty">No engineers found.</td></tr>
                    ) : (
                        filteredMonthly.map((r, idx) => (
                            <tr key={r.id} className={r.email === currentUserEmail ? 'is-current-user' : ''}>
                                <td className="sticky-col first-col center-text">{idx + 1}</td>
                                <td className="sticky-col second-col">
                                    <div className="engineer-profile-sm">
                                        {r.avatar_url ?
                                            <img src={r.avatar_url} alt="" className="avatar-img" /> :
                                            <div className="avatar-placeholder">{r.name?.charAt(0)}</div>
                                        }
                                        <div className="eng-details">
                                            <span className="engineer-name">{r.name}</span>
                                            <span className="engineer-id-small">ENG-{r.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="sticky-col third-col">{r.employment_type}</td>
                                {days.map(d => {
                                    const status = r.attendance[d];
                                    let char = '-';
                                    let statusClass = 'empty';

                                    if (status === 'Present') { char = 'P'; statusClass = 'present'; }
                                    else if (status === 'Absent') { char = 'A'; statusClass = 'absent'; }
                                    else if (status === 'Leave') { char = 'L'; statusClass = 'leave'; }
                                    else if (status === 'Half Day') { char = 'H'; statusClass = 'half'; }

                                    return (
                                        <td key={d} className={`day-cell ${statusClass}`}>
                                            {char}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
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
                        {viewMode === 'daily' ? 'Daily check-in and working hours.' : 'Monthly attendance overview grid.'}
                    </p>
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
                    <div className="att-table-wrapper">
                        {viewMode === 'daily' ? renderDailyTable() : renderMonthlyTable()}
                    </div>
                )}
            </div>
        </section>
    );
};

export default AttendancePage;
