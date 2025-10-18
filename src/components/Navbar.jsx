import { Link, useNavigate } from "react-router-dom";
import { useEffect,useState  } from "react";
import http from "../api/http";
import { useAuth } from "../store/auth";
import NotificationsBell from "./NotificationsBell";



export default function Navbar() {
  const { user, setAuth, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { user: u, token } = useAuth.getState();
      if (token && !u) {
        try {
          const { data } = await http.get("/me");
          setAuth({ user: data, token });
        } catch {}
      }
    })();
  }, [setAuth]);

  const { token } = useAuth();



  

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-base-100/80 border-b shadow-sm">
      <div className="navbar container mx-auto px-4 py-2 flex">
        <Link to="/" className="btn btn-ghost text-xl font-extrabold">MeetExpert</Link>

        {String(user?.role).toLowerCase()==="admin" && (
              <Link to="/admin" className="btn btn-sm btn-outline mx-4">Go to Admin</Link>
          )}
        <div className="flex-1 gap-1">




          
          {/* Search (visual only for now) */}
          <div className="hidden md:block">
            <label className="input input-bordered flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70"><path fill="currentColor" d="M10 2a8 8 0 105.293 14.293l3.707 3.707 1.414-1.414-3.707-3.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>
              <input type="text" className="grow" placeholder="Search experts, skills, companies…" />
            </label>
          </div>
          
        </div>

        <div className="flex gap-3 items-center">
          <Link to="/" className="btn btn-ghost">Home</Link>
          <Link to="/inbox" className="btn btn-ghost">Inbox</Link>

          {token && <NotificationsBell />}

          {!user ? (
            <div className="flex gap-2">
              <button className="btn" onClick={() => navigate("/register")}>Register</button>
              <button className="btn btn-primary" onClick={() => navigate("/login")}>Login</button>
            </div>
          ) : (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost">
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img src={user.avatar || "https://i.pravatar.cc/100"} />
                  </div>
                </div>
                <span className="hidden md:inline ml-2">@{user.username}</span>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-60 p-2 shadow">
                <li className="menu-title px-2">Signed in</li>
                <li><span className="px-2 opacity-70">{user.first_name} {user.last_name}</span></li>
                <li><Link to="/inbox">Inbox</Link></li>
                <li><button onClick={()=>{ logout(); navigate("/login"); }}>Logout</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


