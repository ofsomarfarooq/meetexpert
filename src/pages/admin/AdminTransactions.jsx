// src/pages/admin/AdminTransactions.jsx
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar.jsx";
import http from "../../api/http";

export default function AdminTransactions() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async (p = page) => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await http.get("/admin/transactions", {
        params: { page: p, limit },
      });
      // defensive parsing
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setTotal(Number(data?.total || list.length));
      setPage(Number(data?.page || p));
    } catch (e) {
      console.error(e);
      setErr("Failed to load transactions");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => load(page + 1);
  const prev = () => load(Math.max(1, page - 1));

  return (
    <>
     
      <main className="container mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold mb-4">Transactions</h1>

        {err && <div className="alert alert-error mb-4">{err}</div>}
        {loading ? (
          <div className="skeleton h-32" />
        ) : (
          <div className="card bg-base-100 border shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm opacity-70">
                  Total: {total} • Page {page}
                </div>
                <div className="space-x-2">
                  <button className="btn btn-sm" onClick={prev} disabled={page <= 1}>
                    Prev
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={next}
                    disabled={items.length < limit}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>TX</th>
                      <th>User</th>
                      <th>Kind</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center opacity-60 py-6">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      items.map((r) => (
                        <tr key={r.tx_id}>
                          <td>#{r.tx_id}</td>
                          <td className="flex items-center gap-2">
                            <img
                              src={r.user?.avatar || "/avatar.png"}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                            <div className="text-sm">
                              <div className="font-medium">
                                {r.user?.first_name} {r.user?.last_name}
                              </div>
                              <div className="opacity-60">@{r.user?.username}</div>
                            </div>
                          </td>
                          <td className="uppercase">{r.kind}</td>
                          <td>{r.method}</td>
                          <td>৳ {Number(r.amount).toFixed(2)}</td>
                          <td className="opacity-80">{r.reference || r.note || "-"}</td>
                          <td>{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
