import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { toast } from "sonner";

function formatErr(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const msg = formatErr(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#05050A] text-white">
      <div className="hidden lg:flex w-1/2 relative aurora-bg items-center justify-center p-12">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="relative z-10 max-w-md">
          <Link to="/" data-testid="login-logo" className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center">
              <Eye size={18} />
            </div>
            <span className="font-heading font-black text-xl">FocusGuard <span className="text-cyan-400">AI</span></span>
          </Link>
          <h2 className="font-heading font-black text-5xl tracking-tighter leading-tight">
            Welcome back to your <span className="gradient-text">focus zone</span>.
          </h2>
          <p className="text-zinc-400 mt-6 leading-relaxed">
            Continue your eye-health journey. Track every blink, every break, every breakthrough.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-5"
          data-testid="login-form"
        >
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Login</div>
            <h1 className="font-heading font-black text-3xl">Access your dashboard</h1>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@focusguard.ai"
                className="pl-10 bg-[#0C0C14] border-white/10 h-11 text-white"
                data-testid="login-email-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-10 bg-[#0C0C14] border-white/10 h-11 text-white"
                data-testid="login-password-input"
              />
            </div>
          </div>

          {error && <div className="text-red-400 text-sm" data-testid="login-error">{error}</div>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-11 glow-purple"
            data-testid="login-submit-btn"
          >
            {loading ? "Signing in..." : (<>Sign in <ArrowRight size={16} className="ml-1" /></>)}
          </Button>

          <div className="text-sm text-zinc-400 text-center">
            New here? <Link to="/register" className="text-cyan-400 hover:underline" data-testid="login-to-register-link">Create account</Link>
          </div>

          <div className="text-xs text-zinc-500 text-center pt-4 border-t border-white/5">
            Demo admin: <span className="text-zinc-300">admin@focusguard.ai</span> / <span className="text-zinc-300">Admin@FocusGuard123</span>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
