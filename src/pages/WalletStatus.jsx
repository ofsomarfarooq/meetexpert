import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

export function WalletSuccess() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav("/wallet"), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-xl p-6">
        <div className="alert alert-success">Payment successful. Updating balance…</div>
      </div>
    </>
  );
}

export function WalletFail() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav("/wallet"), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-xl p-6">
        <div className="alert alert-error">Payment failed or cancelled.</div>
      </div>
    </>
  );
}
