// src/api/profile.js
import http from "./http";

export const submitProfileChange = (fields) =>
  http.post("/profile-requests", fields); // fields = { first_name?, last_name?, username?, profession?, bio? }
