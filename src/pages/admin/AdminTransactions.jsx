import { useEffect, useState } from "react";
import { getTransactions } from "../../api/admin";

export default function AdminTransactions(){
  const [items,setItems]=useState(null); const [err,setErr]=useState("");
  useEffect(()=>{ getTransactions().then(r=>setItems(r.data)).catch(e=>setErr(e.response?.data?.error||"Failed")); },[]);
  if (err) return <div className="alert alert-error">{err}</div>;
  if (!items) return <div>Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Transactions</h1>
      <div className="overflow-x-auto border rounded-xl">
        <table className="table table-zebra">
          <thead><tr><th>ID</th><th>Payer</th><th>Expert</th><th>Sub</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            {items.map(t=>(
              <tr key={t.payment_id}>
                <td>{t.payment_id}</td>
                <td>{t.users_payments_payer_idTousers?.username}</td>
                <td>{t.users_payments_expert_idTousers?.username}</td>
                <td>{t.subscription_id}</td>
                <td>${t.amount}</td>
                <td>{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
