import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, ArrowRight, Sparkles, Brain, Zap, Shield, BarChart3, Bell, Activity, ChevronRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Stat = ({ value, label, suffix = "" }) => (
  <div className="border border-white/5 bg-white/[0.02] rounded-2xl p-6 backdrop-blur-sm">
    <div className="font-heading font-black text-4xl gradient-text">{value}{suffix}</div>
    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 mt-2">{label}</div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc, color = "purple" }) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6 hover:border-purple-500/40 transition-all"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
      color === "cyan" ? "bg-cyan-400/10 text-cyan-400" : "bg-purple-600/10 text-purple-400"
    }`}>
      <Icon size={20} />
    </div>
    <h3 className="font-heading font-bold text-lg mb-1.5">{title}</h3>
    <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
  </motion.div>
);

export default function LandingPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#05050A] text-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#05050A]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" data-testid="landing-logo" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center">
              <Eye size={16} />
            </div>
            <span className="font-heading font-black tracking-tight">FocusGuard <span className="text-cyan-400">AI</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-white transition" data-testid="landing-link-features">Features</a>
            <a href="#how" className="text-zinc-400 hover:text-white transition" data-testid="landing-link-how">How it works</a>
            <a href="#stats" className="text-zinc-400 hover:text-white transition" data-testid="landing-link-stats">Why us</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => nav("/dashboard")} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-5" data-testid="landing-go-dashboard-btn">
                Open Dashboard <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <>
                <Link to="/login" data-testid="landing-login-link" className="text-sm text-zinc-300 hover:text-white">Login</Link>
                <Button onClick={() => nav("/register")} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-5" data-testid="landing-cta-signup-btn">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative aurora-bg">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold mb-6"
            >
              {/* <Sparkles size={12} /> Powered by MediaPipe + Claude AI */}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[1.05]"
            >
              Protect your eyes.<br />
              <span className="gradient-text">Sharpen your focus.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-lg text-zinc-400 mt-6 max-w-xl leading-relaxed"
            >
              FocusGuard AI uses real-time facial tracking to monitor your blink rate, detect digital eye strain, and automatically alert you via Telegram, Email, and Sheets through n8n.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <Button
                onClick={() => nav(user ? "/dashboard" : "/register")}
                size="lg"
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-7 h-12 text-base glow-purple"
                data-testid="hero-primary-cta"
              >
                Start Free Session <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button
                onClick={() => nav("/live")}
                size="lg"
                variant="outline"
                className="rounded-full border-white/15 bg-white/[0.03] hover:bg-white/[0.06] text-white h-12 px-7"
                data-testid="hero-secondary-cta"
              >
                <Activity size={18} className="mr-2" /> Live Demo
              </Button>
            </motion.div>
            <div className="flex items-center gap-6 mt-10 text-xs text-zinc-500">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> No install required</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400" /> Privacy-first (browser-only AI)</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="relative rounded-2xl border border-white/10 bg-[#0C0C14] p-1 overflow-hidden float-soft">
              <div className="absolute inset-0 pointer-events-none">
                <div className="scan-line" />
              </div>
              <div className="rounded-xl bg-gradient-to-br from-[#0C0C14] to-[#1a0d2e] aspect-[4/5] flex flex-col justify-between p-6 relative">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400 font-bold tracking-[0.2em] uppercase">● Live</span>
                    <span className="text-zinc-500">FACE_MESH_v2</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold">
                    <Eye size={12} /> HEALTHY
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest">Blinks / min</div>
                  <div className="font-heading font-black text-7xl text-glow-cyan text-cyan-300 tabular-nums">17</div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                    <div className="border border-white/5 rounded-lg p-2 bg-white/[0.02]">
                      <div className="text-zinc-500">Total</div>
                      <div className="text-white font-semibold mt-0.5">142</div>
                    </div>
                    <div className="border border-white/5 rounded-lg p-2 bg-white/[0.02]">
                      <div className="text-zinc-500">EAR</div>
                      <div className="text-white font-semibold mt-0.5">0.31</div>
                    </div>
                    <div className="border border-white/5 rounded-lg p-2 bg-white/[0.02]">
                      <div className="text-zinc-500">Time</div>
                      <div className="text-white font-semibold mt-0.5">12:04</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat value="50" suffix="%" label="Average eye-strain reduction" />
            <Stat value="20-20-20" label="Built-in scientific protocol" />
            <Stat value="<100" suffix="ms" label="Real-time blink detection" />
            <Stat value="100" suffix="%" label="Privacy — runs in your browser" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">FEATURES</div>
            <h2 className="font-heading font-black text-4xl lg:text-5xl tracking-tight">
              An ecosystem for your <span className="gradient-text">eye health</span>.
            </h2>
            <p className="text-zinc-400 mt-4">From real-time tracking to fully automated reports, FocusGuard AI is engineered for developers, students and creators.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={Eye} title="MediaPipe Face Mesh" desc="468-point facial landmarks tracked at 30 FPS. EAR algorithm detects every blink with surgical precision." color="cyan" />
            <FeatureCard icon={Bell} title="n8n Automation Engine" desc="Webhook-driven Telegram alerts, Gmail reports & Google Sheets logging. Plug your workflow JSON, done." />
            <FeatureCard icon={Brain} title="AI Recommendations" desc="Claude Sonnet generates personalized eye-health tips based on your real session patterns." color="cyan" />
            <FeatureCard icon={BarChart3} title="Deep Analytics" desc="Daily, weekly and monthly trends. Productivity & eye-health scores. Beautiful dashboards." />
            <FeatureCard icon={Zap} title="Smart Break Reminders" desc="The 20-20-20 rule, automated. Sound, desktop and visual alerts when fatigue hits." color="cyan" />
            <FeatureCard icon={Shield} title="Privacy-First" desc="Webcam never leaves your device. AI inference runs locally in browser via WebAssembly." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-[#08080F] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">HOW IT WORKS</div>
            <h2 className="font-heading font-black text-4xl lg:text-5xl tracking-tight">From webcam to <span className="gradient-text">automation</span> — instantly.</h2>
            <ol className="mt-8 space-y-5">
              {[
                ["01", "Open Live Session", "Grant camera permission. MediaPipe loads in your browser."],
                ["02", "AI tracks blinks in real-time", "EAR algorithm computes blink rate every second. HUD overlays results."],
                ["03", "Alerts trigger automation", "When fatigue is detected, payload is sent to your n8n webhook."],
                ["04", "Telegram + Email + Sheets", "n8n nodes fire: instant alerts, automated reports and full logging."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-4">
                  <div className="font-heading font-black text-2xl text-purple-400/70 tabular-nums">{n}</div>
                  <div>
                    <div className="font-semibold text-base">{t}</div>
                    <div className="text-zinc-400 text-sm mt-1">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0C0C14] p-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] mb-4">
              <span className="text-cyan-400 font-bold">PAYLOAD</span>
              <span className="text-zinc-500">POST → /webhook</span>
            </div>
            <pre className="text-xs leading-relaxed text-zinc-300 bg-black/40 p-4 rounded-xl overflow-x-auto border border-white/5">
{`{
  "user_name": "Aarya",
  "user_email": "user@focusguard.ai",
  "timestamp": "2026-02-09T10:23:11Z",
  "blink_count": 120,
  "blinks_per_min": 8,
  "fatigue_status": "STRAIN DETECTED",
  "session_duration_sec": 3600,
  "alert": true
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-heading font-black text-4xl lg:text-6xl tracking-tighter">
            Ready to <span className="gradient-text">guard</span> your focus?
          </h2>
          <p className="text-zinc-400 mt-5 max-w-xl mx-auto">Join developers, students and professionals using FocusGuard AI to protect their most precious asset.</p>
          <Button
            onClick={() => nav(user ? "/dashboard" : "/register")}
            size="lg"
            className="mt-8 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 h-13 text-base glow-purple"
            data-testid="cta-bottom-btn"
          >
            Start Free <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between flex-wrap gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-cyan-400" /> FocusGuard AI © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4">
            <span>Built with React · FastAPI · MediaPipe · n8n</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
