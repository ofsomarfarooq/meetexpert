// src/pages/admin/AdminExpertRequests.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PromptModal from "../../components/PromptModal.jsx";
import http from "../../api/http";

export default function AdminExpertRequests() {
  const [status, setStatus] = useState("pending"); // pending | approved | rejected
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [viewRow, setViewRow] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "approved" | "rejected"
  const [selected, setSelected] = useState(null);

  // pricing inputs (used only when approving)
  const [priceModel, setPriceModel] = useState("per_chat");
  const [priceAmount, setPriceAmount] = useState("5");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await http.get("/admin/expert-requests", {
        params: { status },
      });
      setRows(data || []);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openConfirm = (row, action) => {
    setSelected(row);
    setConfirmAction(action);
    if (action === "approved") {
      setPriceModel("per_chat");
      setPriceAmount("5");
    }
    setConfirmOpen(true);
  };

  const onSubmitDecision = async (adminMessage) => {
    if (!selected || !confirmAction) return;

    try {
      const body =
        confirmAction === "approved"
          ? {
              decision: "approved",
              message: adminMessage || "",
              // optional pricing — server will default if columns don’t exist
              price_model: priceModel,
              price_amount: Number(priceAmount || 0),
            }
          : { decision: "rejected", message: adminMessage || "" };

      await http.patch(
        `/admin/expert-requests/${selected.request_id}/decision`,
        body
      );

      setConfirmOpen(false);
      setSelected(null);
      setConfirmAction(null);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Decision failed");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Become Expert Requests</h1>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${
              status === "pending" ? "btn-primary" : ""
            }`}
            onClick={() => setStatus("pending")}
          >
            Pending
          </button>
          <button
            className={`btn btn-sm join-item ${
              status === "approved" ? "btn-primary" : ""
            }`}
            onClick={() => setStatus("approved")}
          >
            Approved
          </button>
          <button
            className={`btn btn-sm join-item ${
              status === "rejected" ? "btn-primary" : ""
            }`}
            onClick={() => setStatus("rejected")}
          >
            Rejected
          </button>
        </div>
      </div>

      {err && <div className="alert alert-error mb-4">{err}</div>}

      {loading ? (
        <div className="skeleton h-24 w-full" />
      ) : rows.length === 0 ? (
        <div className="opacity-70">No {status} requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Skill</th>
                <th>Company / Position</th>
                <th>Submitted</th>
                <th>Reviewed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.request_id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        <div className="w-8 rounded-full">
                          <img
                            alt=""
                            src={r.users?.avatar || "https://i.pravatar.cc/64"}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {r.users?.first_name} {r.users?.last_name}
                        </div>
                        <div className="text-xs opacity-70">
                          @{r.users?.username} • {r.users?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{r.skill}</td>
                  <td>
                    {r.company || "—"} {r.position ? `• ${r.position}` : ""}
                  </td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    {r.reviewed_at
                      ? new Date(r.reviewed_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="space-x-2">
                    <button className="btn btn-sm" onClick={() => setViewRow(r)}>
                      View
                    </button>

                    {status === "pending" ? (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => openConfirm(r, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => openConfirm(r, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    ) : status === "approved" ? (
                      <Link
                        to={`/profile/${r.user_id}`}
                        className="btn btn-sm btn-outline"
                      >
                        Open profile
                      </Link>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openConfirm(r, "approved")}
                        title="Re-approve"
                      >
                        Re-approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View modal */}
      {viewRow && (
        <dialog open className="modal">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              Request #{viewRow.request_id}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm opacity-70">User</div>
                <div className="font-medium">
                  {viewRow.users?.first_name} {viewRow.users?.last_name} (@
                  {viewRow.users?.username})
                </div>
              </div>
              <div>
                <div className="text-sm opacity-70">Skill</div>
                <div className="font-medium">{viewRow.skill}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Company</div>
                <div className="font-medium">{viewRow.company || "—"}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Position</div>
                <div className="font-medium">{viewRow.position || "—"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm opacity-70">Description</div>
                <div className="p-3 rounded border mt-1 whitespace-pre-wrap">
                  {viewRow.description}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm opacity-70">Proof</div>
                {viewRow.proof_url ? (
                  <a
                    href={viewRow.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="link"
                  >
                    {viewRow.proof_url}
                  </a>
                ) : (
                  <div className="opacity-60">—</div>
                )}
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setViewRow(null)}>
                Close
              </button>
              {viewRow.status === "pending" && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      openConfirm(viewRow, "approved");
                      setViewRow(null);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-error"
                    onClick={() => {
                      openConfirm(viewRow, "rejected");
                      setViewRow(null);
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => setViewRow(null)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <PromptModal
          title={`Confirm ${confirmAction}`}
          confirmText={confirmAction === "approved" ? "Approve" : "Reject"}
          onClose={() => setConfirmOpen(false)}
          onSubmit={onSubmitDecision}
        >
          {confirmAction === "approved" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-sm mb-1">Price model</div>
                <select
                  className="select select-bordered w-full"
                  value={priceModel}
                  onChange={(e) => setPriceModel(e.target.value)}
                >
                  <option value="per_chat">per_chat</option>
                  <option value="monthly">monthly</option>
                  <option value="per_question">per_question</option>
                </select>
              </div>
              <div>
                <div className="text-sm mb-1">Price amount (USD)</div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input input-bordered w-full"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                />
              </div>
            </div>
          )}
        </PromptModal>
      )}
    </div>
  );
}
