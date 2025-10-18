// src/admin/pages/AdminUsers.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import http from "../../api/http";

// Small helper for classnames
const cx = (...a) => a.filter(Boolean).join(" ");

const SORT_OPTIONS = [
  { value: "name_asc",  label: "Name (A→Z)" },
  { value: "name_desc", label: "Name (Z→A)" },
  { value: "price_asc", label: "Price (Low→High)" },
  { value: "price_desc",label: "Price (High→Low)" },
];

const ROLE_OPTIONS = [
  { value: "",       label: "All roles" },
  { value: "user",   label: "User" },
  { value: "admin",  label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "",         label: "All status" },
  { value: "active",   label: "Active" },
  { value: "blocked",  label: "Blocked" },
  { value: "deleted",  label: "Deleted" },
];

const EXPERT_OPTIONS = [
  { value: "",     label: "Any" },   // no filter
  { value: "yes",  label: "Experts" },
  { value: "no",   label: "Non-experts" },
];

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state (with defaults)
  const [q, setQ]               = useState(searchParams.get("q") || "");
  const [role, setRole]         = useState(searchParams.get("role") || "");
  const [status, setStatus]     = useState(searchParams.get("status") || "");
  const [expert, setExpert]     = useState(searchParams.get("expert") || "");
  const [sort, setSort]         = useState(searchParams.get("sort") || "name_asc");
  const [page, setPage]         = useState(Number(searchParams.get("page") || 1));
  const [limit, setLimit]       = useState(Number(searchParams.get("limit") || 20));

  // Data
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState({ total: 0, items: [], page: 1, limit: 20 });
  const totalPages              = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / limit)), [data.total, limit]);

  // Debounce search typing
  const debounceRef = useRef(null);
  const pushUrl = () => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (status) p.set("status", status);
    if (expert === "yes" || expert === "no") p.set("expert", expert);
    if (sort) p.set("sort", sort);
    p.set("page", String(page));
    p.set("limit", String(limit));
    setSearchParams(p);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (expert === "yes" || expert === "no") params.set("expert", expert); // IMPORTANT
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const { data } = await http.get(`/admin/users?${params.toString()}`);
      setData(data);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Sync URL on change
  useEffect(() => {
    pushUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, status, expert, sort, page, limit]);

  // Fetch on URL state change
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handlers
  const onSearchChange = (e) => {
    const next = e.target.value;
    setQ(next);
    // debounce page reset + fetch by letting URL effect handle it
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      pushUrl();
    }, 350);
  };

  const onRoleChange = (e) => { setRole(e.target.value); setPage(1); };
  const onStatusChange = (e) => { setStatus(e.target.value); setPage(1); };
  const onExpertChange = (e) => { setExpert(e.target.value); setPage(1); };
  const onSortChange = (e) => { setSort(e.target.value); setPage(1); };
  const onLimitChange = (e) => { setLimit(Number(e.target.value || 20)); setPage(1); };

  const blockToggle = async (u) => {
    const block = u.status !== "blocked";
    if (!confirm(`${block ? "Block" : "Unblock"} ${u.first_name} ${u.last_name}?`)) return;
    try {
      await http.patch(`/admin/users/${u.user_id}/block`, { block, reason: "" });
      // Update row locally
      setData(prev => ({
        ...prev,
        items: prev.items.map(it => it.user_id === u.user_id ? { ...it, status: block ? "blocked" : "active" } : it)
      }));
    } catch (e) {
      alert(e.response?.data?.error || "Action failed");
    }
  };

  const softDelete = async (u) => {
    if (!confirm(`Move ${u.first_name} ${u.last_name} to deleted?`)) return;
    try {
      await http.delete(`/admin/users/${u.user_id}`);
      // Remove row locally
      setData(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        items: prev.items.filter(it => it.user_id !== u.user_id),
      }));
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* Filters */}
      <div className="grid gap-3 md:grid-cols-5 lg:grid-cols-6 items-end">
        <div className="md:col-span-2">
          <label className="label"><span className="label-text">Search</span></label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Name, username, profession…"
            value={q}
            onChange={onSearchChange}
          />
        </div>

        <div>
          <label className="label"><span className="label-text">Role</span></label>
          <select className="select select-bordered w-full" value={role} onChange={onRoleChange}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label"><span className="label-text">Status</span></label>
          <select className="select select-bordered w-full" value={status} onChange={onStatusChange}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label"><span className="label-text">Expert</span></label>
          <select className="select select-bordered w-full" value={expert} onChange={onExpertChange}>
            {EXPERT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label"><span className="label-text">Sort</span></label>
          <select className="select select-bordered w-full" value={sort} onChange={onSortChange}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label"><span className="label-text">Per page</span></label>
          <select className="select select-bordered w-full" value={limit} onChange={onLimitChange}>
            {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-2xl">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="w-14">ID</th>
              <th>Name</th>
              <th>Username / Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Expert</th>
              <th className="text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center py-8">Loading…</td></tr>
            )}

            {!loading && data.items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 opacity-60">No users found.</td></tr>
            )}

            {data.items.map(u => {
              const expertProfile = u.expert_profiles || null;
              return (
                <tr key={u.user_id}>
                  <td>{u.user_id}</td>
                  <td>
                    <div className="font-semibold">{u.first_name} {u.last_name}</div>
                    <div className="text-xs opacity-70">{u.profession || "—"}</div>
                  </td>
                  <td>
                    <div>@{u.username}</div>
                    <div className="text-xs opacity-70">{u.email}</div>
                  </td>
                  <td>
                    <span className={cx(
                      "badge",
                      u.role === "admin" ? "badge-warning" : "badge-ghost"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={cx(
                      "badge",
                      u.status === "active" ? "badge-success" :
                      u.status === "blocked" ? "badge-error" :
                      "badge-ghost"
                    )}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    {expertProfile ? (
                      <div className="flex flex-col">
                        <span className="badge badge-info mb-1">Expert</span>
                        <span className="text-xs opacity-70">
                          {expertProfile.price_model || "per_chat"} • {expertProfile.currency || "USD"} {expertProfile.price_amount ?? "-"}
                        </span>
                      </div>
                    ) : (
                      <span className="opacity-60 text-sm">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/profile/${u.user_id}`} className="btn btn-xs">Visit</Link>
                      <button
                        className={cx("btn btn-xs", u.status === "blocked" ? "btn-success" : "btn-warning")}
                        onClick={() => blockToggle(u)}
                      >
                        {u.status === "blocked" ? "Unblock" : "Block"}
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={() => softDelete(u)}
                        disabled={u.status === "deleted"}
                        title={u.status === "deleted" ? "Already deleted" : "Delete"}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="opacity-70 text-sm">
          Total: {data.total} • Page {page} of {totalPages}
        </div>
        <div className="join">
          <button className="btn btn-sm join-item" onClick={() => setPage(1)} disabled={page <= 1}>« First</button>
          <button className="btn btn-sm join-item" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
          <button className="btn btn-sm join-item" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</button>
          <button className="btn btn-sm join-item" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</button>
        </div>
      </div>
    </div>
  );
}
