import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Leaf,
  Loader2,
  Plus,
  MessageSquare,
  Menu,
  X,
  Trash2,
  User,
  Bot,
  LogOut,
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { authFetch } from "../utils/api";
import { logout } from "../utils/auth";

export default function Chatbot() {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chats, setChats] = useState({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showSources, setShowSources] = useState({});
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-IN";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        if (event.error === "no-speech") {
          alert("No speech detected. Please try again.");
        } else if (event.error === "not-allowed") {
          alert("Microphone access denied. Please enable it in settings.");
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      setVoiceSupported(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    authFetch("/chat/list")
      .then((r) => r.json())
      .then((data) => {
        setChatHistory(
          data.map((c) => ({
            id: c.id,
            title: c.title || "New Chat",
          }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!currentChatId) return;

    authFetch(`/chat/history/${currentChatId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load chat");
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setChats((p) => ({
          ...p,
          [currentChatId]:
            d.messages?.length > 0
              ? d.messages
              : [
                  {
                    role: "assistant",
                    content:
                      "🌱 Hi! I'm your Agriculture Assistant. Ask me anything about farming, crops, soil, or irrigation.",
                  },
                ],
        }));
      })
      .catch(() => {});
  }, [currentChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, currentChatId, isLoading]);

  const toggleVoiceInput = () => {
    if (!voiceSupported) {
      alert(
        "Voice search is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const createNewChat = async () => {
    const id = Date.now().toString();

    try {
      await authFetch("/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: id }),
      });

      setChatHistory((p) => [{ id, title: "New Chat" }, ...p]);
      setChats((p) => ({
        ...p,
        [id]: [
          {
            role: "assistant",
            content:
              "🌱 Hi! I'm your Agriculture Assistant. Ask me anything about farming, crops, soil, or irrigation.",
          },
        ],
      }));
      setCurrentChatId(id);
      setSidebarOpen(false);
    } catch {
      alert("Failed to create new chat. Please try again.");
    }
  };

  const deleteChat = async (id, e) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      const response = await authFetch(`/chat/${id}`, { method: "DELETE" });
      const result = await response.json();

      if (!result.success) {
        alert("Failed to delete chat. Please try again.");
        return;
      }

      setChatHistory((p) => p.filter((c) => c.id !== id));
      setChats((p) => {
        const c = { ...p };
        delete c[id];
        return c;
      });

      if (id === currentChatId) {
        setCurrentChatId(null);
      }
    } catch {
      alert("Failed to delete chat. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    let chatId = currentChatId;
    const msg = input.trim();
    setInput("");

    if (!chatId) {
      chatId = Date.now().toString();

      try {
        await authFetch("/chat/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId }),
        });

        setChatHistory((p) => [{ id: chatId, title: msg }, ...p]);

        setChats((p) => ({
          ...p,
          [chatId]: [
            {
              role: "assistant",
              content:
                "🌱 Hi! I'm your Agriculture Assistant. Ask me anything about farming, crops, soil, or irrigation.",
            },
          ],
        }));

        setCurrentChatId(chatId);
      } catch {
        alert("Failed to create chat. Please try again.");
        return;
      }
    }

    setChats((p) => ({
      ...p,
      [chatId]: [...(p[chatId] || []), { role: "user", content: msg }],
    }));

    setIsLoading(true);

    try {
      const res = await authFetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: msg }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();

      setChats((p) => ({
        ...p,
        [chatId]: [
          ...(p[chatId] || []),
          {
            role: "assistant",
            content: data.message,
            sources: data.sources || [],
          },
        ],
      }));

      if (data.title) {
        setChatHistory((p) =>
          p.map((c) => (c.id === chatId ? { ...c, title: data.title } : c))
        );
      }
    } catch {
      setChats((p) => ({
        ...p,
        [chatId]: [
          ...(p[chatId] || []),
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const currentMessages = chats[currentChatId] || [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-hidden">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-green-200
        flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:flex`}
      >
        <div className="p-5 border-b border-green-200 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg">KisanAi</h1>
              <p className="text-xs text-white/80">Agriculture Assistant</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl flex gap-2 items-center justify-center hover:shadow-lg transition font-medium"
          >
            <Plus className="w-5 h-5" /> New Chat
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3">
          <div className="space-y-2 py-2">
            {chatHistory.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setCurrentChatId(c.id);
                  setSidebarOpen(false);
                }}
                className={`group flex justify-between items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                  c.id === currentChatId
                    ? "bg-gradient-to-r from-green-100 to-emerald-100 shadow-md"
                    : "hover:bg-white/60"
                }`}
              >
                <div className="flex gap-3 items-center truncate flex-1 min-w-0">
                  <MessageSquare
                    className={`w-4 h-4 flex-shrink-0 ${
                      c.id === currentChatId
                        ? "text-green-700"
                        : "text-green-600"
                    }`}
                  />
                  <span
                    className={`truncate text-sm ${
                      c.id === currentChatId ? "font-medium" : ""
                    }`}
                  >
                    {c.title}
                  </span>
                </div>
                <button
                  onClick={(e) => deleteChat(c.id, e)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition hover:bg-red-100 rounded-lg p-1.5"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-green-200">
          <button
            onClick={logout}
            className="flex gap-2 items-center justify-center text-red-600 text-sm hover:text-red-700 transition font-medium w-full px-4 py-3 rounded-lg hover:bg-red-50 border border-red-200"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-xl border-b border-green-200 p-4 flex gap-3 items-center shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-green-100 p-2 rounded-lg transition lg:hidden"
          >
            <Menu className="w-6 h-6 text-green-700" />
          </button>
          <div className="flex items-center gap-2 text-green-700">
            <Leaf className="w-6 h-6" />
            <span className="font-bold text-lg">KisanAi</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">AI Powered</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentMessages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Leaf className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Welcome to KisanAi
                </h2>
                <p className="text-gray-600 mb-6">
                  Your intelligent agriculture assistant. Ask me anything about
                  farming, crops, soil, irrigation, or pest management.
                </p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {[
                    "What are the best crops for monsoon season?",
                    "How to prevent pest attacks on tomatoes?",
                    "Best irrigation methods for rice farming?",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="text-sm text-left px-4 py-3 bg-white hover:bg-green-50 rounded-xl border border-green-200 transition text-gray-700 hover:border-green-400"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentMessages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex justify-center items-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex flex-col gap-2 max-w-xl sm:max-w-2xl">
                <div
                  className={`px-5 py-4 rounded-2xl ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                      : "bg-white border border-green-200 shadow-md"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="my-2" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="my-2 pl-6 list-disc" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="my-2 pl-6 list-decimal" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="my-1" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
                {m.role === "assistant" &&
                  m.sources &&
                  m.sources.length > 0 && (
                    <div className="ml-2">
                      <button
                        onClick={() =>
                          setShowSources((p) => ({ ...p, [i]: !p[i] }))
                        }
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
                      >
                        <span>{m.sources.length} sources</span>
                        <ChevronDown
                          className={`w-3 h-3 transition ${
                            showSources[i] ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {showSources[i] && (
                        <div className="mt-2 space-y-2">
                          {m.sources.map((s, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-green-50 border border-green-200 rounded-lg p-3"
                            >
                              <p className="text-gray-700 line-clamp-2">
                                {s.preview}...
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
              {m.role === "user" && (
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex justify-center items-center flex-shrink-0 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex justify-center items-center flex-shrink-0 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-green-200 rounded-2xl px-5 py-4 shadow-md">
                <div className="flex gap-2 items-center text-green-600">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span className="text-sm">Analyzing your question...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <footer className="border-t border-green-200 bg-white/80 backdrop-blur-xl p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {isListening && (
              <div className="mb-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-600 rounded-full h-4"
                      style={{
                        animation: `pulse 0.8s ease-in-out infinite ${
                          i * 0.1
                        }s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-red-600 font-medium">
                  Listening... Speak now
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmit()
                }
                placeholder="Ask about crops, soil, irrigation..."
                className="flex-1 border-2 border-green-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm"
                disabled={isListening}
              />

              <button
                onClick={toggleVoiceInput}
                className={`px-5 rounded-2xl transition shadow-lg font-medium ${
                  isListening
                    ? "bg-red-600 text-white"
                    : "bg-white border-2 border-green-200 text-green-600 hover:bg-green-50"
                }`}
                title={isListening ? "Stop listening" : "Start voice search"}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-3">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </footer>
      </main>

      <style>{`
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #dcfce7;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #16a34a;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #15803d;
    }
    
    /* For Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: #16a34a #dcfce7;
    }
    
    @keyframes pulse {
      0%, 100% { height: 8px; }
      50% { height: 16px; }
    }
  `}</style>
    </div>
  );
}
