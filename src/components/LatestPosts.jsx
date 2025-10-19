import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http";

const imgUrl = (u) => (u ? (u.startsWith("http") ? u : `${import.meta.env.VITE_API_BASE || ""}${u}`) : null);

export default function LatestPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get("/posts");
        // take a handful
        setPosts((data || []).slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Robust avatar resolver
const avatarUrl = (val) => {
  if (!val) return null;

  // base API origin (fallback to localhost:5000 if VITE_API_BASE isn't set)
  const base =
    import.meta.env.VITE_API_BASE ||
    (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:5000` : "");

  // already absolute
  if (/^https?:\/\//i.test(val)) return val;

  // starts with /uploads => prefix with API origin
  if (val.startsWith("/")) return `${base}${val}`;

  // bare filename => assume avatar file under /uploads/avatars
  return `${base}/uploads/avatars/${val}`;
};


  if (loading) return <div className="text-xs opacity-70">Loading…</div>;
  if (!posts.length) return <div className="text-xs opacity-70">No posts yet.</div>;

  return (
    <ul className="space-y-3">
      {posts.map((p) => {
        const a = p.author || {};
        return (
          <li key={p.post_id} className="flex items-start gap-3">
            <Link to={`/profile/${a.user_id}`} className="avatar">
  <div className="w-8 rounded-full overflow-hidden">
    {a.avatar ? (
      <img src={avatarUrl(a.avatar)} alt={a.username || "avatar"} />
    ) : (
      <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center text-xs">
        {(a.first_name?.[0] || a.username?.[0] || "U").toUpperCase()}
      </div>
    )}
  </div>
</Link>

            <div className="min-w-0">
              <div className="text-xs opacity-70">
                <Link to={`/profile/${a.user_id}`} className="font-medium hover:underline">
                  {a.first_name} {a.last_name}
                </Link>{" "}
                <span className="opacity-60">@{a.username}</span>
              </div>
              <div className="text-sm truncate">{p.title}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
