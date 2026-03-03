import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';

const roles = ['CUSTOMER', 'CAFE_OWNER', 'ADMIN', 'CHEF', 'WAITER'];

const widgets = [
    { color: 'red', title: 'Pending Users', key: 'total' },
    { color: 'green', title: 'Pending Owners', key: 'owners' },
    { color: 'teal', title: 'Pending Staff', key: 'staff' },
    { color: 'orange', title: 'Approved Users', key: 'approved' },
    { color: 'dark', title: 'Current Time', key: 'clock' }
];

const readResponseMessage = async (res, fallback) => {
    try {
        const data = await res.json();
        if (typeof data?.message === 'string' && data.message.trim()) {
            return data.message;
        }
    } catch {
        // Ignore parse errors and fallback to default message.
    }
    return fallback;
};

const getAuthHeaders = (token) => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
};

const ApprovalCard = ({ rowUser, busy, onApprove, onReject }) => {
    const [role, setRole] = useState(rowUser.role || 'CUSTOMER');
    const [rejectReason, setRejectReason] = useState('');

    return (
        <article className="approval-card">
            <div className="approval-card-head">
                <div className="approval-user-info">
                    <h4>{rowUser.firstName} {rowUser.lastName}</h4>
                    <div className="approval-meta-row">
                        <p>{rowUser.email}</p>
                        <span className="username-pill">@{rowUser.username}</span>
                        <div className="approval-role-inline">
                            <label htmlFor={`role-${rowUser.id}`}>Assign Role</label>
                            <select
                                id={`role-${rowUser.id}`}
                                className="role-select"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {roles.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="approval-card-body">
                <div className="approval-action-row">
                    <button
                        className="approve-btn"
                        disabled={busy}
                        onClick={() => onApprove(rowUser.id, role)}
                    >
                        {busy ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                        className="reject-btn"
                        disabled={busy}
                        onClick={() => onReject(rowUser.id, rejectReason.trim())}
                    >
                        {busy ? 'Rejecting...' : 'Reject'}
                    </button>
                    <input
                        id={`reason-${rowUser.id}`}
                        className="reject-reason-input"
                        type="text"
                        placeholder="Reason for rejection (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </div>
            </div>
        </article>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();

    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionStates, setActionStates] = useState({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [clockValue, setClockValue] = useState('');
    const [todayValue, setTodayValue] = useState('');
    const [approvedCount, setApprovedCount] = useState(0);

    const authHeaders = useMemo(() => {
        const authToken = token || localStorage.getItem('token');
        return getAuthHeaders(authToken);
    }, [token]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError('');

            try {
                const res = await fetch(apiUrl('/api/auth/pending-users'), {
                    headers: { ...authHeaders }
                });

                if (!res.ok) {
                    const msg = await readResponseMessage(res, 'Could not load pending users.');
                    throw new Error(msg);
                }

                const users = await res.json();
                setPendingUsers(Array.isArray(users) ? users : []);
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load pending users.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [authHeaders]);

    useEffect(() => {
        const fetchApprovedCount = async () => {
            try {
                const res = await fetch(apiUrl('/api/auth/approved-users/count'), {
                    headers: { ...authHeaders }
                });

                if (!res.ok) {
                    return;
                }

                const data = await res.json();
                const count = Number(data?.count);
                setApprovedCount(Number.isFinite(count) ? count : 0);
            } catch {
                // Keep widget usable even if this count fails.
            }
        };

        fetchApprovedCount();
    }, [authHeaders]);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setClockValue(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setTodayValue(now.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' }));
        };

        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const stats = useMemo(() => {
        const total = pendingUsers.length;
        const owners = pendingUsers.filter((u) => u.role === 'CAFE_OWNER').length;
        const staff = pendingUsers.filter((u) => ['CHEF', 'WAITER'].includes(u.role)).length;
        return { total, owners, staff };
    }, [pendingUsers]);

    const runApprovalAction = async (payload, successFallback, failureFallback) => {
        const { userId } = payload;

        setActionStates((prev) => ({ ...prev, [userId]: true }));
        setMessage('');
        setError('');

        try {
            const res = await fetch(apiUrl('/api/auth/process-approval'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(payload)
            });

            const responseMessage = await readResponseMessage(
                res,
                res.ok ? successFallback : failureFallback
            );

            if (!res.ok) {
                setError(responseMessage);
                return false;
            }

            setMessage(responseMessage);
            setPendingUsers((users) => users.filter((u) => u.id !== userId));
            return true;
        } catch {
            setError('Server error. Please try again.');
            return false;
        } finally {
            setActionStates((prev) => ({ ...prev, [userId]: false }));
        }
    };

    const handleApprove = async (userId, assignedRole) => {
        const success = await runApprovalAction(
            { userId, action: 'APPROVE', assignedRole },
            'User approved!',
            'Approval failed.'
        );

        if (success) {
            setApprovedCount((prev) => prev + 1);
        }
    };

    const handleReject = async (userId, reason) => {
        await runApprovalAction(
            { userId, action: 'REJECT', rejectionReason: reason },
            'User rejected!',
            'Rejection failed.'
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <div className="joli-layout">
            <aside className="joli-sidebar">
                <div className="profile-box">
                    <div className="profile-avatar">A</div>
                    <div className="profile-name">{user?.firstName || 'Admin'} {user?.lastName || ''}</div>
                    <div className="profile-role">Cafe Admin</div>
                </div>

                <div className="menu-section">Navigation</div>
                <nav className="joli-nav">
                    <a className="active" href="#dashboard">Dashboard</a>
                    <a href="#approvals">Approvals</a>
                    <Link to="/profile">Profile</Link>
                    <Link to="/change-password">Change Password</Link>
                </nav>
            </aside>

            <main className="joli-main" id="dashboard">
                <header className="joli-topbar">
                    <div className="left-tools">
                        <span className="hamburger"><span className="fa fa-bars" /></span>
                        <div className="search-box">Search...</div>
                    </div>
                    <div className="right-tools">
                        <Link to="/">Home</Link>
                        <span>{user?.email || 'admin@coffeeconnect.com'}</span>
                        <button type="button" onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <div className="breadcrumb">Home / Dashboard / Widgets</div>
                <h1 className="page-title">Widgets</h1>

                <section className="widget-grid">
                    {widgets.map((widget) => {
                        const value =
                            widget.key === 'total' ? stats.total
                                : widget.key === 'owners' ? stats.owners
                                    : widget.key === 'staff' ? stats.staff
                                        : widget.key === 'approved' ? approvedCount
                                            : clockValue;

                        const subLabel = widget.key === 'clock' ? todayValue : 'Live';

                        return (
                            <div className={`widget ${widget.color}`} key={widget.key}>
                                <h3>{value}</h3>
                                <p>{widget.title}</p>
                                <span className="stat-hint">{subLabel}</span>
                            </div>
                        );
                    })}
                </section>

                {message && <div className="admin-dashboard-message">{message}</div>}
                {error && <div className="admin-dashboard-error">{error}</div>}

                <section className="approvals-panel" id="approvals">
                    <div className="approvals-head">
                        <h2>Registered Users For Approval</h2>
                        <span>{pendingUsers.length} pending</span>
                    </div>

                    {loading ? (
                        <div className="loading">Loading users...</div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="admin-empty-cell">No pending users!</div>
                    ) : (
                        <div className="approval-list">
                            {pendingUsers.map((u) => (
                                <ApprovalCard
                                    key={u.id}
                                    rowUser={u}
                                    busy={Boolean(actionStates[u.id])}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;

