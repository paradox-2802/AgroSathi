import React, { useState, useEffect } from "react";
import { Send, Plus, Trash2 } from "lucide-react";
import { authFetch } from "../utils/api";

export default function AgricultureChatbot() {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chats, setChats] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentChatId) return;
    authFetch(`/chat/history/${currentChatId}`)
      .then((r) => r.ok && r.json())
      .then((d) => {
        if (!d) return;
        setChats((p) => ({
          ...p,
          [currentChatId]:
            d.messages?.length > 0
              ? d.messages
              : [{ role: "assistant", content: "Ask me about farming 🌱" }],
        }));
      });
  }, [currentChatId]);

  const createChat = async () => {
    const id = Date.now().toString();
    await authFetch("/chat/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: id }),
    });
    setChatHistory((p) => [{ id, title: "New Chat" }, ...p]);
    setChats((p) => ({
      ...p,
      [id]: [{ role: "assistant", content: "Ask me about farming 🌱" }],
    }));
    setCurrentChatId(id);
  };

  const deleteChat = async (id) => {
    await authFetch(`/chat/${id}`, { method: "DELETE" });
    setChatHistory((p) => p.filter((c) => c.id !== id));
    setChats((p) => {
      const c = { ...p };
      delete c[id];
      return c;
    });
    if (id === currentChatId) setCurrentChatId(null);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!currentChatId) await createChat();

    const msg = input;
    setInput("");

    setChats((p) => ({
      ...p,
      [currentChatId]: [
        ...(p[currentChatId] || []),
        { role: "user", content: msg },
      ],
    }));

    setLoading(true);

    const res = await authFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: currentChatId, message: msg }),
    });

    const data = await res.json();

    setChats((p) => ({
      ...p,
      [currentChatId]: [
        ...(p[currentChatId] || []),
        { role: "assistant", content: data.message },
      ],
    }));

    setLoading(false);
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r p-3">
        <button onClick={createChat} className="w-full mb-3">
          <Plus /> New Chat
        </button>
        {chatHistory.map((c) => (
          <div key={c.id} className="flex justify-between">
            <span onClick={() => setCurrentChatId(c.id)}>{c.title}</span>
            <Trash2 onClick={() => deleteChat(c.id)} />
          </div>
        ))}
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {(chats[currentChatId] || []).map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              {m.content}
            </div>
          ))}
          {loading && <div>Thinking…</div>}
        </div>

        <div className="p-3 flex gap-2 border-t">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 border rounded px-3"
          />
          <button onClick={sendMessage}>
            <Send />
          </button>
        </div>
      </main>
    </div>
  );
}
