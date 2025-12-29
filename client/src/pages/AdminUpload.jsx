import { useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";

export default function AdminUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const uploadPdf = async () => {
    if (!file) return;

    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(`${API_BASE}/upload/pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setStatus({
        type: "success",
        message: "PDF uploaded successfully! Processing in background...",
      });
      setFile(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>

        <div className="flex items-center gap-2 mb-6 text-green-700">
          <FileText className="w-6 h-6" />
          <h2 className="text-xl font-bold">Admin PDF Upload</h2>
        </div>

        <label className="border-2 border-dashed border-green-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition">
          <Upload className="text-green-600 mb-3 w-12 h-12" />
          <span className="text-sm text-gray-600 text-center">
            {file ? (
              <span className="font-medium text-green-700">{file.name}</span>
            ) : (
              "Click to select a PDF file"
            )}
          </span>
          <span className="text-xs text-gray-400 mt-2">Max size: 200MB</span>
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              setFile(e.target.files[0]);
              setStatus(null);
            }}
          />
        </label>

        <button
          onClick={uploadPdf}
          disabled={!file || loading}
          className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium hover:shadow-lg transition"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload PDF
            </>
          )}
        </button>

        {status && (
          <div
            className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${
              status.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
