import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const RequireAuth = ({ children }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
};

export const RequireAdmin = ({ children }) => {
    const { user } = useAuth();
    return user && user.role === "ADMIN" ? children : <Navigate to="/login" replace />;
};