import { useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../store/auth";

export default function SubscribeButton({ expertId, price = 5.0 }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { token } = useAuth();

  const handle = async () => {
    if (!token) return navigate("/login");
    setLoading(true); setErr("");
    try {
      await http.post(
        "/subscriptions",
        { expert_id: Number(expertId), plan: "monthly", amount: price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/inbox", { state: { refresh: true } });
    } catch (e) {
      setErr(e.response?.data?.error || "Subscription failed");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <button onClick={handle} disabled={loading} className="btn btn-primary">
        {loading ? "Subscribing…" : `Subscribe ($${price})`}
      </button>
      {err && <div className="text-error text-sm mt-1">{err}</div>}
    </div>
  );
}
