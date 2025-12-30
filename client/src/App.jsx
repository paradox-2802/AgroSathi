import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./utils/auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chatbot from "./pages/Chatbot";
import AdminLogin from "./pages/AdminLogin";
import AdminUpload from "./pages/AdminUpload";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/upload"
          element={
            <ProtectedAdminRoute>
              <AdminUpload />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chatbot />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
