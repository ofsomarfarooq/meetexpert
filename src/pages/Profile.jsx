// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import SubscribeButton from "../components/SubscribeButton.jsx";
import StarRating from "../components/StarRating.jsx";
import http from "../api/http";
import { useAuth } from "../store/auth";

/* ---------- Upload helpers (match server: field names + URLs) ---------- */
async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append("file", file); // <- server expects "file"
  const { data } = await http.post("/upload/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { ok, url }
}
async function uploadCover(file) {
  const fd = new FormData();
  fd.append("file", file); // <- server expects "file"
  const { data } = await http.post("/upload/cover", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { ok, url }
}
async function uploadProofs(files = []) {
  const fd = new FormData();
  [...files].forEach(f => fd.append("files", f)); // <- server expects "files"
  const { data } = await http.post("/uploads/proofs", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { ok, urls:[] }
}

export default function Profile() {
  const { id } = useParams();
  const userId = Number(id);
  const nav = useNavigate();
  const { user, token } = useAuth();
  const isOwner = user?.user_id === userId;

  // state
  const [profile, setProfile] = useState(null);
  const [isExpert, setIsExpert] = useState(false);
  const [ratings, setRatings] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // rating form
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // write post
  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);

  // edit / expert modals
  const [editModal, setEditModal] = useState(false);
  const [expertDetailsOpen, setExpertDetailsOpen] = useState(false);
  const [beModal, setBeModal] = useState(false);

  // become expert fields
  const [skillOptions, setSkillOptions] = useState([]);
  const [beSkill, setBeSkill] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [beCompany, setBeCompany] = useState("");
  const [bePosition, setBePosition] = useState("");
  const [beDesc, setBeDesc] = useState("");
  const [proofFiles, setProofFiles] = useState([]);
  const [beSending, setBeSending] = useState(false);

  /* ------------------------------ load profile ------------------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // try expert
        let exp = null;
        try {
          const { data } = await http.get(`/experts/${userId}`);
          exp = data;
        } catch {}

        if (!alive) return;

        if (exp) {
          setProfile(exp);
          setIsExpert(true);
          const { data: r } = await http.get(`/experts/${userId}/ratings`);
          if (!alive) return;
          setRatings(r);
        } else {
          const { data: u } = await http.get(`/users/${userId}`);
          if (!alive) return;
          setProfile(u);
          setIsExpert(false);
          setRatings(null);
        }

        const { data: feed } = await http.get("/posts");
        if (!alive) return;
        setPosts((feed || []).filter(p => Number(p.expert_id) === userId));
      } catch (e) {
        setErr(e.response?.data?.error || "Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  /* ------------------------ load skills when modal opens -------------------- */
  useEffect(() => {
    if (!beModal) return;
    (async () => {
      try {
        const { data } = await http.get("/skills");
        setSkillOptions(Array.isArray(data) ? data : []);
      } catch { setSkillOptions([]); }
    })();
  }, [beModal]);

  /* ---------------------------- derived rating UI --------------------------- */
  const headerRating = useMemo(() => {
    if (isExpert) {
      const avg = profile?.rating?.avg ?? profile?.overall_rating ?? 0;
      const total = profile?.rating?.total ?? 0;
      return { avg, total };
    }
    return { avg: 0, total: 0 };
  }, [profile, isExpert]);

  /* --------------------------------- rating -------------------------------- */
  const submitRating = async () => {
    if (!token) return nav("/login");
    if (!stars) return setErr("Please select a rating (1–5).");
    setSubmittingRating(true);
    setErr("");
    try {
      await http.post("/ratings", { expert_id: userId, rating_value: stars, review: review || undefined });
      const { data } = await http.get(`/experts/${userId}/ratings`);
      setRatings(data);
      setStars(0);
      setReview("");
    } catch (e) {
      setErr(e.response?.data?.error || "Could not submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  /* -------------------------------- open chat ------------------------------- */
  const openChat = async () => {
    try {
      if (!token) return nav("/login");
      await http.post("/chats/open", { expert_id: userId });
      nav("/inbox");
    } catch (e) {
      alert(e.response?.data?.error || "Cannot open chat. Do you have an active subscription?");
    }
  };

  /* --------------------------------- posts --------------------------------- */
  const createPost = async () => {
    if (!token) return nav("/login");
    if (!postTitle.trim() || !postBody.trim()) return;
    setPosting(true);
    try {
      const { data } = await http.post("/posts", {
        title: postTitle.trim(),
        content: postBody.trim(),
        visibility: "public",
      });
      setPosts(p => [{
        ...data,
        author: {
          user_id: userId,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar: profile.avatar,
        },
      }, ...p]);
      setPostTitle(""); setPostBody(""); setPostOpen(false);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to publish post");
    } finally {
      setPosting(false);
    }
  };

  /* --------------------- become expert / edit expert request ---------------- */
  const submitBecomeExpert = async () => {
    if (!token) return nav("/login");
    const effectiveSkill = beSkill === "__other" ? (newSkillName || "").trim() : (beSkill || "").trim();
    if (!effectiveSkill || !beDesc.trim()) return;

    setBeSending(true);
    try {
      if (beSkill === "__other" && newSkillName.trim()) {
        // backend accepts "name" or "skill_name"
        await http.post("/skills", { name: newSkillName.trim() });
      }

      let proof_urls = [];
      if (proofFiles.length) {
        const up = await uploadProofs(proofFiles);
        proof_urls = up.urls || [];
      }

      const payload = {
        skill: effectiveSkill,
        company: beCompany.trim() || null,
        position: bePosition.trim() || null,
        description: beDesc.trim(),
        proof_urls
      };

      if (isExpert && isOwner) {
        // reuse modal to request expert detail changes (stored in profile change request)
        await http.post("/profile-requests", { expert_changes: payload });
      } else {
        await http.post("/expert-requests", payload);
      }

      setBeModal(false);
      setBeCompany(""); setBePosition(""); setBeSkill(""); setNewSkillName(""); setBeDesc(""); setProofFiles([]);
      alert("Submitted. Admin will review it.");
    } catch (e) {
      alert(e.response?.data?.error || "Failed to submit");
    } finally {
      setBeSending(false);
    }
  };

  /* -------------------------------- header UI ------------------------------- */
  const Cover = () => (
    <div className="relative h-44 w-full rounded-2xl bg-gradient-to-r from-primary/20 via-base-200 to-secondary/20" />
  );
  const Avatar = () => (
    <div className="avatar -mt-12 ml-6">
      <div className="w-24 rounded-full ring ring-base-300 ring-offset-2 bg-base-100">
        <img src={profile?.avatar || "https://i.pravatar.cc/160"} alt="avatar" />
      </div>
    </div>
  );
  const HeaderActions = () => (
    <div className="ml-auto flex flex-wrap gap-2">
      {isOwner && (
        <button className="btn btn-outline" onClick={() => setEditModal(true)}>Edit Profile</button>
      )}

      {isExpert ? (
        <>
          <button className="btn btn-outline" onClick={() => setExpertDetailsOpen(true)}>Expert details</button>
          {!isOwner && (
            <>
              <button className="btn btn-outline" onClick={openChat}>Inbox</button>
              <SubscribeButton expertId={userId} price={profile?.price_amount || 5} />
            </>
          )}
        </>
      ) : (
        isOwner && <button className="btn btn-primary" onClick={() => setBeModal(true)}>Become Expert</button>
      )}
    </div>
  );

  /* ----------------------------- loading / error ---------------------------- */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto max-w-6xl p-6">
          <div className="skeleton h-64 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="skeleton h-64" />
            <div className="skeleton h-64 col-span-2" />
          </div>
        </div>
      </>
    );
  }
  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto max-w-3xl p-6">
          <div className="alert alert-error">{err || "Profile not found"}</div>
        </div>
      </>
    );
  }

  /* ---------------------------------- view ---------------------------------- */
  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-6xl p-4 md:p-6">
        {err && <div className="alert alert-error mb-4">{err}</div>}

        {/* Header */}
        <div className="card bg-base-100 shadow-sm border overflow-hidden">
          <Cover />
          <div className="px-4 pb-4">
            <div className="flex items-start gap-3">
              <Avatar />
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h1>
                  {isExpert && <span className="badge badge-info">Expert</span>}
                </div>
                <div className="text-sm opacity-70">@{profile.username}</div>

                {isExpert ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <div className="font-medium">{profile.profession || "—"}</div>
                    <div className="opacity-70">•</div>
                    <div>{headerRating.avg} ★<span className="opacity-60"> ({headerRating.total})</span></div>
                    <div className="opacity-70">•</div>
                    <div>${profile.price_amount ?? 5} <span className="opacity-60">{profile.price_model || "per_chat"}</span></div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm opacity-80">{profile.profession || "—"}</div>
                )}
              </div>
              <HeaderActions />
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left */}
          <div className="space-y-6">
            {isExpert && (
              <div className="card bg-base-100 border shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">Ratings</h2>

                  <div className="border rounded-xl p-3">
                    <div className="text-sm font-medium mb-1">Your rating</div>
                    <StarRating value={stars} onChange={setStars} />
                    <textarea className="textarea textarea-bordered w-full mt-2" rows={3}
                      placeholder="Write a short review (optional)" value={review}
                      onChange={(e) => setReview(e.target.value)} />
                    <button className="btn btn-primary btn-sm mt-2" disabled={submittingRating} onClick={submitRating}>
                      {submittingRating ? "Submitting…" : "Submit rating"}
                    </button>
                  </div>

                  {!ratings ? (
                    <div className="mt-3 opacity-60">Loading reviews…</div>
                  ) : ratings.items.length === 0 ? (
                    <div className="mt-3 opacity-60">No ratings yet.</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {ratings.items.slice(0, 5).map(r => (
                        <div key={r.rating_id} className="p-3 rounded-xl border">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{r.seeker?.first_name} {r.seeker?.last_name}</span>
                            <span className="text-xs opacity-70">@{r.seeker?.username}</span>
                            <span className="ml-auto text-sm">{r.rating_value} ★</span>
                          </div>
                          {r.review && <div className="mt-1 text-sm">{r.review}</div>}
                          <div className="text-xs opacity-50 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            <div className="card bg-base-100 border shadow-sm">
              <div className="card-body">
                <h2 className="card-title">About</h2>
                <div className="prose max-w-none">
                  {profile.bio?.trim() ? profile.bio : <span className="opacity-60">No bio yet.</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="md:col-span-2 space-y-4">
            {isExpert && isOwner && (
              <div className="card bg-base-100 border shadow-sm">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title">Write Post</h2>
                    <button className="btn btn-primary btn-sm" onClick={() => setPostOpen(true)}>New Post</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {posts.length === 0 ? (
                <div className="card bg-base-100 border shadow-sm">
                  <div className="card-body"><div className="opacity-70">No public posts from this user.</div></div>
                </div>
              ) : posts.map(p => (
                <div key={p.post_id} className="card bg-base-100 border shadow-sm">
                  <div className="card-body">
                    <div className="flex items-center gap-2 text-sm opacity-70">
                      <span className="font-medium">{p.author?.first_name} {p.author?.last_name}</span>
                      <span>@{p.author?.username}</span>
                      <span className="ml-auto">{new Date(p.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{p.title}</h3>
                    <p className="opacity-90 whitespace-pre-wrap">{p.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post Modal */}
      {postOpen && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-3">Create Post</h3>
            <input className="input input-bordered w-full mb-2" placeholder="Title"
              value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            <textarea className="textarea textarea-bordered w-full" rows={6} placeholder="Write your post…"
              value={postBody} onChange={(e) => setPostBody(e.target.value)} />
            <div className="modal-action">
              <button className="btn" onClick={() => setPostOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={posting} onClick={createPost}>
                {posting ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setPostOpen(false)}><button>close</button></form>
        </dialog>
      )}

      {/* Edit Profile Modal */}
      {editModal && (
        <dialog open className="modal">
          <div className="modal-box max-w-xl">
            <h3 className="font-bold text-lg mb-3">Edit Profile</h3>

            {/* avatar & cover (instant) */}
            <label className="text-sm font-medium">Avatar</label>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try {
                  const { url } = await uploadAvatar(f);
                  setProfile(p => ({ ...p, avatar: url }));
                } catch (err) { alert(err.response?.data?.error || "Upload failed"); }
              }} />

            <label className="text-sm font-medium mt-2">Cover photo</label>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try {
                  const { url } = await uploadCover(f);
                  setProfile(p => ({ ...p, cover_photo: url }));
                } catch (err) { alert(err.response?.data?.error || "Upload failed"); }
              }} />

            {/* fields needing admin approval */}
            <div className="grid gap-2 mt-3">
              <input className="input input-bordered" id="fn" placeholder="First name" defaultValue={profile.first_name} />
              <input className="input input-bordered" id="ln" placeholder="Last name"  defaultValue={profile.last_name} />
              <input className="input input-bordered" id="un" placeholder="Username"   defaultValue={profile.username} />
              <input className="input input-bordered" id="prof" placeholder="Profession" defaultValue={profile.profession || ""} />
              <textarea className="textarea textarea-bordered" id="bio" rows={4} placeholder="Bio" defaultValue={profile.bio || ""} />
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setEditModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  const payload = {
                    first_name: document.getElementById("fn").value.trim(),
                    last_name:  document.getElementById("ln").value.trim(),
                    username:   document.getElementById("un").value.trim(),
                    profession: document.getElementById("prof").value.trim() || null,
                    bio:        document.getElementById("bio").value || null,
                  };
                  await http.post("/profile-requests", payload);
                  setEditModal(false);
                  alert("Submitted for admin review.");
                } catch (e) {
                  alert(e.response?.data?.error || "Failed to submit profile change request");
                }
              }}>Submit for review</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setEditModal(false)}><button>close</button></form>
        </dialog>
      )}

      {/* Expert details */}
      {expertDetailsOpen && (
        <dialog open className="modal">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-3">Expert details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="opacity-70">Pricing:</span> ${profile.price_amount} · {profile.price_model || "per_chat"}</div>
              <div><span className="opacity-70">Rating:</span> {headerRating.avg} ★ ({headerRating.total})</div>
              {/* add more expert fields as you expose them */}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setExpertDetailsOpen(false)}>Close</button>
              {isOwner && (
                <button className="btn btn-primary" onClick={() => { setExpertDetailsOpen(false); setBeModal(true); }}>
                  Edit
                </button>
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setExpertDetailsOpen(false)}><button>close</button></form>
        </dialog>
      )}

      {/* Become / Edit Expert */}
      {beModal && (
        <dialog open className="modal">
          <div className="modal-box max-w-xl">
            <h3 className="font-bold text-lg mb-3">{isExpert && isOwner ? "Edit expert profile" : "Become an Expert"}</h3>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Primary skill</label>
              <select className="select select-bordered w-full" value={beSkill} onChange={(e)=>setBeSkill(e.target.value)}>
                <option value="">Select a skill…</option>
                {skillOptions.map(s => <option key={s.skill_id} value={s.skill_name}>{s.skill_name}</option>)}
                <option value="__other">Other (type manually)</option>
              </select>

              {beSkill === "__other" && (
                <input className="input input-bordered w-full" placeholder="Type new skill"
                       value={newSkillName} onChange={(e)=>setNewSkillName(e.target.value)} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input className="input input-bordered w-full" placeholder="Company (optional)"
                       value={beCompany} onChange={(e)=>setBeCompany(e.target.value)} />
                <input className="input input-bordered w-full" placeholder="Position (optional)"
                       value={bePosition} onChange={(e)=>setBePosition(e.target.value)} />
              </div>

              <textarea className="textarea textarea-bordered w-full" rows={4}
                        placeholder="Describe your expertise (required)"
                        value={beDesc} onChange={(e)=>setBeDesc(e.target.value)} />

              <label className="text-sm font-medium">Proof files (images)</label>
              <input type="file" accept="image/*" multiple
                     className="file-input file-input-bordered w-full"
                     onChange={(e)=>setProofFiles([...e.target.files])}/>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={()=>setBeModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={beSending} onClick={submitBecomeExpert}>
                {beSending ? "Submitting…" : (isExpert && isOwner ? "Submit changes" : "Submit request")}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={()=>setBeModal(false)}><button>close</button></form>
        </dialog>
      )}
    </>
  );
}
