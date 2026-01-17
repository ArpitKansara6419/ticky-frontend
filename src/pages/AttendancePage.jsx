import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiUserCheck } from 'react-icons/fi';
import './AttendancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AttendancePage = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, [date]);

    const fetchAttendance = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/attendance?date=${date}`);
            if (res.ok) setRecords(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="attendance-page">
            <header className="attendance-header">
                <div className="attendance-title">
                    <h2>Engineer Attendance</h2>
                    <p style={{ marginTop: '4px', color: '#718096' }}>Track daily check-ins and working hours.</p>
                </div>
                <div className="date-picker-container">
                    <FiCalendar color="#718096" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
            </header>

            <div className="attendance-stats">
                <div className="att-stat-card">
                    <div style={{ color: '#38a169', marginBottom: '10px' }}><FiUserCheck size={28} /></div>
                    <h3>{records.filter(r => r.status === 'Present').length}</h3>
                    <p>Present Today</p>
                </div>
            </div>

            <div className="att-table-container">
                <table className="att-table">
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
                        {records.map(r => {
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
                                <tr key={r.id}>
                                    <td>
                                        <div className="engineer-cell">
                                            {r.avatar_url ?
                                                <img src={r.avatar_url} className="engineer-avatar-sm" alt="" /> :
                                                <div className="engineer-avatar-sm">{r.engineer_name?.charAt(0)}</div>
                                            }
                                            <span style={{ fontWeight: 600 }}>{r.engineer_name}</span>
                                        </div>
                                    </td>
                                    <td><span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                                    <td style={{ fontFamily: 'monospace' }}>{start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td style={{ fontWeight: 600, color: duration === 'Active Now' ? '#38a169' : '#2d3748' }}>{duration}</td>
                                </tr>
                            );
                        })}
                        {records.length === 0 && !loading && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>No attendance records for this date.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendancePage;
