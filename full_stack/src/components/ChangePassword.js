import React, { useState } from "react";
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import './ChangePassword.css';


const ChangePassword = () => {
    const { user } = useAuth();
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleChange = e => {
        setForm({...form, [e.target.name]: e.target.value });
        setError(""); setMessage("");
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) {
            setError("New passwords do not match!"); return;
        }
        const userId = user?.id || localStorage.getItem('userId');
        if (!userId) {
            setError("Login required.");
            return;
        }
        try {
            const res = await fetch(apiUrl('/api/auth/change-password'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    oldPassword: form.currentPassword,
                    newPassword: form.newPassword
                })
            });
            if (res.ok) {
                setMessage("Password changed successfully.");
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to change password.");
            }
        } catch {
            setError("Server error");
        }
    };

    return (
        <div className="change-password-container">
            <h2 className="change-password-title">🔑 Change Password</h2>
            <form className="change-password-form" onSubmit={handleSubmit}>
                <label className="change-password-label">
                    Current Password:
                    <input className="change-password-input" type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} required />
                </label>
                <label className="change-password-label">
                    New Password:
                    <input className="change-password-input" type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required />
                </label>
                <label className="change-password-label">
                    Confirm New Password:
                    <input className="change-password-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
                </label>
                <button className="change-password-btn" type="submit">✅ Change Password</button>
            </form>
            {error && <div className="change-password-error">{error}</div>}
            {message && (
                <div className="change-password-message">
                    {message}
                    <div className="change-password-signin-link">
                        <a href="/signin">Go to Sign In</a>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ChangePassword;
