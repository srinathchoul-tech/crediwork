import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../auth/AuthContext";

export function PublicOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Outlet />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
}

export function RequireClientRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== "client") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function RequireAdminRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
