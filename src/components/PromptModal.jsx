import { useState } from "react";

export default function PromptModal({
  title = "Confirm",
  placeholder = "Add a message (optional)…",
  confirmText = "Confirm",
  onClose,
  onSubmit,               // <-- will be called with (message)
}) {
  const [text, setText] = useState("");

  const handleConfirm = () => {
    // Always pass a single argument: the message text
    onSubmit?.(text);
  };

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
