// src/pages/Home.jsx
import { Link } from "react-router-dom";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import http from "../api/http";
import { useAuth } from "../store/auth";
import TopExperts from "../components/TopExperts.jsx";
import LatestPosts from "../components/LatestPosts.jsx";


// Robust avatar resolver
const avatarUrl = (val) => {
  if (!val) return null;

  // base API origin (fallback to localhost:5000 if VITE_API_BASE isn't set)
  const base =
    import.meta.env.VITE_API_BASE ||
    (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:5000` : "");

  // already absolute
  if (/^https?:\/\//i.test(val)) return val;

  // starts with /uploads => prefix with API origin
  if (val.startsWith("/")) return `${base}${val}`;

  // bare filename => assume avatar file under /uploads/avatars
  return `${base}/uploads/avatars/${val}`;
};




export default function Home() {
  const { token } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");


  const imgUrl = (u) => (u ? (u.startsWith("http") ? u : `${import.meta.env.VITE_API_BASE || ""}${u}`) : null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/posts");
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const publish = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Please login first.");
      return;
    }
    setError("");
    setPublishing(true);
    try {
      await http.post(
        "/posts",
        { title, content, visibility },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // reset + close
      setTitle("");
      setContent("");
      setVisibility("public");
      setOpen(false);
      // refresh feed
      loadPosts();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to publish post");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-12 md:col-span-3 space-y-3">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title text-base">Create</h2>
              <button
                className="btn btn-primary w-full"
                onClick={() => setOpen(true)}
                disabled={!token}
                title={token ? "Write a new post" : "Login to write"}
              >
                Write Post
              </button>
              {!token && (
                <p className="text-xs opacity-70 mt-2">
                  Login required to publish.
                </p>
              )}
            </div>
          </div>


          
        </aside>

        {/* FEED */}
        <main className="col-span-12 md:col-span-6 space-y-4">
          {loading ? (
            <div className="text-sm opacity-70">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm opacity-70">No posts yet.</div>
          ) : (
            posts.map((p) => (
              <article key={p.post_id} className="card bg-base-100 shadow">
                <div className="card-body">
                  {/* author */}
                  {p.author && (
  <div className="flex items-center gap-3 mb-2">
    <Link to={`/profile/${p.author.user_id}`} className="avatar">
  <div className="w-8 rounded-full overflow-hidden">
    {p.author.avatar ? (
      <img src={avatarUrl(p.author.avatar)} alt={p.author.username || "avatar"} />
    ) : (
      <div className="bg-neutral text-neutral-content w-8 h-8 rounded-full flex items-center justify-center text-xs">
        {(p.author.first_name?.[0] || p.author.username?.[0] || "U").toUpperCase()}
      </div>
    )}
  </div>
</Link>

    <div className="text-sm">
      <Link to={`/profile/${p.author.user_id}`} className="font-medium hover:underline">
        {p.author.first_name} {p.author.last_name}
      </Link>
      <span className="opacity-60"> @{p.author.username}</span>
      <div className="opacity-60 text-xs">
        {new Date(p.created_at).toLocaleString()}
        {p.visibility === "subscribers" && (
          <span className="ml-2 badge badge-outline badge-sm">Subscribers</span>
        )}
      </div>
    </div>
  </div>
)}

                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="opacity-90 leading-relaxed whitespace-pre-wrap">
                    {p.content}
                  </p>
                </div>
              </article>
            ))
          )}
        </main>
        

       {/* RIGHT SIDEBAR */}
<aside className="col-span-12 md:col-span-3 space-y-4">
  {/* Top Experts */}
  <div className="card bg-base-100 shadow">
    <div className="card-body p-4">
    
      <TopExperts />
    </div>
  </div>

   {/* Trending / Latest posts */}
  <div className="card bg-base-100 shadow">
    <div className="card-body p-4">
      <h2 className="card-title text-sm mb-3">🔥 Latest Posts</h2>
      <LatestPosts />
    </div>
  </div>

{/* Explore Experts */}
  <div className="card bg-primary text-primary-content shadow">
    <div className="card-body p-4 space-y-2">
      <h3 className="font-bold text-lg">Need Expert Help?</h3>
      <p className="text-sm opacity-90">
        Browse verified experts and get instant chat access.
      </p>
      <Link to="/experts" className="btn btn-sm mt-1 bg-white text-primary">
        Explore Experts →
      </Link>
    </div>
  </div>

  
</aside>
        
      </div>

      {/* WRITE MODAL */}
      <dialog id="writeModal" className={`modal ${open ? "modal-open" : ""}`}>
        <div className="modal-box max-w-xl">
          <h3 className="font-bold text-lg mb-2">Write a Post</h3>
          {error && <div className="alert alert-error mb-3">{error}</div>}

          <form onSubmit={publish} className="space-y-3">
            <input
              className="input input-bordered w-full"
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <textarea
              className="textarea textarea-bordered w-full min-h-40"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <span className="text-sm opacity-80">Visibility</span>
                <select
                  className="select select-bordered select-sm"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="subscribers">Subscribers only</option>
                </select>
              </label>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={publishing}
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          </form>

          <div className="modal-action">
            <button className="btn" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setOpen(false)}>close</button>
        </form>
      </dialog>
    </>
  );
}
