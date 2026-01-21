import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiUserCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AttendancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AttendancePage = ({ user }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const currentUserEmail = user?.email;

    useEffect(() => {
        fetchAttendance();
    }, [date]);

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
    };

    const presentCount = records.filter(r => r.status === 'Present').length;

    return (
        <section className="dashboard-section attendance-page">
            <header className="dashboard-header-row">
                <div>
                    <h2 className="section-title">Engineer Attendance</h2>
                    <p className="section-subtitle">Track daily check-ins and working hours across your team.</p>
                </div>

                <div className="attendance-controls">
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
                </div>
            </header>

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

            <div className="dashboard-card-full">
                <div className="att-table-wrapper">
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
                            {loading ? (
                                <tr><td colSpan="5" className="table-loader">Loading attendance records...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="5" className="table-error">{error}</td></tr>
                            ) : records.length === 0 ? (
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
                </div>
            </div>
        </section>
    );
};

export default AttendancePage;
