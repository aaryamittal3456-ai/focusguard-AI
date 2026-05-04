import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { ShieldCheck, Activity, Database, Webhook, Users, Brain } from "lucide-react";

const Pill = ({ status, label }) => {
  const ok = status === "healthy" || status === true;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono ${
      ok ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/30" : "bg-red-500/10 text-red-300 border-red-500/30"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-cyan-400" : "bg-red-400"} animate-pulse`} />
      {label}
    </span>
  );
};

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [n8nStatus, setN8nStatus] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get("/admin/users").then((r) => setUsers(r.data));
    api.get("/admin/health").then((r) => setHealth(r.data));
    api.get("/admin/n8n-status").then((r) => setN8nStatus(r.data));
    api.get("/admin/sessions").then((r) => setSessions(r.data));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6" data-testid="admin-page">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold flex items-center gap-2">
            <ShieldCheck size={14} /> Admin Panel
          </div>
          <h1 className="font-heading font-black text-3xl mt-1">System control room</h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage users, monitor API health & n8n connectivity.</p>
        </div>

        {/* Health pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthCard icon={Activity} label="API" value={health?.api || "—"} status={health?.api === "healthy"} testId="health-api" />
          <HealthCard icon={Database} label="MongoDB" value={health?.mongodb || "—"} status={health?.mongodb === "healthy"} testId="health-mongo" />
          <HealthCard icon={Brain} label="LLM Key" value={health?.llm_key_configured ? "configured" : "missing"} status={health?.llm_key_configured} testId="health-llm" />
          <HealthCard icon={Webhook} label="n8n Coverage" value={n8nStatus ? `${n8nStatus.users_with_webhook}/${n8nStatus.total_users}` : "—"} status={(n8nStatus?.users_with_webhook || 0) > 0} testId="health-n8n" />
        </div>

        {/* Users table */}
        <div className="rounded-2xl border border-white/5 bg-[#0C0C14] overflow-hidden">
          <div className="p-6 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Users</div>
              <div className="font-heading font-bold text-lg flex items-center gap-2">
                <Users size={18} className="text-cyan-400" /> Registered users ({users.length})
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-users-table">
              <thead className="bg-white/[0.02] border-y border-white/5">
                <tr className="text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-right p-4">Sessions</th>
                  <th className="text-right p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4">{u.name}</td>
                    <td className="p-4 text-zinc-300">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        u.role === "admin" ? "bg-purple-600/10 text-purple-300 border-purple-500/30" : "bg-white/5 text-zinc-300 border-white/10"
                      }`}>{u.role}</span>
                    </td>
                    <td className="p-4 text-right tabular-nums">{u.session_count}</td>
                    <td className="p-4 text-right text-zinc-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent sessions across users */}
        <div className="rounded-2xl border border-white/5 bg-[#0C0C14] overflow-hidden">
          <div className="p-6 pb-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Activity</div>
            <div className="font-heading font-bold text-lg">All recent sessions</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-sessions-table">
              <thead className="bg-white/[0.02] border-y border-white/5">
                <tr className="text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Time</th>
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">BPM</th>
                  <th className="text-right p-4">n8n</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 30).map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="p-4 text-zinc-400 text-xs">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="p-4">{s.user_name}</td>
                    <td className="p-4 text-zinc-300 text-xs">{s.fatigue_status}</td>
                    <td className="p-4 text-right tabular-nums text-cyan-300">{s.blinks_per_min}</td>
                    <td className="p-4 text-right">{s.n8n_forwarded ? "●" : "○"}</td>
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

function HealthCard({ icon: Icon, label, value, status, testId }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-5" data-testid={testId}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <Pill status={status} label={status ? "OK" : "DOWN"} />
      </div>
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="font-heading font-bold text-xl mt-1">{value}</div>
    </div>
  );
}
