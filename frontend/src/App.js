import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import LiveSessionPage from "@/pages/LiveSessionPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import { Toaster } from "sonner";
import { api } from "@/lib/api";

function ThemeWrapper({ children }) {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (user) {
      api.get("/settings").then((r) => {
        setDarkMode(r.data.dark_mode !== false);
      }).catch(() => {});
    }
  }, [user]);

  return (
    <div className={darkMode ? "App dark-mode" : "App light-mode"}>
      {children}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeWrapper>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/live" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: "#0C0C14", border: "1px solid rgba(255,255,255,0.1)", color: "white" },
            }}
          />
        </ThemeWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;