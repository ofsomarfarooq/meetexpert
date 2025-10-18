import { useEffect, useState } from "react";
import { listNotifications, markRead, markAllRead } from "../api/notifications";
import { useAuth } from "../store/auth";

const onMarkAll = async () => {
  try {
    const { data } = await markAllRead();
    // optimistic update
    setItems(prev => prev.map(it => ({ ...it, is_read: true })));

    // (optional) if you want to be 100% in sync with server:
    // if (data?.ok) await load();
  } catch (e) {
    console.error(e);
    alert(e.response?.data?.error || "Failed to mark all as read");
  }
};


export default function NotificationsBell() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!token) return;
    const { data } = await listNotifications({ limit: 25 });
    setItems(data);
  };

  useEffect(() => {
    load();
    if (!token) return;
    const id = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(id);
  }, [token]);

  const unreadCount = items.filter(n => !n.is_read).length;

  const onOpen = () => {
    setOpen(!open);
    if (!open) load();
  };

  const onItemClick = async (n) => {
    if (!n.is_read) {
      await markRead(n.notification_id);
      setItems(prev => prev.map(it =>
        it.notification_id === n.notification_id ? { ...it, is_read: true } : it
      ));
    }
  };

//   const onMarkAll = async () => {
//     await markAllRead();
//     setItems(prev => prev.map(it => ({ ...it, is_read: true })));
//   };

  return (
    <div className="relative">
      <button className="btn btn-ghost btn-circle" onClick={onOpen} title="Notifications">
        <div className="indicator">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
               viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
          </svg>
          {unreadCount > 0 && (
            <span className="badge badge-error badge-sm indicator-item">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] z-50">
          <div className="card bg-base-100 shadow-xl border">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Notifications</h3>
                <button className="btn btn-xs" onClick={onMarkAll}>Mark all read</button>
              </div>

              <div className="max-h-80 overflow-auto space-y-2">
                {items.length === 0 && (
                  <div className="text-sm opacity-60 p-2">No notifications.</div>
                )}
                {items.map(n => (
                  <div key={n.notification_id}
                       onClick={() => onItemClick(n)}
                       className={`p-2 rounded border ${n.is_read ? "opacity-70" : "bg-base-200 cursor-pointer"}`}>
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs opacity-80">{n.body}</div>}
                    <div className="text-[10px] opacity-60 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="card-actions">
            <a href="/notifications" className="btn btn-primary btn-sm w-full">View all</a>
          </div>
              </div>

            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
