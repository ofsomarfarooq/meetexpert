// src/components/SubscribeButton.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../store/auth";

export default function SubscribeButton({ expertId, price }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [label, setLabel] = useState("Subscribe");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await http.get(`/subscriptions/status/${expertId}`);
        if (!alive) return;
        if (!data.canSubscribe) {
          setBlocked(true);
          setLabel("Already subscribed");
        } else {
          setBlocked(false);
          setLabel(`Subscribe $${Number(price || 0).toFixed(2)}`);
        }
      } catch {
        // ignore
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [expertId, price]);

  const buy = async () => {
    if (!token) return navigate("/login");
    try {
      setLabel("Processing…");
      const { data } = await http.post(`/subscriptions/${expertId}`);
      // success: send to inbox
      navigate("/inbox");
    } catch (e) {
      const msg = e.response?.data?.error || "Failed";
      if (e.response?.status === 402) {
        // not enough balance: send to wallet page to top-up
        return navigate("/wallet");
      }
      alert(msg);
      setLabel(`Subscribe $${Number(price || 0).toFixed(2)}`);
    }
  };

  return (
    <button
      className="btn btn-primary"
      disabled={checking || blocked}
      onClick={buy}
      title={blocked ? "You already have an active subscription" : "Subscribe via wallet"}
    >
      {label}
    </button>
  );
}
