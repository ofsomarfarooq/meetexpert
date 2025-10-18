import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import http from "../api/http";
import { useAuth } from "../store/auth";
import Navbar from "../components/Navbar.jsx";

export default function Register() {
  const [first_name, setFirst] = useState("");
  const [last_name, setLast] = useState("");
  const [username, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password !== confirm) return setErr("Passwords do not match");
    setLoading(true);
    try {
      const { data } = await http.post("/auth/register", {
        first_name, last_name, username, email, password
      });
      // Auto-login with returned token+user
      setAuth({ user: data.user, token: data.token });
      navigate("/");
    } catch (e) {
      setErr(e.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] grid place-items-center p-4">
        <form onSubmit={submit} className="card w-full max-w-lg bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">Create your account</h2>

            <div className="grid md:grid-cols-2 gap-3">
              <input className="input input-bordered" placeholder="First name" value={first_name} onChange={e=>setFirst(e.target.value)} required />
              <input className="input input-bordered" placeholder="Last name" value={last_name} onChange={e=>setLast(e.target.value)} required />
            </div>

            <input className="input input-bordered" placeholder="Username" value={username} onChange={e=>setUser(e.target.value)} required />
            <input className="input input-bordered" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />

            <input className="input input-bordered" placeholder="Password" type="password" value={password} onChange={e=>setPw(e.target.value)} required />
            <input className="input input-bordered" placeholder="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

            {err && <div className="text-error text-sm">{err}</div>}

            <button className={`btn btn-primary ${loading ? "btn-disabled" : ""}`} disabled={loading}>
              {loading ? "Creating..." : "Sign up"}
            </button>

            <div className="text-sm">
              Already have an account? <Link to="/login" className="link">Log in</Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
