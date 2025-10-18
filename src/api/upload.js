import http from "./http";

// returns { url }
export const uploadOne = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await http.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
  return data;
};

// returns { urls: [] }
export const uploadProofs = async (files) => {
  const fd = new FormData();
  [...files].forEach(f => fd.append("files", f));
  const { data } = await http.post("/uploads/proofs", fd, { headers: { "Content-Type": "multipart/form-data" }});
  return data;
};
