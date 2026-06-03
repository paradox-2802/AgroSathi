import { useState, useEffect } from "react";
import { Leaf, Calendar, ExternalLink, ArrowLeft, Building, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/api";

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchNotices();
  }, [filter]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      let url = "/api/notices";
      if (filter !== "ALL") {
        url += `?type=${filter}`;
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 text-gray-800">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-green-700" />
            </Link>
            <div className="flex items-center gap-2 text-green-700">
              <Leaf className="w-6 h-6" />
              <span className="font-bold text-lg">AgroSathi News</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Latest Updates</h1>

          <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-green-100">
            {["ALL", "GOVERNMENT", "AGRI_NEWS"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-green-50"
                  }`}
              >
                {f === "ALL" ? "All Updates" : f === "GOVERNMENT" ? "Schemes" : "News"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No updates found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notices.map((notice) => (
              <div key={notice._id} className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 hover:shadow-md transition-all flex flex-col h-full group">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${notice.source_type === "GOVERNMENT"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}>
                    {notice.source_type === "GOVERNMENT" ? "SCHEME" : "NEWS"}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(notice.published_date)}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-green-700 transition-colors">
                  {notice.title}
                </h3>

                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {notice.source_type === "GOVERNMENT" ? <Building className="w-3 h-3" /> : <Newspaper className="w-3 h-3" />}
                  {notice.source_name}
                </div>

                <p className="text-gray-600 mb-6 text-sm leading-relaxed flex-grow">
                  {notice.summary}
                </p>

                <a
                  href={notice.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-50 text-green-700 font-semibold rounded-xl hover:bg-green-600 hover:text-white transition-all text-sm"
                >
                  Read Full Article <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
