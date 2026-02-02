import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiTrendingUp, FiDollarSign, FiCalendar, FiDownload, FiSearch, FiFilter, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import './SampleReportsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SampleReportsPage = () => {
    const [stats, setStats] = useState({
        totalResolved: 0,
        totalRevenue: '0.00',
        currentMonthRevenue: '0.00',
        activeLeads: 0
    });
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const [statsRes, ticketsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/insights/stats`, { credentials: 'include' }),
                    fetch(`${API_BASE_URL}/tickets`, { credentials: 'include' })
                ]);

                const statsData = await statsRes.json();
                const ticketsData = await ticketsRes.json();

                if (statsRes.ok) setStats(statsData);
                if (ticketsRes.ok) {
                    const resolved = (ticketsData.tickets || [])
                        .filter(t => t.status === 'Resolved')
                        .slice(0, 10);
                    setRecentJobs(resolved);
                }
            } catch (err) {
                console.error('Failed to load report data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReportData();
    }, []);

    return (
        <div className="reports-container fade-in">
            <header className="reports-header-section">
                <div>
                    <h2 className="section-title">Business Analytics &amp; Reports</h2>
                    <p className="section-subtitle">Deep dive into your operational performance and revenue metrics.</p>
                </div>
                <div className="reports-actions">
                    <button className="btn-wow-secondary"><FiFilter /> Global Filters</button>
                    <button
                        className="btn-wow-primary"
                        onClick={() => window.location.href = `${API_BASE_URL}/reports/tickets/export`}
                    >
                        <FiDownload /> Export Full Report
                    </button>
                </div>
            </header>

            {/* Performance Tiles */}
            <div className="report-tiles-grid">
                <div className="report-tile">
                    <div className="tile-icon icon-rev"><FiDollarSign /></div>
                    <div className="tile-info">
                        <label>Lifetime Revenue</label>
                        <h3>€ {stats.totalRevenue}</h3>
                        <span className="trend-up"><FiTrendingUp /> Healthy Pipeline</span>
                    </div>
                </div>
                <div className="report-tile">
                    <div className="tile-icon icon-job"><FiCheckCircle /></div>
                    <div className="tile-info">
                        <label>Jobs Completed</label>
                        <h3>{stats.totalResolved}</h3>
                        <span className="trend-up">Full Resolution</span>
                    </div>
                </div>
                <div className="report-tile">
                    <div className="tile-icon icon-wait"><FiClock /></div>
                    <div className="tile-info">
                        <label>Monthly Earnings</label>
                        <h3>€ {stats.currentMonthRevenue}</h3>
                        <span className="trend-label">Current Period</span>
                    </div>
                </div>
                <div className="report-tile">
                    <div className="tile-icon icon-pipeline"><FiBarChart2 /></div>
                    <div className="tile-info">
                        <label>Pipeline Leads</label>
                        <h3>{stats.activeLeads}</h3>
                        <span className="trend-label">Potential conversions</span>
                    </div>
                </div>
            </div>

            {/* Revenue Distribution Chart Area (Placeholder for Visual) */}
            <div className="analytics-major-split">
                <div className="analytics-card chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Earnings Trend (Monthly)</h3>
                    </div>
                    <div className="chart-visual-placeholder">
                        <div className="bar-grid">
                            {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                <div key={i} className="bar-wrapper" title={`Month ${i + 1}: €${h * 100}`}>
                                    <div className="bar" style={{ height: `${h}%` }}></div>
                                    <span className="bar-label">M{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="analytics-card recent-activity">
                    <div className="card-header">
                        <h3 className="card-title">Latest Revenue Instances</h3>
                    </div>
                    <div className="activity-list">
                        {recentJobs.length === 0 ? (
                            <div className="empty-activity">No resolved jobs found.</div>
                        ) : (
                            recentJobs.map(job => (
                                <div key={job.id} className="activity-item">
                                    <div className="act-icon"><FiFileText /></div>
                                    <div className="act-details">
                                        <p className="act-msg"><strong>AIM-T-{job.id}</strong>: {job.taskName}</p>
                                        <span className="act-time">{job.engineerName} • {job.billingType}</span>
                                    </div>
                                    <div className="act-value">+€{job.totalCost || '0.00'}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="analytics-card table-section">
                <div className="card-header-with-tools">
                    <h3 className="card-title">Billing Breakdown Report</h3>
                    <div className="table-search">
                        <FiSearch />
                        <input type="text" placeholder="Search by job ID or client..." />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="wow-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Task Detail</th>
                                <th>Client</th>
                                <th>Engineer</th>
                                <th>Billing Type</th>
                                <th>Total Cost</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentJobs.map(job => (
                                <tr key={job.id}>
                                    <td><strong>#AIM-T-{job.id}</strong></td>
                                    <td>{job.taskName}</td>
                                    <td>{job.clientName || 'N/A'}</td>
                                    <td>{job.engineerName}</td>
                                    <td><span className="badge-outline">{job.billingType || 'Hourly'}</span></td>
                                    <td className="text-bold">€ {job.totalCost || '0.00'}</td>
                                    <td><span className="status-pill status-resolved">{job.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SampleReportsPage;
