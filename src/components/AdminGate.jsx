// components/AdminGate.jsx
import { useAuth } from "../store/auth";

export default function AdminGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!user || String(user.role).toLowerCase() !== "admin") {
    return <div className="p-10 text-center text-error flex items-center justify-center gap-2">
      <span className="text-xl">✖ Admin access only</span>
    </div>;
  }
  return children;
}
