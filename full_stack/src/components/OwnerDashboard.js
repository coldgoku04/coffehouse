
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './OwnerDashboard.css';
import ImageUploader from './ImageUploader';

const emptyMenu = { name: '', description: '', category: '', price: '', imageUrl: '' };
const emptyTable = { tableNumber: '', category: 'REGULAR', capacity: '' };
const emptyStaff = {
    firstName: '', lastName: '', email: '', phone: '', role: 'WAITER', dateOfBirth: '',
    education: '', schoolName: '', collegeName: '', degreeDetails: '', courseStream: '',
    yearOfPassing: '', rollNumber: '', govIdType: '', address: '', city: '', state: '', postalCode: '', country: 'India'
};

const PENDING_STATUSES = ['PLACED', 'ACCEPTED', 'COOKING', 'READY', 'SERVING'];
const COMPLETED_STATUSES = ['COMPLETED', 'SERVED'];

const OwnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const ownerId = user?.id || localStorage.getItem('userId');
    const isOwner = user?.role === 'CAFE_OWNER' || localStorage.getItem('role') === 'CAFE_OWNER';

    const [loading, setLoading] = useState(true);
    const [cafe, setCafe] = useState(null);
    const [details, setDetails] = useState(null);
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activeSection, setActiveSection] = useState('dashboard');
    const [menuForm, setMenuForm] = useState(emptyMenu);
    const [tableForm, setTableForm] = useState(emptyTable);
    const [staffForm, setStaffForm] = useState(emptyStaff);
    const [menuEditId, setMenuEditId] = useState(null);
    const [tableEditId, setTableEditId] = useState(null);
    const [orderPage, setOrderPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [cafeForm, setCafeForm] = useState({
        name: '', description: '', phone: '', address: '', city: '', state: '', openHours: '', logoUrl: '', coverImageUrl: ''
    });

    const hasCafe = Boolean(cafe?.id);
    const userName = user?.name || user?.username || 'Owner';

    const refreshCafe = useCallback(async () => {
        if (!ownerId) { setLoading(false); return; }
        setLoading(true);
        try {
            const ownerRes = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`));
            if (!ownerRes.ok) { setCafe(null); setDetails(null); setOrders([]); return; }
            const cafeData = await ownerRes.json();
            setCafe(cafeData);
            const detailsRes = await fetch(apiUrl(`/api/cafes/${cafeData.id}`));
            const ordersRes = await fetch(apiUrl(`/api/cafes/${cafeData.id}/orders`));
            setDetails(detailsRes.ok ? await detailsRes.json() : null);
            setOrders(ordersRes.ok ? await ordersRes.json() : []);
        } catch (e) {
            setError('Failed to load owner dashboard');
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    useEffect(() => { refreshCafe(); }, [refreshCafe]);
    useEffect(() => {
        if (message || error) {
            const timer = setTimeout(() => { setMessage(''); setError(''); }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message, error]);

    const handleCreateCafe = async () => {
        if (!cafeForm.name || !cafeForm.city || !cafeForm.state) {
            setError('Cafe name, city and state are required.');
            return;
        }
        setError('');
        setMessage('');
        try {
            const r = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cafeForm)
            });
            if (!r.ok) {
                const t = await r.text();
                throw new Error(t || 'Unable to create cafe');
            }
            setMessage('Cafe created successfully!');
            await refreshCafe();
        } catch (e) {
            setError('Failed to create cafe. Check name uniqueness and owner approval.');
        }
    };

    const sortedOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [orders]);
    const pages = Math.max(1, Math.ceil(sortedOrders.length / 8));
    const pageOrders = sortedOrders.slice((orderPage - 1) * 8, orderPage * 8);
    const servedNotifications = sortedOrders.filter(o => (o.status || '').toUpperCase() === 'SERVED');

    const saveMenu = async () => {
        if (!hasCafe) return;
        const method = menuEditId ? 'PUT' : 'POST';
        const path = menuEditId ? `/api/cafes/${cafe.id}/menu/${menuEditId}` : `/api/cafes/${cafe.id}/menu`;
        const res = await fetch(apiUrl(path), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...menuForm, price: Number(menuForm.price) }) });
        if (!res.ok) { setError('Menu save failed'); return; }
        setMenuForm(emptyMenu);
        setMenuEditId(null);
        setMessage('Menu item saved successfully!');
        await refreshCafe();
    };

    const editMenu = (m) => {
        setMenuEditId(m.id);
        setMenuForm({ name: m.name || '', description: m.description || '', category: m.category || '', price: m.price ?? '', imageUrl: m.imageUrl || '' });
    };

    const removeMenu = async (id) => {
        if (window.confirm('Are you sure you want to delete this menu item?')) {
            await fetch(apiUrl(`/api/cafes/${cafe.id}/menu/${id}`), { method: 'DELETE' });
            setMessage('Menu item deleted');
            await refreshCafe();
        }
    };

    const saveTable = async () => {
        if (!hasCafe) return;
        const method = tableEditId ? 'PUT' : 'POST';
        const path = tableEditId ? `/api/cafes/${cafe.id}/tables/${tableEditId}` : `/api/cafes/${cafe.id}/tables`;
        const res = await fetch(apiUrl(path), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tableForm, capacity: Number(tableForm.capacity) }) });
        if (!res.ok) { setError('Table save failed'); return; }
        setTableForm(emptyTable);
        setTableEditId(null);
        setMessage('Table saved successfully!');
        await refreshCafe();
    };

    const editTable = (t) => {
        setTableEditId(t.id);
        setTableForm({ tableNumber: t.tableNumber || '', category: t.category || 'REGULAR', capacity: t.capacity ?? '' });
    };

    const saveStaff = async () => {
        if (!hasCafe) return;
        const res = await fetch(apiUrl(`/api/cafes/${cafe.id}/owner/${ownerId}/employees`), {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staffForm)
        });
        if (!res.ok) { setError('Staff save failed'); return; }
        const data = await res.json().catch(() => ({}));
        setStaffForm(emptyStaff);
        setMessage(`Staff created successfully! Username: ${data.username}, Temp Password: ${data.temporaryPassword}`);
        await refreshCafe();
    };

    const completeBooking = async (id) => {
        if (!hasCafe) return;
        const res = await fetch(apiUrl(`/api/cafes/${cafe.id}/orders/${id}/status`), {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED' })
        });
        if (!res.ok) { setError('Could not mark completed'); return; }
        setMessage('Booking marked as completed');
        await refreshCafe();
    };

    if (!isOwner) return <Navigate to="/signin" replace />;
    if (loading) return <div className="od-loading">Loading owner dashboard...</div>;

    const menuItems = [
        { key: 'dashboard', icon: '📊', label: 'Dashboard' },
        { key: 'menu', icon: '📋', label: 'Menu Management' },
        { key: 'tables', icon: '🪑', label: 'Table Management' },
        { key: 'bookings', icon: '🗓️', label: 'Bookings' },
        { key: 'staff', icon: '👥', label: 'Staff Registration' },
        { key: 'orders', icon: '🧾', label: 'Orders' },
        { key: 'payments', icon: '💳', label: 'Payments' },
    ];

    // ===== RENDER SECTIONS =====
    const renderDashboard = () => (
        <div className="od-section-card">
            <h2>📊 Dashboard Overview</h2>
            <div className="od-stats-grid">
                <div className="od-stat-card">
                    <div className="od-stat-icon blue"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{sortedOrders.length}</div>
                        <div className="od-stat-label">Total Orders</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon orange"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{sortedOrders.filter(o => PENDING_STATUSES.includes((o.status || '').toUpperCase())).length}</div>
                        <div className="od-stat-label">In Progress</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon green"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{sortedOrders.filter(o => COMPLETED_STATUSES.includes((o.status || '').toUpperCase())).length}</div>
                        <div className="od-stat-label">Completed</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon brown"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{details?.menu?.length || 0}</div>
                        <div className="od-stat-label">Menu Items</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon red"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{details?.tables?.length || 0}</div>
                        <div className="od-stat-label">Tables</div>
                    </div>
                </div>
                <div className="od-stat-card">
                    <div className="od-stat-icon purple"></div>
                    <div className="od-stat-info">
                        <div className="od-stat-value">{(details?.waiterCount || 0) + (details?.chefCount || 0)}</div>
                        <div className="od-stat-label">Staff</div>
                    </div>
                </div>
            </div>
            <div className="od-notification-panel">
                <h3>🔔 Served Orders Notifications</h3>
                {servedNotifications.length === 0 ? (
                    <p className="od-empty-state">No served orders yet.</p>
                ) : (
                    <ul className="od-notification-list">
                        {servedNotifications.slice(0, 5).map(order => (
                            <li key={order.id} className="od-notification-item">
                                Order #{order.id?.slice(-6)} served at Table {order.tableNumber}
                                <span>{new Date(order.updatedAt || order.createdAt || '').toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="od-cafe-info">
                <h3>🏪 {cafe?.name || 'Cafe Information'}</h3>
                <p><strong>Location:</strong> {cafe?.city}, {cafe?.state}</p>
                <p><strong>Address:</strong> {cafe?.address || 'Not provided'}</p>
                <p><strong>Phone:</strong> {cafe?.phone || 'Not provided'}</p>
                <p><strong>Hours:</strong> {cafe?.openHours || 'Not set'}</p>
            </div>
        </div>
    );

    // Replace the renderMenu function with this updated version:

    const renderMenu = () => (
        <div className="od-section-card">
            <h2>📋 Menu Management</h2>
            <div className="od-form-section">
                <h3>{menuEditId ? '✏️ Edit Menu Item' : '➕ Add New Menu Item'}</h3>
                <div className="od-form-row">
                    <input placeholder="Item Name *" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} />
                    <input placeholder="Category" value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input placeholder="Price (INR) *" type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} />
                </div>
                <textarea placeholder="Description" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />

                {/* Image Uploader Component */}
                <ImageUploader
                    label="Menu Item Image"
                    value={menuForm.imageUrl}
                    onChange={(val) => setMenuForm({ ...menuForm, imageUrl: val })}
                    multiple={false}
                    maxSizeMB={2}
                />

                <div className="od-form-actions">
                    <button className="od-btn od-btn-primary" onClick={saveMenu}>
                        {menuEditId ? '✅ Update Item' : '➕ Add Item'}
                    </button>
                    {menuEditId && (
                        <button className="od-btn od-btn-ghost" onClick={() => { setMenuEditId(null); setMenuForm(emptyMenu); }}>
                             ↩️ Cancel
                        </button>
                    )}
                </div>
            </div>
            <hr />
            <h3>🧾 Current Menu Items ({details?.menu?.length || 0})</h3>
            {(details?.menu?.length || 0) === 0 ? (
                <p className="od-empty-state">No menu items yet. Add your first item above!</p>
            ) : (
                <div className="od-menu-grid">
                    {(details?.menu || []).map((m) => (
                        <div key={m.id} className="od-menu-card">
                            {m.imageUrl && <img src={m.imageUrl} alt={m.name} className="od-menu-img" />}
                            <div className="od-menu-card-body">
                                <div className="od-menu-card-top">
                                    <h4>{m.name}</h4>
                                    <span className="od-price-badge">INR {m.price}</span>
                                </div>
                                {m.category && <span className="od-category-tag">{m.category}</span>}
                                <p>{m.description}</p>
                            </div>
                            <div className="od-menu-card-actions">
                                <button className="od-btn od-btn-sm od-btn-ghost" onClick={() => editMenu(m)}> ✏️ Edit</button>
                                <button className="od-btn od-btn-sm od-btn-danger" onClick={() => removeMenu(m.id)}> 🗑️ Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderTables = () => (
        <div className="od-section-card">
            <h2>🪑 Table Management</h2>
            <div className="od-form-section">
                <h3>{tableEditId ? '✏️ Edit Table' : '➕ Add New Table'}</h3>
                <div className="od-form-row">
                    <input placeholder="Table Number *" value={tableForm.tableNumber} onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })} />
                    <input placeholder="Capacity *" type="number" value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })} />
                </div>
                <select value={tableForm.category} onChange={(e) => setTableForm({ ...tableForm, category: e.target.value })}>
                    <option value="REGULAR">Regular Table</option>
                    <option value="FAMILY">Family Table</option>
                    <option value="VALENTINE">Valentine Table</option>
                    <option value="VIP">VIP Table</option>
                    <option value="WINDOW">Window Side Table</option>
                </select>
                <div className="od-form-actions">
                    <button className="od-btn od-btn-primary" onClick={saveTable}>
                        {tableEditId ? '✅ Update Table' : '➕ Add Table'}
                    </button>
                    {tableEditId && (
                        <button className="od-btn od-btn-ghost" onClick={() => { setTableEditId(null); setTableForm(emptyTable); }}>
                             ↩️ Cancel
                        </button>
                    )}
                </div>
            </div>
            <hr />
            <h3>Current Tables ({details?.tables?.length || 0})</h3>
            {(details?.tables?.length || 0) === 0 ? (
                <p className="od-empty-state">No tables yet. Add your first table above!</p>
            ) : (
                <div className="od-table-grid">
                    {(details?.tables || []).map((t) => (
                        <div key={t.id} className="od-table-card">
                            <div className="od-table-card-head">
                                <h4>Table #{t.tableNumber}</h4>
                                <button className="od-btn od-btn-sm od-btn-ghost" onClick={() => editTable(t)}> ✏️ Edit</button>
                            </div>
                            <div className="od-table-row"><span>Type:</span><span>{t.category}</span></div>
                            <div className="od-table-row"><span>Capacity:</span><span>{t.capacity} seats</span></div>
                            <div className={`od-table-status ${t.available ? 'available' : 'booked'}`}>
                                {t.available ? '✅ Available' : '⛔ Reserved'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderBookings = () => (
        <div className="od-section-card">
            <h2>🗓️ Bookings ({sortedOrders.length})</h2>
            {sortedOrders.length === 0 ? (
                <p className="od-empty-state">😕 No bookings yet.</p>
            ) : (
                <div className="od-booking-grid">
                    {sortedOrders.map((o) => (
                        <div key={o.id} className="od-booking-card">
                            <div className="od-booking-card-head">
                                <h4>Order #{o.id?.slice(-6)}</h4>
                                <span className={`od-status-badge ${(o.status || 'pending').toLowerCase()}`}>{o.status}</span>
                            </div>
                            <div className="od-booking-detail"> Table {o.tableNumber}</div>
                            <div className="od-booking-detail"> {new Date(o.bookingDateTime || o.createdAt || '').toLocaleString()}</div>
                            <div className="od-booking-detail">INR {o.totalAmount || 0}</div>
                            {o.status === 'SERVED' && (
                                <button className="od-btn od-btn-success od-btn-sm" onClick={() => completeBooking(o.id)}>
                                     ✅ Mark Completed
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderStaff = () => (
        <div className="od-section-card">
            <h2>👥 Staff Registration</h2>
            <div className="od-form-section">
                <h3>Add New Staff Member</h3>
                <div className="od-form-row">
                    <input placeholder="First Name *" value={staffForm.firstName} onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })} />
                    <input placeholder="Last Name *" value={staffForm.lastName} onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input placeholder="Email *" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                    <input placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input type="date" placeholder="Date of Birth" value={staffForm.dateOfBirth} onChange={(e) => setStaffForm({ ...staffForm, dateOfBirth: e.target.value })} />
                    <input placeholder="Gov ID Type" value={staffForm.govIdType} onChange={(e) => setStaffForm({ ...staffForm, govIdType: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input placeholder="Address" value={staffForm.address} onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })} />
                    <input placeholder="City" value={staffForm.city} onChange={(e) => setStaffForm({ ...staffForm, city: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input placeholder="State" value={staffForm.state} onChange={(e) => setStaffForm({ ...staffForm, state: e.target.value })} />
                    <input placeholder="Postal Code" value={staffForm.postalCode} onChange={(e) => setStaffForm({ ...staffForm, postalCode: e.target.value })} />
                </div>
                <div className="od-form-row">
                    <input placeholder="Country" value={staffForm.country} onChange={(e) => setStaffForm({ ...staffForm, country: e.target.value })} />
                    <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                        <option value="WAITER">Waiter</option>
                        <option value="CHEF">Chef</option>
                    </select>
                </div>
                <button className="od-btn od-btn-primary" onClick={saveStaff}>➕ Create Staff Member</button>
            </div>
            <div className="od-staff-summary">
                <p><strong>Waiters:</strong> {details?.waiterCount || 0}</p>
                <p><strong>Chefs:</strong> {details?.chefCount || 0}</p>
                <p><strong>Total Staff:</strong> {(details?.waiterCount || 0) + (details?.chefCount || 0)}</p>
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="od-section-card">
            <h2>🧾 Customer Orders ({sortedOrders.length})</h2>
            {sortedOrders.length === 0 ? (
                <p className="od-empty-state">😕 No customer orders yet.</p>
            ) : (
                <>
                    <div className="od-orders-grid">
                        {pageOrders.map((o) => (
                            <div key={o.id} className="od-order-card">
                                <div className="od-order-top">
                                    <strong>Order #{o.id?.slice(-6)}</strong>
                                    <span className={`od-status-badge ${(o.status || 'pending').toLowerCase()}`}>{o.status}</span>
                                </div>
                                <p className="od-order-meta"> Table {o.tableNumber} |  {new Date(o.createdAt || '').toLocaleString()}</p>
                                <ul className="od-order-items">
                                    {(o.items || []).map((i, idx) => (
                                        <li key={`${o.id}-${idx}`}>{i.name} x{i.quantity} - INR {i.price}</li>
                                    ))}
                                </ul>
                                <p className="od-order-total">Total: INR {o.totalAmount || 0}</p>
                            </div>
                        ))}
                    </div>
                    <div className="od-pagination">
                        <button className="od-btn od-btn-ghost" disabled={orderPage <= 1} onClick={() => setOrderPage((p) => p - 1)}> Previous</button>
                        <span>Page {orderPage} / {pages}</span>
                        <button className="od-btn od-btn-ghost" disabled={orderPage >= pages} onClick={() => setOrderPage((p) => p + 1)}>Next </button>
                    </div>
                </>
            )}
        </div>
    );

    const renderPayments = () => {
        const paidOrders = sortedOrders.filter(o => COMPLETED_STATUSES.includes((o.status || '').toUpperCase()));
        const pendingOrders = sortedOrders.filter(o => !COMPLETED_STATUSES.includes((o.status || '').toUpperCase()));
        const paidAmount = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        return (
            <div className="od-section-card">
                <h2>💳 Payment Dashboard</h2>
                <div className="od-payment-grid">
                    <div className="od-payment-card">
                        <h4>💰 Total Collected</h4>
                        <div className="od-payment-value">INR {paidAmount.toFixed(2)}</div>
                        <p>{paidOrders.length} orders completed/served</p>
                    </div>
                    <div className="od-payment-card">
                        <h4>⏳ Pending Collection</h4>
                        <div className="od-payment-value">INR {pendingAmount.toFixed(2)}</div>
                        <p>{pendingOrders.length} orders in progress</p>
                    </div>
                    <div className="od-payment-card">
                        <h4>🔗 Razorpay Setup</h4>
                        <p>Connect Razorpay to start collecting digital payments.</p>
                        <button className="od-btn od-btn-primary" onClick={() => alert('Razorpay integration placeholder')}>🔗 Connect Razorpay</button>
                    </div>
                </div>
                <div className="od-payment-summary">
                    <h3>🧾 Recent Orders</h3>
                    {sortedOrders.length === 0 ? (
                        <p className="od-empty-state">😕 No orders available for payment summary.</p>
                    ) : (
                        <ul>
                            {sortedOrders.slice(0, 6).map(order => (
                                <li key={order.id}>
                                    Order #{order.id?.slice(-6)} - INR {order.totalAmount || 0} - {order.status}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

    const renderCafeRegistration = () => (
        <div className="od-wizard-container">
            <div className="od-wizard-header">
                <h2>☕ Register Your Cafe</h2>
                <p>Complete the setup to publish your cafe for customers</p>
            </div>

            {/* Step Indicators */}
            <div className="od-wizard-steps">
                {[1, 2, 3, 4].map(step => (
                    <div key={step} className={`od-step ${wizardStep === step ? 'active' : wizardStep > step ? 'completed' : ''}`}>
                        <div className="od-step-number">{wizardStep > step ? '' : step}</div>
                        <div className="od-step-label">
                            {step === 1 && '📝 Basic Info'}
                            {step === 2 && '📍 Location'}
                            {step === 3 && '📷 Photos'}
                            {step === 4 && '✅ Review'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="od-wizard-content">
                {wizardStep === 1 && (
                    <div className="od-wizard-form">
                        <h3>📝 Basic Details</h3>
                        <div className="od-form-group">
                            <label>Cafe Name *</label>
                            <input
                                placeholder="Enter cafe name"
                                value={cafeForm.name}
                                onChange={e => setCafeForm({ ...cafeForm, name: e.target.value })}
                            />
                        </div>
                        <div className="od-form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="Describe your cafe..."
                                rows="4"
                                value={cafeForm.description}
                                onChange={e => setCafeForm({ ...cafeForm, description: e.target.value })}
                            />
                        </div>
                        <div className="od-form-group">
                            <label>Phone Number</label>
                            <input
                                placeholder="Contact number"
                                value={cafeForm.phone}
                                onChange={e => setCafeForm({ ...cafeForm, phone: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {wizardStep === 2 && (
                    <div className="od-wizard-form">
                        <h3>📍 Location & Hours</h3>
                        <div className="od-form-group">
                            <label>Street Address</label>
                            <input
                                placeholder="Street address"
                                value={cafeForm.address}
                                onChange={e => setCafeForm({ ...cafeForm, address: e.target.value })}
                            />
                        </div>
                        <div className="od-form-row">
                            <div className="od-form-group">
                                <label>City *</label>
                                <input
                                    placeholder="City"
                                    value={cafeForm.city}
                                    onChange={e => setCafeForm({ ...cafeForm, city: e.target.value })}
                                />
                            </div>
                            <div className="od-form-group">
                                <label>State *</label>
                                <input
                                    placeholder="State"
                                    value={cafeForm.state}
                                    onChange={e => setCafeForm({ ...cafeForm, state: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="od-form-group">
                            <label>Opening Hours</label>
                            <input
                                placeholder="e.g. 8 AM - 11 PM"
                                value={cafeForm.openHours}
                                onChange={e => setCafeForm({ ...cafeForm, openHours: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {wizardStep === 3 && (
                    <div className="od-wizard-form">
                        <h3>📷 Cafe Photos</h3>
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
                    </div>
                )}

                {wizardStep === 4 && (
                    <div className="od-wizard-form">
                        <h3>✅ Review & Submit</h3>
                        <div className="od-review-section">
                            <h4>📝 Basic Information</h4>
                            <p><strong>Name:</strong> {cafeForm.name || '-'}</p>
                            <p><strong>Description:</strong> {cafeForm.description || '-'}</p>
                            <p><strong>Phone:</strong> {cafeForm.phone || '-'}</p>
                        </div>
                        <div className="od-review-section">
                            <h4>📍 Location</h4>
                            <p><strong>Address:</strong> {cafeForm.address || '-'}</p>
                            <p><strong>City:</strong> {cafeForm.city || '-'}</p>
                            <p><strong>State:</strong> {cafeForm.state || '-'}</p>
                            <p><strong>Hours:</strong> {cafeForm.openHours || '-'}</p>
                        </div>
                        <div className="od-review-section">
                            <h4>📷 Photos</h4>
                            <p><strong>Logo:</strong> {cafeForm.logoUrl ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                            <p><strong>Cover Image:</strong> {cafeForm.coverImageUrl ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        </div>
                        <button className="od-btn od-btn-primary od-btn-large" onClick={handleCreateCafe}>
                             ✅ Create Cafe
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="od-wizard-nav">
                <button
                    className="od-btn od-btn-ghost"
                    disabled={wizardStep === 1}
                    onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                >
                     ⬅️ Previous
                </button>
                <button
                    className="od-btn od-btn-primary"
                    disabled={wizardStep === 4}
                    onClick={() => setWizardStep(s => Math.min(4, s + 1))}
                >
                    Next ➡️
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (!hasCafe) {
            return renderCafeRegistration();
        }

        switch (activeSection) {
            case 'dashboard': return renderDashboard();
            case 'menu': return renderMenu();
            case 'tables': return renderTables();
            case 'bookings': return renderBookings();
            case 'staff': return renderStaff();
            case 'orders': return renderOrders();
            case 'payments': return renderPayments();
            default: return renderDashboard();
        }
    };

    return (
        <div className="owner-dash-container">
            {/* Sidebar overlay for mobile */}
            <div className={`od-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Left Sidebar */}
            <aside className={`od-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="od-sidebar-header">
                    <div className="od-sidebar-brand">
                        <span className="od-brand-icon">☕</span>
                        <div>
                            <strong>Cafe Bridge</strong>
                            <small>Owner Panel</small>
                        </div>
                    </div>
                </div>

                <div className="od-sidebar-welcome">
                    <div className="od-user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div>Welcome, {userName}!</div>
                </div>

                {hasCafe && (
                    <nav className="od-sidebar-nav">
                        {menuItems.map(item => (
                            <button
                                key={item.key}
                                className={`od-nav-item ${activeSection === item.key ? 'active' : ''}`}
                                onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                            >
                                <span className="od-nav-icon">{item.icon}</span>
                                <span className="od-nav-label">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                )}

                {!hasCafe && (
                    <div className="od-sidebar-placeholder">
                        <p>Register your cafe to access management features</p>
                    </div>
                )}

                <div className="od-sidebar-footer">
                    <button className="od-btn od-btn-ghost od-btn-block" onClick={() => navigate('/')}>
                         🏠 Customer View
                    </button>
                    <button className="od-btn od-btn-ghost od-btn-block" onClick={() => { logout(); navigate('/signin'); }}>
                         🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="od-main-content">
                <header className="od-topbar">
                    <button className="od-menu-toggle" onClick={() => setSidebarOpen(true)}></button>
                    <h1>{hasCafe ? (menuItems.find(m => m.key === activeSection)?.label || 'Dashboard') : 'Cafe Registration'}</h1>
                    {hasCafe && <button className="od-btn od-btn-ghost" onClick={refreshCafe}>🔄 Refresh</button>}
                </header>

                <div className="od-content">
                    {error && <div className="od-flash od-flash-error"> {error}</div>}
                    {message && <div className="od-flash od-flash-success"> {message}</div>}
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default OwnerDashboard;

