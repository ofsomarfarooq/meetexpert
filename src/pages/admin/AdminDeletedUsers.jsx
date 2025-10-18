// src/pages/admin/AdminDeletedUsers.jsx
import { useEffect, useState } from "react";
import http from "../../api/http";

export default function AdminDeletedUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchDeletedUsers = async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/admin/deleted-users");
      setUsers(data || []);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load deleted users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

 const restoreUser = async (id) => {
  if (!confirm("Restore this user’s account?")) return;
  try {
    await http.patch(`/admin/users/${id}/restore`);
    setUsers(prev => prev.filter(u => u.user_id !== id)); // remove row
  } catch (e) {
    alert(e.response?.data?.error || "Restore failed");
  }
};


  const permanentlyDelete = async (id) => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    try {
      await http.delete(`/admin/users/${id}/purge`);
      // Optimistic remove
      setUsers((prev) => prev.filter((u) => u.user_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || "Permanent delete failed");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Deleted Users</h1>
        <button className="btn btn-sm" onClick={fetchDeletedUsers}>
          Refresh
        </button>
      </div>

      {err && <div className="alert alert-error mb-4">{err}</div>}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="w-16">ID</th>
                <th>Name</th>
                <th>Username / Email</th>
                <th className="w-72 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center opacity-60 py-6">
                    No deleted users.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td>
                      {u.first_name} {u.last_name}
                    </td>
                    <td>
                      @{u.username}
                      <div className="opacity-70 text-sm">{u.email}</div>
                    </td>
                    <td className="text-right space-x-2">
                      <button
                        onClick={() => restoreUser(u.user_id)}
                        className="btn btn-sm btn-success"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDelete(u.user_id)}
                        className="btn btn-sm btn-error"
                      >
                        Delete Permanently
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
