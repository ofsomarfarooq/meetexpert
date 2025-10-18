import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../store/auth";


export default function AdminGuard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (String(user.role).toLowerCase() !== "admin")
    return <div className="p-8 text-error font-medium">✖ Admin access only</div>;
  return <Outlet />;
}
