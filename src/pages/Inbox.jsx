// src/pages/Inbox.jsx
import { useEffect, useState, useMemo } from "react";
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

  // Build absolute URL for avatars stored like "/uploads/avatars/xxx.jpg"
  const API_ORIGIN = useMemo(() => {
    try {
      return new URL(http.defaults.baseURL).origin;
    } catch {
      return "http://localhost:5000";
    }
  }, []);
  const toUrl = (p) =>
    !p ? "" : p.startsWith("http") ? p : `${API_ORIGIN}${p}`;

  // load chats once
  useEffect(() => {
    const load = async () => {
      setLoadingChats(true);
      try {
        const { data } = await http.get("/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(data || []);
        if (!activeChat && data?.length) setActiveChat(data[0]);
      } catch (e) {
        console.error("Failed to load chats", e);
        setChats([]);
      } finally {
        setLoadingChats(false);
      }
    };
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // load messages when activeChat changes
  useEffect(() => {
    const loadMsgs = async () => {
      if (!activeChat) return;
      setLoadingMsgs(true);
      try {
        const { data } = await http.get(
          `/chats/${activeChat.chat_id}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(data || []);
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
      setMessages((m) => m.map((x) => (x._optimistic ? { ...data } : x)));
      setTimeout(() => {
        const el = document.getElementById("msg-end");
        el?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } catch (e) {
      console.error("Send failed", e);
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
              {loadingChats && (
                <div className="text-sm opacity-70">Loading chats…</div>
              )}
              {!loadingChats && chats.length === 0 && <div>No chats yet</div>}
              <ul className="menu">
                {chats.map((c) => {
                  const name =
                    c.peer?.first_name
                      ? `${c.peer.first_name} ${
                          c.peer.last_name || ""
                        }`.trim()
                      : c.peer?.username;
                  const avatarSrc =
                    toUrl(c.peer?.avatar) || "https://i.pravatar.cc/64?u=me";
                  return (
                    <li key={c.chat_id}>
                      <button
                        className={
                          activeChat?.chat_id === c.chat_id ? "active" : ""
                        }
                        onClick={() => setActiveChat(c)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-8 rounded-full ring ring-base-300 ring-offset-2">
                              <img src={avatarSrc} alt={name} />
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{name}</div>
                            <div className="text-xs opacity-70">
                              #{c.chat_id}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT: messages */}
        <div className="md:col-span-2">
          {activeChat ? (
            <div className="card bg-base-200 h-[70vh] flex">
              <div className="card-body overflow-y-auto flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img
                        src={
                          toUrl(activeChat.peer?.avatar) ||
                          "https://i.pravatar.cc/64?u=peer"
                        }
                        alt={activeChat.peer?.username || "peer"}
                      />
                    </div>
                  </div>
                  <h2 className="card-title">
                    Chat with{" "}
                    {activeChat.peer?.first_name
                      ? `${activeChat.peer.first_name} ${
                          activeChat.peer.last_name || ""
                        }`.trim()
                      : activeChat.peer?.username}
                  </h2>
                </div>

                {loadingMsgs && (
                  <div className="opacity-70 text-sm">Loading messages…</div>
                )}

                <div className="flex flex-col gap-3">
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.user_id;
                    return (
                      <div
                        key={m.message_id}
                        className={`chat ${mine ? "chat-end" : "chat-start"}`}
                      >
                        <div className="chat-image avatar">
                          <div className="w-8 rounded-full">
                            <img
                              src={
                                mine
                                  ? toUrl(user?.avatar) ||
                                    "https://i.pravatar.cc/64?u=me"
                                  : toUrl(activeChat.peer?.avatar) ||
                                    "https://i.pravatar.cc/64?u=peer"
                              }
                              alt={mine ? "You" : "Peer"}
                            />
                          </div>
                        </div>
                        <div className="chat-header">
                          {mine ? "You" : activeChat.peer?.username}
                          <time className="text-xs opacity-50 ml-2">
                            {new Date(m.created_at).toLocaleString()}
                          </time>
                        </div>
                        <div
                          className={`chat-bubble ${
                            mine ? "chat-bubble-primary" : ""
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div id="msg-end" />
                </div>
              </div>

              <form
                onSubmit={sendMessage}
                className="p-3 border-t bg-base-100 flex gap-2"
              >
                <input
                  className="input input-bordered flex-1"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  disabled={sending || !draft.trim()}
                >
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
