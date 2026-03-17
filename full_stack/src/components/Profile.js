import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        address: '', city: '', state: '', postalCode: '', country: ''
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const userId = user?.id || localStorage.getItem('userId');

    const normalizeProfile = (data) => ({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        email: data?.email || '',
        phone: data?.phone || '',
        address: data?.address || '',
        city: data?.city || '',
        state: data?.state || '',
        postalCode: data?.postalCode || '',
        country: data?.country || ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await fetch(apiUrl(`/api/users/${userId}`), {
                    headers: token ? { "Authorization": "Bearer " + token } : {}
                });
                if (!res.ok) throw new Error("Failed to fetch profile");
                const data = await res.json();
                setProfile(normalizeProfile(data));
            } catch (e) {
                setError('Could not load profile.');
            }
            setLoading(false);
        };
        if (userId) fetchProfile();
        else { setError('Login required.'); setLoading(false); }
    }, [userId, token]);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
        setMessage(''); setError('');
    };

    const handleUpdate = async () => {
        setMessage(''); setError('');
        try {
            const res = await fetch(apiUrl(`/api/users/${userId}`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": "Bearer " + token } : {})
                },
                body: JSON.stringify(profile)
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Profile update failed.");
            } else {
                setMessage("Profile updated successfully.");
                setEditMode(false);
            }
        } catch {
            setError("Server error.");
        }
    };


    if (loading) return <div className="cafe-page-state" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf6f1', color: '#8a7968' }}>Loading profile...</div>;
    if (error && !profile.email) return <div className="profile-error">{error}</div>;

    const fields = [
        { name: 'firstName', label: 'First Name', editable: true },
        { name: 'lastName', label: 'Last Name', editable: true },
        { name: 'email', label: 'Email', editable: false },
        { name: 'phone', label: 'Phone', editable: true },
        { name: 'address', label: 'Address', editable: true },
        { name: 'city', label: 'City', editable: true },
        { name: 'state', label: 'State', editable: true },
        { name: 'postalCode', label: 'Postal Code', editable: true },
        { name: 'country', label: 'Country', editable: true },
    ];

    return (
        <div className="profile-container">
            <h2 className="profile-title">👤 Your Profile</h2>
            {message && <div className="profile-message">{message}</div>}
            {error && profile.email && <div className="profile-error" style={{ margin: '0 0 16px', maxWidth: '100%' }}>{error}</div>}

            <form onSubmit={(e) => e.preventDefault()}>
                {fields.map((field) => (
                    <div className="profile-form-row" key={field.name}>
                        <label>{field.label}</label>
                        <input
                            name={field.name}
                            value={profile[field.name] || ''}
                            onChange={handleChange}
                            readOnly={!field.editable || !editMode}
                        />
                    </div>
                ))}

                {!editMode ? (
                    <div className="profile-actions">
                        <button className="profile-btn" type="button" onClick={() => setEditMode(true)}> ✏️ Edit Profile</button>
                    </div>
                ) : (
                    <div className="profile-actions">
                        <button className="profile-btn" type="button" onClick={handleUpdate}> 💾 Save Changes</button>
                        <button className="profile-btn" type="button" onClick={() => { setEditMode(false); setMessage(''); setError(''); }}>Cancel</button>
                    </div>
                )}
            </form>

            <div className="profile-links">
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}> 🏠 Home Page</a>
                <a href="/change-password" onClick={(e) => { e.preventDefault(); navigate('/change-password'); }}> 🔑 Change Password</a>
                {user?.role === 'CAFE_OWNER' && (
                    <a href="/owner/dashboard" onClick={(e) => { e.preventDefault(); navigate('/owner/dashboard'); }}> 📊 Owner Dashboard</a>
                )}
            </div>

        </div>
    );
};

export default Profile;
