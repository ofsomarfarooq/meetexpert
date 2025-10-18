import { useEffect, useState } from "react";
import http from "../api/http";
import { useAuth } from "../store/auth";
import Navbar from "../components/Navbar.jsx";

export default function Inbox() {
  const { token, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // chat object
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  // load chats once
  useEffect(() => {
    const load = async () => {
      setLoadingChats(true);
      try {
        const { data } = await http.get("/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(data || []);
        // auto-select first chat if none selected
        if (!activeChat && data?.length) setActiveChat(data[0]);
      } catch (e) {
        console.error("Failed to load chats", e);
        setChats([]);
      } finally {
        setLoadingChats(false);
      }
    };
    if (token) load();
  }, [token]);

  // load messages when activeChat changes
  useEffect(() => {
    const loadMsgs = async () => {
      if (!activeChat) return;
      setLoadingMsgs(true);
      try {
        const { data } = await http.get(`/chats/${activeChat.chat_id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(data || []);
        // scroll to bottom next tick
        setTimeout(() => {
          const el = document.getElementById("msg-end");
          el?.scrollIntoView({ behavior: "smooth" });
        }, 0);
      } catch (e) {
        console.error("Failed to load messages", e);
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
      }
    };
    if (token) loadMsgs();
  }, [token, activeChat]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeChat) return;
    const temp = {
      message_id: Date.now(),
      chat_id: activeChat.chat_id,
      sender_id: user?.user_id,
      content: draft.trim(),
      has_attachment: false,
      is_urgent: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((m) => [...m, temp]);
    setDraft("");
    setSending(true);
    try {
      const { data } = await http.post(
        `/chats/${activeChat.chat_id}/messages`,
        { content: temp.content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // replace optimistic with real one
      setMessages((m) =>
        m.map((x) => (x._optimistic ? { ...data } : x))
      );
      setTimeout(() => {
        const el = document.getElementById("msg-end");
        el?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } catch (e) {
      console.error("Send failed", e);
      // revert optimistic
      setMessages((m) => m.filter((x) => !x._optimistic));
      alert(e?.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: chats */}
        <div className="md:col-span-1">
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Chats</h2>
              {loadingChats && <div className="text-sm opacity-70">Loading chats…</div>}
              {!loadingChats && chats.length === 0 && <div>No chats yet</div>}
              <ul className="menu">
                {chats.map((c) => (
                  <li key={c.chat_id}>
                    <button
                      className={activeChat?.chat_id === c.chat_id ? "active" : ""}
                      onClick={() => setActiveChat(c)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-8">
                            <span>{(c.peer?.first_name?.[0] || c.peer?.username?.[0] || "?").toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-medium">
                            {c.peer?.first_name ? `${c.peer.first_name} ${c.peer.last_name || ""}`.trim() : c.peer?.username}
                          </div>
                          <div className="text-xs opacity-70">#{c.chat_id}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT: messages */}
        <div className="md:col-span-2">
          {activeChat ? (
            <div className="card bg-base-200 h-[70vh] flex">
              <div className="card-body overflow-y-auto flex-1">
                <h2 className="card-title mb-2">
                  Chat with{" "}
                  {activeChat.peer?.first_name
                    ? `${activeChat.peer.first_name} ${activeChat.peer.last_name || ""}`.trim()
                    : activeChat.peer?.username}
                </h2>

                {loadingMsgs && <div className="opacity-70 text-sm">Loading messages…</div>}

                <div className="flex flex-col gap-3">
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.user_id;
                    return (
                      <div
                        key={m.message_id}
                        className={`chat ${mine ? "chat-end" : "chat-start"}`}
                      >
                        <div className="chat-header">
                          {mine ? "You" : activeChat.peer?.username}
                          <time className="text-xs opacity-50 ml-2">
                            {new Date(m.created_at).toLocaleString()}
                          </time>
                        </div>
                        <div className={`chat-bubble ${mine ? "chat-bubble-primary" : ""}`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div id="msg-end" />
                </div>
              </div>

              <form onSubmit={sendMessage} className="p-3 border-t bg-base-100 flex gap-2">
                <input
                  className="input input-bordered flex-1"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button className="btn btn-primary" disabled={sending || !draft.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </div>
          ) : (
            <div className="card bg-base-200 h-[70vh] grid place-items-center">
              <div className="opacity-70">Select a chat to start messaging</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
