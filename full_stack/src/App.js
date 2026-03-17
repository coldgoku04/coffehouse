import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Component Imports
import HomePage from './components/HomePage';
import CafePage from './components/CafePage';
import SignIn from './components/SignIn';
import Registration from './components/Registration';
import AdminDashboard from './components/AdminDashboard';
import ChangePassword from './components/ChangePassword';
import Profile from './components/Profile';
import ForgotPassword from './components/ForgotPassword';
import OwnerDashboard from './components/OwnerDashboard';
import ChefDashboard from './components/ChefDashboard';
import WaiterDashboard from './components/WaiterDashboard';
import CustomerOrdersDashboard from './components/CustomerOrdersDashboard';

// Auth context & wrapper imports
import { AuthProvider, useAuth } from './components/AuthContext';

// RequireAuth & RequireAdmin wrappers
function RequireAuth({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/signin" replace />;
}

function RequireAdmin({ children }) {
    const { user } = useAuth();
    return user && user.role === 'ADMIN'
        ? children
        : <Navigate to="/signin" replace />;
}

function RequireOwner({ children }) {
    const { user } = useAuth();
    return user && user.role === 'CAFE_OWNER'
        ? children
        : <Navigate to="/signin" replace />;
}

function RequireChef({ children }) {
    const { user } = useAuth();
    return user && user.role === 'CHEF'
        ? children
        : <Navigate to="/signin" replace />;
}

function RequireWaiter({ children }) {
    const { user } = useAuth();
    return user && user.role === 'WAITER'
        ? children
        : <Navigate to="/signin" replace />;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/cafes/:cafeId" element={<CafePage />} />
                        <Route path="/signin" element={<SignIn />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/register" element={<Registration />} />
                        <Route
                            path="/admin"
                            element={
                                <RequireAdmin>
                                    <AdminDashboard />
                                </RequireAdmin>
                            }
                        />
                        <Route
                            path="/owner/dashboard"
                            element={
                                <RequireOwner>
                                    <OwnerDashboard />
                                </RequireOwner>
                            }
                        />
                        <Route
                            path="/chef/dashboard"
                            element={
                                <RequireChef>
                                    <ChefDashboard />
                                </RequireChef>
                            }
                        />
                        <Route
                            path="/waiter/dashboard"
                            element={
                                <RequireWaiter>
                                    <WaiterDashboard />
                                </RequireWaiter>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <RequireAuth>
                                    <Profile />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/customer/orders"
                            element={
                                <RequireAuth>
                                    <CustomerOrdersDashboard />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/change-password"
                            element={
                                <RequireAuth>
                                    <ChangePassword />
                                </RequireAuth>
                            }
                        />
                        {/* Default/fallback route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
