import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../store/auth";

export default function Login() {
  const [emailOrUsername, setId] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await http.post("/auth/login", { emailOrUsername, password });
      setAuth({ user: data.user, token: data.token });
      navigate("/"); // go home
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-col items-center gap-4">
          <h2 className="card-title">Log in to MeetExpert</h2>
          <input className="input input-bordered" placeholder="Email or username"
                 value={emailOrUsername} onChange={(e)=>setId(e.target.value)} required />
          <input type="password" className="input input-bordered" placeholder="Password"
                 value={password} onChange={(e)=>setPw(e.target.value)} required />
          {err && <div className="text-error text-sm">{err}</div>}
          </div>
          <button className={`btn btn-primary ${loading ? "btn-disabled" : ""}`} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="text-sm mt-2">
            New here? <Link to="/register" className="link">Create an account</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
