// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import http from "../api/http";
import { useAuth } from "../store/auth";
import NotificationsBell from "./NotificationsBell";

// Build absolute URLs for API-hosted images (avatar/cover)
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const toAbsUrl = (u) => {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u}`;
};

export default function Navbar() {
  const navigate = useNavigate();
  const { user, token, setAuth, logout } = useAuth();
  const [balance, setBalance] = useState(null);

  // If we have a token but user is empty (page refresh), hydrate /me
  useEffect(() => {
    (async () => {
      const st = useAuth.getState();
      if (st.token && !st.user) {
        try {
          const { data } = await http.get("/me");
          setAuth({ user: data, token: st.token });
        } catch {
          /* ignore */
        }
      }
    })();
  }, [setAuth]);

  // Load wallet balance when logged in
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return setBalance(null);
      try {
        const { data } = await http.get("/wallet/balance");
        if (alive) setBalance(Number(data.balance || 0));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const avatarSrc = user?.avatar
    ? toAbsUrl(user.avatar)
    : "https://i.pravatar.cc/100";

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-base-100/80 border-b shadow-sm">
      <div className="navbar container mx-auto px-4 py-2 flex">
        <Link to="/" className="btn btn-ghost text-xl font-extrabold">
          MeetExpert
        </Link>

        {/* Admin shortcut */}
        {String(user?.role).toLowerCase() === "admin" && (
          <Link to="/admin" className="btn btn-sm btn-outline mx-4">
            Go to Admin
          </Link>
        )}

        {/* Center: search (visual only for now) */}
        <div className="flex-1 gap-1">
          <div className="hidden md:block">
            <label className="input input-bordered flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
                <path
                  fill="currentColor"
                  d="M10 2a8 8 0 105.293 14.293l3.707 3.707 1.414-1.414-3.707-3.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"
                />
              </svg>
              <input
                type="text"
                className="grow"
                placeholder="Search experts, skills, companies…"
              />
            </label>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex gap-3 items-center">
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
          <Link to="/inbox" className="btn btn-ghost">
            Inbox
          </Link>

          {token && <NotificationsBell />}

          {/* Wallet button */}
          {token && (
            <Link to="/wallet" className="btn btn-sm btn-outline">
              Wallet: {balance === null ? "—" : `৳ ${balance.toFixed(2)}`}
            </Link>
          )}

          {/* Auth area */}
          {!user ? (
            <div className="flex gap-2">
              <button className="btn" onClick={() => navigate("/register")}>
                Register
              </button>
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Login
              </button>
            </div>
          ) : (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost">
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img src={avatarSrc} alt="avatar" />
                  </div>
                </div>
                <span className="hidden md:inline ml-2">@{user.username}</span>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-[1] w-60 p-2 shadow"
              >
                <li className="menu-title px-2">Signed in</li>
                <li>
                  {/* Name is clickable → profile */}
                  <Link to={`/profile/${user.user_id}`} className="px-2">
                    {user.first_name} {user.last_name}
                    <span className="opacity-60 ml-1">@{user.username}</span>
                  </Link>
                </li>
                <li>
                  <Link to="/inbox">Inbox</Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
