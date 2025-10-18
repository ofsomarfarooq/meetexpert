import { useState } from "react";
import http from "../../api/http";

export default function EditProfileModal({ initial, onClose, onSubmitted }) {
  const [values, setValues] = useState({
    first_name: initial.first_name || "",
    last_name: initial.last_name || "",
    username: initial.username || "",
    profession: initial.profession || "",
    bio: initial.bio || "",
    avatar: initial.avatar || "",
    cover_photo: initial.cover_photo || ""
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const change = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const saveAvatar = async () => {
    if (!values.avatar) return;
    await http.patch("/me/avatar", { avatar: values.avatar });
  };
  const saveCover = async () => {
    if (!values.cover_photo) return;
    await http.patch("/me/cover", { cover_photo: values.cover_photo });
  };

  const submitRequest = async () => {
    setSaving(true); setErr("");
    try {
      await saveAvatar();
      await saveCover();
      // Everything else goes to admin approval:
      await http.post("/profile-requests", {
        first_name: values.first_name,
        last_name: values.last_name,
        username: values.username,
        profession: values.profession,
        bio: values.bio
      });
      onSubmitted?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to submit changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-3">Edit profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="form-control">
            <span className="label-text">First name</span>
            <input className="input input-bordered" value={values.first_name} onChange={change("first_name")} />
          </label>
          <label className="form-control">
            <span className="label-text">Last name</span>
            <input className="input input-bordered" value={values.last_name} onChange={change("last_name")} />
          </label>

          <label className="form-control col-span-2">
            <span className="label-text">Username</span>
            <input className="input input-bordered" value={values.username} onChange={change("username")} />
          </label>

          <label className="form-control col-span-2">
            <span className="label-text">Profession</span>
            <input className="input input-bordered" value={values.profession} onChange={change("profession")} />
          </label>

          <label className="form-control col-span-2">
            <span className="label-text">Bio</span>
            <textarea className="textarea textarea-bordered" rows={4} value={values.bio} onChange={change("bio")} />
          </label>

          <label className="form-control">
            <span className="label-text">Avatar URL (applies instantly)</span>
            <input className="input input-bordered" value={values.avatar} onChange={change("avatar")} />
          </label>
          <label className="form-control">
            <span className="label-text">Cover URL (applies instantly)</span>
            <input className="input input-bordered" value={values.cover_photo} onChange={change("cover_photo")} />
          </label>
        </div>

        {err && <div className="alert alert-error mt-3">{err}</div>}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={submitRequest}>
            {saving ? "Saving…" : "Apply changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
