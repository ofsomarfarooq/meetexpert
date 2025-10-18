import { useState } from "react";
import axios from "axios";

export default function BecomeExpertModal({ isOpen, onClose, onCreated, token }) {
  const [form, setForm] = useState({
    skill: "",
    company: "",
    position: "",
    description: "",
    proof_urls: [], // array of strings
  });
  const [proofInput, setProofInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const addProof = () => {
    if (!proofInput.trim()) return;
    setForm(f => ({ ...f, proof_urls: [...f.proof_urls, proofInput.trim()] }));
    setProofInput("");
  };

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/expert-requests",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreated?.(data);
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">Apply for Expert Badge</h3>

        <div className="space-y-3">
          <input className="input input-bordered w-full"
                 placeholder="Skill (e.g. Java, Marketing)"
                 value={form.skill}
                 onChange={e=>setForm({...form, skill:e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input input-bordered"
                   placeholder="Company (optional)"
                   value={form.company}
                   onChange={e=>setForm({...form, company:e.target.value})} />
            <input className="input input-bordered"
                   placeholder="Position (optional)"
                   value={form.position}
                   onChange={e=>setForm({...form, position:e.target.value})} />
          </div>
          <textarea className="textarea textarea-bordered w-full"
                    rows={4}
                    placeholder="Tell us about your expertise"
                    value={form.description}
                    onChange={e=>setForm({...form, description:e.target.value})} />

          <div>
            <label className="block text-sm font-medium mb-1">Proof URLs (images/docs)</label>
            <div className="flex gap-2">
              <input className="input input-bordered flex-1"
                     placeholder="https://..."
                     value={proofInput}
                     onChange={e=>setProofInput(e.target.value)} />
              <button className="btn" onClick={addProof}>Add</button>
            </div>
            {!!form.proof_urls.length && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {form.proof_urls.map((u,i)=> <li key={i}>{u}</li>)}
              </ul>
            )}
          </div>
        </div>

        {err && <p className="text-error text-sm mt-3">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
