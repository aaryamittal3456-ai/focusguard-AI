import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Eye, Activity, Zap, Clock, Sparkles, Brain, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid,
} from "recharts";

const StatCard = ({ icon: Icon, label, value, sub, color = "purple", testId }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rounded-2xl border border-white/5 bg-[#0C0C14] p-5 transition-all hover:border-purple-500/30"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        color === "cyan" ? "bg-cyan-400/10 text-cyan-400" : "bg-purple-600/10 text-purple-400"
      }`}>
        <Icon size={18} />
      </div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{sub}</div>
    </div>
    <div className="mt-5">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</div>
      <div className={`font-heading font-black text-3xl tabular-nums ${color === "cyan" ? "text-cyan-300 text-glow-cyan" : "text-white"}`}>
        {value}
      </div>
    </div>
  </motion.div>
);

const ScoreRing = ({ score, label, color, testId }) => {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6 flex items-center gap-5" data-testid={testId}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="76" textAnchor="middle" fill="white" fontSize="28" fontWeight="800" fontFamily="Outfit">{score}</text>
      </svg>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</div>
        <div className="font-heading font-bold text-lg">Out of 100</div>
        <div className="text-sm text-zinc-400 mt-1">{score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs improvement"}</div>
      </div>
    </div>
  );
};

const STATUS_COLORS = { "HEALTHY": "#00E5FF", "LOW BLINK RATE": "#FF9F0A", "STRAIN DETECTED": "#FF3366" };

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    api.get("/sessions/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const loadRecs = async () => {
    setLoadingRecs(true);
    try {
      const { data } = await api.post("/ai/recommendations", {
        recent_status: stats?.status_distribution?.[0]?.name || "HEALTHY",
        avg_blinks_per_min: stats?.today?.avg_blinks_per_min || 15,
        total_session_minutes: stats?.today?.total_minutes || 30,
      });
      setRecs(data.recommendations);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold">Dashboard</div>
            <h1 className="font-heading font-black text-3xl lg:text-4xl mt-1">
              Welcome, <span className="gradient-text">{user?.name}</span>
            </h1>
            <p className="text-zinc-400 mt-1.5">Here's a snapshot of your eye-health today.</p>
          </div>
          <Link to="/live">
            <Button className="bg-purple-600 hover:bg-purple-500 rounded-full px-6 glow-purple" data-testid="dashboard-start-session-btn">
              <Activity size={16} className="mr-2" /> Start Live Session
            </Button>
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Eye} label="Blinks Today" value={stats?.today?.total_blinks ?? "—"} sub="TODAY" testId="stat-blinks-today" />
          <StatCard icon={Activity} label="Avg Blinks/min" value={stats?.today?.avg_blinks_per_min ?? "—"} sub="TODAY" color="cyan" testId="stat-bpm-today" />
          <StatCard icon={Clock} label="Minutes Tracked" value={stats?.today?.total_minutes ?? "—"} sub="TODAY" testId="stat-minutes-today" />
          <StatCard icon={Zap} label="Alerts Triggered" value={stats?.today?.alerts ?? "—"} sub="TODAY" color="cyan" testId="stat-alerts-today" />
        </div>

        {/* Scores */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ScoreRing score={stats?.productivity_score ?? 0} label="Productivity Score" color="#8A2BE2" testId="score-productivity" />
          <ScoreRing score={stats?.eye_health_score ?? 0} label="Eye Health Score" color="#00E5FF" testId="score-eye-health" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0C0C14] p-6" data-testid="chart-weekly">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Last 7 days</div>
                <div className="font-heading font-bold text-lg">Daily blink trend</div>
              </div>
              <div className="text-xs text-cyan-400">● Total Blinks</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.daily || []}>
                  <defs>
                    <linearGradient id="gradBlinks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8A2BE2" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white" }} />
                  <Area type="monotone" dataKey="blinks" stroke="#8A2BE2" strokeWidth={2} fill="url(#gradBlinks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6" data-testid="chart-status">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Last 30 days</div>
            <div className="font-heading font-bold text-lg mb-4">Fatigue distribution</div>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats?.status_distribution || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {(stats?.status_distribution || []).map((d, i) => (
                      <Cell key={i} fill={STATUS_COLORS[d.name] || "#8A2BE2"} stroke="rgba(0,0,0,0.4)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              {(stats?.status_distribution || []).map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[d.name] }} />
                    <span className="text-zinc-300">{d.name}</span>
                  </div>
                  <span className="text-zinc-400 tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0C0C14] to-[#160c2c] p-6" data-testid="ai-recommendations-panel">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center">
                <Brain size={18} />
              </div>
              <div>
                {/* <div className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">AI Coach · Claude Sonnet 4.5</div> */}
                <div className="font-heading font-bold text-lg">Personalized recommendations</div>
              </div>
            </div>
            <Button onClick={loadRecs} disabled={loadingRecs}
              className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white"
              data-testid="ai-recs-generate-btn">
              <Sparkles size={14} className="mr-2" /> {loadingRecs ? "Thinking..." : recs ? "Refresh" : "Generate"}
            </Button>
          </div>
          {recs ? (
            <ul className="grid md:grid-cols-2 gap-3">
              {recs.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <ChevronRight size={16} className="text-cyan-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-zinc-200 leading-relaxed">{r}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-400">Click "Generate" to get personalized eye-health tips powered by Claude AI based on your recent sessions.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
