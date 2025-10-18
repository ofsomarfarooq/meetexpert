import http from "./http";


// Dashboard summary
export const getAdminSummary = () => http.get("/admin/summary");

// Users
export const getAdminUsers = (params) => http.get("/admin/users", { params }); // e.g. { q, role, status, expert, sort, page, limit }
export const blockUser        = (id, block = true, reason = "") => http.patch(`/admin/users/${id}/block`, { block, reason });
export const softDeleteUser   = (id) => http.delete(`/admin/users/${id}`);
export const purgeUser        = (id) => http.delete(`/admin/users/${id}/purge`);
export const restoreUser      = (id) => http.patch(`/admin/users/${id}/restore`);

// Requests
// export const getProfileRequests      = () => http.get("/admin/profile-requests");
// export const decideProfileRequest    = (id, decision, message) => http.post(`/admin/profile-requests/${id}/decision`, { decision, message });
export const getExpertRequests = (status = "pending") =>
  http.get("/admin/expert-requests", { params: { status } });
// export const decideExpertRequest     = (id, decision, message) => http.post(`/admin/expert-requests/${id}/decision`, { decision, message });


// Deleted users
export const getDeletedUsers = () => http.get("/admin/deleted-users");

// Transactions
export const getTransactions = () => http.get("/admin/transactions");
export const getStats        = (range = "30d") => http.get("/admin/statistics", { params: { range } });


// src/api/admin.js
export const decideExpertRequest = (id, decision, adminMessage = "") =>
  http.patch(`/admin/expert-requests/${id}/decision`, {
    decision,
    admin_message: adminMessage,
  });

// export const decideProfileRequest = (id, decision, message) =>
//   http.patch(`/admin/profile-requests/${id}/decision`, { decision, message, payload });


// List by status
export const getProfileRequests = () => http.get("/admin/profile-requests");

// decision must be PATCH and use req_id
export const decideProfileRequest = (reqId, decision, message) =>
  http.patch(`/admin/profile-requests/${reqId}/decision`, { decision, message });




