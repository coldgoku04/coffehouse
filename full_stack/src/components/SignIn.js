import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignIn.css';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';

const SignIn = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: '',  // ← Changed from email to username
        password: '',
        role: '',
        rememberMe: false
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

   /* const roles = [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'CUSTOMER', label: 'Customer' },
        { value: 'CAFE_OWNER', label: 'Café Owner' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'WAITER', label: 'Waiter' }
    ];*/

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        //if (!formData.role) {
        //    newErrors.role = 'Please select your role';
       // }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch(apiUrl('/api/auth/login'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                })
            });

            let errorMsg = "Invalid credentials or account not approved";
            let responseData = null;
            let bodyText = null;

            try {
                // Try to read as JSON. If this fails, it will throw.
                responseData = await response.clone().json();
            } catch (jsonErr) {
                // If not JSON, read as text! But clone first.
                try {
                    bodyText = await response.text();
                } catch (textErr) {
                    bodyText = null;
                }
            }

            if (response.ok) {
                const user = responseData?.user;
                if (!user) {
                    setErrors({ submit: "Invalid login response from server." });
                    return;
                }

                login(user, responseData?.token || "");

                const isAdmin = user.role === "ADMIN";
                const isOwner = user.role === "CAFE_OWNER";
                const mustChangePassword = user.mustChangePassword === true;
                const destination = mustChangePassword && !isAdmin
                    ? "/change-password"
                    : (isAdmin ? "/admin" : (isOwner ? "/owner/dashboard" : "/"));
                navigate(destination);
            } else {
                if (responseData && typeof responseData === "object") {
                    errorMsg = responseData.message || errorMsg;
                } else if (bodyText) {
                    errorMsg = bodyText;
                }
                setErrors({ submit: errorMsg });
            }
        } catch (error) {
            setErrors({ submit: "Server error. Please try again." });
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="signin-page">
            {/* Home Icon */}
            <button className="home-icon-btn" onClick={() => navigate('/')} title="Go to Home">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </button>

            <div className="signin-container">
                <div className="signin-left">
                    <div className="signin-brand">
                        <h1>☕ Cafe House</h1>
                        <p>Your daily dose of happiness</p>
                    </div>
                    <div className="signin-illustration">
                        <div className="floating-cup">☕</div>
                        <div className="signin-text">
                            <h2>Welcome Back!</h2>
                            <p>Sign in with your credentials received via email</p>
                        </div>
                    </div>
                </div>

                <div className="signin-right">
                    <div className="signin-form-container">
                        <div className="signin-header">
                            <h2>Sign In</h2>
                            <p>Enter your credentials to access your account</p>
                        </div>

                        {errors.submit && (
                            <div className="error-message">
                                {errors.submit}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="signin-form">
                            {/* Username First */}
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter your username"
                                    className={errors.username ? 'error' : ''}
                                />
                                {errors.username && <span className="field-error">{errors.username}</span>}
                            </div>

                            {/* Password Second */}
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    className={errors.password ? 'error' : ''}
                                />
                                {errors.password && <span className="field-error">{errors.password}</span>}
                            </div>

                            {/* Role Third (moved after password)
                            <div className="form-group">
                                <label htmlFor="role">Select Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className={errors.role ? 'error' : ''}
                                >
                                    <option value="">Choose your role</option>
                                    {roles.map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && <span className="field-error">{errors.role}</span>}
                            </div>*/}

                            {/* Rest of the form stays the same */}
                            <div className="form-options">
                                <label className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                    />
                                    <span>Remember me</span>
                                </label>
                                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
                            </div>

                            <button
                                type="submit"
                                className="btn-signin"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="divider">
                                or sign in with
                            </div>

                            <div className="social-login">
                                <button type="button" className="btn-social google">
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                </button>
                                <button type="button" className="btn-social facebook">
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </button>
                            </div>

                            <div className="register-link">
                                Don't have an account? <a href="/register">Register Now</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;

