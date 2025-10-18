import { useEffect, useState } from "react";
import http from "../api/http";

export default function TopExperts() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get("/experts?sort=rating_desc&limit=5");
        setExperts(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-xs opacity-70">Loading…</div>;
  if (!experts.length) return <div className="text-xs opacity-70">No experts yet.</div>;

  return (
    <ul className="space-y-2">
      {experts.map((ex) => (
        <li key={ex.expert_id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="avatar">
              <div className="w-8 rounded-full">
                {ex.user?.avatar ? (
                  <img src={ex.user.avatar} />
                ) : (
                  <div className="bg-neutral text-neutral-content rounded-full w-8 flex items-center justify-center text-xs">
                    {ex.user?.first_name?.[0]?.toUpperCase() || "E"}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium leading-none">
                {ex.user?.first_name} {ex.user?.last_name}
              </div>
              <div className="text-xs opacity-70">{ex.user?.profession}</div>
            </div>
          </div>
          <span className="text-xs">⭐ {Number(ex.overall_rating ?? 0).toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}
