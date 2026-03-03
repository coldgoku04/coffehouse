import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './OwnerDashboard.css';

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
    const [activeSection, setActiveSection] = useState('overview');

    const [cafeForm, setCafeForm] = useState({
        name: '',
        description: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        openHours: '',
        logoUrl: '',
        coverImageUrl: ''
    });

    const [menuForm, setMenuForm] = useState({ name: '', description: '', category: '', price: '', imageUrl: '' });
    const [tableForm, setTableForm] = useState({ tableNumber: '', category: 'REGULAR', capacity: '' });
    const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'WAITER' });

    const hasCafe = Boolean(cafe?.id);

    const refreshCafe = useCallback(async () => {
        if (!ownerId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`));
            if (response.status === 404) {
                setCafe(null);
                setDetails(null);
                setOrders([]);
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch owner cafe');
            }

            const cafeData = await response.json();
            setCafe(cafeData);

            const detailsResponse = await fetch(apiUrl(`/api/cafes/${cafeData.id}`));
            if (detailsResponse.ok) {
                setDetails(await detailsResponse.json());
            } else {
                setDetails(null);
            }

            const ordersResponse = await fetch(apiUrl(`/api/cafes/${cafeData.id}/orders`));
            if (ordersResponse.ok) {
                const ordersData = await ordersResponse.json();
                setOrders(Array.isArray(ordersData) ? ordersData : []);
            } else {
                setOrders([]);
            }
        } catch (e) {
            setError('Could not load owner dashboard.');
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    useEffect(() => {
        refreshCafe();
    }, [refreshCafe]);

    useEffect(() => {
        if (!hasCafe) {
            setActiveSection('overview');
        }
    }, [hasCafe]);

    const handleCreateCafe = async () => {
        if (!cafeForm.name || !cafeForm.city || !cafeForm.state) {
            setError('Cafe name, city and state are required.');
            return;
        }

        setError('');
        setMessage('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/owner/${ownerId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cafeForm)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Unable to create cafe');
            }

            setMessage('Cafe created successfully.');
            await refreshCafe();
        } catch (e) {
            setError('Failed to create cafe. Check cafe name uniqueness and owner approval.');
        }
    };

    const addMenuItem = async () => {
        if (!hasCafe) {
            return;
        }
        if (!menuForm.name || !menuForm.price) {
            setError('Menu item name and price are required.');
            return;
        }

        setError('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/${cafe.id}/menu`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...menuForm, price: Number(menuForm.price) })
            });
            if (!response.ok) {
                throw new Error('Menu add failed');
            }

            setMenuForm({ name: '', description: '', category: '', price: '', imageUrl: '' });
            setMessage('Menu item added.');
            await refreshCafe();
            setActiveSection('registered');
        } catch (e) {
            setError('Could not add menu item.');
        }
    };

    const addTable = async () => {
        if (!hasCafe) {
            return;
        }
        if (!tableForm.tableNumber || !tableForm.category || !tableForm.capacity) {
            setError('Table number, category and capacity are required.');
            return;
        }

        setError('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/${cafe.id}/tables`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableNumber: tableForm.tableNumber, category: tableForm.category, capacity: Number(tableForm.capacity) })
            });
            if (!response.ok) {
                throw new Error('Table add failed');
            }

            setTableForm({ tableNumber: '', category: 'REGULAR', capacity: '' });
            setMessage('Table added.');
            await refreshCafe();
            setActiveSection('registered');
        } catch (e) {
            setError('Could not add table.');
        }
    };

    const addStaff = async () => {
        if (!hasCafe) {
            return;
        }
        if (!staffForm.firstName || !staffForm.lastName || !staffForm.email || !staffForm.role) {
            setError('Complete staff details are required.');
            return;
        }

        setError('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/${cafe.id}/owner/${ownerId}/employees`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(staffForm)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Staff add failed');
            }

            setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: 'WAITER' });
            setMessage(`Employee created: ${data.username} (temp password: ${data.temporaryPassword})`);
            await refreshCafe();
        } catch (e) {
            setError('Could not register staff member.');
        }
    };

    const staffSummary = useMemo(() => {
        return details ? `${details.waiterCount} waiters / ${details.chefCount} chefs` : '0 waiters / 0 chefs';
    }, [details]);

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [orders]);

    const formatDateTime = (value) => {
        if (!value) {
            return 'Time not available';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString();
    };

    if (!isOwner) {
        return <Navigate to="/signin" replace />;
    }

    if (loading) {
        return <div className="owner-state">Loading owner dashboard...</div>;
    }

    const renderSectionContent = () => {
        if (activeSection === 'overview') {
            return (
                <article className="manage-panel">
                    <h3>My Cafe</h3>
                    <p><strong>{cafe.name}</strong></p>
                    <p>{cafe.description || 'No description'}</p>
                    <p>{cafe.address || '-'}, {cafe.city}, {cafe.state}</p>
                    <p>{cafe.openHours || 'Hours not set'}</p>
                    <div className="stats-row">
                        <div className="stat-card"><strong>{details?.menu?.length || 0}</strong><span>Menu Items</span></div>
                        <div className="stat-card"><strong>{details?.tables?.length || 0}</strong><span>Tables</span></div>
                        <div className="stat-card"><strong>{staffSummary}</strong><span>Staff</span></div>
                    </div>
                </article>
            );
        }

        if (activeSection === 'menu') {
            return (
                <article className="manage-panel">
                    <h3>Add Menu Item</h3>
                    <input placeholder="Name" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} />
                    <input placeholder="Category" value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} />
                    <input placeholder="Price" type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} />
                    <input placeholder="Image URL" value={menuForm.imageUrl} onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })} />
                    <textarea placeholder="Description" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
                    <button type="button" className="primary" onClick={addMenuItem}>Add Menu</button>
                </article>
            );
        }

        if (activeSection === 'table') {
            return (
                <article className="manage-panel">
                    <h3>Add Table</h3>
                    <input placeholder="Table Number" value={tableForm.tableNumber} onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })} />
                    <select value={tableForm.category} onChange={(e) => setTableForm({ ...tableForm, category: e.target.value })}>
                        <option value="REGULAR">Regular Table</option>
                        <option value="FAMILY">Family Table</option>
                        <option value="VALENTINE">Valentine Table</option>
                        <option value="VIP">VIP Table</option>
                        <option value="WINDOW">Window Side Table</option>
                    </select>
                    <input placeholder="Capacity" type="number" value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })} />
                    <button type="button" className="primary" onClick={addTable}>Add Table</button>
                </article>
            );
        }

        if (activeSection === 'employee') {
            return (
                <article className="manage-panel">
                    <h3>Add Employee</h3>
                    <input placeholder="First Name" value={staffForm.firstName} onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })} />
                    <input placeholder="Last Name" value={staffForm.lastName} onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })} />
                    <input placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                    <input placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                    <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                        <option value="WAITER">Waiter</option>
                        <option value="CHEF">Chef</option>
                    </select>
                    <button type="button" className="primary" onClick={addStaff}>Register Employee</button>
                </article>
            );
        }

        if (activeSection === 'orders') {
            return (
                <article className="manage-panel wide">
                    <div className="orders-header">
                        <h3>Customer Orders ({sortedOrders.length})</h3>
                        <button type="button" className="primary" onClick={refreshCafe}>Refresh Orders</button>
                    </div>
                    {sortedOrders.length === 0 ? (
                        <p>No customer orders yet.</p>
                    ) : (
                        <div className="orders-list">
                            {sortedOrders.map((order) => (
                                <div key={order.id} className="order-card">
                                    <div className="order-top-row">
                                        <strong>Order #{order.id?.slice(-6) || 'N/A'}</strong>
                                        <span className="order-status">{order.status || 'PLACED'}</span>
                                    </div>
                                    <p className="order-meta">Table {order.tableNumber || '-'} | {formatDateTime(order.createdAt)}</p>
                                    <ul>
                                        {(order.items || []).map((item, idx) => (
                                            <li key={`${order.id}-${idx}`}>
                                                {item.name} x{item.quantity} - Rs. {item.price}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="order-total">Total: Rs. {order.totalAmount || 0}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            );
        }

        return (
            <article className="manage-panel wide">
                <h3>Registered Data</h3>
                <div className="snapshot-grid">
                    <div>
                        <h4>Menu Items ({details?.menu?.length || 0})</h4>
                        <ul>
                            {(details?.menu || []).slice(0, 20).map((item) => (
                                <li key={item.id}>{item.name} - Rs. {item.price}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4>Tables ({details?.tables?.length || 0})</h4>
                        <ul>
                            {(details?.tables || []).slice(0, 25).map((table) => (
                                <li key={table.id}>Table {table.tableNumber} - {table.category || 'REGULAR'} ({table.capacity} seats)</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <div className="owner-page">
            <header className="owner-header">
                <div>
                    <p className="owner-kicker">Cafe Owner Workspace</p>
                    <h1>{hasCafe ? cafe.name : 'Register Your Cafe'}</h1>
                    <p>{hasCafe ? `${cafe.city}, ${cafe.state} | ${staffSummary}` : 'Complete setup to publish your cafe for customers.'}</p>
                </div>
                <div className="owner-actions">
                    <button type="button" onClick={() => navigate('/')}>Customer View</button>
                    <button type="button" onClick={() => navigate('/profile')}>Profile</button>
                    <button type="button" className="danger" onClick={() => { logout(); navigate('/signin'); }}>Logout</button>
                </div>
            </header>

            {message && <div className="flash success">{message}</div>}
            {error && <div className="flash error">{error}</div>}

            {!hasCafe ? (
                <section className="setup-panel">
                    <div className="setup-steps">
                        {[1, 2, 3, 4].map((step) => (
                            <button
                                key={step}
                                type="button"
                                className={`step ${wizardStep === step ? 'active' : ''}`}
                                onClick={() => setWizardStep(step)}
                            >
                                Step {step}
                            </button>
                        ))}
                    </div>
                    <div className="setup-form">
                        {wizardStep === 1 && (
                            <>
                                <h3>Basic Details</h3>
                                <input placeholder="Cafe Name *" value={cafeForm.name} onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })} />
                                <textarea placeholder="Description" value={cafeForm.description} onChange={(e) => setCafeForm({ ...cafeForm, description: e.target.value })} />
                                <input placeholder="Phone" value={cafeForm.phone} onChange={(e) => setCafeForm({ ...cafeForm, phone: e.target.value })} />
                            </>
                        )}
                        {wizardStep === 2 && (
                            <>
                                <h3>Location & Hours</h3>
                                <input placeholder="Address" value={cafeForm.address} onChange={(e) => setCafeForm({ ...cafeForm, address: e.target.value })} />
                                <input placeholder="City *" value={cafeForm.city} onChange={(e) => setCafeForm({ ...cafeForm, city: e.target.value })} />
                                <input placeholder="State *" value={cafeForm.state} onChange={(e) => setCafeForm({ ...cafeForm, state: e.target.value })} />
                                <input placeholder="Open Hours (e.g. 8 AM - 11 PM)" value={cafeForm.openHours} onChange={(e) => setCafeForm({ ...cafeForm, openHours: e.target.value })} />
                            </>
                        )}
                        {wizardStep === 3 && (
                            <>
                                <h3>Photos</h3>
                                <input placeholder="Logo URL" value={cafeForm.logoUrl} onChange={(e) => setCafeForm({ ...cafeForm, logoUrl: e.target.value })} />
                                <input placeholder="Cover Image URL" value={cafeForm.coverImageUrl} onChange={(e) => setCafeForm({ ...cafeForm, coverImageUrl: e.target.value })} />
                            </>
                        )}
                        {wizardStep === 4 && (
                            <>
                                <h3>Review</h3>
                                <p><strong>Name:</strong> {cafeForm.name || '-'}</p>
                                <p><strong>City/State:</strong> {cafeForm.city || '-'}, {cafeForm.state || '-'}</p>
                                <p><strong>Hours:</strong> {cafeForm.openHours || '-'}</p>
                                <button type="button" className="primary" onClick={handleCreateCafe}>Create Cafe</button>
                            </>
                        )}
                    </div>
                    <div className="setup-nav">
                        <button type="button" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))}>Previous</button>
                        <button type="button" disabled={wizardStep === 4} onClick={() => setWizardStep((s) => Math.min(4, s + 1))}>Next</button>
                    </div>
                </section>
            ) : (
                <section className="owner-workspace">
                    <aside className="workspace-nav">
                        <button type="button" className={activeSection === 'overview' ? 'active' : ''} onClick={() => setActiveSection('overview')}>Overview</button>
                        <button type="button" className={activeSection === 'menu' ? 'active' : ''} onClick={() => setActiveSection('menu')}>Add Menu Item</button>
                        <button type="button" className={activeSection === 'table' ? 'active' : ''} onClick={() => setActiveSection('table')}>Add Table</button>
                        <button type="button" className={activeSection === 'employee' ? 'active' : ''} onClick={() => setActiveSection('employee')}>Add Employee</button>
                        <button type="button" className={activeSection === 'orders' ? 'active' : ''} onClick={() => setActiveSection('orders')}>Orders</button>
                        <button type="button" className={activeSection === 'registered' ? 'active' : ''} onClick={() => setActiveSection('registered')}>Registered Data</button>
                    </aside>
                    <div className="workspace-content">
                        {renderSectionContent()}
                    </div>
                </section>
            )}
        </div>
    );
};

export default OwnerDashboard;
