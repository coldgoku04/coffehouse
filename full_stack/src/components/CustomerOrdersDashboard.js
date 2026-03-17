import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiUrl } from '../config/api';
import './CustomerOrdersDashboard.css';

const CustomerOrdersDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userId = user?.id || localStorage.getItem('userId');
    const roleValue = (user?.role || localStorage.getItem('role') || '').toUpperCase();
    const isCustomer = roleValue === 'CUSTOMER';

    const [orders, setOrders] = useState([]);
    const [itemImages, setItemImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const fetchOrders = useCallback(async () => {
        if (!userId) {
            setError('Login required.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(apiUrl(`/api/cafes/orders/customer/${userId}`));
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || 'Unable to load orders.');
            }
            const data = await res.json();
            const safeOrders = Array.isArray(data) ? data : [];
            setOrders(safeOrders);
            await loadCafeDetails(safeOrders);
        } catch (e) {
            setError(e.message || 'Unable to load orders.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadCafeDetails = async (ordersList) => {
        const cafeIds = Array.from(new Set((ordersList || []).map((o) => o.cafeId).filter(Boolean)));
        if (cafeIds.length === 0) return;

        const imageMap = {};

        await Promise.all(cafeIds.map(async (id) => {
            try {
                const res = await fetch(apiUrl(`/api/cafes/${id}`));
                if (!res.ok) return;
                const data = await res.json();
                const menu = data?.menu || [];
                if (Array.isArray(menu)) {
                    menu.forEach((item) => {
                        if (item?.id && item?.imageUrl) {
                            imageMap[item.id] = item.imageUrl;
                        }
                    });
                }
            } catch {
                // Ignore individual cafe fetch failures
            }
        }));

        if (Object.keys(imageMap).length) {
            setItemImages((prev) => ({ ...prev, ...imageMap }));
        }
    };

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
    const pageOrders = useMemo(() => {
        const start = (page - 1) * pageSize;
        return orders.slice(start, start + pageSize);
    }, [orders, page]);

    if (!user) return <Navigate to="/signin" replace />;
    if (!isCustomer) return <Navigate to="/" replace />;

    return (
        <div className="customer-orders-shell">
            <header className="customer-orders-topbar">
                <div>
                    <h1>Previous Orders</h1>
                    <p>Your recent orders and order details.</p>
                </div>
                <div className="customer-orders-actions">
                    <button className="co-btn ghost" onClick={() => navigate('/')}>Home</button>
                    <button className="co-btn ghost" onClick={fetchOrders}>Refresh</button>
                </div>
            </header>

            {loading ? (
                <div className="co-state">Loading orders...</div>
            ) : error ? (
                <div className="co-state error">{error}</div>
            ) : orders.length === 0 ? (
                <div className="co-state">No orders yet.</div>
            ) : (
                <>
                    <div className="customer-orders-list">
                        {pageOrders.map((order) => (
                            <div className="co-card" key={order.id}>
                                <div className="co-card-top">
                                    <strong>Order #{order.id?.slice(-6)}</strong>
                                    <span className="co-status">{order.status}</span>
                                </div>
                                <div className="co-meta">
                                    Table {order.tableNumber} | {new Date(order.createdAt || '').toLocaleString()}
                                </div>
                                <div className="co-items">
                                    {(order.items || []).map((item, idx) => (
                                        <div className="co-item-row" key={`${order.id}-${idx}`}>
                                            <div className="co-item-image">
                                                {itemImages[item.menuItemId] ? (
                                                    <img src={itemImages[item.menuItemId]} alt={item.name || 'Item'} />
                                                ) : (
                                                    <div className="co-item-fallback">🍽️</div>
                                                )}
                                            </div>
                                            <div className="co-item-info">
                                                <div className="co-item-name">{item.name}</div>
                                                <div className="co-item-qty">Qty: {item.quantity}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="co-total">Total: INR {order.totalAmount || 0}</div>
                            </div>
                        ))}
                    </div>

                    <div className="co-pagination">
                        <button className="co-btn ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                        <span>Page {page} / {totalPages}</span>
                        <button className="co-btn ghost" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerOrdersDashboard;
