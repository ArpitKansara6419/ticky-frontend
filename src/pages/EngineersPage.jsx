
import React, { useEffect, useState } from 'react'
import { FiSearch, FiEye, FiEdit2, FiTrash2, FiArrowLeft, FiSave, FiCheck, FiX, FiBriefcase, FiDollarSign, FiClock, FiCalendar } from 'react-icons/fi'
import './EngineersPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const TAB_STYLE = {
    padding: '12px 24px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontWeight: '500',
    color: '#64748b',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const TAB_ACTIVE_STYLE = {
    ...TAB_STYLE,
    borderBottom: '2px solid #2563eb',
    color: '#2563eb',
    fontWeight: '700'
};

function EngineersPage() {
    // View State: 'list' or 'details'
    const [viewMode, setViewMode] = useState('list');
    const [selectedEngineer, setSelectedEngineer] = useState(null);

    // List State
    const [engineers, setEngineers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // Details State
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'tickets', 'charges'
    const [engTickets, setEngTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Charges Form State
    const [chargesForm, setChargesForm] = useState({
        jobType: 'Full Time',
        jobTitle: '',
        startDate: '',
        checkInTime: '',
        checkOutTime: '',
        currency: 'USD',
        hourlyRate: '',
        halfDayRate: '',
        fullDayRate: '',
        agreedRate: '',
        overtimeRate: '',
        oohRate: '',
        weekendRate: '',
        holidayRate: '',
        city: ''
    });
    const [savingCharges, setSavingCharges] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // New Profile Features State
    const [rtwData, setRtwData] = useState({
        visaType: '',
        documentUrl: '',
        documentName: '',
        issueDate: '',
        expiryDate: '',
        notes: ''
    });
    const [travelData, setTravelData] = useState({
        passportNumber: '',
        passportExpiry: '',
        passportCountry: '',
        drivingLicense: '',
        drivingLicenseExpiry: '',
        vehicleType: '',
        willingToTravel: 'Yes',
        travelRadius: '',
        preferredTransport: '',
        notes: ''
    });
    const [skillsData, setSkillsData] = useState([]);
    const [experienceData, setExperienceData] = useState([]);

    const [savingRTW, setSavingRTW] = useState(false);
    const [savingTravel, setSavingTravel] = useState(false);
    const [savingSkills, setSavingSkills] = useState(false);
    const [savingExp, setSavingExp] = useState(false);

    useEffect(() => {
        fetchEngineers()
    }, [])

    // Fetch basic list
    const fetchEngineers = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_BASE_URL}/engineers`, { credentials: 'include' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Unable to load engineers')

            const sorted = (data.engineers || []).sort((a, b) => a.id - b.id)
            setEngineers(sorted)

            // Auto-select first engineer to show Tabs immediately (User Request)
            if (sorted.length > 0) {
                // We use a timeout to let the state update loop finish or simply call logic directly
                const firstEng = sorted[0];
                setSelectedEngineer(firstEng);
                setViewMode('details');
                setActiveTab('profile');

                // Trigger background fetches
                fetchEngineerDetails(firstEng.id);
                fetchEngineerTickets(firstEng.id);
                fetchAdditionalDetails(firstEng.id);
            }

        } catch (err) {
            console.error('Load engineers error', err)
            setError(err.message || 'Unable to load engineers')
        } finally {
            setLoading(false)
        }
    }

    // Fetch full details when entering Details view
    const fetchEngineerDetails = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const eng = data.engineer;
                setSelectedEngineer(eng);

                // Populate Form
                setChargesForm({
                    jobType: eng.employmentType || 'Full Time',
                    jobTitle: eng.jobTitle || '',
                    startDate: eng.startDate ? eng.startDate.split('T')[0] : '',
                    checkInTime: eng.checkInTime ? eng.checkInTime.slice(0, 5) : '',
                    checkOutTime: eng.checkOutTime ? eng.checkOutTime.slice(0, 5) : '',
                    currency: eng.currency || 'USD',
                    hourlyRate: eng.hourlyRate || '',
                    halfDayRate: eng.halfDayRate || '',
                    fullDayRate: eng.fullDayRate || '',
                    agreedRate: eng.agreedRate || '',
                    overtimeRate: eng.overtimeRate || '',
                    oohRate: eng.oohRate || '',
                    weekendRate: eng.weekendRate || '',
                    holidayRate: eng.holidayRate || '',
                    city: eng.city || ''
                });
            }
        } catch (e) { console.error(e); }
    };

    const fetchEngineerTickets = async (id) => {
        setLoadingTickets(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tickets?engineerId=${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEngTickets(data.tickets || []);
            }
        } catch (e) { console.error(e); }
        setLoadingTickets(false);
    };

    const fetchAdditionalDetails = async (id) => {
        try {
            const [rtwRes, travelRes, skillsRes, expRes] = await Promise.all([
                fetch(`${API_BASE_URL}/engineers/${id}/right-to-work`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/engineers/${id}/travel-details`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/engineers/${id}/skills`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/engineers/${id}/experience`, { credentials: 'include' })
            ]);

            if (rtwRes.ok) {
                const data = await rtwRes.json();
                if (data.rightToWork) {
                    setRtwData({
                        ...data.rightToWork,
                        issueDate: data.rightToWork.issue_date ? data.rightToWork.issue_date.split('T')[0] : '',
                        expiryDate: data.rightToWork.expiry_date ? data.rightToWork.expiry_date.split('T')[0] : '',
                        visaType: data.rightToWork.visa_type || '',
                        documentUrl: data.rightToWork.document_url || '',
                        documentName: data.rightToWork.document_name || ''
                    });
                } else {
                    setRtwData({ visaType: '', documentUrl: '', documentName: '', issueDate: '', expiryDate: '', notes: '' });
                }
            }

            if (travelRes.ok) {
                const data = await travelRes.json();
                if (data.travelDetails) {
                    setTravelData({
                        ...data.travelDetails,
                        passportExpiry: data.travelDetails.passport_expiry ? data.travelDetails.passport_expiry.split('T')[0] : '',
                        drivingLicenseExpiry: data.travelDetails.driving_license_expiry ? data.travelDetails.driving_license_expiry.split('T')[0] : '',
                        passportNumber: data.travelDetails.passport_number || '',
                        passportCountry: data.travelDetails.passport_country || '',
                        drivingLicense: data.travelDetails.driving_license || '',
                        vehicleType: data.travelDetails.vehicle_type || '',
                        travelRadius: data.travelDetails.travel_radius || '',
                        preferredTransport: data.travelDetails.preferred_transport || '',
                        willingToTravel: data.travelDetails.willing_to_travel || 'Yes'
                    });
                } else {
                    setTravelData({ passportNumber: '', passportExpiry: '', passportCountry: '', drivingLicense: '', drivingLicenseExpiry: '', vehicleType: '', willingToTravel: 'Yes', travelRadius: '', preferredTransport: '', notes: '' });
                }
            }

            if (skillsRes.ok) {
                const data = await skillsRes.json();
                setSkillsData(data.skills.map(s => ({
                    skillName: s.skill_name,
                    proficiencyLevel: s.proficiency_level,
                    yearsExp: s.years_exp,
                    certificationName: s.certification_name,
                    certificationUrl: s.certification_url
                })));
            }

            if (expRes.ok) {
                const data = await expRes.json();
                setExperienceData(data.experience.map(e => ({
                    companyName: e.company_name,
                    jobTitle: e.job_title,
                    industry: e.industry,
                    startDate: e.start_date ? e.start_date.split('T')[0] : '',
                    endDate: e.end_date ? e.end_date.split('T')[0] : '',
                    isCurrent: !!e.is_current,
                    description: e.description
                })));
            }
        } catch (e) {
            console.error('Error fetching additional details:', e);
        }
    };

    const handleView = (engineer) => {
        // Immediate navigation state
        setSelectedEngineer(engineer);
        setViewMode('details');
        setActiveTab('profile');

        // Async data fetch
        fetchEngineerDetails(engineer.id);
        fetchEngineerTickets(engineer.id);
        fetchAdditionalDetails(engineer.id);
    }

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedEngineer(null);
        setSaveMessage('');
    }

    const handleDelete = async (engineer) => {
        if (!window.confirm(`Are you sure you want to delete ${engineer.name}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${engineer.id}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (!res.ok) throw new Error('Failed to delete engineer')
            fetchEngineers()
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete engineer')
        }
    }

    const handleSaveCharges = async () => {
        setSavingCharges(true);
        setSaveMessage('');
        try {
            const payload = {
                ...selectedEngineer, // keep existing fields
                employmentType: chargesForm.jobType,
                jobTitle: chargesForm.jobTitle,
                startDate: chargesForm.startDate,
                checkInTime: chargesForm.checkInTime,
                checkOutTime: chargesForm.checkOutTime,
                currency: chargesForm.currency,
                hourlyRate: chargesForm.hourlyRate,
                halfDayRate: chargesForm.halfDayRate,
                fullDayRate: chargesForm.fullDayRate,
                agreedRate: chargesForm.agreedRate,
                overtimeRate: chargesForm.overtimeRate,
                oohRate: chargesForm.oohRate,
                weekendRate: chargesForm.weekendRate,
                holidayRate: chargesForm.holidayRate,
                city: chargesForm.city
            };

            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (res.ok) {
                setSaveMessage('Saved successfully');
                // Refresh engineer details to show updated values in real-time
                await fetchEngineerDetails(selectedEngineer.id);
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage('Failed to save');
            }
        } catch (e) {
            console.error(e);
            setSaveMessage('Error saving');
        }
        setSavingCharges(false);
    };

    const handleSaveRTW = async () => {
        setSavingRTW(true);
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}/right-to-work`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rtwData),
                credentials: 'include'
            });
            if (res.ok) {
                setSaveMessage('Right to work saved');
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (e) { console.error(e); }
        setSavingRTW(false);
    };

    const handleSaveTravel = async () => {
        setSavingTravel(true);
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}/travel-details`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(travelData),
                credentials: 'include'
            });
            if (res.ok) {
                setSaveMessage('Travel details saved');
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (e) { console.error(e); }
        setSavingTravel(false);
    };

    const handleSaveSkills = async () => {
        setSavingSkills(true);
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}/skills`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills: skillsData }),
                credentials: 'include'
            });
            if (res.ok) {
                setSaveMessage('Skills saved');
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (e) { console.error(e); }
        setSavingSkills(false);
    };

    const handleSaveExp = async () => {
        setSavingExp(true);
        try {
            const res = await fetch(`${API_BASE_URL}/engineers/${selectedEngineer.id}/experience`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experience: experienceData }),
                credentials: 'include'
            });
            if (res.ok) {
                setSaveMessage('Experience saved');
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (e) { console.error(e); }
        setSavingExp(false);
    };

    const handleUploadRTW = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setRtwData({ ...rtwData, documentUrl: data.url, documentName: file.name });
            }
        } catch (e) { console.error(e); }
    };

    const filteredEngineers = engineers.filter((eng) => {
        const term = searchTerm.toLowerCase()
        return (
            eng.name.toLowerCase().includes(term) ||
            eng.email.toLowerCase().includes(term) ||
            eng.phone.toLowerCase().includes(term)
        )
    })

    // --- Render ---

    if (viewMode === 'details' && selectedEngineer) {
        return (
            <div className="engineers-page details-view">
                <header className="engineers-header" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={handleBackToList} className="back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                            <FiArrowLeft size={24} color="#64748b" />
                        </button>
                        <div>
                            <h1 className="engineers-title">Engineer Details</h1>
                            <p className="engineers-subtitle">{selectedEngineer.name}</p>
                        </div>
                    </div>
                </header>

                <div className="tabs-header" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '30px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <div style={activeTab === 'profile' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('profile')}>PROFILE</div>
                    <div style={activeTab === 'rtw' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('rtw')}>RIGHT TO WORK</div>
                    <div style={activeTab === 'travel' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('travel')}>TRAVEL</div>
                    <div style={activeTab === 'skills' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('skills')}>SKILLS</div>
                    <div style={activeTab === 'experience' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('experience')}>EXPERIENCE</div>
                    <div style={activeTab === 'tickets' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('tickets')}>TICKETS</div>
                    <div style={activeTab === 'charges' ? TAB_ACTIVE_STYLE : TAB_STYLE} onClick={() => setActiveTab('charges')}>CHARGES</div>
                </div>

                <div className="tab-content">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="profile-tab-content card-box">
                            <h3 className="section-head" style={{ border: 'none' }}>Personal Information</h3>
                            <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                                <div className="detail-item">
                                    <label>Name</label>
                                    <div className="detail-value">{selectedEngineer.name}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Email</label>
                                    <div className="detail-value">{selectedEngineer.email}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Phone</label>
                                    <div className="detail-value">{selectedEngineer.phone}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Address / Location</label>
                                    <div className="detail-value">{selectedEngineer.address || '-'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Joined Date</label>
                                    <div className="detail-value">{selectedEngineer.created_at ? new Date(selectedEngineer.created_at).toLocaleDateString() : '-'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>Status</label>
                                    <div className="detail-value">
                                        <span className={`status-pill status-pill--${selectedEngineer.status}`}>{selectedEngineer.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="divider-line" style={{ margin: '30px 0' }}></div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div>
                                    <h4 className="section-head" style={{ fontSize: '16px', color: '#64748b' }}>Work Authorization</h4>
                                    <div className="detail-item" style={{ marginBottom: '15px' }}>
                                        <label>Visa Type</label>
                                        <div className="detail-value">{rtwData.visaType || 'Not specified'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label>Expiry Date</label>
                                        <div className="detail-value">{rtwData.expiryDate || 'N/A'}</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="section-head" style={{ fontSize: '16px', color: '#64748b' }}>Travel & Transport</h4>
                                    <div className="detail-item" style={{ marginBottom: '15px' }}>
                                        <label>Willing to Travel</label>
                                        <div className="detail-value">{travelData.willingToTravel || 'Yes'} ({travelData.travelRadius || 'No radius specified'})</div>
                                    </div>
                                    <div className="detail-item">
                                        <label>Vehicle Type</label>
                                        <div className="detail-value">{travelData.vehicleType || 'Not specified'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="divider-line" style={{ margin: '30px 0' }}></div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div>
                                    <h4 className="section-head" style={{ fontSize: '16px', color: '#64748b' }}>Top Skills</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {skillsData.length > 0 ? skillsData.map((s, i) => (
                                            <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', border: '1px solid #e2e8f0' }}>
                                                {s.skillName} ({s.proficiencyLevel})
                                            </span>
                                        )) : <span style={{ color: '#94a3b8', fontSize: '14px' }}>No skills listed</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="section-head" style={{ fontSize: '16px', color: '#64748b' }}>Recent Experience</h4>
                                    {experienceData.length > 0 ? (
                                        <div style={{ fontSize: '14px' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{experienceData[0].jobTitle}</div>
                                            <div style={{ color: '#64748b' }}>{experienceData[0].companyName}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {experienceData[0].startDate} - {experienceData[0].isCurrent ? 'Present' : experienceData[0].endDate}
                                            </div>
                                        </div>
                                    ) : <span style={{ color: '#94a3b8', fontSize: '14px' }}>No experience listed</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT TO WORK TAB */}
                    {activeTab === 'rtw' && (
                        <div className="rtw-tab-content card-box">
                            <h4 className="section-head">Right to Work Documents</h4>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Visa Type / Status</label>
                                    <select className="form-input" value={rtwData.visaType} onChange={e => setRtwData({ ...rtwData, visaType: e.target.value })}>
                                        <option value="">Select Visa Type</option>
                                        <option value="Citizen">Citizen</option>
                                        <option value="Permanent Resident">Permanent Resident</option>
                                        <option value="Work Visa (Tier 2/Skilled Worker)">Work Visa (Tier 2/Skilled Worker)</option>
                                        <option value="Student Visa">Student Visa</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Upload Document (Passport/BRP/Visa)</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input type="file" onChange={handleUploadRTW} style={{ fontSize: '12px' }} />
                                        {rtwData.documentUrl && (
                                            <a href={`${API_BASE_URL.replace('/api', '')}/${rtwData.documentUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                                                View Saved
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Issue Date</label>
                                    <input type="date" className="form-input" value={rtwData.issueDate} onChange={e => setRtwData({ ...rtwData, issueDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input type="date" className="form-input" value={rtwData.expiryDate} onChange={e => setRtwData({ ...rtwData, expiryDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes / Remarks</label>
                                <textarea className="form-input" style={{ height: '80px' }} value={rtwData.notes} onChange={e => setRtwData({ ...rtwData, notes: e.target.value })} placeholder="Any additional information..." />
                            </div>
                            <div className="form-actions" style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button className="save-btn" onClick={handleSaveRTW} disabled={savingRTW}>
                                    {savingRTW ? 'Saving...' : 'Save RTW Details'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TRAVEL TAB */}
                    {activeTab === 'travel' && (
                        <div className="travel-tab-content card-box">
                            <h4 className="section-head">Travel & Identification</h4>
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Passport Number</label>
                                    <input type="text" className="form-input" value={travelData.passportNumber} onChange={e => setTravelData({ ...travelData, passportNumber: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Passport Expiry</label>
                                    <input type="date" className="form-input" value={travelData.passportExpiry} onChange={e => setTravelData({ ...travelData, passportExpiry: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Passport Country</label>
                                    <input type="text" className="form-input" value={travelData.passportCountry} onChange={e => setTravelData({ ...travelData, passportCountry: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Driving License No.</label>
                                    <input type="text" className="form-input" value={travelData.drivingLicense} onChange={e => setTravelData({ ...travelData, drivingLicense: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>License Expiry</label>
                                    <input type="date" className="form-input" value={travelData.drivingLicenseExpiry} onChange={e => setTravelData({ ...travelData, drivingLicenseExpiry: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Vehicle Type</label>
                                    <input type="text" className="form-input" value={travelData.vehicleType} onChange={e => setTravelData({ ...travelData, vehicleType: e.target.value })} placeholder="e.g. Car, Van" />
                                </div>
                            </div>
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Willing to Travel?</label>
                                    <select className="form-input" value={travelData.willingToTravel} onChange={e => setTravelData({ ...travelData, willingToTravel: e.target.value })}>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Travel Radius (km/miles)</label>
                                    <input type="text" className="form-input" value={travelData.travelRadius} onChange={e => setTravelData({ ...travelData, travelRadius: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Preferred Transport</label>
                                    <input type="text" className="form-input" value={travelData.preferredTransport} onChange={e => setTravelData({ ...travelData, preferredTransport: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-actions" style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button className="save-btn" onClick={handleSaveTravel} disabled={savingTravel}>
                                    {savingTravel ? 'Saving...' : 'Save Travel Details'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SKILLS TAB */}
                    {activeTab === 'skills' && (
                        <div className="skills-tab-content card-box">
                            <h4 className="section-head">Technical Skills</h4>
                            {skillsData.map((skill, index) => (
                                <div key={index} className="form-row three-col" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <div className="form-group">
                                        <label>Skill Name</label>
                                        <input type="text" className="form-input" value={skill.skillName} onChange={e => {
                                            const newSkills = [...skillsData];
                                            newSkills[index].skillName = e.target.value;
                                            setSkillsData(newSkills);
                                        }} />
                                    </div>
                                    <div className="form-group">
                                        <label>Proficiency</label>
                                        <select className="form-input" value={skill.proficiencyLevel} onChange={e => {
                                            const newSkills = [...skillsData];
                                            newSkills[index].proficiencyLevel = e.target.value;
                                            setSkillsData(newSkills);
                                        }}>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Years of Exp.</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input type="number" className="form-input" value={skill.yearsExp} onChange={e => {
                                                const newSkills = [...skillsData];
                                                newSkills[index].yearsExp = e.target.value;
                                                setSkillsData(newSkills);
                                            }} />
                                            <button className="delete-btn" onClick={() => setSkillsData(skillsData.filter((_, i) => i !== index))}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="save-btn" style={{ background: '#64748b', marginBottom: '20px' }} onClick={() => setSkillsData([...skillsData, { skillName: '', proficiencyLevel: 'Intermediate', yearsExp: 0 }])}>
                                + Add Skill
                            </button>
                            <div className="form-actions" style={{ textAlign: 'right' }}>
                                <button className="save-btn" onClick={handleSaveSkills} disabled={savingSkills}>
                                    {savingSkills ? 'Saving...' : 'Save All Skills'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* EXPERIENCE TAB */}
                    {activeTab === 'experience' && (
                        <div className="exp-tab-content card-box">
                            <h4 className="section-head">Industry Experience</h4>
                            {experienceData.map((exp, index) => (
                                <div key={index} style={{ border: '1px solid #f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label>Company Name</label>
                                            <input type="text" className="form-input" value={exp.companyName} onChange={e => {
                                                const newExp = [...experienceData];
                                                newExp[index].companyName = e.target.value;
                                                setExperienceData(newExp);
                                            }} />
                                        </div>
                                        <div className="form-group">
                                            <label>Job Title</label>
                                            <input type="text" className="form-input" value={exp.jobTitle} onChange={e => {
                                                const newExp = [...experienceData];
                                                newExp[index].jobTitle = e.target.value;
                                                setExperienceData(newExp);
                                            }} />
                                        </div>
                                    </div>
                                    <div className="form-row three-col">
                                        <div className="form-group">
                                            <label>Start Date</label>
                                            <input type="date" className="form-input" value={exp.startDate} onChange={e => {
                                                const newExp = [...experienceData];
                                                newExp[index].startDate = e.target.value;
                                                setExperienceData(newExp);
                                            }} />
                                        </div>
                                        {!exp.isCurrent && (
                                            <div className="form-group">
                                                <label>End Date</label>
                                                <input type="date" className="form-input" value={exp.endDate} onChange={e => {
                                                    const newExp = [...experienceData];
                                                    newExp[index].endDate = e.target.value;
                                                    setExperienceData(newExp);
                                                }} />
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label>Currently Working?</label>
                                            <div style={{ marginTop: '10px' }}>
                                                <input type="checkbox" checked={exp.isCurrent} onChange={e => {
                                                    const newExp = [...experienceData];
                                                    newExp[index].isCurrent = e.target.checked;
                                                    setExperienceData(newExp);
                                                }} /> Yes
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <button className="delete-btn" style={{ color: '#ef4444' }} onClick={() => setExperienceData(experienceData.filter((_, i) => i !== index))}>Remove This</button>
                                    </div>
                                </div>
                            ))}
                            <button className="save-btn" style={{ background: '#64748b', marginBottom: '20px' }} onClick={() => setExperienceData([...experienceData, { companyName: '', jobTitle: '', industry: '', startDate: '', endDate: '', isCurrent: false, description: '' }])}>
                                + Add Experience
                            </button>
                            <div className="form-actions" style={{ textAlign: 'right' }}>
                                <button className="save-btn" onClick={handleSaveExp} disabled={savingExp}>
                                    {savingExp ? 'Saving...' : 'Save Experience'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TICKETS TAB */}
                    {activeTab === 'tickets' && (
                        <div className="tickets-tab-content">
                            {/* We reuse the engineers-table class but with structure matching Tickets Table */}
                            <div className="engineers-content-card">
                                <div className="engineers-table-wrapper">
                                    <table className="engineers-table">
                                        <thead>
                                            <tr>
                                                <th>Ticket ID</th>
                                                <th>Task Name</th>
                                                <th>Customer</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th>Location</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingTickets ? (
                                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading tickets...</td></tr>
                                            ) : engTickets.length === 0 ? (
                                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No tickets found for this engineer.</td></tr>
                                            ) : (
                                                engTickets.map(t => (
                                                    <tr key={t.id}>
                                                        <td style={{ fontWeight: '500', color: '#6366f1' }}>#AIM-T-{t.id}</td>
                                                        <td style={{ fontWeight: '600' }}>{t.taskName}</td>
                                                        <td>{t.customerName}</td>
                                                        <td>{t.taskStartDate ? new Date(t.taskStartDate).toLocaleDateString() : '-'}</td>
                                                        <td><span className={`status-pill status-pill--${t.status?.toLowerCase().replace(' ', '')}`}>{t.status}</span></td>
                                                        <td>{t.city}, {t.country}</td>
                                                        <td>
                                                            <div className="engineer-actions">
                                                                <button className="action-icon-btn view-btn" title="View Ticket" onClick={() => alert('Navigate to Ticket #' + t.id)}>
                                                                    <FiEye />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHARGES TAB */}
                    {activeTab === 'charges' && (
                        <div className="charges-tab-content card-box">
                            {/* Title: Job Details */}
                            <h4 className="section-head" style={{ color: '#2563eb', marginBottom: '20px' }}>Job Details</h4>

                            {/* Row 1: Job Type */}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Job Type <span className="req">*</span></label>
                                <div className="radio-group" style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                    {['Full Time', 'Part Time', 'Dispatch'].map(type => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="jobType"
                                                checked={chargesForm.jobType === type}
                                                onChange={() => setChargesForm({ ...chargesForm, jobType: type })}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Row 2: Job Title | Start Date */}
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Job Title <span className="req">*</span></label>
                                    <input type="text" className="form-input" value={chargesForm.jobTitle} onChange={e => setChargesForm({ ...chargesForm, jobTitle: e.target.value })} placeholder="e.g. Senior Engineer" />
                                </div>
                                <div className="form-group">
                                    <label>Start Date <span className="req">*</span></label>
                                    <input type="date" className="form-input" value={chargesForm.startDate} onChange={e => setChargesForm({ ...chargesForm, startDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>City / Location</label>
                                    <input type="text" className="form-input" value={chargesForm.city} onChange={e => setChargesForm({ ...chargesForm, city: e.target.value })} placeholder="e.g. New York" />
                                </div>
                            </div>

                            {/* Row 3: Check-In | Check-Out */}
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Check-In Time <span className="req">*</span></label>
                                    <input type="time" className="form-input" value={chargesForm.checkInTime} onChange={e => setChargesForm({ ...chargesForm, checkInTime: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Check-Out Time <span className="req">*</span></label>
                                    <input type="time" className="form-input" value={chargesForm.checkOutTime} onChange={e => setChargesForm({ ...chargesForm, checkOutTime: e.target.value })} />
                                </div>
                            </div>

                            <div className="divider-line"></div>

                            {/* Costing & Rates */}
                            <h4 className="section-head" style={{ color: '#2563eb', marginBottom: '20px' }}>Costing & Rates</h4>

                            {/* Row 4: Currency | Hourly | Half Day */}
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Select Currency <span className="req">*</span></label>
                                    <select className="form-input" value={chargesForm.currency} onChange={e => setChargesForm({ ...chargesForm, currency: e.target.value })}>
                                        <option value="USD">USD - Dollar ($)</option>
                                        <option value="EUR">EUR - Euro (€)</option>
                                        <option value="GBP">GBP - Pound (£)</option>
                                        <option value="INR">INR - Rupee (₹)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Hourly Charge</label>
                                    <input type="number" className="form-input" value={chargesForm.hourlyRate} onChange={e => setChargesForm({ ...chargesForm, hourlyRate: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label>Half Day Charge</label>
                                    <input type="number" className="form-input" value={chargesForm.halfDayRate} onChange={e => setChargesForm({ ...chargesForm, halfDayRate: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>

                            {/* Row 5: Full Day | Agreed Rate */}
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Full Day Charge</label>
                                    <input type="number" className="form-input" value={chargesForm.fullDayRate} onChange={e => setChargesForm({ ...chargesForm, fullDayRate: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label>Agreed Rate</label>
                                    <input type="text" className="form-input" value={chargesForm.agreedRate || ''} onChange={e => setChargesForm({ ...chargesForm, agreedRate: e.target.value })} placeholder="e.g. Fixed $500" />
                                </div>
                            </div>

                            <div className="divider-line"></div>

                            {/* Extra Work Pay */}
                            <h4 className="section-head" style={{ color: '#2563eb', marginBottom: '20px' }}>Extra Work Pay</h4>

                            {/* Row 6: Overtime | OOH | Weekend */}
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Over Time (Hourly rate) <span className="req">*</span></label>
                                    <input type="number" className="form-input" value={chargesForm.overtimeRate} onChange={e => setChargesForm({ ...chargesForm, overtimeRate: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label>Out of Office Hour (Hourly rate) <span className="req">*</span></label>
                                    <input type="number" className="form-input" value={chargesForm.oohRate} onChange={e => setChargesForm({ ...chargesForm, oohRate: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label>Weekend (Hourly rate) <span className="req">*</span></label>
                                    <input type="number" className="form-input" value={chargesForm.weekendRate} onChange={e => setChargesForm({ ...chargesForm, weekendRate: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>

                            {/* Row 7: Public Holiday */}
                            <div className="form-row three-col">
                                <div className="form-group">
                                    <label>Public Holiday (Hourly rate) <span className="req">*</span></label>
                                    <input type="number" className="form-input" value={chargesForm.holidayRate} onChange={e => setChargesForm({ ...chargesForm, holidayRate: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '30px', textAlign: 'right' }}>
                                {saveMessage && <span style={{ marginRight: '15px', color: saveMessage.includes('Failed') ? 'red' : 'green', fontWeight: '500' }}>{saveMessage}</span>}
                                <button className="save-btn" onClick={handleSaveCharges} disabled={savingCharges}>
                                    {savingCharges ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>


            </div >
        );
    }

    return (
        <section className="engineers-page">
            <header className="engineers-header">
                <div>
                    <h1 className="engineers-title">Engineers</h1>
                    <p className="engineers-subtitle">
                        Manage your engineering team
                    </p>
                </div>
            </header>

            <section className="engineers-stats-row">
                <div className="engineers-stat-card">
                    <p className="stat-value">{engineers.length}</p>
                    <p className="stat-label">Total Engineers</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
                <div className="engineers-stat-card">
                    <p className="stat-label">Coming soon</p>
                </div>
            </section>

            <section className="engineers-content-card">
                <div className="engineers-toolbar">
                    <div className="engineers-search">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search engineers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && <div className="engineers-message engineers-message--error">{error}</div>}

                <div className="engineers-table-wrapper">
                    <table className="engineers-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Hourly Rate</th>
                                <th>Location</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="engineers-empty">
                                        Loading engineers...
                                    </td>
                                </tr>
                            ) : filteredEngineers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="engineers-empty">
                                        No engineers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredEngineers.map((eng) => (
                                    <tr key={eng.id}>
                                        <td>#AIM-E-{eng.id}</td>
                                        <td>
                                            <div className="engineer-name" onClick={() => handleView(eng)} style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}>{eng.name}</div>
                                        </td>
                                        <td><span style={{ fontSize: '13px', color: '#64748b' }}>{eng.employmentType || '-'}</span></td>
                                        <td>
                                            <span style={{ fontWeight: 'bold', color: '#059669' }}>
                                                {eng.currency === 'EUR' ? '€' : eng.currency === 'GBP' ? '£' : eng.currency === 'INR' ? '₹' : '$'}
                                                {parseFloat(eng.hourlyRate || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td>{eng.city || eng.address || '-'}</td>
                                        <td>{eng.email}</td>
                                        <td>
                                            <span className={`status-pill status-pill--${eng.status}`}>{eng.status}</span>
                                        </td>
                                        <td>
                                            <div className="engineer-actions">
                                                <button
                                                    className="action-icon-btn view-btn"
                                                    onClick={() => handleView(eng)}
                                                    title="View"
                                                >
                                                    <FiEye />
                                                </button>
                                                <button
                                                    className="action-icon-btn delete-btn"
                                                    onClick={() => handleDelete(eng)}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    )
}

export default EngineersPage
