import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import './CafePage.css';

const CafePage = () => {
    const { cafeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bookingMessage, setBookingMessage] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [selectedItems, setSelectedItems] = useState({});
    const [activeSection, setActiveSection] = useState('menu');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bookingForm, setBookingForm] = useState({
        tableId: '',
        date: '',
        time: '',
        duration: '60'
    });

    const loadCafe = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(apiUrl(`/api/cafes/${cafeId}`));
            if (!response.ok) throw new Error('Unable to load cafe');
            const data = await response.json();
            setDetails(data);
        } catch (e) {
            setError('Cafe not found or unavailable.');
        } finally {
            setLoading(false);
        }
    }, [cafeId]);

    useEffect(() => {
        loadCafe();
    }, [loadCafe]);

    useEffect(() => {
        if (bookingMessage?.text) {
            const timer = setTimeout(() => setBookingMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [bookingMessage]);

    const loadRazorpayScript = useCallback(() => new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    }), []);

    const availableTables = useMemo(
        () => (details?.tables || []).filter((t) => t.available !== false),
        [details]
    );

    const selectedTable = useMemo(
        () => (details?.tables || []).find((t) => t.id === bookingForm.tableId),
        [details, bookingForm.tableId]
    );

    const menu = useMemo(() => details?.menu || [], [details]);
    const cartItems = useMemo(
        () => menu.filter((item) => (selectedItems[item.id] || 0) > 0),
        [menu, selectedItems]
    );
    const cartTotal = useMemo(
        () => cartItems.reduce((sum, item) => sum + (item.price || 0) * (selectedItems[item.id] || 0), 0),
        [cartItems, selectedItems]
    );

    const updateQty = (itemId, next) => {
        setSelectedItems((prev) => ({ ...prev, [itemId]: Math.max(0, next) }));
    };

    const submitBooking = async (e) => {
        e.preventDefault();
        if (!user?.id) {
            setBookingMessage({ type: 'error', text: 'Please sign in before booking.' });
            return;
        }
        if (!bookingForm.tableId || !bookingForm.date || !bookingForm.time) {
            setBookingMessage({ type: 'error', text: 'Please select table, date and time.' });
            return;
        }
        if (cartItems.length === 0) {
            setBookingMessage({ type: 'error', text: 'Please add at least one menu item.' });
            return;
        }

        const bookingDateTime = `${bookingForm.date}T${bookingForm.time}:00`;
        const payload = {
            tableId: bookingForm.tableId,
            tableNumber: selectedTable?.tableNumber || '',
            customerId: user.id,
            customerName: user.name || user.username || user.email || 'Customer',
            bookingDateTime,
            durationMinutes: Number(bookingForm.duration),
            items: cartItems.map((item) => ({
                menuItemId: item.id,
                name: item.name,
                quantity: selectedItems[item.id],
                price: item.price
            }))
        };

        setIsPaying(true);
        try {
            const amountPaise = Math.round(cartTotal * 100);
            const orderRes = await fetch(apiUrl('/api/payments/orders'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amountPaise,
                    currency: 'INR'
                })
            });
            const orderData = await orderRes.json().catch(() => ({}));
            if (!orderRes.ok) {
                throw new Error(orderData.message || 'Unable to start payment.');
            }

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error('Unable to load payment gateway. Please try again.');
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: details?.name || 'Cafe',
                description: `Order payment for Table ${selectedTable?.tableNumber || ''}`,
                order_id: orderData.orderId,
                prefill: {
                    name: user?.name || user?.username || '',
                    email: user?.email || '',
                    contact: user?.phone || ''
                },
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch(apiUrl('/api/payments/verify'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature
                            })
                        });
                        if (!verifyRes.ok) {
                            const verifyText = await verifyRes.text().catch(() => '');
                            throw new Error(verifyText || 'Payment verification failed.');
                        }

                        const res = await fetch(apiUrl(`/api/cafes/${cafeId}/orders`), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.message || 'Booking failed');

                        setBookingMessage({ type: 'success', text: 'Payment successful. Order placed.' });
                        setBookingForm({ tableId: '', date: '', time: '', duration: '60' });
                        setSelectedItems({});
                        setActiveSection('menu');
                        await loadCafe();
                    } catch (err) {
                        setBookingMessage({ type: 'error', text: err.message || 'Payment verified but booking failed.' });
                    }
                },
                modal: {
                    ondismiss: () => {
                        setBookingMessage({ type: 'info', text: 'Payment was cancelled.' });
                    }
                },
                theme: { color: '#8b5a2b' }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', () => {
                setBookingMessage({ type: 'error', text: 'Payment failed. Please try again.' });
            });
            paymentObject.open();
        } catch (err) {
            setBookingMessage({ type: 'error', text: err.message || 'Could not complete booking.' });
        } finally {
            setIsPaying(false);
        }
    };

    if (loading) return <div className="cp-loading">Loading cafe details...</div>;
    if (error || !details) {
        return (
            <div className="cp-error-state">
                <p>{error || 'Cafe unavailable.'}</p>
                <button type="button" className="cp-btn cp-btn-primary" onClick={() => navigate('/')}> Back to Cafes</button>
            </div>
        );
    }

    const menuItems = [
        { key: 'menu', icon: '📋', label: 'Menu Selection' },
        { key: 'tables', icon: '🪑', label: 'Select Table' },
        { key: 'booking', icon: '✅', label: 'Confirm Booking' }
    ];

    // ===== RENDER SECTIONS =====
    // Find this section in the renderMenu function and update it:

    const renderMenu = () => (
        <>
            <div className="cp-toolbar">
                <h3>🍽️ Select Your Menu Items</h3>
                <div className="cp-toolbar-info">
                    <span className="cp-info-badge">Items: {cartItems.length}</span>
                    <span className="cp-info-badge">Total: INR {cartTotal}</span>
                </div>
            </div>

            {menu.length === 0 ? (
                <div className="cp-empty-state">
                    <span className="cp-empty-icon">🍽️</span>
                    <p>No menu items available at the moment.</p>
                </div>
            ) : (
                <div className="cp-menu-grid">
                    {menu.map((item) => {
                        const qty = selectedItems[item.id] || 0;
                        return (
                            <div key={item.id} className={`cp-menu-card ${qty > 0 ? 'selected' : ''}`}>
                                {/* Only show image if imageUrl exists */}
                                {item.imageUrl && (
                                    <img src={item.imageUrl} alt={item.name} className="cp-menu-img" />
                                )}
                                <div className="cp-menu-body">
                                    <div className="cp-menu-top">
                                        <h4>{item.name}</h4>
                                        <span className="cp-price-badge">{item.price}</span>
                                    </div>
                                    {item.category && <span className="cp-category-tag">{item.category}</span>}
                                    {item.description && <p className="cp-menu-desc">{item.description}</p>}
                                </div>
                                <div className="cp-menu-actions">
                                    <button
                                        type="button"
                                        className="cp-qty-btn"
                                        onClick={() => updateQty(item.id, qty - 1)}
                                        disabled={qty === 0}
                                    >
                                        ➖
                                    </button>
                                    <span className="cp-qty-display">{qty}</span>
                                    <button
                                        type="button"
                                        className="cp-qty-btn"
                                        onClick={() => updateQty(item.id, qty + 1)}
                                    >
                                        ➕
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {cartItems.length > 0 && (
                <div className="cp-next-section">
                    <button className="cp-btn cp-btn-primary" onClick={() => setActiveSection('tables')}>
                        ➡️ Next: Select Table
                    </button>
                </div>
            )}
        </>
    );

    const renderTables = () => (
        <>
            <div className="cp-toolbar">
                <h3>🪑 Available Tables</h3>
                {bookingForm.tableId && (
                    <span className="cp-info-badge selected">
                         ✅ Table #{selectedTable?.tableNumber} Selected
                    </span>
                )}
            </div>

            {availableTables.length === 0 ? (
                <div className="cp-empty-state">
                    <span className="cp-empty-icon">🪑</span>
                    <p>No tables available at the moment.</p>
                </div>
            ) : (
                <div className="cp-table-grid">
                    {availableTables.map((table) => (
                        <div
                            key={table.id}
                            className={`cp-table-card ${bookingForm.tableId === table.id ? 'selected' : ''}`}
                            onClick={() => setBookingForm({ ...bookingForm, tableId: table.id })}
                        >
                            <div className="cp-table-header">
                                <h4>Table #{table.tableNumber}</h4>
                                {bookingForm.tableId === table.id && <span className="cp-selected-check"></span>}
                            </div>
                            <div className="cp-table-info">
                                <div className="cp-table-row">
                                    <span>Type:</span>
                                    <span>{table.category || 'Regular'}</span>
                                </div>
                                <div className="cp-table-row">
                                    <span>Capacity:</span>
                                    <span> {table.capacity} seats</span>
                                </div>
                            </div>
                            <div className="cp-table-status available">✅ Available</div>
                        </div>
                    ))}
                </div>
            )}

            {bookingForm.tableId && (
                <div className="cp-next-section">
                    <button className="cp-btn cp-btn-ghost" onClick={() => setActiveSection('menu')}>
                         ⬅️ Back to Menu
                    </button>
                    <button className="cp-btn cp-btn-primary" onClick={() => setActiveSection('booking')}>
                        ➡️ Next: Confirm Booking
                    </button>
                </div>
            )}
        </>
    );

    const renderBooking = () => (
        <>
            <div className="cp-toolbar">
                <h3>✅ Booking Details & Confirmation</h3>
            </div>

            <form onSubmit={submitBooking} className="cp-booking-form">
                <div className="cp-form-grid">
                    <div className="cp-form-group">
                        <label>📅 Date *</label>
                        <input
                            type="date"
                            value={bookingForm.date}
                            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="cp-form-group">
                        <label>⏰ Time *</label>
                        <input
                            type="time"
                            value={bookingForm.time}
                            onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                            required
                        />
                    </div>

                    <div className="cp-form-group">
                        <label>⏳ Duration</label>
                        <select
                            value={bookingForm.duration}
                            onChange={(e) => setBookingForm({ ...bookingForm, duration: e.target.value })}
                        >
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="90">1.5 hours</option>
                            <option value="120">2 hours</option>
                        </select>
                    </div>

                </div>

                <div className="cp-order-summary">
                    <h3>🧾 Order Summary</h3>
                    <div className="cp-summary-grid">
                        <div className="cp-summary-section">
                            <h4>🍽️ Menu Items ({cartItems.length})</h4>
                            {cartItems.length === 0 ? (
                                <p className="cp-no-items">No items selected</p>
                            ) : (
                                <ul className="cp-summary-items">
                                    {cartItems.map((item) => (
                                        <li key={item.id}>
                                            <span>{item.name} x{selectedItems[item.id]}</span>
                                            <span>INR {item.price * selectedItems[item.id]}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="cp-summary-section">
                            <h4>🪑 Table Details</h4>
                            {!bookingForm.tableId ? (
                                <p className="cp-no-items">No table selected</p>
                            ) : (
                                <div className="cp-table-details">
                                    <p><strong>Table:</strong> #{selectedTable?.tableNumber}</p>
                                    <p><strong>Type:</strong> {selectedTable?.category}</p>
                                    <p><strong>Capacity:</strong> {selectedTable?.capacity} seats</p>
                                </div>
                            )}
                        </div>

                        <div className="cp-summary-section">
                            <h4>📅 Booking Info</h4>
                            {!bookingForm.date || !bookingForm.time ? (
                                <p className="cp-no-items">Select date and time</p>
                            ) : (
                                <div className="cp-booking-details">
                                    <p><strong>Date:</strong> {new Date(bookingForm.date).toLocaleDateString()}</p>
                                    <p><strong>Time:</strong> {bookingForm.time}</p>
                                    <p><strong>Duration:</strong> {bookingForm.duration} minutes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cp-total-section">
                        <div className="cp-total-row">
                            <span>Total Amount:</span>
                            <span className="cp-final-total">INR {cartTotal}</span>
                        </div>
                    </div>

                    <div className="cp-action-buttons">
                        <button
                            type="button"
                            className="cp-btn cp-btn-ghost"
                            onClick={() => setActiveSection('tables')}
                        >
                             ⬅️ Back to Tables
                        </button>
                        <button
                            type="submit"
                            className="cp-btn cp-btn-book"
                            disabled={isPaying || cartItems.length === 0 || !bookingForm.tableId || !bookingForm.date || !bookingForm.time}
                        >
                            {isPaying
                                ? '⏳ Processing payment...'
                                : (cartItems.length === 0 || !bookingForm.tableId || !bookingForm.date || !bookingForm.time
                                    ? 'Complete Selection'
                                    : `💳 Pay and Confirm - INR ${cartTotal}`)}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'menu': return renderMenu();
            case 'tables': return renderTables();
            case 'booking': return renderBooking();
            default: return renderMenu();
        }
    };

    return (
        <div className="cafe-page-container">
            {/* Sidebar overlay for mobile */}
            <div className={`cp-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Left Sidebar */}
            <aside className={`cp-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="cp-sidebar-header">
                    <div className="cp-sidebar-brand">
                        <span className="cp-brand-icon">☕</span>
                        <div>
                            <strong>{details.name}</strong>
                            <small>
                                {[details.city, details.state].filter(Boolean).join(', ') || ''}
                            </small>
                        </div>
                    </div>
                </div>

                <div className="cp-cart-preview">
                    <h4>🛒 Your Cart</h4>
                    <div className="cp-cart-stats">
                        <div className="cp-cart-stat">
                            <span className="cp-stat-label">Items</span>
                            <span className="cp-stat-value">{cartItems.length}</span>
                        </div>
                        <div className="cp-cart-stat">
                            <span className="cp-stat-label">Total</span>
                            <span className="cp-stat-value">INR {cartTotal}</span>
                        </div>
                    </div>
                </div>

                <nav className="cp-sidebar-nav">
                    {menuItems.map(item => (
                        <button
                            key={item.key}
                            className={`cp-nav-item ${activeSection === item.key ? 'active' : ''}`}
                            onClick={() => { setActiveSection(item.key); setSidebarOpen(false); }}
                        >
                            <span className="cp-nav-icon">{item.icon}</span>
                            <span className="cp-nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="cp-sidebar-footer">
                    <button className="cp-btn cp-btn-ghost cp-btn-block" onClick={() => navigate('/')}>
                         ⬅️ Back to Cafes
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="cp-main-content">
                <header className="cp-topbar">
                    <div className="cp-topbar-left">
                        <button className="cp-menu-toggle" onClick={() => setSidebarOpen(true)}></button>
                        <h1>
                            {(() => {
                                const current = menuItems.find(m => m.key === activeSection);
                                return current ? `${current.icon} ${current.label}` : '📋 Menu Selection';
                            })()}
                        </h1>
                    </div>
                    <div className="cp-topbar-right">
                        <button className="cp-btn cp-btn-ghost" type="button" onClick={() => navigate('/')}>
                            🏠 Home
                        </button>
                        <div className="cp-cart-badge">
                             <span>{cartItems.length}</span>
                        </div>
                    </div>
                </header>

                <div className="cp-content">
                    {bookingMessage?.text && (
                        <div className={`cp-flash ${bookingMessage.type || 'success'}`}>
                            {bookingMessage.text}
                        </div>
                    )}
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default CafePage;

