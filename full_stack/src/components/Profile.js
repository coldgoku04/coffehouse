import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, token } = useAuth();
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

    // Fetch user info on load
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
        else {
            setError('Login required.');
            setLoading(false);
        }
    }, [userId, token]);

    const handleChange = e => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
        setMessage('');
        setError('');
    };

    const handleUpdate = async () => {
        setMessage('');
        setError('');
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

    if (loading) return <div>Loading profile...</div>;
    if (error) return <div className="profile-error">{error}</div>;

    return (
        <div className="profile-container">
            <h2 className="profile-title">Your Profile</h2>
            {message && <div className="profile-message">{message}</div>}
            <form onSubmit={(e) => e.preventDefault()}>
                <div className="profile-form-row">
                    <label>First Name: </label>
                    <input name="firstName" value={profile.firstName || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>Last Name: </label>
                    <input name="lastName" value={profile.lastName || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>Email: </label>
                    <input name="email" value={profile.email || ''} readOnly />
                </div>
                <div className="profile-form-row">
                    <label>Phone: </label>
                    <input name="phone" value={profile.phone || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>Address: </label>
                    <input name="address" value={profile.address || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>City: </label>
                    <input name="city" value={profile.city || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>State: </label>
                    <input name="state" value={profile.state || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>Postal Code: </label>
                    <input name="postalCode" value={profile.postalCode || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                <div className="profile-form-row">
                    <label>Country: </label>
                    <input name="country" value={profile.country || ''} onChange={handleChange} readOnly={!editMode} />
                </div>
                {!editMode ? (
                    <div className="profile-actions">
                        <button className="profile-btn" type="button" onClick={() => setEditMode(true)}>Edit Profile</button>
                    </div>
                ) : (
                    <div className="profile-actions">
                        <button className="profile-btn" type="button" onClick={handleUpdate}>Update Profile</button>
                        <button className="profile-btn" type="button" onClick={() => { setEditMode(false); setMessage(''); setError(''); }}>Cancel</button>
                    </div>
                )}
            </form>
            <div className="profile-links">
                <a href="/">Go to Home Page</a>
                <a href="/change-password">Change Password</a>
            </div>
        </div>
    );
};

export default Profile;
