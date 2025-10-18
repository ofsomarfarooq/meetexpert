import http from "./http";

export const listNotifications = (params = {}) =>
  http.get("/notifications", { params });

export const markRead = (id) =>
  http.patch(`/notifications/${id}/read`);

// use the primary route; alias also works if you prefer
export const markAllRead = () =>
  http.post("/notifications/read-all");
