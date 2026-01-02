import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Leaf,
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
  ChevronDown,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  Globe,
  Volume2,
  Square,
  Zap,
  ArrowRight,
  Bug as BugIcon,
  Sparkles,
  Sprout,
  CloudOff as CloudOffIcon,
  PanelLeftClose,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { authFetch } from "../utils/api";
import { logout, getUser } from "../utils/auth";
import { speak, stopSpeaking } from "../utils/tts";

export default function Chatbot() {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chats, setChats] = useState({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showSources, setShowSources] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [weather, setWeather] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showDailyForecast, setShowDailyForecast] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const user = getUser();
    if (user && user.name) {
      setUserName(user.name);
    }
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const LANGUAGES = {
    English: "en-IN",
    Hindi: "hi-IN",
    Bengali: "bn-IN",
    Tamil: "ta-IN",
    Telugu: "te-IN",
    Marathi: "mr-IN",
    Kannada: "kn-IN",
    Malayalam: "ml-IN",
    Gujarati: "gu-IN",
    Punjabi: "pa-IN",
    Urdu: "ur-IN",
  };
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const skipHistoryFetchRef = useRef(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = LANGUAGES[language];

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
  }, [language]);

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
      .catch(() => { });
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!currentChatId) return;

    if (skipHistoryFetchRef.current === currentChatId) {
      skipHistoryFetchRef.current = null;
      return;
    }

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
      .catch(() => { });
  }, [currentChatId]);

  useEffect(() => {
    if (chats[currentChatId]?.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
      setSidebarOpen(window.innerWidth < 1024);
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

        skipHistoryFetchRef.current = chatId;
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

    setChats((p) => ({
      ...p,
      [chatId]: [
        ...(p[chatId] || []),
        {
          role: "assistant",
          content: "",
          sources: [],
        },
      ],
    }));

    setIsLoading(true);

    try {
      const res = await authFetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: msg, language }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let sources = [];
      let title = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const data = JSON.parse(line.trim().slice(6));

              if (data.content) {
                accumulatedContent += data.content;
                await new Promise((resolve) => setTimeout(resolve, 10));

                setChats((p) => {
                  const messages = [...(p[chatId] || [])];
                  const lastIndex = messages.length - 1;
                  messages[lastIndex] = {
                    ...messages[lastIndex],
                    content: accumulatedContent,
                  };
                  return { ...p, [chatId]: messages };
                });
              }

              if (data.sources) {
                sources = data.sources;
              }

              if (data.title) {
                title = data.title;
              }

              if (data.done) {
                setChats((p) => {
                  const messages = [...(p[chatId] || [])];
                  const lastIndex = messages.length - 1;
                  messages[lastIndex] = {
                    ...messages[lastIndex],
                    sources: sources,
                  };
                  return { ...p, [chatId]: messages };
                });

                if (title) {
                  setChatHistory((p) =>
                    p.map((c) => (c.id === chatId ? { ...c, title: title } : c))
                  );
                }
              }
            } catch (e) { }
          }
        }
      }
    } catch {
      setChats((p) => {
        const messages = [...(p[chatId] || [])];
        const lastIndex = messages.length - 1;
        messages[lastIndex] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return { ...p, [chatId]: messages };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeather = () => {
    setWeatherLoading(true);
    setShowWeather(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setWeatherLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`
          );
          const data = await response.json();
          const current = data.current;
          const daily = data.daily;

          const getWeatherDesc = (code) => {
            if (code === 0) return "Clear sky";
            if (code >= 1 && code <= 3) return "Partly cloudy";
            if (code >= 45 && code <= 48) return "Foggy";
            if (code >= 51 && code <= 67) return "Rainy";
            if (code >= 71 && code <= 77) return "Snowy";
            if (code >= 80 && code <= 82) return "Showers";
            if (code >= 95 && code <= 99) return "Thunderstorm";
            return "Unknown";
          };

          setWeather({
            temp: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            wind: current.wind_speed_10m,
            desc: getWeatherDesc(current.weather_code),
            code: current.weather_code,
            rainChance: daily.precipitation_probability_max[0],
            rainSum: daily.precipitation_sum[0],
            daily: daily.time.map((t, i) => ({
              date: new Date(t).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' }),
              maxTemp: daily.temperature_2m_max[i],
              minTemp: daily.temperature_2m_min[i],
              code: daily.weather_code[i],
              desc: getWeatherDesc(daily.weather_code[i]),
              rainChance: daily.precipitation_probability_max[i],
            })),
          });
        } catch (error) {
          alert("Failed to fetch weather data.");
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        alert("Unable to retrieve your location");
        setWeatherLoading(false);
      }
    );
  };

  const currentMessages = chats[currentChatId] || [];

  return (
    <div
      className={`flex h-screen overflow-hidden relative ${darkMode
        ? "bg-gray-900"
        : "bg-gradient-to-br from-green-50/50 to-emerald-50/50"
        }`}
    >
      <div className={`absolute inset-0 z-0 pointer-events-none ${darkMode ? "opacity-10 mix-blend-soft-light" : "opacity-40 mix-blend-overlay"}`}
        style={{
          backgroundImage: "url(/bg-agriculture.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}
      />

      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>


      <AnimatePresence mode="wait">
        {showWeather && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWeather(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-800 border-white/50"
                } rounded-3xl shadow-2xl p-6 max-w-sm w-full border backdrop-blur-xl relative z-50`}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  Weather
                </h3>
                <button
                  onClick={() => setShowWeather(false)}
                  className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {weatherLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium opacity-60">Fetching forecast...</p>
                </div>
              ) : weather ? (
                <div className="space-y-8">
                  <div className="text-center relative py-4">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10" />
                    <h2 className="text-6xl font-bold mb-2 tracking-tighter">{Math.round(weather.temp)}°</h2>
                    <p className="text-lg font-medium text-blue-500">{weather.desc}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-2xl ${darkMode ? "bg-gray-700/50" : "bg-blue-50/50"} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 opacity-60 mb-1">
                        <Droplets className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Humidity</span>
                      </div>
                      <p className="text-xl font-bold">{weather.humidity}%</p>
                    </div>
                    <div className={`p-4 rounded-2xl ${darkMode ? "bg-gray-700/50" : "bg-blue-50/50"} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 opacity-60 mb-1">
                        <Wind className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Wind</span>
                      </div>
                      <p className="text-xl font-bold">{weather.wind} <span className="text-xs font-normal">km/h</span></p>
                    </div>
                    <div className={`p-4 rounded-2xl ${darkMode ? "bg-gray-700/50" : "bg-blue-50/50"} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 opacity-60 mb-1">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Rain %</span>
                      </div>
                      <p className="text-xl font-bold">{weather.rainChance}%</p>
                    </div>
                    <div className={`p-4 rounded-2xl ${darkMode ? "bg-gray-700/50" : "bg-blue-50/50"} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 opacity-60 mb-1">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Rain Vol</span>
                      </div>
                      <p className="text-xl font-bold">{weather.rainSum} <span className="text-xs font-normal">mm</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium opacity-40 justify-center">
                    <MapPin className="w-3 h-3" />
                    <span>Local Forecast</span>
                  </div>

                  {weather.daily && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowDailyForecast(true)}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="text-sm">View 7-Day Forecast</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <CloudOffIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Weather unavailable</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showDailyForecast && weather && weather.daily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDailyForecast(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-800 border-white/50"
                } rounded-3xl shadow-2xl p-6 max-w-md w-full border backdrop-blur-xl max-h-[80vh] flex flex-col relative z-50`}
            >
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  7-Day Forecast
                </h3>
                <button
                  onClick={() => setShowDailyForecast(false)}
                  className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {weather.daily.map((day, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx}
                    className={`p-4 rounded-2xl flex items-center justify-between ${darkMode ? "bg-gray-700/30" : "bg-blue-50/50"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-white"} shadow-sm text-sm font-bold`}>
                        {idx === 0 ? "Today" : day.date.split(',')[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{day.date}</span>
                        <span className="text-xs opacity-60 font-medium">{day.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-lg">{Math.round(day.maxTemp)}°</span>
                        <span className="text-xs opacity-50 font-medium">{Math.round(day.minTemp)}°</span>
                      </div>
                      <div className="flex flex-col items-center w-8 bg-blue-100/50 rounded-lg py-1 dark:bg-blue-900/20">
                        <span className="text-[10px] font-bold text-blue-500">{day.rainChance}%</span>
                        <CloudRain className="w-3 h-3 text-blue-500 opacity-60" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed inset-y-0 left-0 z-40 w-80 
              ${darkMode ? "bg-gray-900/80 border-r border-gray-800" : "bg-white/60 border-r border-white/40"} 
              backdrop-blur-xl shadow-2xl flex flex-col h-full`}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 text-white">
                  <Leaf className="w-7 h-7" />
                </div>
                <div>
                  <h1 className={`font-bold text-2xl tracking-tight ${darkMode ? "text-green-500" : "text-green-600"}`}>KisanAi</h1>
                  <p className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Agriculture Assistant</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto p-2 rounded-xl active:scale-95 transition"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createNewChat}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl flex gap-2 items-center justify-center shadow-lg shadow-green-600/25 font-semibold text-sm group transition-all"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Chat
              </motion.button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 custom-scrollbar">
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-4 px-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>History</p>
                {chatHistory.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setCurrentChatId(c.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`group flex justify-between items-center gap-2 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${c.id === currentChatId
                      ? darkMode
                        ? "bg-gray-800 shadow-lg shadow-black/10 border border-gray-700 text-white"
                        : "bg-white shadow-lg shadow-green-100/50 border border-green-100 text-green-700"
                      : darkMode
                        ? "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                        : "hover:bg-white/50 text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    <div className="flex gap-3 items-center truncate flex-1 min-w-0">
                      <MessageSquare
                        className={`w-4 h-4 flex-shrink-0 ${c.id === currentChatId
                          ? "text-green-500"
                          : "opacity-50"
                          }`}
                      />
                      <span className="truncate text-sm font-medium">
                        {c.title}
                      </span>
                    </div>
                    {c.id === currentChatId && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => deleteChat(c.id, e)}
                        className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-lg group/del transition-colors"
                        title="Delete chat"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 group-hover/del:text-red-500" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100/10">
              <div className={`p-4 rounded-2xl ${darkMode ? "bg-gray-800/50" : "bg-white/50"} flex items-center gap-3 backdrop-blur-sm shadow-sm border ${darkMode ? "border-gray-700" : "border-white/50"}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{userName}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors text-gray-500 hover:text-red-500"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-300 ${sidebarOpen ? "lg:ml-80" : ""}`}>
        <header
          className={`${darkMode
            ? "bg-gray-900/60 border-gray-800"
            : "bg-white/40 border-white/40"
            } backdrop-blur-xl border-b p-4 flex gap-3 items-center sticky top-0 z-20 transition-all`}
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${darkMode ? "hover:bg-gray-800" : "hover:bg-white/50"
                } p-2 rounded-xl transition-colors`}
            >
              <Menu
                className={`w-6 h-6 ${darkMode ? "text-green-400" : "text-green-700"
                  }`}
              />
            </button>
          )}
          <div
            className={`flex items-center gap-2 ${darkMode ? "text-green-400" : "text-green-700"
              }`}
          >
            <Leaf className="w-6 h-6" />
            <span className="font-bold text-lg">KisanAi</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${(new Date().getMonth() >= 5 && new Date().getMonth() <= 9)
              ? "bg-green-100 text-green-700 border-green-200"
              : (new Date().getMonth() >= 10 || new Date().getMonth() <= 2)
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
              }`}>
              <Sprout className="w-3 h-3" />
              <span>
                {(new Date().getMonth() >= 5 && new Date().getMonth() <= 9) ? "Kharif" :
                  (new Date().getMonth() >= 10 || new Date().getMonth() <= 2) ? "Rabi" : "Zaid"} Season
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchWeather}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition shadow-sm font-medium text-sm ${darkMode
                ? "bg-gray-800/80 text-blue-400 hover:bg-gray-700 border border-gray-700"
                : "bg-blue-50/80 text-blue-600 hover:bg-blue-100 border border-blue-100"
                }`}
            >
              <Cloud className="w-4 h-4" />
              <span className="hidden sm:inline">Weather</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition shadow-sm ${darkMode
                ? "bg-gray-800/80 text-yellow-400 hover:bg-gray-700 border border-gray-700"
                : "bg-white/80 text-orange-500 hover:bg-orange-50 border border-orange-100"
                }`}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth custom-scrollbar">
          {currentMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-full py-12 sm:py-0 max-w-4xl mx-auto w-full text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center w-full max-w-2xl"
              >

                <h2
                  className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-900"
                    } mb-4 tracking-tight`}
                >
                  Welcome to <span className="text-green-500">KisanAi</span>
                </h2>
                <p
                  className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"
                    } mb-12 leading-relaxed max-w-lg mx-auto`}
                >
                  Your expert agriculture assistant. Ready to help with <span className="text-green-500 font-semibold">farming</span>, <span className="text-emerald-500 font-semibold">crops</span>, & <span className="text-teal-500 font-semibold">soil health</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left w-full">
                  {[
                    {
                      icon: <CloudRain className="w-6 h-6 text-blue-500" />,
                      title: "Monsoon Crops",
                      q: "What are the best crops for monsoon season?",
                    },
                    {
                      icon: <BugIcon className="w-6 h-6 text-red-500" />,
                      title: "Pest Control",
                      q: "How to prevent pest attacks on tomatoes?",
                    },
                    {
                      icon: <Droplets className="w-6 h-6 text-teal-500" />,
                      title: "Smart Irrigation",
                      q: "Best irrigation methods for rice farming?",
                    },
                  ].map((item, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInput(item.q)}
                      className={`p-6 rounded-xl border transition-all shadow-sm hover:shadow-md flex flex-col gap-4 group ${darkMode
                        ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
                        : "bg-white border-stone-200 hover:border-green-300"
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-stone-50 border border-stone-100"}`}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className={`font-bold mb-1 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{item.title}</h3>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.q}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {currentMessages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex justify-center items-center flex-shrink-0 shadow-lg shadow-green-500/20">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex flex-col gap-2 max-w-xl sm:max-w-2xl">
                <div
                  className={`px-6 py-4 rounded-[2rem] ${m.role === "user"
                    ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-md shadow-green-900/10 rounded-tr-none"
                    : darkMode
                      ? "bg-gray-800 border border-gray-700 shadow-sm text-gray-100 rounded-tl-none"
                      : "bg-white border border-green-100 shadow-sm shadow-green-100/50 rounded-tl-none text-gray-800"
                    } ${m.role === "assistant" && !m.content && isLoading
                      ? "thinking-bubble"
                      : ""
                    }`}
                >
                  {m.role === "assistant" && !m.content && isLoading ? (
                    <div className="flex gap-1.5 py-2">
                      <div
                        className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      style={{
                        fontFamily:
                          '"Outfit", "Nirmala UI", "Inter", sans-serif',
                      }}
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="my-2 pl-6 list-disc space-y-1" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="my-2 pl-6 list-decimal space-y-1" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="my-0.5" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold" {...props} />
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="ml-2 mt-2">
                  <div className="flex items-center gap-2">
                    {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                      <button
                        onClick={() => setShowSources((p) => ({ ...p, [i]: !p[i] }))}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors w-fit"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{m.sources.length} sources</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showSources[i] ? "rotate-180" : ""}`} />
                      </button>
                    )}

                    {m.role === "assistant" && m.content && !isLoading && (
                      <button
                        onClick={() => {
                          if (playingMessageId === i) {
                            stopSpeaking();
                            setPlayingMessageId(null);
                          } else {
                            setPlayingMessageId(i);
                            speak(m.content, () => setPlayingMessageId(null));
                          }
                        }}
                        className={`p-2 rounded-full transition-colors flex items-center gap-1.5 text-xs font-medium ${playingMessageId === i
                          ? "text-red-500 bg-red-50 hover:bg-red-100"
                          : darkMode
                            ? "text-gray-400 hover:text-green-400 hover:bg-gray-700"
                            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                          }`}
                        title={playingMessageId === i ? "Stop listening" : "Listen to response"}
                      >
                        {playingMessageId === i ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showSources[i] && m.sources && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2 space-y-2"
                      >
                        {m.sources.map((s, idx) => (
                          <div
                            key={idx}
                            className={`text-xs rounded-xl p-3 ${darkMode
                              ? "bg-gray-800 border border-gray-700"
                              : "bg-white border border-green-100 shadow-sm"
                              }`}
                          >
                            <p
                              className={`${darkMode ? "text-gray-300" : "text-gray-700"
                                } line-clamp-2`}
                            >
                              {s.preview}...
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {m.role === "user" && (
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex justify-center items-center flex-shrink-0 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </motion.div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <footer
          className={`p-4 md:p-6 ${darkMode ? "bg-gray-900/50" : "bg-transparent"} relative z-20`}
        >
          <div className="max-w-4xl mx-auto">
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 shadow-lg shadow-red-500/10"
              >
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full h-4"
                      style={{
                        animation: `pulse 0.8s ease-in-out infinite ${i * 0.1
                          }s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-red-600 font-semibold">
                  Listening... Speak now
                </span>
              </motion.div>
            )}
            <div className={`p-1.5 flex gap-1.5 sm:gap-2 rounded-[1.5rem] shadow-2xl transition-all border ${darkMode
              ? "bg-gray-800 border-gray-700 shadow-black/20"
              : "bg-white border-white/60 shadow-green-900/5"
              }`}>
              <div className="relative flex items-center pl-2">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold transition rounded-xl ${darkMode
                    ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    : "text-gray-500 hover:bg-green-50 hover:text-green-700"
                    }`}
                  title="Select Language"
                >
                  <Globe className={`w-4 h-4 ${language !== "English"
                    ? darkMode ? "text-green-400" : "text-green-600"
                    : ""
                    }`} />
                  <span className="max-w-[60px] truncate">{language === "English" ? "EN" : language.slice(0, 3)}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                <AnimatePresence>
                  {showLanguageMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowLanguageMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={`absolute bottom-full mb-3 left-0 w-48 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-green-100"
                          }`}
                      >
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                          {Object.keys(LANGUAGES).map((l) => (
                            <button
                              key={l}
                              onClick={() => {
                                setLanguage(l);
                                setShowLanguageMenu(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition rounded-xl ${language === l
                                ? "text-white bg-gradient-to-r from-green-500 to-emerald-600 font-medium shadow-md"
                                : darkMode
                                  ? "text-gray-300 hover:bg-gray-700"
                                  : "text-gray-600 hover:bg-green-50"
                                }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className={`w-[1px] my-2 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`} />

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmit()
                }
                placeholder="Ask anything about agriculture..."
                className={`flex-1 min-w-0 bg-transparent px-2 sm:px-3 py-3 text-sm sm:text-base focus:outline-none ${darkMode
                  ? "text-gray-100 placeholder-gray-500"
                  : "text-gray-800 placeholder-gray-400"
                  }`}
                disabled={isListening}
              />

              <div className="flex items-center gap-1 pr-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleVoiceInput}
                  className={`p-3 rounded-xl transition-all ${isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : darkMode
                      ? "text-gray-400 hover:bg-gray-700 hover:text-green-400"
                      : "text-gray-400 hover:bg-green-50 hover:text-green-600"
                    }`}
                  title={isListening ? "Stop listening" : "Start voice search"}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-xl transition-all shadow-lg font-medium flex items-center justify-center ${isLoading || !input.trim()
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-600/30 hover:shadow-green-600/40"
                    }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
            <p
              className={`text-[10px] sm:text-xs text-center ${darkMode ? "text-gray-500" : "text-gray-400"
                } mt-4 font-medium`}
            >
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </footer>

      </main >

      <style>{`
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${darkMode ? "#1f2937" : "#dcfce7"};
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #16a34a;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #15803d;
    }
    
    * {
      scrollbar-width: thin;
      scrollbar-color: #16a34a ${darkMode ? "#1f2937" : "#dcfce7"};
    }
    
    @keyframes pulse {
      0%, 100% { height: 8px; }
      50% { height: 16px; }
    }
  `}</style>
    </div >
  );
}
