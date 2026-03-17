import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { apiUrl } from '../config/api';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(apiUrl('/api/auth/login'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || "Login failed!");
                return;
            }
            login(data.user, data.token || ""); // Save user and token

            // Role-based redirect
            const isAdmin = data.user.role === "ADMIN";
            const mustChangePassword = data.user.mustChangePassword === true;
            if (mustChangePassword && !isAdmin) {
                navigate("/change-password");
            } else if (isAdmin) {
                navigate("/admin");
            } else {
                navigate("/profile");
            }
        } catch {
            setError("Server error.");
        }
    };

    return (
        <div>
            <h2>🔐 Login</h2>
            {error && <div style={{color: "red"}}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
                <input value={password} type="password" onChange={e => setPassword(e.target.value)} placeholder="Password" />
                <button type="submit">🔓 Login</button>
            </form>
        </div>
    );
};

export default Login;
