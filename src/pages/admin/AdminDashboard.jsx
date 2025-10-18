import { useEffect, useState } from "react";
import { getAdminSummary } from "../../api/admin";

export default function AdminDashboard(){
  const [data,setData] = useState(null);
  const [err,setErr] = useState("");
  useEffect(()=>{ getAdminSummary().then(r=>setData(r.data)).catch(e=>setErr(e.response?.data?.error || "Failed")); },[]);
  if (err) return <div className="alert alert-error">{err}</div>;
  if (!data) return <div>Loading…</div>;
  const Item = ({label,val})=>(
    <div className="stat">
      <div className="stat-title">{label}</div>
      <div className="stat-value text-primary">{val}</div>
    </div>
  );
  return (
    <div className="card bg-base-100 border">
      <div className="card-body">
        <h1 className="card-title">Dashboard</h1>
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <Item label="Total Users" val={data.totalUsers}/>
          <Item label="Experts" val={data.expertMentors}/>
          <Item label="Profile Requests" val={data.profileReqs}/>
          <Item label="Expert Requests" val={data.expertReqs}/>
          <Item label="Deleted Users" val={data.deletedUsers}/>
          <Item label="Blocked Users" val={data.blockedUsers}/>
          <Item label="Transactions" val={data.txCount}/>
        </div>
      </div>
    </div>
  );
}
