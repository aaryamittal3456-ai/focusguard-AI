import React from "react";
import Sidebar from "./Sidebar";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, LayoutDashboard, Activity, Settings, LogOut, ShieldCheck, BarChart3, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex bg-[#05050A] text-white">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <MobileTopBar />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="p-4 sm:p-6 lg:p-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function MobileTopBar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const isActive = (p) => loc.pathname === p;
  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testId: "mobile-nav-dashboard" },
    { to: "/live", icon: Activity, label: "Live Session", testId: "mobile-nav-live" },
    { to: "/analytics", icon: BarChart3, label: "Analytics", testId: "mobile-nav-analytics" },
    { to: "/settings", icon: Settings, label: "Settings", testId: "mobile-nav-settings" },
  ];
  if (user?.role === "admin") items.push({ to: "/admin", icon: ShieldCheck, label: "Admin", testId: "mobile-nav-admin" });

  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#05050A]/90 backdrop-blur-xl border-b border-white/5">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center">
          <Eye size={16} />
        </div>
        <span className="font-heading font-black">FocusGuard</span>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <button data-testid="mobile-menu-btn" className="p-2 rounded-lg border border-white/10">
            <Menu size={18} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-[#0A0A12] border-white/10 text-white w-72">
          <div className="flex flex-col gap-2 mt-6">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                data-testid={it.testId}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isActive(it.to) ? "bg-purple-600/20 border border-purple-500/40" : "border border-white/5"
                }`}
              >
                <it.icon size={16} className="text-cyan-400" />
                {it.label}
              </Link>
            ))}
            <button
              data-testid="mobile-logout-btn"
              onClick={async () => { await logout(); nav("/login"); }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/5 text-red-400 mt-4"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
