import React, { useState, useEffect } from 'react';
import { FiVideo, FiCalendar, FiPlus, FiTrash2, FiClock } from 'react-icons/fi';
import './MeetingPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MeetingPage = () => {
    const [meetings, setMeetings] = useState([]);
    const [activeCall, setActiveCall] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        scheduled_at: new Date().toISOString().slice(0, 16)
    });

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/meetings`);
            if (res.ok) setMeetings(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/meetings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({ title: '', scheduled_at: new Date().toISOString().slice(0, 16) });
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
                    <div className="meeting-modal">
                        <h3>Schedule Meeting</h3>
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
