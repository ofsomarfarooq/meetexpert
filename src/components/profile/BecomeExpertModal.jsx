import { useEffect, useState } from "react";
import http from "../../api/http";
import { uploadProofs } from "../../api/upload";

export default function BecomeExpertModal({ open, onClose }) {
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState("");
  const [otherSkill, setOtherSkill] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [description, setDescription] = useState("");
  const [proofs, setProofs] = useState([]);
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await http.get("/skills");
      setSkills(data);
    })();
  }, [open]);

  if (!open) return null;

  const onProofChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const { urls } = await uploadProofs(files);
    setProofs(prev => [...prev, ...urls]);
  };

  const submit = async () => {
    if (!description) { setMsg("Description is required."); return; }
    setPosting(true); setMsg("");
    try {
      const payload = {
        company, position, description,
        proof_urls: proofs,
        website, linkedin, expected_price: expectedPrice ? Number(expectedPrice) : null
      };
      if (skillId && skillId !== "__other__") payload.skill_id = Number(skillId);
      if (!skillId || skillId === "__other__") payload.skill_name = otherSkill;

      await http.post("/expert-requests", payload);
      setMsg("Submitted. Awaiting admin approval.");
    } catch (e) {
      setMsg(e.response?.data?.error || "Submit failed");
    } finally { setPosting(false); }
  };

  const showOther = !skillId || skillId === "__other__";

  return (
    <dialog open className="modal">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-3">Become Expert</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <div className="text-sm mb-1">Skill</div>
            <select className="select select-bordered w-full"
                    value={skillId} onChange={e=>setSkillId(e.target.value)}>
              <option value="">Select a skill</option>
              {skills.map(s => <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>)}
              <option value="__other__">Other…</option>
            </select>
          </div>
          {showOther && (
            <input className="input input-bordered"
                   placeholder="Write new skill name"
                   value={otherSkill} onChange={e=>setOtherSkill(e.target.value)} />
          )}

          <input className="input input-bordered" placeholder="Company" value={company} onChange={e=>setCompany(e.target.value)} />
          <input className="input input-bordered" placeholder="Position / Role" value={position} onChange={e=>setPosition(e.target.value)} />
          <input className="input input-bordered" placeholder="Website link" value={website} onChange={e=>setWebsite(e.target.value)} />
          <input className="input input-bordered" placeholder="LinkedIn link" value={linkedin} onChange={e=>setLinkedin(e.target.value)} />
          <input className="input input-bordered" placeholder="Expected subscription price (USD)" value={expectedPrice} onChange={e=>setExpectedPrice(e.target.value)} />
          <textarea className="textarea textarea-bordered col-span-2" rows={4}
                    placeholder="Describe your expertise…"
                    value={description} onChange={e=>setDescription(e.target.value)} />
          <div className="col-span-2">
            <div className="text-sm mb-1">Proof documents (images/PDF, you can add multiple)</div>
            <input type="file" multiple onChange={onProofChange} className="file-input file-input-bordered w-full" />
            {!!proofs.length && (
              <div className="mt-2 text-xs opacity-70 break-all">
                {proofs.map(u => <div key={u}>{u}</div>)}
              </div>
            )}
          </div>
        </div>

        {msg && <div className="mt-3 text-sm">{msg}</div>}
        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" disabled={posting} onClick={submit}>
            {posting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
