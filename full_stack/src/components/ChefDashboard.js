import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './ChefDashboard.css';

const ChefDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isChef = user?.role === 'CHEF' || localStorage.getItem('role') === 'CHEF';
    const cafeId = user?.cafeId || localStorage.getItem('cafeId');

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [cafeName, setCafeName] = useState('');
    const [activeSection, setActiveSection] = useState('start');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [startPage, setStartPage] = useState(1);
    const [activePage, setActivePage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);

    const pageSize = 10;

    const fetchOrders = useCallback(async () => {
        if (!cafeId) {
            setError('Cafe assignment not found for this account.');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/cafes/${cafeId}/orders`));
            if (!res.ok) {
                throw new Error('Failed to load orders');
            }
            const data = await res.json();
            setOrders(data || []);
            setLastUpdated(new Date());
            setError('');
        } catch (e) {
            setError('Unable to load orders right now.');
        } finally {
            setLoading(false);
        }
    }, [cafeId]);

    const fetchCafeName = useCallback(async () => {
        if (!cafeId) return;
        try {
            const res = await fetch(apiUrl(`/api/cafes/${cafeId}`));
            if (!res.ok) return;
            const data = await res.json();
            const cafe = data?.cafe || data;
            if (cafe?.name) {
                setCafeName(cafe.name);
            }
        } catch {
            // ignore
        }
    }, [cafeId]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { fetchCafeName(); }, [fetchCafeName]);
    useEffect(() => {
        const interval = setInterval(() => {
            fetchOrders();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchOrders]);
    useEffect(() => {
        if (message || error) {
            const timer = setTimeout(() => { setMessage(''); setError(''); }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, error]);

    const updateStatus = async (orderId, status) => {
        if (!cafeId) return;
        try {
            const res = await fetch(apiUrl(`/api/cafes/${cafeId}/orders/${orderId}/status`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || 'Update failed');
            }
            setMessage(`Order marked as ${status}.`);
            await fetchOrders();
        } catch (e) {
            setError(e.message || 'Could not update order status.');
        }
    };

    const normalizeStatus = (status) => (status || '').trim().toUpperCase();
    const startOrders = useMemo(
        () => orders.filter(o => ['PLACED', 'ACCEPTED', 'COOKING'].includes(normalizeStatus(o.status))),
        [orders]
    );
    const activeOrders = useMemo(
        () => orders.filter(o => ['READY'].includes(normalizeStatus(o.status))),
        [orders]
    );
    const completedOrders = useMemo(
        () => orders.filter(o => ['SERVED', 'COMPLETED'].includes(normalizeStatus(o.status))),
        [orders]
    );
    const paginate = (items, page) => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    };

    const startPages = Math.max(1, Math.ceil(startOrders.length / pageSize));
    const activePages = Math.max(1, Math.ceil(activeOrders.length / pageSize));
    const completedPages = Math.max(1, Math.ceil(completedOrders.length / pageSize));

    const startPageOrders = paginate(startOrders, startPage);
    const activePageOrders = paginate(activeOrders, activePage);
    const completedPageOrders = paginate(completedOrders, completedPage);

    if (!isChef) return <Navigate to="/signin" replace />;
    if (loading) return <div className="chef-loading">Loading chef dashboard...</div>;

    const menuItems = [
        { key: 'start', label: '👨‍🍳 Start Cooking', count: startOrders.length },
        { key: 'active', label: '🕒 Active Orders', count: activeOrders.length },
        { key: 'completed', label: '✅ Completed Orders', count: completedOrders.length }
    ];

    const renderStart = () => (
        <section className="chef-section">
            <h2>👨‍🍳 Start Cooking ({startOrders.length})</h2>
            {startOrders.length === 0 ? (
                <div className="chef-empty">No active orders right now.</div>
            ) : (
                <div className="chef-grid">
                    {startPageOrders.map(order => {
                        const status = normalizeStatus(order.status);
                        return (
                        <div key={order.id} className="chef-card">
                            <div className="chef-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className={`chef-status ${(order.status || 'placed').toLowerCase()}`}>{order.status}</span>
                            </div>
                            <div className="chef-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <ul className="chef-items">
                                {(order.items || []).map((item, idx) => (
                                    <li key={`${order.id}-${idx}`}>{item.name} x{item.quantity}</li>
                                ))}
                            </ul>
                            <div className="chef-total">Total: INR {order.totalAmount || 0}</div>
                            <div className="chef-card-actions">
                                {['PLACED', 'ACCEPTED'].includes(status) && (
                                    <button className="chef-btn" onClick={() => updateStatus(order.id, 'COOKING')}>Start Preparing</button>
                                )}
                                {['COOKING'].includes(status) && (
                                    <button className="chef-btn primary" onClick={() => updateStatus(order.id, 'READY')}>Mark Ready</button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
            <div className="chef-pagination">
                <button className="chef-btn ghost" disabled={startPage <= 1} onClick={() => setStartPage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {startPage} / {startPages}</span>
                <button className="chef-btn ghost" disabled={startPage >= startPages} onClick={() => setStartPage(p => Math.min(startPages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderActive = () => (
        <section className="chef-section">
            <h2>🕒 Active Orders ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
                <div className="chef-empty">No ready orders right now.</div>
            ) : (
                <div className="chef-grid">
                    {activePageOrders.map(order => (
                        <div key={`${order.id}-active`} className="chef-card">
                            <div className="chef-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className={`chef-status ${(order.status || 'placed').toLowerCase()}`}>{order.status}</span>
                            </div>
                            <div className="chef-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <div className="chef-card-actions">
                                <button className="chef-btn ghost" disabled>Ready for Waiter</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="chef-pagination">
                <button className="chef-btn ghost" disabled={activePage <= 1} onClick={() => setActivePage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {activePage} / {activePages}</span>
                <button className="chef-btn ghost" disabled={activePage >= activePages} onClick={() => setActivePage(p => Math.min(activePages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderCompleted = () => (
        <section className="chef-section">
            <h2>✅ Completed Orders ({completedOrders.length})</h2>
            {completedOrders.length === 0 ? (
                <div className="chef-empty">No completed orders yet.</div>
            ) : (
                <div className="chef-grid">
                    {completedPageOrders.map(order => (
                        <div key={`${order.id}-completed`} className="chef-card">
                            <div className="chef-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className={`chef-status ${(order.status || 'placed').toLowerCase()}`}>{order.status}</span>
                            </div>
                            <div className="chef-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <ul className="chef-items">
                                {(order.items || []).map((item, idx) => (
                                    <li key={`${order.id}-completed-${idx}`}>{item.name} x{item.quantity}</li>
                                ))}
                            </ul>
                            <div className="chef-total">Total: INR {order.totalAmount || 0}</div>
                        </div>
                    ))}
                </div>
            )}
            <div className="chef-pagination">
                <button className="chef-btn ghost" disabled={completedPage <= 1} onClick={() => setCompletedPage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {completedPage} / {completedPages}</span>
                <button className="chef-btn ghost" disabled={completedPage >= completedPages} onClick={() => setCompletedPage(p => Math.min(completedPages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'start':
                return renderStart();
            case 'active':
                return renderActive();
            case 'completed':
                return renderCompleted();
            default:
                return renderStart();
        }
    };

    return (
        <div className="chef-dashboard">
            <div className={`chef-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
            <aside className={`chef-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="chef-sidebar-header">
                    <div className="chef-sidebar-brand">
                        <span className="chef-brand-icon">🍳</span>
                        <div>
                            <strong>Chef Panel</strong>
                            <small>{cafeName || 'Cafe Assigned'}</small>
                        </div>
                    </div>
                </div>
                <nav className="chef-sidebar-nav">
                    {menuItems.map(item => (
                        <button
                            key={item.key}
                            className={`chef-nav-item ${activeSection === item.key ? 'active' : ''}`}
                            onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                        >
                            <span className="chef-nav-label">{item.label}</span>
                            <span className="chef-nav-count">{item.count}</span>
                        </button>
                    ))}
                </nav>
                <div className="chef-sidebar-footer">
                    <button className="chef-btn ghost chef-btn-block" onClick={fetchOrders}>Refresh</button>
                    <button className="chef-btn ghost chef-btn-block" onClick={() => { logout(); navigate('/signin'); }}>Logout</button>
                </div>
            </aside>

            <main className="chef-main">
                <header className="chef-topbar">
                    <div className="chef-topbar-left">
                        <button className="chef-menu-toggle" onClick={() => setSidebarOpen(true)}>Menu</button>
                        <div>
                            <h1>🍽️ Chef Dashboard</h1>
                            <p>{menuItems.find(m => m.key === activeSection)?.label || 'Active Orders'}</p>
                        </div>
                    </div>
                    <div className="chef-actions">
                        <button className="chef-btn ghost" onClick={fetchOrders}>Refresh</button>
                        <button className="chef-btn ghost" onClick={() => { logout(); navigate('/signin'); }}>Logout</button>
                    </div>
                </header>

                {error && <div className="chef-alert error">{error}</div>}
                {message && <div className="chef-alert success">{message}</div>}
                {lastUpdated && (
                    <div className="chef-alert info">
                        Last updated: {lastUpdated.toLocaleTimeString()} | Orders fetched: {orders.length}
                    </div>
                )}

                {renderContent()}
            </main>
        </div>
    );
};

export default ChefDashboard;

