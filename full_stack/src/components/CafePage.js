import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl } from '../config/api';
import './CafePage.css';

const CafePage = () => {
    const { cafeId } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [checkoutMessage, setCheckoutMessage] = useState('');

    useEffect(() => {
        let active = true;
        const loadCafe = async () => {
            setLoading(true);
            setError('');
            setSelectedCategory('All');
            setSelectedTableId('');
            setCartItems([]);
            setCheckoutMessage('');
            try {
                const response = await fetch(apiUrl(`/api/cafes/${cafeId}`));
                if (!response.ok) {
                    throw new Error('Unable to load cafe');
                }
                const data = await response.json();
                if (active) {
                    setDetails(data);
                }
            } catch (e) {
                if (active) {
                    setError('Cafe not found or unavailable.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };
        loadCafe();
        return () => {
            active = false;
        };
    }, [cafeId]);

    const categories = useMemo(() => {
        if (!details?.menu) {
            return ['All'];
        }
        const set = new Set(details.menu.map((item) => item.category || 'Uncategorized'));
        return ['All', ...set];
    }, [details]);

    const filteredMenu = useMemo(() => {
        if (!details?.menu) {
            return [];
        }
        if (selectedCategory === 'All') {
            return details.menu;
        }
        return details.menu.filter((item) => (item.category || 'Uncategorized') === selectedCategory);
    }, [details, selectedCategory]);

    const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartItems]);
    const coverImage = details?.cafe?.coverImageUrl || details?.cafe?.logoUrl || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200';

    const addToCart = (menuItem) => {
        setCheckoutMessage('');
        setCartItems((prev) => {
            const existing = prev.find((x) => x.id === menuItem.id);
            if (existing) {
                return prev.map((x) => x.id === menuItem.id ? { ...x, quantity: x.quantity + 1 } : x);
            }
            return [...prev, { ...menuItem, quantity: 1 }];
        });
    };

    const updateQty = (itemId, delta) => {
        setCartItems((prev) =>
            prev.map((item) => item.id === itemId ? { ...item, quantity: item.quantity + delta } : item)
                .filter((item) => item.quantity > 0)
        );
    };

    const placeOrder = async () => {
        if (!selectedTableId || cartItems.length === 0) {
            setCheckoutMessage('Select a table and add items to place order.');
            return;
        }
        const table = (details?.tables || []).find((x) => x.id === selectedTableId);
        const payload = {
            tableId: selectedTableId,
            tableNumber: table?.tableNumber || selectedTableId,
            items: cartItems.map((item) => ({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        };
        try {
            const response = await fetch(apiUrl(`/api/cafes/${cafeId}/orders`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error('Order failed');
            }
            setCheckoutMessage(`Order placed for table ${payload.tableNumber}.`);
            setCartItems([]);
        } catch (e) {
            setCheckoutMessage('Could not place order right now.');
        }
    };

    if (loading) {
        return <div className="cafe-page-state">Loading cafe details...</div>;
    }
    if (error || !details) {
        return (
            <div className="cafe-page-state">
                <p>{error || 'Cafe unavailable.'}</p>
                <button type="button" onClick={() => navigate('/')}>Back to Cafes</button>
            </div>
        );
    }

    return (
        <div className="cafe-page">
            <header className="cafe-page-header">
                <div>
                    <button type="button" className="link-btn" onClick={() => navigate('/')}>Back to All Cafes</button>
                    <h1>{details.cafe?.name}</h1>
                    <p>{details.cafe?.city}, {details.cafe?.state} | {details.cafe?.openHours || 'Hours not updated'}</p>
                </div>
                <div className="staff-pill">{details.waiterCount} Waiters | {details.chefCount} Chefs</div>
            </header>
            <div className="cafe-cover">
                <img src={coverImage} alt={`${details.cafe?.name} cover`} />
            </div>

            <section className="cafe-layout">
                <article className="panel">
                    <h3>Table Booking</h3>
                    <div className="table-grid">
                        {(details.tables || []).map((table) => (
                            <button
                                type="button"
                                key={table.id}
                                disabled={!table.available}
                                className={`table-pill ${!table.available ? 'off' : ''} ${selectedTableId === table.id ? 'on' : ''}`}
                                onClick={() => table.available && setSelectedTableId(table.id)}
                            >
                                <span>Table {table.tableNumber}</span>
                                <small>{table.category || 'REGULAR'} | {table.capacity} seats</small>
                            </button>
                        ))}
                    </div>
                </article>

                <article className="panel">
                    <h3>Menu</h3>
                    <div className="chips">
                        {categories.map((category) => (
                            <button
                                type="button"
                                key={category}
                                className={`chip ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                    <div className="menu-list">
                        {filteredMenu.map((item) => (
                            <div key={item.id} className="menu-item">
                                <img src={item.imageUrl || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=220'} alt={item.name} />
                                <div>
                                    <p className="type">{item.category}</p>
                                    <h4>{item.name}</h4>
                                    <p>{item.description}</p>
                                    <div className="item-row">
                                        <strong>Rs. {item.price}</strong>
                                        <button type="button" onClick={() => addToCart(item)}>Add</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="panel">
                    <h3>Your Order</h3>
                    <div className="order-list">
                        {cartItems.length === 0 ? (
                            <p className="muted">No items selected.</p>
                        ) : (
                            cartItems.map((item) => (
                                <div className="order-row" key={item.id}>
                                    <div>
                                        <h4>{item.name}</h4>
                                        <small>Rs. {item.price}</small>
                                    </div>
                                    <div className="qty">
                                        <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="checkout">
                        <p>Total: <strong>Rs. {cartTotal}</strong></p>
                        <button type="button" onClick={placeOrder}>Place Order</button>
                        {checkoutMessage && <small>{checkoutMessage}</small>}
                    </div>
                </article>
            </section>
        </div>
    );
};

export default CafePage;

