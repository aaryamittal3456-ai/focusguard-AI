import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend
} from "recharts";
import jsPDF from "jspdf";

const STATUS_BADGE = {
  "HEALTHY": "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  "LOW BLINK RATE": "bg-orange-400/10 text-orange-300 border-orange-400/30",
  "STRAIN DETECTED": "bg-red-500/10 text-red-300 border-red-500/30",
  "TEST": "bg-zinc-500/10 text-zinc-300 border-white/10",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get("/sessions/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/sessions").then((r) => setSessions(r.data)).catch(() => {});
  }, []);

  const exportCSV = () => {
    const header = ["Timestamp", "Status", "Blinks", "Blinks/min", "Duration (s)", "Alert"];
    const rows = sessions.map((s) => [s.timestamp, s.fatigue_status, s.blink_count, s.blinks_per_min, s.session_duration_sec, s.alert]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "focusguard_sessions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(138, 43, 226);
    doc.text("FocusGuard AI - Analytics Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Productivity Score: ${stats?.productivity_score ?? 0}/100`, 14, 42);
    doc.text(`Eye Health Score: ${stats?.eye_health_score ?? 0}/100`, 14, 50);
    doc.text(`Total Sessions: ${stats?.total_sessions ?? 0}`, 14, 58);

    doc.setFontSize(13);
    doc.text("Recent Sessions", 14, 72);
    doc.setFontSize(9);
    let y = 80;
    doc.text("Timestamp", 14, y);
    doc.text("Status", 80, y);
    doc.text("Blinks", 130, y);
    doc.text("BPM", 155, y);
    doc.text("Duration", 175, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 6;

    sessions.slice(0, 25).forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(new Date(s.timestamp).toLocaleString().slice(0, 18), 14, y);
      doc.text(s.fatigue_status.slice(0, 18), 80, y);
      doc.text(String(s.blink_count), 130, y);
      doc.text(String(s.blinks_per_min), 155, y);
      doc.text(`${s.session_duration_sec}s`, 175, y);
      y += 6;
    });
    doc.save("focusguard_report.pdf");
  };

  return (
    <AppShell>
      <div className="space-y-6" data-testid="analytics-page">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold">Analytics</div>
            <h1 className="font-heading font-black text-3xl mt-1">Your eye-health analytics</h1>
            <p className="text-zinc-400 mt-1 text-sm">{sessions.length} total sessions tracked</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}
              className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] rounded-full" data-testid="export-csv-btn">
              <Download size={14} className="mr-2" /> CSV
            </Button>
            <Button onClick={exportPDF} className="bg-purple-600 hover:bg-purple-500 rounded-full" data-testid="export-pdf-btn">
              <FileText size={14} className="mr-2" /> PDF Report
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Last 7 days</div>
            <div className="font-heading font-bold text-lg mb-4">Total minutes tracked</div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={stats?.daily || []}>
                  <defs>
                    <linearGradient id="gradMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" />
                      <stop offset="100%" stopColor="#8A2BE2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white" }} />
                  <Bar dataKey="minutes" fill="url(#gradMinutes)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Last 7 days</div>
            <div className="font-heading font-bold text-lg mb-4">Blinks/min vs Alerts</div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={stats?.daily || []}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white" }} />
                  <Legend wrapperStyle={{ color: "white", fontSize: 12 }} />
                  <Line type="monotone" dataKey="avg_bpm" stroke="#00E5FF" strokeWidth={3} dot={{ fill: "#00E5FF", r: 4 }} />
                  <Line type="monotone" dataKey="alerts" stroke="#FF3366" strokeWidth={2} dot={{ fill: "#FF3366", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0C0C14] overflow-hidden">
          <div className="p-6 pb-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Logs</div>
            <div className="font-heading font-bold text-lg">Session history</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="sessions-table">
              <thead className="bg-white/[0.02] border-y border-white/5">
                <tr className="text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Blinks</th>
                  <th className="text-right p-4">BPM</th>
                  <th className="text-right p-4">Duration</th>
                  <th className="text-right p-4">n8n</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-zinc-500">No sessions yet. Start your first live session!</td></tr>
                )}
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 text-zinc-300">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE[s.fatigue_status] || "bg-white/5 border-white/10 text-white"}`}>
                        {s.fatigue_status}
                      </span>
                    </td>
                    <td className="p-4 text-right tabular-nums">{s.blink_count}</td>
                    <td className="p-4 text-right tabular-nums text-cyan-300">{s.blinks_per_min}</td>
                    <td className="p-4 text-right tabular-nums">{Math.round(s.session_duration_sec / 60)}m {s.session_duration_sec % 60}s</td>
                    <td className="p-4 text-right">
                      {s.n8n_forwarded ? (
                        <span className="text-xs text-cyan-400">●</span>
                      ) : (
                        <span className="text-xs text-zinc-600">○</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
