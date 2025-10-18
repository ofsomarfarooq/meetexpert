import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http";

export default function LatestPosts() {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get("/posts");
        setRecent((data || []).slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-xs opacity-70">Loading…</div>;
  if (!recent.length) return <div className="text-xs opacity-70">No recent posts.</div>;

  return (
    <ul className="space-y-2">
      {recent.map((p) => (
        <li key={p.post_id}>
          <Link to={`/post/${p.post_id}`} className="text-sm font-medium hover:underline">
            {p.title?.length > 40 ? p.title.slice(0, 40) + "…" : p.title}
          </Link>
          <div className="text-xs opacity-60">
            by {p.author?.first_name || p.author?.username || "Unknown"}
          </div>
        </li>
      ))}
    </ul>
  );
}
