// src/api/files.js
import http from "./http";

// returns { ok, avatar } or { ok, cover_photo }
export const uploadAvatar = async (file) => {
  const fd = new FormData();
  fd.append("avatar", file);
  const { data } = await http.patch("/me/avatar", fd, { headers:{ "Content-Type":"multipart/form-data" }});
  return data;
};

export const uploadCover = async (file) => {
  const fd = new FormData();
  fd.append("cover", file);
  const { data } = await http.patch("/me/cover", fd, { headers:{ "Content-Type":"multipart/form-data" }});
  return data;
};

export const uploadProofs = async (files) => {
  const fd = new FormData();
  [...files].forEach(f => fd.append("proofs", f));
  const { data } = await http.post("/expert-requests/upload", fd, { headers:{ "Content-Type":"multipart/form-data" }});
  return data; // { ok, urls: ["/uploads/..", ...] }
};
