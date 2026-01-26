import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, X, Calendar, ExternalLink, Building, Filter } from "lucide-react";
import { authFetch } from "../../utils/api";

export default function NoticesWidget({ showNotices, setShowNotices, darkMode }) {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        if (showNotices) {
            fetchNotices();
        }
    }, [showNotices, filter]);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            let url = "/api/notices?limit=20";
            if (filter !== "ALL") {
                url += `&type=${filter}`;
            }
            const res = await authFetch(url);
            const data = await res.json();
            setNotices(data.notices || []);
        } catch (error) {
            console.error("Failed to fetch notices", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <AnimatePresence mode="wait">
            {showNotices && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNotices(false)}
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-800 border-white/50"
                            } rounded-3xl shadow-2xl p-6 max-w-4xl w-full border backdrop-blur-xl max-h-[85vh] flex flex-col relative z-50`}
                    >
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <div className="p-2 bg-green-500/10 rounded-xl">
                                    <Newspaper className="w-5 h-5 text-green-500" />
                                </div>
                                Schemes & News
                            </h3>
                            <button
                                onClick={() => setShowNotices(false)}
                                className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2 mb-4 flex-shrink-0">
                            {["ALL", "GOVERNMENT", "AGRI_NEWS"].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${filter === f
                                        ? "bg-green-600 text-white shadow-md"
                                        : darkMode
                                            ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    {f === "ALL" ? "All" : f === "GOVERNMENT" ? "Schemes" : "News"}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {loading ? (
                                <div className="flex flex-col items-center py-10">
                                    <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mb-4" />
                                    <p className="text-sm font-medium opacity-60">Loading updates...</p>
                                </div>
                            ) : notices.length === 0 ? (
                                <div className="text-center py-10 opacity-60">
                                    <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No updates available</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {notices.map((notice) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={notice._id}
                                            className={`p-5 rounded-2xl border transition-all ${darkMode
                                                ? "bg-gray-700/40 border-gray-600 hover:bg-gray-700/60"
                                                : "bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-green-200"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm ${notice.source_type === "GOVERNMENT"
                                                        ? "bg-blue-600 text-white dark:bg-blue-500"
                                                        : "bg-yellow-400 text-yellow-950 dark:bg-yellow-500"
                                                        }`}
                                                >
                                                    {notice.source_type === "GOVERNMENT" ? "Scheme" : "News"}
                                                </span>
                                                <span className="text-xs opacity-50 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(notice.published_date)}
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-sm mb-2 leading-tight">{notice.title}</h4>

                                            <p className="text-xs opacity-70 mb-3 leading-relaxed line-clamp-2">
                                                {notice.summary}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-semibold opacity-50 uppercase tracking-widest flex items-center gap-1">
                                                    <Building className="w-3 h-3" />
                                                    {notice.source_name}
                                                </span>
                                                <a
                                                    href={notice.article_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                                >
                                                    Read More <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
