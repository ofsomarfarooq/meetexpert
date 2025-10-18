// src/pages/admin/AdminProfileRequests.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PromptModal from "../../components/PromptModal.jsx";
import { getProfileRequests, decideProfileRequest } from "../../api/admin.js";

function parsePayload(row) {
  // support both schemas:
  //   • new schema: row.payload (JSON string)
  //   • old schema: scattered new_* columns
  try {
    if (row?.payload) {
      const obj = JSON.parse(row.payload);
      if (obj && typeof obj === "object") return obj;
    }
  } catch (_) {}
  // fallback to legacy columns if present
  const legacy = {};
  if (row?.new_first_name) legacy.first_name = row.new_first_name;
  if (row?.new_last_name) legacy.last_name = row.new_last_name;
  if (row?.new_username) legacy.username = row.new_username;
  if (row?.new_profession) legacy.profession = row.new_profession;
  if (row?.new_bio) legacy.bio = row.new_bio;
  return legacy;
}

export default function AdminProfileRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("pending");

  // modals
  const [viewRow, setViewRow] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "approved" | "rejected"
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await getProfileRequests();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load profile change requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.status === status),
    [rows, status]
  );

  const openConfirm = (row, action) => {
    setSelected(row);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const onSubmitDecision = async (adminMessage) => {
    try {
      // IMPORTANT: use req_id (not request_id)
      await decideProfileRequest(selected.req_id, confirmAction, adminMessage || "");
      setConfirmOpen(false);
      setSelected(null);
      setConfirmAction(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Decision failed");
    }
  };

  const DiffRow = ({ label, before, after }) => {
    const changed = (after ?? "") !== (before ?? "");
    return (
      <div className={`grid grid-cols-3 gap-3 items-start p-2 rounded ${changed ? "bg-base-200" : ""}`}>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm opacity-80 break-words">{before ?? "—"}</div>
        <div className={`text-sm break-words ${changed ? "font-semibold" : "opacity-80"}`}>
          {after ?? "—"}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Profile Change Requests</h1>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${status === "pending" ? "btn-primary" : ""}`}
            onClick={() => setStatus("pending")}
          >
            Pending
          </button>
          <button
            className={`btn btn-sm join-item ${status === "approved" ? "btn-primary" : ""}`}
            onClick={() => setStatus("approved")}
          >
            Approved
          </button>
          <button
            className={`btn btn-sm join-item ${status === "rejected" ? "btn-primary" : ""}`}
            onClick={() => setStatus("rejected")}
          >
            Rejected
          </button>
        </div>
      </div>

      {err && <div className="alert alert-error mb-4">{err}</div>}

      {loading ? (
        <div className="skeleton h-24 w-full" />
      ) : filtered.length === 0 ? (
        <div className="opacity-70">No {status} requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Requested fields</th>
                <th>Submitted</th>
                <th>Reviewed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const payload = parsePayload(r);
                const requestedList = Object.keys(payload || {});
                const requestedFields = requestedList.length ? requestedList.join(", ") : "—";

                return (
                  <tr key={r.req_id}>
                    <td>{r.req_id}</td>
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
                    <td className="text-sm">{requestedFields}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}</td>
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
                      ) : (
                        <Link to={`/profile/${r.user_id}`} className="btn btn-sm btn-outline">
                          Open profile
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View details */}
      {viewRow && (() => {
        const payload = parsePayload(viewRow);
        return (
          <dialog open className="modal">
            <div className="modal-box max-w-3xl">
              <h3 className="font-bold text-lg mb-3">
                Request #{viewRow.req_id} • @{viewRow.users?.username}
              </h3>

              <div className="grid grid-cols-3 gap-3 px-2 pb-2 text-xs opacity-70">
                <div>Field</div>
                <div>Current</div>
                <div>Requested</div>
              </div>

              <div className="rounded border divide-y">
                {/* Only render rows that actually appear in the payload */}
                {"first_name" in payload && (
                  <DiffRow
                    label="First name"
                    before={viewRow.users?.first_name}
                    after={payload.first_name}
                  />
                )}
                {"last_name" in payload && (
                  <DiffRow
                    label="Last name"
                    before={viewRow.users?.last_name}
                    after={payload.last_name}
                  />
                )}
                {"username" in payload && (
                  <DiffRow
                    label="Username"
                    before={viewRow.users?.username}
                    after={payload.username}
                  />
                )}
                {"profession" in payload && (
                  <DiffRow
                    label="Profession"
                    before={viewRow.users?.profession}
                    after={payload.profession}
                  />
                )}
                {"bio" in payload && (
                  <DiffRow
                    label="Bio"
                    before={viewRow.users?.bio}
                    after={payload.bio}
                  />
                )}
              </div>

              {viewRow.admin_message && (
                <div className="mt-3">
                  <div className="text-sm opacity-70">Admin note</div>
                  <div className="p-2 rounded border whitespace-pre-wrap">
                    {viewRow.admin_message}
                  </div>
                </div>
              )}

              <div className="modal-action">
                <button className="btn" onClick={() => setViewRow(null)}>
                  Close
                </button>
                {viewRow.status === "pending" && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        setConfirmAction("approved");
                        setSelected(viewRow);
                        setConfirmOpen(true);
                        setViewRow(null);
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-error"
                      onClick={() => {
                        setConfirmAction("rejected");
                        setSelected(viewRow);
                        setConfirmOpen(true);
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
        );
      })()}

      {/* Confirm -> single message input */}
      {confirmOpen && (
        <PromptModal
          title={`Confirm ${confirmAction}`}
          confirmText={confirmAction === "approved" ? "Approve" : "Reject"}
          onClose={() => setConfirmOpen(false)}
          onSubmit={onSubmitDecision}
        />
      )}
    </div>
  );
}
