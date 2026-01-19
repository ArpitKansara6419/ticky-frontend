import React, { useState, useEffect } from 'react';
import { FiVideo, FiCalendar, FiPlus, FiTrash2, FiClock, FiUsers, FiX, FiCheck } from 'react-icons/fi';
import './MeetingPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MeetingPage = () => {
    const [meetings, setMeetings] = useState([]);
    const [activeCall, setActiveCall] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Participants State
    const [engineers, setEngineers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState([]); // Array of {type, id, name}

    const [formData, setFormData] = useState({
        title: '',
        scheduled_at: new Date().toISOString().slice(0, 16)
    });

    useEffect(() => {
        fetchMeetings();
        fetchParticipantsData();
    }, []);

    const fetchMeetings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/meetings`);
            if (res.ok) setMeetings(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchParticipantsData = async () => {
        try {
            const [engRes, custRes] = await Promise.all([
                fetch(`${API_BASE_URL}/engineers`),
                fetch(`${API_BASE_URL}/customers`)
            ]);
            if (engRes.ok) {
                const data = await engRes.json();
                setEngineers(data.engineers || []);
            }
            if (custRes.ok) {
                const data = await custRes.json();
                setCustomers(data.customers || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                participants: selectedParticipants.map(p => ({ type: p.type, id: p.id }))
            };

            const res = await fetch(`${API_BASE_URL}/meetings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({ title: '', scheduled_at: new Date().toISOString().slice(0, 16) });
                setSelectedParticipants([]);
                fetchMeetings();
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Cancel this meeting?')) return;
        try {
            await fetch(`${API_BASE_URL}/meetings/${id}`, { method: 'DELETE' });
            fetchMeetings();
        } catch (e) { console.error(e); }
    };

    const toggleParticipant = (type, id, name) => {
        const identifier = `${type}-${id}`;
        const exists = selectedParticipants.find(p => `${p.type}-${p.id}` === identifier);

        if (exists) {
            setSelectedParticipants(prev => prev.filter(p => `${p.type}-${p.id}` !== identifier));
        } else {
            setSelectedParticipants(prev => [...prev, { type, id, name }]);
        }
    };

    // If active call, render full screen video interface
    if (activeCall) {
        return (
            <div className="video-frame-container">
                <div className="video-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#48bb78' }}></div>
                        <h4>{activeCall.title}</h4>
                    </div>
                    <button className="leave-call-btn" onClick={() => setActiveCall(null)}>End Call</button>
                </div>
                <iframe
                    src={`https://meet.jit.si/${activeCall.room_id}#config.prejoinPageEnabled=false&userInfo.displayName="User"`}
                    className="jitsi-frame"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="Video Meeting"
                ></iframe>
            </div>
        );
    }

    return (
        <div className="meeting-page">
            <header className="meeting-header">
                <div className="meeting-title">
                    <h2>Meetings & Video Calls</h2>
                    <p>Schedule and join secure video conferences instantly.</p>
                </div>
                <button className="schedule-btn" onClick={() => setShowModal(true)}>
                    <FiPlus /> Schedule Meeting
                </button>
            </header>

            <div className="meetings-grid">
                {meetings.map((m) => (
                    <div className="meeting-card" key={m.id}>
                        <div className="meeting-card-header">
                            <span className="meeting-date">{new Date(m.scheduled_at).toLocaleDateString()}</span>
                            <span className="meeting-creator">by {m.created_by}</span>
                        </div>
                        <h3>{m.title}</h3>
                        <div className="meeting-id">ROOM: {m.room_id}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', color: '#718096', fontSize: '13px' }}>
                            <FiClock /> {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <button className="join-btn" onClick={() => setActiveCall(m)}>
                            <FiVideo /> Join Meeting
                        </button>

                        <button
                            onClick={() => handleDelete(m.id)}
                            style={{ background: 'transparent', border: 'none', color: '#cbd5e0', marginTop: '10px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <FiTrash2 /> Cancel
                        </button>
                    </div>
                ))}
            </div>

            {meetings.length === 0 && (
                <div style={{ textAlign: 'center', color: '#718096', padding: '60px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                    <FiCalendar style={{ fontSize: '40px', color: '#cbd5e0', marginBottom: '10px' }} />
                    <p>No meetings scheduled. Create one to get started!</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="meeting-modal-overlay">
                    <div className="meeting-modal" style={{ width: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Schedule Meeting</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}><FiX /></button>
                        </div>

                        <form className="meeting-form" onSubmit={handleCreate}>
                            <label>Meeting Title</label>
                            <input
                                required
                                placeholder="e.g. Weekly Standup"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />

                            <label>Date & Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.scheduled_at}
                                onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                            />

                            <label style={{ marginTop: '10px' }}>Invite Participants (Optional)</label>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', fontWeight: 600 }}>Engineers</div>
                                {engineers.map(e => (
                                    <div
                                        key={`eng-${e.id}`}
                                        onClick={() => toggleParticipant('Engineer', e.id, e.name)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderRadius: '4px', background: selectedParticipants.find(p => p.type === 'Engineer' && p.id === e.id) ? '#ebf8ff' : 'transparent' }}
                                    >
                                        <div style={{ width: '16px', height: '16px', border: '1px solid #cbd5e0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                                            {selectedParticipants.find(p => p.type === 'Engineer' && p.id === e.id) && <FiCheck size={12} color="#3182ce" />}
                                        </div>
                                        <span style={{ fontSize: '14px' }}>{e.name}</span>
                                    </div>
                                ))}
                                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', marginTop: '10px', fontWeight: 600 }}>Customers</div>
                                {customers.map(c => (
                                    <div
                                        key={`cust-${c.id}`}
                                        onClick={() => toggleParticipant('Customer', c.id, c.name)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderRadius: '4px', background: selectedParticipants.find(p => p.type === 'Customer' && p.id === c.id) ? '#ebf8ff' : 'transparent' }}
                                    >
                                        <div style={{ width: '16px', height: '16px', border: '1px solid #cbd5e0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                                            {selectedParticipants.find(p => p.type === 'Customer' && p.id === c.id) && <FiCheck size={12} color="#3182ce" />}
                                        </div>
                                        <span style={{ fontSize: '14px' }}>{c.name} ({c.company})</span>
                                    </div>
                                ))}
                            </div>

                            <div className="meeting-actions">
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px', border: 'none', background: '#edf2f7', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#4299e1', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingPage;
