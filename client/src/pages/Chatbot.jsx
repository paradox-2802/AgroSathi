import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Leaf,
  Menu,
  X,
  User,
  Bot,
  Mic,
  MicOff,
  ChevronDown,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Droplets,
  Volume2,
  Square,
  ArrowRight,
  Bug as BugIcon,
  Sparkles,
  Sprout,
  Camera,
  Image as ImageIcon,
  Globe,
  Newspaper
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { authFetch, API_BASE } from "../utils/api";
import { logout, getUser } from "../utils/auth";
import { speak, stopSpeaking } from "../utils/tts";

import Sidebar from "../components/chat/Sidebar";
import WeatherWidget from "../components/chat/WeatherWidget";
import NoticesWidget from "../components/chat/NoticesWidget";

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
  const [diseaseMode, setDiseaseMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showNotices, setShowNotices] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

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
            type: c.type || "normal",
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

    const chat = chatHistory.find((c) => c.id === currentChatId);
    const endpoint =
      chat?.type === "disease" || chat?.isDisease
        ? `/chat/disease/history/${currentChatId}`
        : `/chat/history/${currentChatId}`;

    authFetch(endpoint)
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
                    "🌱 Hi! I'm Bhoomi, your Agriculture Assistant. Ask me anything about farming, crops, soil, or irrigation.",
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

      setChatHistory((p) => [{ id, title: "New Chat", type: "normal" }, ...p]);
      setChats((p) => ({
        ...p,
        [id]: [
          {
            role: "assistant",
            content:
              "🌱 Hi! I'm Bhoomi, your Agriculture Assistant. Ask me anything about farming, crops, soil, or irrigation.",
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


  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image size must be less than 10MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    if (diseaseMode && !selectedImage) {
      alert("Please upload an image for crop diagnosis.");
      return;
    }

    let chatId = currentChatId;
    const msg = input.trim();
    setInput("");

    const imageToSend = selectedImage;
    if (imageToSend) clearImage();

    if (!chatId) {
      chatId = Date.now().toString();

      try {
        const endpoint = diseaseMode ? "/chat/disease/create" : "/chat/create";
        await authFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, title: msg || "New Diagnosis" }),
        });

        setChatHistory((p) => [{ id: chatId, title: msg || "New Diagnosis", type: diseaseMode ? "disease" : "normal" }, ...p]);

        skipHistoryFetchRef.current = chatId;
        setCurrentChatId(chatId);
      } catch {
        alert("Failed to create chat. Please try again.");
        return;
      }
    }

    setChats((p) => ({
      ...p,
      [chatId]: [...(p[chatId] || []), {
        role: "user",
        content: msg,
        image: imageToSend ? URL.createObjectURL(imageToSend) : null
      }],
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
      let res;
      if (diseaseMode && imageToSend) {
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("message", msg || "Diagnose this plant");
        formData.append("image", imageToSend);
        formData.append("language", language);

        res = await authFetch("/chat/disease-detect", {
          method: "POST",
          body: formData, // No Content-Type header needed for FormData
        });
      } else {
        res = await authFetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, message: msg, language }),
        });
      }

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
                if (data.content.length > 10) {

                  const chars = data.content.split("");
                  for (const char of chars) {
                    accumulatedContent += char;
                    await new Promise((resolve) => setTimeout(resolve, 15));

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
                } else {

                  accumulatedContent += data.content;
                  await new Promise((resolve) => setTimeout(resolve, 50));

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
    } catch (error) {
      console.error(error);
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

      <WeatherWidget
        showWeather={showWeather}
        setShowWeather={setShowWeather}
        weather={weather}
        darkMode={darkMode}
        weatherLoading={weatherLoading}
        showDailyForecast={showDailyForecast}
        setShowDailyForecast={setShowDailyForecast}
      />

      <NoticesWidget
        showNotices={showNotices}
        setShowNotices={setShowNotices}
        darkMode={darkMode}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        darkMode={darkMode}
        createNewChat={createNewChat}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        deleteChat={deleteChat}
        userName={userName}
        logout={logout}
      />

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
            <span className="font-bold text-lg">AgroSathi</span>
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${(new Date().getMonth() >= 5 && new Date().getMonth() <= 9)
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
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => {
                setDiseaseMode(!diseaseMode);
                setCurrentChatId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm border
                ${diseaseMode
                  ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                  : darkMode
                    ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                    : "bg-white text-green-700 border-green-100 hover:bg-green-50"
                }`}
            >
              <BugIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Crop Doctor</span>
            </button>
            <button
              onClick={() => setShowNotices(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm border
                ${darkMode
                  ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                  : "bg-white text-green-700 border-green-100 hover:bg-green-50"
                }`}
            >
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline">Schemes & News</span>
            </button>
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
                  Welcome to <span className="text-green-500">AgroSathi</span>
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
                      {(m.image || m.imagePath) && (
                        <div className="mb-3 rounded-xl overflow-hidden shadow-sm">
                          <img
                            src={m.image || (m.imagePath?.startsWith('http') ? m.imagePath : `${API_BASE}${m.imagePath}`)}
                            alt="Uploaded content"
                            className="max-w-full h-auto max-h-64 object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
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
          className={`p-4 md:p-6 relative z-20`}
        >
          <div className="max-w-4xl mx-auto">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="mb-4 flex flex-col items-center justify-center p-4"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                    <div className={`p-4 rounded-full ${darkMode ? "bg-red-500/20" : "bg-red-100"} relative z-10`}>
                      <Mic className="w-8 h-8 text-red-500" />
                    </div>
                  </div>

                  <div className="h-4 flex items-center justify-center gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [8, 24, 8] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          ease: "easeInOut",
                          delay: i * 0.1
                        }}
                        className="w-1.5 bg-red-500 rounded-full"
                      />
                    ))}
                  </div>

                  <span className={`mt-2 text-sm font-semibold tracking-wide ${darkMode ? "text-gray-200" : "text-gray-600"}`}>
                    Listening...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {diseaseMode && imagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="mb-3 relative inline-block group"
                >
                  <div className="relative rounded-2xl overflow-hidden border-2 border-green-500 shadow-lg">
                    <img
                      src={imagePreview}
                      alt="Selected plant"
                      className="h-32 w-auto object-cover bg-gray-100"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors transform hover:scale-110"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`p-1.5 flex gap-1.5 sm:gap-2 rounded-[1.5rem] shadow-2xl transition-all border glass-input ${darkMode
              ? "bg-gray-800/60 border-gray-700 shadow-black/20"
              : "bg-white/70 border-white/60 shadow-green-900/5"
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
                        className={`absolute bottom-full mb-3 left-0 w-48 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 glass-card text-left ${darkMode ? "text-white" : "text-gray-800"
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
                                  ? "text-gray-300 hover:bg-gray-700/50"
                                  : "text-gray-600 hover:bg-green-50/50"
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


              <div className={`w-[1px] my-2 ${darkMode ? "bg-gray-700" : "bg-gray-400/20"}`} />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden"
              />

              {diseaseMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold transition rounded-xl flex items-center gap-1.5 ${darkMode
                    ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    : "text-gray-500 hover:bg-green-50 hover:text-green-700"
                    }`}
                  title="Upload Image"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmit()
                }
                placeholder={isListening ? "Listening..." : "Ask anything about agriculture..."}
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
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={`p-3 rounded-xl transition-all shadow-lg font-medium flex items-center justify-center ${isLoading || (!input.trim() && !selectedImage)
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
