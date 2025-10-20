// src/pages/Wallet.jsx
import { useEffect, useState } from "react";
import { getBalance, getMyTx, startTopup } from "../api/wallet";
import Navbar from "../components/Navbar";
import { useAuth } from "../store/auth";

export default function Wallet() {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const [b, t] = await Promise.all([getBalance(), getMyTx()]);
      setBalance(Number(b.data.balance || 0));
      setTx(Array.isArray(t.data.items) ? t.data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const addMoney = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Enter a valid amount");
      return;
    }
    try {
  const { data } = await startTopup(amt);
  if (data?.url) window.location.href = data.url;
  else alert(data?.detail?.statusMessage || data?.error || "Could not start payment");
} catch (e) {
  alert(e?.response?.data?.detail?.statusMessage || e?.response?.data?.error || "Payment init failed");
}

  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        {err && <div className="alert alert-error mb-4">{err}</div>}

        <div className="grid gap-6">
          {/* Balance + Add money */}
          <div className="card bg-base-100 border shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Wallet</h2>
              {loading ? (
                <div className="skeleton h-8 w-40" />
              ) : (
                <div className="text-3xl font-bold">৳ {balance.toFixed(2)}</div>
              )}

              <div className="mt-4 flex gap-2 items-center">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (BDT)"
                  className="input input-bordered w-44"
                />
                <button className="btn btn-primary" onClick={addMoney}>
                  Add money (bKash)
                </button>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="card bg-base-100 border shadow-sm">
            <div className="card-body">
              <h3 className="font-bold text-lg mb-2">Transactions</h3>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>When</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.map((r) => (
  <tr key={r.tx_id}>
    <td>{r.tx_id}</td>
    <td>{new Date(r.created_at).toLocaleString()}</td>
    <td className="uppercase">{r.kind}</td>{/* credit/debit */}
    <td className="uppercase">{r.method}</td>{/* dev/bkash */}
    <td>{Number(r.amount).toFixed(2)}</td>
    <td>{r.note || "—"}</td>
  </tr>
))}

                    {tx.length === 0 && (
                      <tr>
                        <td colSpan={4} className="opacity-70">
                          No transactions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
