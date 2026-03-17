import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './WaiterDashboard.css';

const WaiterDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isWaiter = user?.role === 'WAITER' || localStorage.getItem('role') === 'WAITER';
    const cafeId = user?.cafeId || localStorage.getItem('cafeId');

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [cafeName, setCafeName] = useState('');
    const [activeSection, setActiveSection] = useState('ready');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [readyPage, setReadyPage] = useState(1);
    const [activePage, setActivePage] = useState(1);
    const [queuePage, setQueuePage] = useState(1);

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
    const readyOrders = useMemo(
        () => orders.filter(o => normalizeStatus(o.status) === 'READY'),
        [orders]
    );
    const servingOrders = useMemo(
        () => orders.filter(o => normalizeStatus(o.status) === 'SERVING'),
        [orders]
    );
    const completedOrders = useMemo(
        () => orders.filter(o => ['SERVED', 'COMPLETED'].includes(normalizeStatus(o.status))),
        [orders]
    );
    const inProgressCount = useMemo(
        () => orders.filter(o => ['PLACED', 'COOKING', 'ACCEPTED'].includes(normalizeStatus(o.status))).length,
        [orders]
    );
    const paginate = (items, page) => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    };

    const readyPages = Math.max(1, Math.ceil(readyOrders.length / pageSize));
    const servingPages = Math.max(1, Math.ceil(servingOrders.length / pageSize));
    const completedPages = Math.max(1, Math.ceil(completedOrders.length / pageSize));

    const readyPageOrders = paginate(readyOrders, readyPage);
    const servingPageOrders = paginate(servingOrders, activePage);
    const completedPageOrders = paginate(completedOrders, queuePage);

    if (!isWaiter) return <Navigate to="/signin" replace />;
    if (loading) return <div className="waiter-loading">Loading waiter dashboard...</div>;

    const menuItems = [
        { key: 'ready', label: '✅ Ready To Serve', count: readyOrders.length },
        { key: 'active', label: '🛎️ Active Orders', count: servingOrders.length },
        { key: 'queue', label: '✅ Completed Orders', count: completedOrders.length }
    ];

    const renderReady = () => (
        <section className="waiter-section">
            <h2>✅ Ready To Serve ({readyOrders.length})</h2>
            {readyOrders.length === 0 ? (
                <div className="waiter-empty">No ready orders at the moment.</div>
            ) : (
                <div className="waiter-grid">
                    {readyPageOrders.map(order => (
                        <div key={order.id} className="waiter-card">
                            <div className="waiter-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className="waiter-status ready">READY</span>
                            </div>
                            <div className="waiter-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <ul className="waiter-items">
                                {(order.items || []).map((item, idx) => (
                                    <li key={`${order.id}-${idx}`}>{item.name} x{item.quantity}</li>
                                ))}
                            </ul>
                            <div className="waiter-total">Total: INR {order.totalAmount || 0}</div>
                            <div className="waiter-card-actions">
                                <button className="waiter-btn primary" onClick={() => updateStatus(order.id, 'SERVING')}>
                                    Take Order
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="waiter-pagination">
                <button className="waiter-btn ghost" disabled={readyPage <= 1} onClick={() => setReadyPage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {readyPage} / {readyPages}</span>
                <button className="waiter-btn ghost" disabled={readyPage >= readyPages} onClick={() => setReadyPage(p => Math.min(readyPages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderServing = () => (
        <section className="waiter-section">
            <h2>🛎️ Active Orders ({servingOrders.length})</h2>
            {servingOrders.length === 0 ? (
                <div className="waiter-empty">No orders currently being served.</div>
            ) : (
                <div className="waiter-grid">
                    {servingPageOrders.map(order => (
                        <div key={`${order.id}-serving`} className="waiter-card">
                            <div className="waiter-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className="waiter-status ready">SERVING</span>
                            </div>
                            <div className="waiter-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <div className="waiter-total">Total: INR {order.totalAmount || 0}</div>
                            <div className="waiter-card-actions">
                                <button className="waiter-btn primary" onClick={() => updateStatus(order.id, 'SERVED')}>
                                    Mark Delivered
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="waiter-pagination">
                <button className="waiter-btn ghost" disabled={activePage <= 1} onClick={() => setActivePage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {activePage} / {servingPages}</span>
                <button className="waiter-btn ghost" disabled={activePage >= servingPages} onClick={() => setActivePage(p => Math.min(servingPages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderQueue = () => (
        <section className="waiter-section">
            <h2>✅ Completed Orders ({completedOrders.length})</h2>
            {completedOrders.length === 0 ? (
                <div className="waiter-empty">No completed orders yet.</div>
            ) : (
                <div className="waiter-grid">
                    {completedPageOrders.map(order => (
                        <div key={`${order.id}-queue`} className="waiter-card">
                            <div className="waiter-card-top">
                                <strong>Order #{order.id?.slice(-6)}</strong>
                                <span className="waiter-status ready">{normalizeStatus(order.status) || 'UNKNOWN'}</span>
                            </div>
                            <div className="waiter-meta">Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}</div>
                            <ul className="waiter-items">
                                {(order.items || []).map((item, idx) => (
                                    <li key={`${order.id}-completed-${idx}`}>{item.name} x{item.quantity}</li>
                                ))}
                            </ul>
                            <div className="waiter-total">Total: INR {order.totalAmount || 0}</div>
                        </div>
                    ))}
                </div>
            )}
            <div className="waiter-pagination">
                <button className="waiter-btn ghost" disabled={queuePage <= 1} onClick={() => setQueuePage(p => Math.max(1, p - 1))}>Previous</button>
                <span>Page {queuePage} / {completedPages}</span>
                <button className="waiter-btn ghost" disabled={queuePage >= completedPages} onClick={() => setQueuePage(p => Math.min(completedPages, p + 1))}>Next</button>
            </div>
        </section>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'ready':
                return renderReady();
            case 'active':
                return renderServing();
            case 'queue':
                return renderQueue();
            default:
                return renderReady();
        }
    };

    return (
        <div className="waiter-dashboard">
            <div className={`waiter-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
            <aside className={`waiter-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="waiter-sidebar-header">
                    <div className="waiter-sidebar-brand">
                        <span className="waiter-brand-icon">🧑‍🍽️</span>
                        <div>
                            <strong>Waiter Panel</strong>
                            <small>{cafeName || 'Cafe Assigned'}</small>
                        </div>
                    </div>
                </div>
                <nav className="waiter-sidebar-nav">
                    {menuItems.map(item => (
                        <button
                            key={item.key}
                            className={`waiter-nav-item ${activeSection === item.key ? 'active' : ''}`}
                            onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                        >
                            <span className="waiter-nav-label">{item.label}</span>
                            <span className="waiter-nav-count">{item.count}</span>
                        </button>
                    ))}
                </nav>
                <div className="waiter-sidebar-footer">
                    <button className="waiter-btn ghost waiter-btn-block" onClick={fetchOrders}>Refresh</button>
                    <button className="waiter-btn ghost waiter-btn-block" onClick={() => { logout(); navigate('/signin'); }}>Logout</button>
                </div>
            </aside>

            <main className="waiter-main">
                <header className="waiter-topbar">
                    <div className="waiter-topbar-left">
                        <button className="waiter-menu-toggle" onClick={() => setSidebarOpen(true)}>Menu</button>
                        <div>
                            <h1>🧑‍🍽️ Waiter Dashboard</h1>
                            <p>{menuItems.find(m => m.key === activeSection)?.label || 'Ready To Serve'}</p>
                        </div>
                    </div>
                    <div className="waiter-actions">
                        <button className="waiter-btn ghost" onClick={fetchOrders}>Refresh</button>
                        <button className="waiter-btn ghost" onClick={() => { logout(); navigate('/signin'); }}>Logout</button>
                    </div>
                </header>

                {error && <div className="waiter-alert error">{error}</div>}
                {message && <div className="waiter-alert success">{message}</div>}
                {lastUpdated && (
                    <div className="waiter-alert info">
                        Last updated: {lastUpdated.toLocaleTimeString()} | Orders fetched: {orders.length} | In kitchen: {inProgressCount}
                    </div>
                )}

                {renderContent()}
            </main>
        </div>
    );
};

export default WaiterDashboard;

