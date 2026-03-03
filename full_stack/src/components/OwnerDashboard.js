import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './OwnerDashboard.css';
import ImageUploader from './ImageUploader';

const OwnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const ownerId = user?.id || localStorage.getItem('userId');
    const isOwner = user?.role === 'CAFE_OWNER' || localStorage.getItem('role') === 'CAFE_OWNER';

    const [loading, setLoading] = useState(true);
    const [cafe, setCafe] = useState(null);
    const [details, setDetails] = useState(null);
    const [orders, setOrders] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [wizardStep, setWizardStep] = useState(1);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);

    const [cafeForm, setCafeForm] = useState({
        name: '', description: '', phone: '', address: '', city: '', state: '', openHours: '', logoUrl: '', coverImageUrl: ''
    });
    const [menuForm, setMenuForm] = useState({ name: '', description: '', category: '', price: '', imageUrl: '' });
    const [tableForm, setTableForm] = useState({ tableNumber: '', category: 'REGULAR', capacity: '' });
    const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'WAITER' });

    const hasCafe = Boolean(cafe?.id);
    const userName = user?.name || user?.username || 'Owner';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const refreshCafe = useCallback(async () => {
        if (!ownerId) { setLoading(false); return; }
        setLoading(true); setError(''); setMessage('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`));
            if (response.status === 404) { setCafe(null); setDetails(null); setOrders([]); return; }
            if (!response.ok) throw new Error('Failed to fetch owner cafe');
            const cafeData = await response.json();
            setCafe(cafeData);
            const detailsResponse = await fetch(apiUrl(`/api/cafes/${cafeData.id}`));
            if (detailsResponse.ok) setDetails(await detailsResponse.json()); else setDetails(null);
            const ordersResponse = await fetch(apiUrl(`/api/cafes/${cafeData.id}/orders`));
            if (ordersResponse.ok) { const od = await ordersResponse.json(); setOrders(Array.isArray(od) ? od : []); } else setOrders([]);
        } catch (e) { setError('Could not load owner dashboard.'); } finally { setLoading(false); }
    }, [ownerId]);

    useEffect(() => { refreshCafe(); }, [refreshCafe]);
    useEffect(() => { if (!hasCafe) setActiveSection('dashboard'); }, [hasCafe]);
    useEffect(() => { if (message || error) { const t = setTimeout(() => { setMessage(''); setError(''); }, 4000); return () => clearTimeout(t); } }, [message, error]);

    const handleCreateCafe = async () => {
        if (!cafeForm.name || !cafeForm.city || !cafeForm.state) { setError('Cafe name, city and state are required.'); return; }
        setError(''); setMessage('');
        try {
            const r = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cafeForm) });
            if (!r.ok) { const t = await r.text(); throw new Error(t || 'Unable to create cafe'); }
            setMessage('Cafe created successfully!'); await refreshCafe();
        } catch (e) { setError('Failed to create cafe. Check name uniqueness and owner approval.'); }
    };

    const addMenuItem = async () => {
        if (!hasCafe) return;
        if (!menuForm.name || !menuForm.price) { setError('Menu item name and price are required.'); return; }
        setError('');
        try {
            const r = await fetch(apiUrl(`/api/cafes/${cafe.id}/menu`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...menuForm, price: Number(menuForm.price) }) });
            if (!r.ok) throw new Error('Menu add failed');
            setMenuForm({ name: '', description: '', category: '', price: '', imageUrl: '' });
            setMessage('Menu item added successfully!'); setShowMenuModal(false); await refreshCafe();
        } catch (e) { setError('Could not add menu item.'); }
    };

    const addTable = async () => {
        if (!hasCafe) return;
        if (!tableForm.tableNumber || !tableForm.category || !tableForm.capacity) { setError('Table number, category and capacity are required.'); return; }
        setError('');
        try {
            const r = await fetch(apiUrl(`/api/cafes/${cafe.id}/tables`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: tableForm.tableNumber, category: tableForm.category, capacity: Number(tableForm.capacity) }) });
            if (!r.ok) throw new Error('Table add failed');
            setTableForm({ tableNumber: '', category: 'REGULAR', capacity: '' });
            setMessage('Table added successfully!'); setShowTableModal(false); await refreshCafe();
        } catch (e) { setError('Could not add table.'); }
    };

    const addStaff = async () => {
        if (!hasCafe) return;
        if (!staffForm.firstName || !staffForm.lastName || !staffForm.email || !staffForm.role) { setError('Complete staff details are required.'); return; }
        setError('');
        try {
            const r = await fetch(apiUrl(`/api/cafes/${cafe.id}/owner/${ownerId}/employees`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staffForm) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(data.message || 'Staff add failed');
            setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: 'WAITER' });
            setMessage(`Employee created: ${data.username} (temp password: ${data.temporaryPassword})`);
            setShowStaffModal(false); await refreshCafe();
        } catch (e) { setError('Could not register staff member.'); }
    };

    const staffSummary = useMemo(() => details ? `${details.waiterCount || 0} waiters / ${details.chefCount || 0} chefs` : '0 waiters / 0 chefs', [details]);
    const totalStaff = useMemo(() => details ? (details.waiterCount || 0) + (details.chefCount || 0) : 0, [details]);

    const sortedOrders = useMemo(() => [...orders].sort((a, b) => {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bT - aT;
    }), [orders]);

    const formatDateTime = (v) => {
        if (!v) return 'N/A';
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
    };

    if (!isOwner) return <Navigate to="/signin" replace />;
    if (loading) return <div className="od-loading">Loading owner dashboard...</div>;

    const sidebarItems = [
        { key: 'dashboard', icon: '📊', label: 'Dashboard' },
        { key: 'menu', icon: '🍽️', label: 'Menu' },
        { key: 'mycafe', icon: '☕', label: 'My Cafe' },
        { key: 'tables', icon: '🪑', label: 'Tables' },
        { key: 'bookings', icon: '📅', label: 'Bookings' },
        { key: 'staff', icon: '👥', label: 'Staff' },
        { key: 'orders', icon: '📋', label: 'Orders' },
        { key: 'profile', icon: '👤', label: 'My Profile' },
    ];

    const sectionTitles = {
        dashboard: 'Dashboard Overview',
        menu: 'Cafe Menu',
        mycafe: 'My Cafe',
        tables: 'Table Management',
        bookings: 'Table Bookings',
        staff: 'Staff Management',
        orders: 'Customer Orders',
        profile: 'My Profile',
    };

    // ===== RENDER SECTIONS =====

    const renderDashboard = () => (
        <>
            <div className="od-stats-grid">
                <div className="od-stat-card">
                    <div className="od-stat-icon blue">📅</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{sortedOrders.length}</div>
                        <div className="od-stat-label">Total Bookings</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon orange">⏳</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length}</div>
                        <div className="od-stat-label">Pending Requests</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon green">₹</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">₹{sortedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)}</div>
                        <div className="od-stat-label">Total Revenue</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon brown">🍽️</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{details?.menu?.length || 0}</div>
                        <div className="od-stat-label">Menu Items</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon purple">👥</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{totalStaff}</div>
                        <div className="od-stat-label">Staff Members</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon red">🪑</div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{details?.tables?.length || 0}</div>
                        <div className="od-stat-label">Tables</div>
                    </div>
                </div>
            </div>

            <div className="od-two-col">
                <div className="od-section-card">
                    <h2>☕ Booking Distribution</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(#2e8b57 0% ${sortedOrders.length ? ((sortedOrders.filter(o => o.status === 'COMPLETED').length / sortedOrders.length) * 100) : 0}%, #e67e22 ${sortedOrders.length ? ((sortedOrders.filter(o => o.status === 'COMPLETED').length / sortedOrders.length) * 100) : 0}% ${sortedOrders.length ? (((sortedOrders.filter(o => o.status === 'COMPLETED').length + sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length) / sortedOrders.length) * 100) : 0}%, #c0392b ${sortedOrders.length ? (((sortedOrders.filter(o => o.status === 'COMPLETED').length + sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length) / sortedOrders.length) * 100) : 0}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
                                {sortedOrders.length}<br /><span style={{ fontSize: 10, color: '#8a7968' }}>Total</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2e8b57' }}></span>
                                Completed ({sortedOrders.filter(o => o.status === 'COMPLETED').length})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e67e22' }}></span>
                                Pending ({sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#c0392b' }}></span>
                                Rejected ({sortedOrders.filter(o => o.status === 'REJECTED' || o.status === 'CANCELLED').length})
                            </div>
                        </div>
                    </div>
                </div>

                <div className="od-section-card">
                    <h2>📈 Revenue Overview</h2>
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ fontSize: 12, color: '#8a7968' }}>Total Revenue</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#2e8b57', margin: '6px 0' }}>₹{sortedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 14 }}>
                            <div>
                                <div style={{ fontSize: 12, color: '#8a7968' }}>Completed Orders</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{sortedOrders.filter(o => o.status === 'COMPLETED').length}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: '#8a7968' }}>Avg. per Order</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>₹{sortedOrders.filter(o => o.status === 'COMPLETED').length ? Math.round(sortedOrders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.totalAmount || 0), 0) / sortedOrders.filter(o => o.status === 'COMPLETED').length) : 0}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="od-section-card" style={{ marginTop: 18 }}>
                <h2>🕐 Recent Activity (Last 5)</h2>
                <div className="od-activity-list">
                    {sortedOrders.slice(0, 5).map((order, i) => (
                        <div key={order.id || i} className="od-activity-item">
                            <span className={`od-activity-dot ${order.status === 'COMPLETED' ? 'success' : order.status === 'REJECTED' || order.status === 'CANCELLED' ? 'danger' : 'pending'}`}></span>
                            <span className="od-activity-text">
                                Order #{order.id?.slice(-6) || 'N/A'} — {order.status || 'PLACED'} — Rs. {order.totalAmount || 0}
                            </span>
                            <span className="od-activity-time">{formatDateTime(order.createdAt)}</span>
                        </div>
                    ))}
                    {sortedOrders.length === 0 && <p style={{ color: '#8a7968', padding: '12px 0' }}>No activity yet.</p>}
                </div>
            </div>
        </>
    );

    const renderMenu = () => (
        <>
            <div className="od-toolbar">
                <div className="od-toolbar-left">
                    <button className="od-btn od-btn-primary" onClick={() => setShowMenuModal(true)}>+ Add Menu Item</button>
                </div>
                <div className="od-toolbar-right">
                    <button className="od-btn od-btn-ghost" onClick={refreshCafe}>↻ Refresh</button>
                </div>
            </div>
            {(details?.menu?.length || 0) === 0 ? (
                <div className="od-section-card" style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                    <p style={{ margin: 0 }}>No menu items yet. Add your first item!</p>
                </div>
            ) : (
                <div className="od-menu-grid">
                    {(details?.menu || []).map(item => (
                        <div key={item.id} className="od-menu-card">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} />
                            ) : (
                                <div style={{ width: '100%', height: 170, background: '#f5ede4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8a898', fontSize: 40 }}>
                                    🖼️
                                </div>
                            )}
                            <div className="od-menu-card-body">
                                <div className="od-menu-card-top">
                                    <h4>{item.name}</h4>
                                    <span className="od-price-badge">₹{item.price}</span>
                                </div>
                                {item.category && <span className="od-category-tag">Category: {item.category}</span>}
                                {item.description && <p style={{ margin: 0, fontSize: 13, color: '#8a7968' }}>{item.description}</p>}
                            </div>
                            <div className="od-menu-card-actions">
                                <button className="od-icon-btn" title="Edit">✏️</button>
                                <button className="od-icon-btn danger" title="Delete">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
    const renderMyCafe = () => (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0 }}>{cafe?.name || 'My Cafe'}</h2>
                    <span className="od-status-badge completed" style={{ fontSize: 13, padding: '5px 14px' }}>✅ Active</span>
                </div>
                <button className="od-btn od-btn-primary">✏️ Edit Cafe</button>
            </div>
            <div className="od-info-grid">
                <div className="od-info-card">
                    <h3>ℹ️ Basic Information</h3>
                    <div className="od-info-row"><span className="od-info-label">Description:</span><span className="od-info-value">{cafe?.description || 'No description'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Email:</span><span className="od-info-value">{user?.email || 'Not provided'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Phone:</span><span className="od-info-value">{cafe?.phone || 'Not provided'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Hours:</span><span className="od-info-value">{cafe?.openHours || 'Not set'}</span></div>
                </div>
                <div className="od-info-card">
                    <h3>📍 Address</h3>
                    <div className="od-info-row"><span className="od-info-label">Street:</span><span className="od-info-value">{cafe?.address || 'Not provided'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">City:</span><span className="od-info-value">{cafe?.city || '-'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">State:</span><span className="od-info-value">{cafe?.state || '-'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Country:</span><span className="od-info-value">India</span></div>
                </div>
                <div className="od-info-card">
                    <h3>⚙️ Facilities</h3>
                    <div className="od-facility-chips">
                        <span className="od-facility-chip">✅ WiFi</span>
                        <span className="od-facility-chip">✅ Air Conditioning</span>
                        <span className="od-facility-chip">❌ Parking</span>
                    </div>
                </div>
                <div className="od-info-card">
                    <h3>📊 Capacity</h3>
                    <div className="od-info-row"><span className="od-info-label">Total Tables:</span><span className="od-info-value">{details?.tables?.length || 0}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Total Seats:</span><span className="od-info-value">{(details?.tables || []).reduce((s, t) => s + (t.capacity || 0), 0)}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Staff:</span><span className="od-info-value">{staffSummary}</span></div>
                </div>
            </div>
        </>
    );

    const renderTables = () => (
        <>
            <div className="od-toolbar">
                <div className="od-toolbar-left">
                    <button className="od-btn od-btn-primary" onClick={() => setShowTableModal(true)}>+ Add Table</button>
                </div>
                <div className="od-toolbar-right">
                    <button className="od-btn od-btn-ghost" onClick={refreshCafe}>↻ Refresh</button>
                </div>
            </div>
            {(details?.tables?.length || 0) === 0 ? (
                <div className="od-section-card" style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>No tables yet. Add your first table!</div>
            ) : (
                <div className="od-table-grid">
                    {(details?.tables || []).map(table => (
                        <div key={table.id} className="od-table-card">
                            <div className="od-table-card-head">
                                <h4>Table #{table.tableNumber}</h4>
                                <button className="od-icon-btn" title="Edit">✏️</button>
                            </div>
                            <div className="od-table-row"><span>Type</span><span>{table.category || 'Regular'}</span></div>
                            <div className="od-table-row"><span>Capacity</span><span>{table.capacity} seats</span></div>
                            <div className={`od-table-status ${table.status === 'BOOKED' || table.status === 'OCCUPIED' ? 'booked' : 'available'}`}>
                                {table.status === 'BOOKED' || table.status === 'OCCUPIED' ? '⏳ Booked' : '✅ Available'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderBookings = () => (
        <>
            <div className="od-filter-bar">
                <span className="od-filter-chip active">Total: {sortedOrders.length}</span>
                <span className="od-filter-chip" style={{ color: '#e67e22', borderColor: '#e67e22' }}>Pending: {sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length}</span>
                <span className="od-filter-chip" style={{ color: '#2980b9', borderColor: '#2980b9' }}>Accepted: {sortedOrders.filter(o => o.status === 'ACCEPTED').length}</span>
                <span className="od-filter-chip" style={{ color: '#2e8b57', borderColor: '#2e8b57' }}>Completed: {sortedOrders.filter(o => o.status === 'COMPLETED').length}</span>
                <span className="od-filter-chip" style={{ color: '#c0392b', borderColor: '#c0392b' }}>Rejected: {sortedOrders.filter(o => o.status === 'REJECTED' || o.status === 'CANCELLED').length}</span>
            </div>
            {sortedOrders.length === 0 ? (
                <div className="od-section-card" style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>No bookings yet.</div>
            ) : (
                <div className="od-booking-grid">
                    {sortedOrders.map(order => (
                        <div key={order.id} className="od-booking-card">
                            <div className="od-booking-card-head">
                                <h4>Order #{order.id?.slice(-6) || 'N/A'}</h4>
                                <span className={`od-status-badge ${(order.status || 'pending').toLowerCase()}`}>{order.status || 'PLACED'}</span>
                            </div>
                            <div className="od-booking-detail"><span className="detail-icon">🕐</span>{formatDateTime(order.createdAt)}</div>
                            <div className="od-booking-detail"><span className="detail-icon">🪑</span>Table {order.tableNumber || 'N/A'}</div>
                            <div className="od-booking-detail"><span className="detail-icon">💰</span>Rs. {order.totalAmount || 0}</div>
                            {(order.status === 'PENDING' || order.status === 'PLACED' || order.status === 'ACCEPTED') && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <button className="od-btn od-btn-success" style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}>✅ Mark Completed</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderStaff = () => (
        <>
            <div className="od-toolbar">
                <div className="od-toolbar-left">
                    <button className="od-btn od-btn-primary" onClick={() => setShowStaffModal(true)}>👥 Add Staff</button>
                </div>
                <div className="od-toolbar-right">
                    <button className="od-btn od-btn-ghost" onClick={refreshCafe}>↻ Refresh</button>
                </div>
            </div>
            <div className="od-section-card">
                <p style={{ color: '#8a7968', margin: 0 }}>Staff summary: <strong>{staffSummary}</strong></p>
            </div>
        </>
    );

    const renderOrders = () => (
        <>
            <div className="od-toolbar">
                <h3 style={{ margin: 0 }}>Customer Orders ({sortedOrders.length})</h3>
                <button className="od-btn od-btn-primary" onClick={refreshCafe}>↻ Refresh Orders</button>
            </div>
            {sortedOrders.length === 0 ? (
                <div className="od-section-card" style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>No customer orders yet.</div>
            ) : (
                <div className="od-orders-grid">
                    {sortedOrders.map(order => (
                        <div key={order.id} className="od-order-card">
                            <div className="od-order-top">
                                <strong>Order #{order.id?.slice(-6) || 'N/A'}</strong>
                                <span className={`od-status-badge ${(order.status || 'pending').toLowerCase()}`}>{order.status || 'PLACED'}</span>
                            </div>
                            <p className="od-order-meta">Table {order.tableNumber || '-'} | {formatDateTime(order.createdAt)}</p>
                            <ul className="od-order-items">
                                {(order.items || []).map((item, idx) => (
                                    <li key={`${order.id}-${idx}`}>{item.name} x{item.quantity} — Rs. {item.price}</li>
                                ))}
                            </ul>
                            <p className="od-order-total">Total: Rs. {order.totalAmount || 0}</p>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderProfile = () => (
        <div className="od-section-card">
            <h2>👤 Owner Profile</h2>
            <div className="od-info-grid" style={{ marginTop: 12 }}>
                <div className="od-info-card">
                    <h3>Personal Information</h3>
                    <div className="od-info-row"><span className="od-info-label">Name</span><span className="od-info-value">{userName}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Email</span><span className="od-info-value">{user?.email || 'N/A'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Role</span><span className="od-info-value">Cafe Owner</span></div>
                </div>
                <div className="od-info-card">
                    <h3>Cafe Information</h3>
                    <div className="od-info-row"><span className="od-info-label">Cafe Name</span><span className="od-info-value">{cafe?.name || 'Not registered'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Location</span><span className="od-info-value">{cafe ? `${cafe.city}, ${cafe.state}` : 'N/A'}</span></div>
                    <div className="od-info-row"><span className="od-info-label">Staff</span><span className="od-info-value">{staffSummary}</span></div>
                </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="od-btn od-btn-ghost" onClick={() => navigate('/profile')}>✏️ Edit Profile</button>
                <button className="od-btn od-btn-ghost" onClick={() => navigate('/')}>🏠 Customer View</button>
            </div>
        </div>
    );

    const renderSectionContent = () => {
        if (!hasCafe && activeSection !== 'dashboard') {
            return <div className="od-section-card" style={{ textAlign: 'center', padding: 40 }}>Please register your cafe first to access this section.</div>;
        }
        switch (activeSection) {
            case 'dashboard': return hasCafe ? renderDashboard() : null;
            case 'menu': return renderMenu();
            case 'mycafe': return renderMyCafe();
            case 'tables': return renderTables();
            case 'bookings': return renderBookings();
            case 'staff': return renderStaff();
            case 'orders': return renderOrders();
            case 'profile': return renderProfile();
            default: return renderDashboard();
        }
    };

    // ===== MAIN RETURN =====
    return (
        <div className="owner-dash">
            {/* Sidebar overlay for mobile */}
            <div className={`od-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <aside className={`od-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <button className="od-sidebar-brand" onClick={() => navigate('/')}>
                    <span className="od-sidebar-brand-icon">CB</span>
                    <span>
                        <strong>Cafe Bridge</strong>
                        <small>Owner Panel</small>
                    </span>
                </button>
                <div className="od-sidebar-welcome">Welcome, {userName}!</div>
                <nav className="od-sidebar-nav">
                    {sidebarItems.map(item => (
                        <button
                            key={item.key}
                            className={activeSection === item.key ? 'active' : ''}
                            onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="od-sidebar-logout">
                    <button onClick={() => { logout(); navigate('/signin'); }}>🚪 Logout</button>
                </div>
            </aside>

            {/* Main content */}
            <div className="od-main">
                <header className="od-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="od-menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
                        <h1>{sectionTitles[activeSection] || 'Dashboard'}</h1>
                    </div>
                    <div className="od-topbar-actions">
                        <button className="od-notif-btn">
                            🔔
                            {sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length > 0 && (
                                <span className="od-notif-badge">{sortedOrders.filter(o => o.status === 'PENDING' || o.status === 'PLACED').length}</span>
                            )}
                        </button>
                        <div className="od-avatar">{userInitials}</div>
                    </div>
                </header>

                <div className="od-content">
                    {message && <div className="od-flash success">✅ {message}</div>}
                    {error && <div className="od-flash error">❌ {error}</div>}

                    {!hasCafe ? (
                        <div className="od-setup-panel">
                            <h2 style={{ margin: '0 0 14px' }}>Register Your Cafe</h2>
                            <p style={{ color: '#8a7968', marginBottom: 18 }}>Complete setup to publish your cafe for customers.</p>
                            <div className="od-setup-steps">
                                {[1, 2, 3, 4].map(step => (
                                    <button key={step} className={`od-step-btn ${wizardStep === step ? 'active' : ''}`} onClick={() => setWizardStep(step)}>
                                        Step {step}
                                    </button>
                                ))}
                            </div>
                            <div className="od-setup-form">
                                {wizardStep === 1 && (
                                    <>
                                        <h3>Basic Details</h3>
                                        <input placeholder="Cafe Name *" value={cafeForm.name} onChange={e => setCafeForm({ ...cafeForm, name: e.target.value })} />
                                        <textarea placeholder="Description" value={cafeForm.description} onChange={e => setCafeForm({ ...cafeForm, description: e.target.value })} />
                                        <input placeholder="Phone" value={cafeForm.phone} onChange={e => setCafeForm({ ...cafeForm, phone: e.target.value })} />
                                    </>
                                )}
                                {wizardStep === 2 && (
                                    <>
                                        <h3>Location & Hours</h3>
                                        <input placeholder="Address" value={cafeForm.address} onChange={e => setCafeForm({ ...cafeForm, address: e.target.value })} />
                                        <input placeholder="City *" value={cafeForm.city} onChange={e => setCafeForm({ ...cafeForm, city: e.target.value })} />
                                        <input placeholder="State *" value={cafeForm.state} onChange={e => setCafeForm({ ...cafeForm, state: e.target.value })} />
                                        <input placeholder="Open Hours (e.g. 8 AM - 11 PM)" value={cafeForm.openHours} onChange={e => setCafeForm({ ...cafeForm, openHours: e.target.value })} />
                                    </>
                                )}
                                {wizardStep === 3 && (
                                    <>
                                        <h3>Photos</h3>
                                        <ImageUploader
                                            label="Cafe Logo"
                                            value={cafeForm.logoUrl}
                                            onChange={(val) => setCafeForm({ ...cafeForm, logoUrl: val })}
                                            multiple={false}
                                            maxSizeMB={2}
                                        />
                                        <ImageUploader
                                            label="Cover Image"
                                            value={cafeForm.coverImageUrl}
                                            onChange={(val) => setCafeForm({ ...cafeForm, coverImageUrl: val })}
                                            multiple={false}
                                            maxSizeMB={3}
                                        />
                                    </>
                                )}
                                {wizardStep === 4 && (
                                    <>
                                        <h3>Review & Submit</h3>
                                        <p><strong>Name:</strong> {cafeForm.name || '-'}</p>
                                        <p><strong>City/State:</strong> {cafeForm.city || '-'}, {cafeForm.state || '-'}</p>
                                        <p><strong>Hours:</strong> {cafeForm.openHours || '-'}</p>
                                        <button className="od-btn od-btn-primary" onClick={handleCreateCafe}>🚀 Create Cafe</button>
                                    </>
                                )}
                            </div>
                            <div className="od-setup-nav">
                                <button className="od-btn od-btn-ghost" disabled={wizardStep === 1} onClick={() => setWizardStep(s => Math.max(1, s - 1))}>← Previous</button>
                                <button className="od-btn od-btn-primary" disabled={wizardStep === 4} onClick={() => setWizardStep(s => Math.min(4, s + 1))}>Next →</button>
                            </div>
                        </div>
                    ) : (
                        renderSectionContent()
                    )}
                </div>
            </div>

            {/* ===== MODALS ===== */}

            {showMenuModal && (
                <div className="od-modal-overlay" onClick={() => setShowMenuModal(false)}>
                    <div className="od-modal" onClick={e => e.stopPropagation()}>
                        <div className="od-modal-head">
                            <h2>🍽️ Add Menu Item</h2>
                            <button className="od-modal-close" onClick={() => setShowMenuModal(false)}>✕</button>
                        </div>
                        <div className="od-modal-form">
                            <div className="od-form-row">
                                <div className="od-form-group"><label>Item name *</label><input placeholder="e.g. Cold Coffee" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} /></div>
                                <div className="od-form-group"><label>Category</label><input placeholder="Coffee, Snacks..." value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} /></div>
                            </div>
                            <div className="od-form-group"><label>Price (₹) *</label><input type="number" placeholder="0" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} /></div>
                            <div className="od-form-group"><label>Description</label><textarea placeholder="Describe the item..." value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} /></div>
                            <ImageUploader
                                label="Item Photo"
                                value={menuForm.imageUrl}
                                onChange={(val) => setMenuForm({ ...menuForm, imageUrl: val })}
                                multiple={false}
                                maxSizeMB={2}
                            />
                        </div>
                        <div className="od-modal-footer">
                            <button className="od-btn od-btn-ghost" onClick={() => setShowMenuModal(false)}>Cancel</button>
                            <button className="od-btn od-btn-primary" onClick={addMenuItem}>✓ Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showTableModal && (
                <div className="od-modal-overlay" onClick={() => setShowTableModal(false)}>
                    <div className="od-modal" onClick={e => e.stopPropagation()}>
                        <div className="od-modal-head">
                            <h2>🪑 Add Table</h2>
                            <button className="od-modal-close" onClick={() => setShowTableModal(false)}>✕</button>
                        </div>
                        <div className="od-modal-form">
                            <div className="od-form-group"><label>Table Number *</label><input placeholder="e.g. 1" value={tableForm.tableNumber} onChange={e => setTableForm({ ...tableForm, tableNumber: e.target.value })} /></div>
                            <div className="od-form-row">
                                <div className="od-form-group">
                                    <label>Category *</label>
                                    <select value={tableForm.category} onChange={e => setTableForm({ ...tableForm, category: e.target.value })}>
                                        <option value="REGULAR">Regular Table</option>
                                        <option value="FAMILY">Family Table</option>
                                        <option value="VALENTINE">Valentine Table</option>
                                        <option value="VIP">VIP Table</option>
                                        <option value="WINDOW">Window Side Table</option>
                                    </select>
                                </div>
                                <div className="od-form-group"><label>Capacity *</label><input type="number" placeholder="4" value={tableForm.capacity} onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="od-modal-footer">
                            <button className="od-btn od-btn-ghost" onClick={() => setShowTableModal(false)}>Cancel</button>
                            <button className="od-btn od-btn-primary" onClick={addTable}>✓ Add Table</button>
                        </div>
                    </div>
                </div>
            )}

            {showStaffModal && (
                <div className="od-modal-overlay" onClick={() => setShowStaffModal(false)}>
                    <div className="od-modal" onClick={e => e.stopPropagation()}>
                        <div className="od-modal-head">
                            <h2>👥 Add Staff Member</h2>
                            <button className="od-modal-close" onClick={() => setShowStaffModal(false)}>✕</button>
                        </div>
                        <div className="od-modal-form">
                            <div className="od-form-row">
                                <div className="od-form-group"><label>First Name *</label><input value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })} /></div>
                                <div className="od-form-group"><label>Last Name *</label><input value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })} /></div>
                            </div>
                            <div className="od-form-row">
                                <div className="od-form-group"><label>Email *</label><input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} /></div>
                                <div className="od-form-group"><label>Phone</label><input value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} /></div>
                            </div>
                            <div className="od-form-group">
                                <label>Role *</label>
                                <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                                    <option value="WAITER">Waiter</option>
                                    <option value="CHEF">Chef</option>
                                </select>
                            </div>
                        </div>
                        <div className="od-modal-footer">
                            <button className="od-btn od-btn-ghost" onClick={() => setShowStaffModal(false)}>Cancel</button>
                            <button className="od-btn od-btn-primary" onClick={addStaff}>✓ Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;