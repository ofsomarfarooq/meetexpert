import { useEffect, useState } from "react";
import { getStats } from "../../api/admin";

export default function AdminStats(){
  const [range,setRange]=useState("30d");
  const [data,setData]=useState(null); const [err,setErr]=useState("");
  const load=()=>getStats(range).then(r=>setData(r.data)).catch(e=>setErr(e.response?.data?.error||"Failed"));
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[range]);
  if (err) return <div className="alert alert-error">{err}</div>;
  if (!data) return <div>Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Statistics</h1>
      <div className="flex gap-2">
        {["today","7d","30d","90d","365d","all"].map(r=>(
          <button key={r} className={`btn btn-sm ${range===r?'btn-primary':''}`} onClick={()=>setRange(r)}>{r}</button>
        ))}
      </div>
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">New Users</div>
          <div className="stat-value">{data.newUsers}</div>
        </div>
        <div className="stat">
          <div className="stat-title">New Subscriptions</div>
          <div className="stat-value">{data.subs}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Payments</div>
          <div className="stat-value">{data.paymentsCount}</div>
        </div>
      </div>
    </div>
  );
}
