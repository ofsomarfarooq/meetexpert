// import { useEffect, useState } from "react";
// import http from "../api/http";
// import Navbar from "../components/Navbar.jsx";
// import { useAuth } from "../store/auth";

// export default function AdminExpertRequests() {
//   const { token, user } = useAuth();
//   const [requests, setRequests] = useState([]);
//   const [filter, setFilter] = useState("pending");
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");
//   const [message, setMessage] = useState("");

//   useEffect(() => {
//     if (!token) return;
//     (async () => {
//       try {
//         setLoading(true);
//         const { data } = await http.get(`/admin/expert-requests?status=${filter}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setRequests(data);
//       } catch (e) {
//         setErr(e?.response?.data?.error || "Failed to load requests");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [filter, token]);

//   const decide = async (id, decision) => {
//     const msg = prompt(`Enter admin message for ${decision}:`);
//     if (msg === null) return; // cancelled
//     try {
//       await http.patch(
//         `/admin/expert-requests/${id}/decision`,
//         { decision, admin_message: msg },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setMessage(`✅ Request ${id} ${decision}`);
//       // refresh
//       const { data } = await http.get(`/admin/expert-requests?status=${filter}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setRequests(data);
//     } catch (e) {
//       setErr(e?.response?.data?.error || e.message);
//     }
//   };

//   if (!user || user.role !== "admin") {
//     return (
//       <div className="p-10 text-center text-lg text-error">
//         ❌ Admin access only
//       </div>
//     );
//   }

//   return (
//     <>
//       <Navbar />
//       <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
//         <div className="flex items-center justify-between">
//           <h1 className="text-2xl font-bold">Expert Requests</h1>
//           <select
//             className="select select-bordered"
//             value={filter}
//             onChange={(e) => setFilter(e.target.value)}
//           >
//             <option value="pending">Pending</option>
//             <option value="approved">Approved</option>
//             <option value="rejected">Rejected</option>
//           </select>
//         </div>

//         {message && <div className="alert alert-success">{message}</div>}
//         {err && <div className="alert alert-error">{err}</div>}

//         {loading ? (
//           <div>Loading…</div>
//         ) : requests.length === 0 ? (
//           <div className="text-center opacity-70 py-10">No {filter} requests.</div>
//         ) : (
//           <div className="grid gap-4">
//             {requests.map((r) => (
//               <div
//                 key={r.request_id}
//                 className="card bg-base-100 border shadow-sm hover:shadow-md transition"
//               >
//                 <div className="card-body">
//                   <div className="flex justify-between items-center mb-2">
//                     <div>
//                       <div className="font-semibold text-lg">
//                         {r.users.first_name} {r.users.last_name} @{r.users.username}
//                       </div>
//                       <div className="text-sm opacity-70">{r.users.email}</div>
//                     </div>
//                     <div className="badge badge-outline capitalize">{r.status}</div>
//                   </div>

//                   <div className="text-sm space-y-1 mb-3">
//                     <div>
//                       <span className="font-semibold">Skill:</span> {r.skill}
//                     </div>
//                     {r.company && (
//                       <div>
//                         <span className="font-semibold">Company:</span> {r.company}
//                       </div>
//                     )}
//                     {r.position && (
//                       <div>
//                         <span className="font-semibold">Position:</span> {r.position}
//                       </div>
//                     )}
//                     <div>
//                       <span className="font-semibold">Description:</span> {r.description}
//                     </div>
//                     {r.proof_url && (
//                       <div className="mt-1">
//                         <span className="font-semibold">Proofs:</span>{" "}
//                         {JSON.parse(r.proof_url).map((p, i) => (
//                           <a
//                             key={i}
//                             href={p}
//                             className="link link-primary mx-1"
//                             target="_blank"
//                             rel="noopener noreferrer"
//                           >
//                             [Proof {i + 1}]
//                           </a>
//                         ))}
//                       </div>
//                     )}
//                   </div>

//                   <div className="text-xs opacity-60 mb-3">
//                     Submitted: {new Date(r.created_at).toLocaleString()}
//                   </div>

//                   {r.status === "pending" ? (
//                     <div className="flex gap-2">
//                       <button
//                         className="btn btn-success btn-sm"
//                         onClick={() => decide(r.request_id, "approved")}
//                       >
//                         Approve
//                       </button>
//                       <button
//                         className="btn btn-error btn-sm"
//                         onClick={() => decide(r.request_id, "rejected")}
//                       >
//                         Reject
//                       </button>
//                     </div>
//                   ) : (
//                     <div>
//                       <p className="text-sm">
//                         <b>Admin Message:</b>{" "}
//                         {r.admin_message || "—"}
//                       </p>
//                       {r.reviewed_at && (
//                         <p className="text-xs opacity-60">
//                           Reviewed: {new Date(r.reviewed_at).toLocaleString()}
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }
