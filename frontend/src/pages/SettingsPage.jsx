import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Webhook, MessageCircle, Bell, Save, TestTube2, Volume2, Bell as BellIcon, Moon } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setS(r.data));
  }, []);

  if (!s) return <AppShell><div className="text-zinc-400">Loading settings…</div></AppShell>;

  const update = (k, v) => setS((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/settings", s);
      setS(data);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/settings/test-webhook");
      toast.success(data.success ? "Webhook responded successfully" : "Webhook returned error");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Webhook test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl" data-testid="settings-page">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold">Settings</div>
          <h1 className="font-heading font-black text-3xl mt-1">Customize your experience</h1>
        </div>

        {/* n8n Section */}
        <Section icon={Webhook} title="n8n Automation" subtitle="Connect your workflow webhook to receive Telegram, Email & Sheets alerts.">
          <div className="space-y-4">
            <Field label="n8n Webhook URL">
              <Input
                value={s.n8n_webhook_url || ""}
                onChange={(e) => update("n8n_webhook_url", e.target.value)}
                placeholder="https://your-n8n.example.com/webhook/d6d71ed0-9a99-46e7-bbd6-456945ae71ca"
                className="bg-[#0A0A12] border-white/10 text-white"
                data-testid="settings-webhook-input"
              />
            </Field>
            <Button onClick={test} disabled={testing || !s.n8n_webhook_url}
              variant="outline" className="border-white/10 bg-white/[0.03] rounded-full" data-testid="settings-test-webhook-btn">
              <TestTube2 size={14} className="mr-2" /> {testing ? "Testing…" : "Test webhook"}
            </Button>
          </div>
        </Section>

        {/* Telegram (used by n8n) */}
        <Section icon={MessageCircle} title="Telegram (optional reference)" subtitle="Stored for reference. Actual Telegram credentials live in n8n.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Bot Token">
              <Input value={s.telegram_bot_token || ""} onChange={(e) => update("telegram_bot_token", e.target.value)}
                placeholder="123456:ABC..." className="bg-[#0A0A12] border-white/10 text-white" data-testid="settings-telegram-token" />
            </Field>
            <Field label="Chat ID">
              <Input value={s.telegram_chat_id || ""} onChange={(e) => update("telegram_chat_id", e.target.value)}
                placeholder="5630167675" className="bg-[#0A0A12] border-white/10 text-white" data-testid="settings-telegram-chat" />
            </Field>
          </div>
        </Section>

        {/* Thresholds */}
        <Section icon={Bell} title="Alert thresholds" subtitle="Calibrate when FocusGuard considers you fatigued.">
          <div className="space-y-6">
            <SliderField label="LOW BLINK RATE — below (blinks/min)" value={s.blink_threshold_low}
              onChange={(v) => update("blink_threshold_low", v)} min={5} max={20} testId="settings-threshold-low" />
            <SliderField label="STRAIN DETECTED — below (blinks/min)" value={s.blink_threshold_strain}
              onChange={(v) => update("blink_threshold_strain", v)} min={3} max={15} testId="settings-threshold-strain" />
            <SliderField label="Break reminder (minutes)" value={s.break_reminder_minutes}
              onChange={(v) => update("break_reminder_minutes", v)} min={5} max={60} testId="settings-break-minutes" />
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={BellIcon} title="Notifications & UI" subtitle="">
          <div className="space-y-4">
            <ToggleField label="Sound alerts" icon={Volume2} value={s.sound_alerts} onChange={(v) => update("sound_alerts", v)} testId="settings-sound" />
            <ToggleField label="Desktop notifications" icon={BellIcon} value={s.desktop_notifications} onChange={(v) => update("desktop_notifications", v)} testId="settings-desktop" />
            <ToggleField label="Dark mode" icon={Moon} value={s.dark_mode} onChange={(v) => update("dark_mode", v)} testId="settings-darkmode" />
          </div>
        </Section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 rounded-full px-7 glow-purple" data-testid="settings-save-btn">
            <Save size={16} className="mr-2" /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <div className="font-heading font-bold text-lg">{title}</div>
          {subtitle && <div className="text-zinc-400 text-sm mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-zinc-300 text-xs uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, testId }) {
  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-zinc-300 text-xs uppercase tracking-wider">{label}</Label>
        <span className="font-heading font-bold text-cyan-400 tabular-nums">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function ToggleField({ label, icon: Icon, value, onChange, testId }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-cyan-400" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={!!value} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}