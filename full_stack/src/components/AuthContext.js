import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Optionally auto-load from localStorage
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken || "");
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", authToken || "");
        if (userData?.id) {
            localStorage.setItem("userId", userData.id);
        }
        if (userData?.role) {
            localStorage.setItem("role", userData.role);
        }
        if (userData?.cafeId) {
            localStorage.setItem("cafeId", userData.cafeId);
        }
    };

    const logout = () => {
        setUser(null); setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        localStorage.removeItem("cafeId");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
