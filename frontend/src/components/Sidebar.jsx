import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, LayoutDashboard, Activity, Settings, LogOut, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NavItem = ({ to, icon: Icon, label, active, testId }) => (
  <Link
    to={to}
    data-testid={testId}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active
        ? "bg-gradient-to-r from-purple-600/20 to-cyan-500/10 border border-purple-500/40 text-white"
        : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
    }`}
  >
    <Icon size={18} className={active ? "text-cyan-400" : ""} />
    <span className="font-medium text-sm tracking-wide">{label}</span>
  </Link>
);

export default function Sidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const isActive = (p) => loc.pathname === p;

  const handleLogout = async () => {
    await logout();
    nav("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[#0A0A12] border-r border-white/5 p-5">
      <Link to="/dashboard" data-testid="sidebar-logo" className="flex items-center gap-2 mb-10">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center"
        >
          <Eye className="text-white" size={18} />
        </motion.div>
        <div>
          <div className="font-heading font-black text-lg leading-none">FocusGuard</div>
          <div className="text-[10px] tracking-[0.3em] text-cyan-400 font-bold">AI</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1.5">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} testId="nav-dashboard" />
        <NavItem to="/live" icon={Activity} label="Live Session" active={isActive("/live")} testId="nav-live" />
        <NavItem to="/analytics" icon={BarChart3} label="Analytics" active={isActive("/analytics")} testId="nav-analytics" />
        <NavItem to="/settings" icon={Settings} label="Settings" active={isActive("/settings")} testId="nav-settings" />
        {user?.role === "admin" && (
          <NavItem to="/admin" icon={ShieldCheck} label="Admin" active={isActive("/admin")} testId="nav-admin" />
        )}
      </nav>

      <div className="mt-auto">
        <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] mb-3">
          <div className="text-xs text-zinc-500 mb-1">Signed in as</div>
          <div className="font-semibold text-sm truncate" data-testid="sidebar-user-name">{user?.name}</div>
          <div className="text-xs text-cyan-400 truncate">{user?.email}</div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full bg-transparent border-white/10 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          data-testid="sidebar-logout-btn"
        >
          <LogOut size={16} className="mr-2" /> Logout
        </Button>
      </div>
    </aside>
  );
}
