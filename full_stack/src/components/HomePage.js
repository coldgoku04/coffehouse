import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { useAuth } from './AuthContext';
import './HomePage.css';

const HomePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [cafes, setCafes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let active = true;
        const loadCafes = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(apiUrl('/api/cafes'));
                if (!response.ok) {
                    throw new Error('Unable to load cafes');
                }
                const data = await response.json();
                if (active) {
                    setCafes(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                if (active) {
                    setError('Could not load cafes right now. Please try again.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadCafes();
        return () => {
            active = false;
        };
    }, []);

    const filteredCafes = useMemo(() => {
        if (!search.trim()) {
            return cafes;
        }
        const q = search.toLowerCase();
        return cafes.filter((cafe) =>
            `${cafe.name || ''} ${cafe.city || ''} ${cafe.state || ''}`.toLowerCase().includes(q)
        );
    }, [cafes, search]);

    const handleDashboardRoute = () => {
        if (!user) {
            navigate('/signin');
            return;
        }
        if (user.role === 'CAFE_OWNER') {
            navigate('/owner/dashboard');
            return;
        }
        if (user.role === 'ADMIN') {
            navigate('/admin');
            return;
        }
        navigate('/profile');
    };

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <div className="home-shell">
            <header className="home-header">
                <div className="header-inner">
                    <button type="button" className="brand" onClick={() => navigate('/')}>
                        <span className="brand-icon">CB</span>
                        <span>
                            <strong>Cafe Bridge</strong>
                            <small>Discover and book top cafes</small>
                        </span>
                    </button>

                    <nav className="main-nav">
                        <a href="#cafes">Cafes</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#contact">Contact</a>
                    </nav>

                    <div className="header-cta">
                        {!user ? (
                            <>
                                <button type="button" className="ghost" onClick={() => navigate('/signin')}>Sign In</button>
                                <button type="button" className="primary" onClick={() => navigate('/register')}>Register</button>
                            </>
                        ) : (
                            <>
                                <button type="button" className="ghost" onClick={handleDashboardRoute}>
                                    {user.role === 'CAFE_OWNER' ? 'Owner Dashboard' : user.role === 'ADMIN' ? 'Admin Panel' : 'My Profile'}
                                </button>
                                <button type="button" className="primary" onClick={handleLogout}>Logout</button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="home-main">
                <section className="hero">
                    <div className="hero-content">
                        <p className="eyebrow">One Platform. Many Cafes.</p>
                        <h1>Reserve tables and order from your favorite local cafes.</h1>
                        <p>
                            Browse all available cafes, open a cafe page, select tables, and place menu orders from a single experience.
                        </p>
                        <div className="hero-search">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by cafe name, city, state"
                            />
                            <button type="button" onClick={() => document.getElementById('cafes')?.scrollIntoView({ behavior: 'smooth' })}>
                                Explore Cafes
                            </button>
                        </div>
                    </div>
                    <div className="hero-metrics">
                        <article>
                            <strong>{cafes.length}</strong>
                            <span>Available Cafes</span>
                        </article>
                        <article>
                            <strong>24x7</strong>
                            <span>Online Access</span>
                        </article>
                        <article>
                            <strong>Fast</strong>
                            <span>Table Booking + Orders</span>
                        </article>
                    </div>
                </section>

                <section className="cafes-section" id="cafes">
                    <div className="section-head">
                        <h2>Available Cafes</h2>
                        <p>Only active cafes are listed here.</p>
                    </div>

                    {loading ? (
                        <div className="state-panel">Loading cafes...</div>
                    ) : error ? (
                        <div className="state-panel">{error}</div>
                    ) : filteredCafes.length === 0 ? (
                        <div className="state-panel">No cafes match your search.</div>
                    ) : (
                        <div className="cafe-grid">
                            {filteredCafes.map((cafe) => (
                                <article key={cafe.id} className="cafe-card">
                                    <img
                                        src={cafe.coverImageUrl || cafe.logoUrl || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'}
                                        alt={cafe.name}
                                    />
                                    <div className="card-body">
                                        <h3>{cafe.name}</h3>
                                        <p>{cafe.city}, {cafe.state}</p>
                                        <small>{cafe.openHours || 'Open hours not updated'}</small>
                                        <button type="button" onClick={() => navigate(`/cafes/${cafe.id}`)}>
                                            Open Cafe Page
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="how-it-works" id="how-it-works">
                    <article>
                        <span>1</span>
                        <h4>Choose Cafe</h4>
                        <p>Select from available cafes on the platform.</p>
                    </article>
                    <article>
                        <span>2</span>
                        <h4>Book Table</h4>
                        <p>Pick your preferred available table.</p>
                    </article>
                    <article>
                        <span>3</span>
                        <h4>Order Menu</h4>
                        <p>Add menu items and place your order instantly.</p>
                    </article>
                </section>
            </main>

            <footer className="home-footer" id="contact">
                <div className="footer-grid">
                    <div>
                        <h5>Cafe Bridge</h5>
                        <p>Central cafe marketplace for customers and cafe owners.</p>
                    </div>
                    <div>
                        <h5>Customer</h5>
                        <a href="#cafes">Browse Cafes</a>
                        <a href="/signin">Sign In</a>
                    </div>
                    <div>
                        <h5>Cafe Owner</h5>
                        <a href="/owner/dashboard">Owner Dashboard</a>
                        <a href="/register">Owner Registration</a>
                    </div>
                    <div>
                        <h5>Support</h5>
                        <a href="/forgot-password">Reset Password</a>
                        <a href="/profile">Profile</a>
                    </div>
                </div>
                <p className="copyright">© 2026 Cafe Bridge. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default HomePage;
