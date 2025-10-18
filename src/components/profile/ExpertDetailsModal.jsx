export default function ExpertDetailsModal({ open, onClose, expertUser, isMe, onEdit }) {
  if (!open) return null;
  return (
    <dialog open className="modal">
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Expert details</h3>
          {isMe && <button className="btn btn-sm" onClick={onEdit}>Edit</button>}
        </div>

        <div className="mt-4 space-y-2">
          <div><span className="font-semibold">Company:</span> {expertUser?.company || "—"}</div>
          <div><span className="font-semibold">Position/role:</span> {expertUser?.position || "—"}</div>
          <div><span className="font-semibold">Skills:</span> {
            (expertUser?.skills?.length ? expertUser.skills.join(", ") : "—")
          }</div>
          <div><span className="font-semibold">Description:</span></div>
          <div className="p-3 rounded border">{expertUser?.description || "—"}</div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  );
}
