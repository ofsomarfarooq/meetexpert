import { useEffect, useState } from "react";
import http from "../api/http";
import Navbar from "../components/Navbar";

export default function Notifications() {
  const [items, setItems] = useState(null); // null = loading
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setErr("");
      const { data } = await http.get("/notifications");
      setItems(data || []); // make sure it’s an array
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load notifications");
      setItems([]); // avoid crash
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await http.patch(`/notifications/${id}/read`);
    setItems(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await http.patch("/notifications/read-all");
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <button onClick={markAll} className="btn btn-sm">Mark all read</button>
        </div>
        {err && <div className="alert alert-error mb-4">{err}</div>}
        {items === null ? (
          <div className="loading loading-spinner" />
        ) : items.length === 0 ? (
          <div className="opacity-70">No notifications.</div>
        ) : (
          <div className="space-y-3">
            {items.map(n => {
              const text = n.body ?? n.message ?? ""; // tolerate both
              return (
                <div
                  key={n.notification_id}
                  className={`p-4 rounded-xl border ${n.is_read ? "opacity-70" : "bg-base-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{n.title || "Notification"}</div>
                    <div className="text-xs opacity-60">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="mt-1">{text}</div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.notification_id)} className="btn btn-xs mt-2">
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
