// src/components/TopExperts.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http";

// Build a usable avatar URL from whatever we stored
const avatarUrl = (val) => {
  if (!val) return null;
  const base =
    import.meta.env.VITE_API_BASE ||
    `${window.location.protocol}//${window.location.hostname}:5000`;
  if (/^https?:\/\//i.test(val)) return val;        // absolute URL
  if (val.startsWith("/")) return `${base}${val}`;   // stored as /uploads/avatars/xyz.jpg
  return `${base}/uploads/avatars/${val}`;           // stored as filename only
};

// Format rating (handles null/undefined/strings/Decimals)
const formatRating = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
};

export default function TopExperts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Ask the API for top 5 by rating (server supports sort=rating_desc)
        const { data } = await http.get("/experts", {
          params: { page: 1, limit: 5, sort: "rating_desc" },
        });
        if (!alive) return;
        setItems(data?.items ?? []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span>🌞</span> Top Experts
        </h3>

        {loading ? (
          <div className="mt-2 space-y-2">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="opacity-70 mt-2">No experts yet.</div>
        ) : (
          <ul className="menu gap-2 mt-2">
            {items.map((e) => {
              // API returns the user object under e.user (our latest server),
              // but older builds used e.users — support both just in case.
              const u = e.user || e.users || {};
              const ratingStr = formatRating(
                e.overall_rating ?? e.rating?.avg ?? 0
              );

              return (
                <li key={e.expert_id} className="flex items-center">
                  <Link
                    to={`/profile/${u.user_id}`}
                    className="flex-1 flex items-center gap-3"
                    title={`${u.first_name ?? ""} ${u.last_name ?? ""}`}
                  >
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {u.avatar ? (
                          <img src={avatarUrl(u.avatar)} alt={u.username || "avatar"} />
                        ) : (
                          <div className="bg-neutral text-neutral-content w-8 h-8 rounded-full flex items-center justify-center text-xs">
                            {(u.first_name?.[0] ||
                              u.username?.[0] ||
                              "E"
                            ).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-medium text-primary hover:underline">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        {u.profession || "—"}
                      </div>
                    </div>
                  </Link>

                  <div className="ml-2 flex items-center gap-1 text-sm">
                    <span>⭐</span>
                    <span className="tabular-nums">{ratingStr}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
