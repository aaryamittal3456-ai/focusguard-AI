import React, { useEffect, useRef, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Eye, Play, StopCircle, AlertTriangle, Camera, CameraOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Eye landmark indices for MediaPipe Face Mesh (refined: 478)
// Using 6-point EAR layout (p1..p6): horizontal corners + 2 top + 2 bottom
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// EAR uses Euclidean distance — MediaPipe gives normalized [0,1] coords on each axis.
// Because video is wider than tall, we MUST scale by width/height to get a metric distance.
function ear(landmarks, idx, w, h) {
  const p = idx.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));
  const A = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
  const B = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
  const C = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
  return (A + B) / (2.0 * C);
}

// Defaults — calibrated dynamically after a 3-second warmup.
const DEFAULT_EAR_THRESHOLD = 0.21;
const EAR_CLOSE_RATIO = 0.78;     // threshold = baseline * 0.78 (eyes closing drops EAR ~25%)
const EAR_CONSEC_FRAMES = 2;       // ~66ms at 30fps — typical blink is 100-400ms
const CALIBRATION_MS = 3000;

function classify(blinks_per_min) {
  if (blinks_per_min < 8) return "STRAIN DETECTED";
  if (blinks_per_min < 12) return "LOW BLINK RATE";
  return "HEALTHY";
}

const STATUS_STYLE = {
  "HEALTHY": "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  "LOW BLINK RATE": "bg-orange-400/10 text-orange-300 border-orange-400/30",
  "STRAIN DETECTED": "bg-red-500/10 text-red-300 border-red-500/30 pulse-strain",
  "INITIALIZING": "bg-zinc-700/30 text-zinc-400 border-white/10",
};

export default function LiveSessionPage() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const blinkStateRef = useRef({ counter: 0, blinks: 0, lastEAR: 0, threshold: DEFAULT_EAR_THRESHOLD, baselineSamples: [], baselineEAR: 0, calibrated: false });
  const sessionStartRef = useRef(null);
  const lastBlinkArrayRef = useRef([]); // timestamps of blinks for blinks-per-minute calc
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);
  const lastAlertRef = useRef(0); // timestamp of last live alert sent
  const webhookUrlRef = useRef(""); // n8n webhook URL fetched at session start

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("INITIALIZING");
  const [metrics, setMetrics] = useState({ blinks: 0, bpm: 0, ear: 0, threshold: 0, elapsed: 0, calibrated: false });
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Load MediaPipe scripts dynamically
  useEffect(() => {
    if (window.FaceMesh && window.Camera) { setMediapipeLoaded(true); return; }
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
      "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
      "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
    ];
    const tags = scripts.map((src) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      document.body.appendChild(s);
      return s;
    });
    let loaded = 0;
    const onLoad = () => { loaded += 1; if (loaded === scripts.length) setMediapipeLoaded(true); };
    tags.forEach((t) => t.addEventListener("load", onLoad));
    return () => tags.forEach((t) => t.removeEventListener("load", onLoad));
  }, []);

  const drawMesh = useCallback((landmarks) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw eye contours
    [LEFT_EYE, RIGHT_EYE].forEach((idx) => {
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00E5FF";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      idx.forEach((i, k) => {
        const p = landmarks[i];
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    });

    // Sparse mesh dots
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(138,43,226,0.5)";
    for (let i = 0; i < landmarks.length; i += 8) {
      const p = landmarks[i];
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const onResults = useCallback((results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const lm = results.multiFaceLandmarks[0];
    drawMesh(lm);

    const video = videoRef.current;
    const w = video?.videoWidth || 640;
    const h = video?.videoHeight || 480;

    const lEAR = ear(lm, LEFT_EYE, w, h);
    const rEAR = ear(lm, RIGHT_EYE, w, h);
    const avgEAR = (lEAR + rEAR) / 2.0;
    const state = blinkStateRef.current;
    state.lastEAR = avgEAR;

    // Calibration: collect baseline EAR (eyes-open) for first 3 seconds
    if (!state.calibrated) {
      const elapsed = Date.now() - (sessionStartRef.current || Date.now());
      if (elapsed < CALIBRATION_MS) {
        state.baselineSamples.push(avgEAR);
        return;
      }
      // Use median of upper half (filters out any unintended closures during calibration)
      const sorted = [...state.baselineSamples].sort((a, b) => a - b);
      const upperHalf = sorted.slice(Math.floor(sorted.length / 2));
      const baseline = upperHalf.length ? upperHalf.reduce((s, v) => s + v, 0) / upperHalf.length : 0.3;
      state.baselineEAR = baseline;
      state.threshold = Math.max(0.15, Math.min(0.28, baseline * EAR_CLOSE_RATIO));
      state.calibrated = true;
    }

    // Blink detection vs. calibrated threshold
    if (avgEAR < state.threshold) {
      state.counter += 1;
    } else {
      if (state.counter >= EAR_CONSEC_FRAMES) {
        state.blinks += 1;
        lastBlinkArrayRef.current.push(Date.now());
      }
      state.counter = 0;
    }
  }, [drawMesh]);

  const start = async () => {
    if (!mediapipeLoaded) {
      toast.error("MediaPipe still loading, try again in a sec.");
      return;
    }
    setCameraError("");
    submittedRef.current = false;
    // Fetch n8n webhook URL once at session start
    try {
      const r = await api.get("/settings");
      webhookUrlRef.current = r.data.n8n_webhook_url || "";
    } catch {}
    blinkStateRef.current = { counter: 0, blinks: 0, lastEAR: 0, threshold: DEFAULT_EAR_THRESHOLD, baselineSamples: [], baselineEAR: 0, calibrated: false };
    lastBlinkArrayRef.current = [];
    sessionStartRef.current = Date.now();
    setStatus("INITIALIZING");
    setMetrics({ blinks: 0, bpm: 0, ear: 0, threshold: 0, elapsed: 0, calibrated: false });

    try {
      const FaceMesh = window.FaceMesh;
      const Camera = window.Camera;
      const fm = new FaceMesh({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      fm.setOptions({
        maxNumFaces: 1, refineLandmarks: true,
        minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      fm.onResults(onResults);
      faceMeshRef.current = fm;

      const cam = new Camera(videoRef.current, {
        onFrame: async () => { if (videoRef.current) await fm.send({ image: videoRef.current }); },
        width: 640, height: 480,
      });
      await cam.start();
      cameraRef.current = cam;
      setRunning(true);
      toast.success("Live session started");

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartRef.current) / 1000);
        // blinks per min based on last 60 sec
        lastBlinkArrayRef.current = lastBlinkArrayRef.current.filter((t) => now - t < 60000);
        const calibrated = blinkStateRef.current.calibrated;
        // After calibration window, extrapolate from elapsed-since-calibration to avoid undercounting
        let bpm = 0;
        if (calibrated) {
          const trackingSec = Math.max(1, elapsed - Math.ceil(CALIBRATION_MS / 1000));
          bpm = trackingSec < 60
            ? Math.round((lastBlinkArrayRef.current.length / trackingSec) * 60)
            : lastBlinkArrayRef.current.length;
        }
        const newStatus = !calibrated ? "INITIALIZING" : classify(bpm);
        setStatus(newStatus);
        // Real-time alert: notify n8n if strain/low blinks, max once per 2 minutes
        if (calibrated && newStatus !== "HEALTHY") {
          const now2 = Date.now();
          if (now2 - lastAlertRef.current > 60 * 1000) {
            lastAlertRef.current = now2;
            // Call n8n directly from browser — no backend needed
            const wUrl = webhookUrlRef.current;
            if (wUrl) {
              fetch(wUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_name: user?.name || "FocusGuard User",
                  fatigue_status: newStatus,
                  blinks_per_min: bpm,
                  elapsed_sec: elapsed,
                  alert: true,
                  blink_count: blinkStateRef.current.blinks,
                  session_duration_sec: elapsed,
                  timestamp: new Date().toISOString(),
                }),
              }).catch(() => {});
            }
          }
        }
        setMetrics({
          blinks: blinkStateRef.current.blinks,
          bpm,
          ear: blinkStateRef.current.lastEAR.toFixed(3),
          threshold: blinkStateRef.current.threshold.toFixed(3),
          elapsed,
          calibrated,
        });
      }, 500);
    } catch (e) {
      console.error(e);
      setCameraError(e.message || "Could not access webcam. Please grant permission.");
      toast.error("Webcam access failed");
    }
  };

  const stop = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    try { cameraRef.current?.stop?.(); } catch {}
    try { faceMeshRef.current?.close?.(); } catch {}
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setRunning(false);

    if (submittedRef.current) return;
    submittedRef.current = true;
    const elapsed = Math.floor((Date.now() - (sessionStartRef.current || Date.now())) / 1000);
    if (elapsed < 5) { toast("Session too short to save"); return; }
    const finalStatus = classify(metrics.bpm);
    try {
      const { data } = await api.post("/sessions", {
        blink_count: blinkStateRef.current.blinks,
        blinks_per_min: metrics.bpm,
        fatigue_status: finalStatus,
        session_duration_sec: elapsed,
        alert: finalStatus !== "HEALTHY",
        avg_ear: parseFloat(metrics.ear),
      });
      toast.success(`Session saved${data.n8n_forwarded ? " · n8n notified" : ""}`);
    } catch (e) {
      toast.error("Failed to save session");
    }
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { cameraRef.current?.stop?.(); } catch {}
    try { faceMeshRef.current?.close?.(); } catch {}
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="space-y-6" data-testid="live-session-page">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold">Live Session</div>
            <h1 className="font-heading font-black text-3xl mt-1">Real-time eye tracking</h1>
            <p className="text-zinc-400 mt-1 text-sm">MediaPipe Face Mesh · 468 landmarks · EAR algorithm</p>
          </div>
          <div className="flex gap-2">
            {!running ? (
              <Button onClick={start} className="bg-purple-600 hover:bg-purple-500 rounded-full px-6 glow-purple" data-testid="live-start-btn">
                <Play size={16} className="mr-2" /> Start session
              </Button>
            ) : (
              <Button onClick={stop} className="bg-red-500 hover:bg-red-400 rounded-full px-6" data-testid="live-stop-btn">
                <StopCircle size={16} className="mr-2" /> Stop & save
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 relative rounded-2xl border border-white/10 bg-[#0C0C14] overflow-hidden gradient-border">
            <div className="absolute inset-0 pointer-events-none">
              {running && <div className="scan-line" />}
            </div>
            <div className="relative aspect-video bg-black">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted data-testid="webcam-video" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-purple-600/10 border border-purple-500/30 flex items-center justify-center">
                      {cameraError ? <CameraOff size={28} className="text-red-400" /> : <Camera size={28} className="text-purple-400" />}
                    </div>
                    <div className="font-heading font-bold text-lg">{cameraError ? "Webcam unavailable" : "Camera idle"}</div>
                    <div className="text-zinc-400 text-sm max-w-sm mx-auto">
                      {cameraError || `Click "Start session" to begin real-time blink detection. ${mediapipeLoaded ? "" : "Loading MediaPipe model..."}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* HUD overlay top */}
            {running && (
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
                <div className={`px-3 py-1.5 rounded-full border text-xs font-bold tracking-wider ${STATUS_STYLE[status]}`} data-testid="hud-status">
                  ● {status}
                </div>
                <div className="px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur text-xs font-mono" data-testid="hud-timer">
                  {fmtTime(metrics.elapsed)}
                </div>
              </div>
            )}
          </div>

          {/* Metrics panel */}
          <div className="rounded-2xl border border-white/5 bg-[#0C0C14] p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold mb-4">SESSION METRICS</div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-4 py-3 rounded-xl border mb-5 ${STATUS_STYLE[status]}`}
              >
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-70">Status</div>
                <div className="font-heading font-bold text-base mt-1">{status}</div>
              </motion.div>
            </AnimatePresence>

            <div className="space-y-4">
              <Metric label="Total blinks" value={metrics.blinks} testId="metric-blinks" />
              <Metric label="Blinks per minute" value={metrics.bpm} accent testId="metric-bpm" />
              <Metric label="Eye Aspect Ratio" value={metrics.ear} testId="metric-ear" />
              <Metric label="Threshold (auto)" value={metrics.calibrated ? metrics.threshold : "calibrating…"} testId="metric-threshold" />
              <Metric label="Session duration" value={fmtTime(metrics.elapsed)} testId="metric-duration" />
            </div>

            {status === "STRAIN DETECTED" && (
              <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>Eye strain detected. Look 20 feet away for 20 seconds. Consider taking a break.</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Tip: For best results, sit ~50cm from the camera in well-lit conditions. The first 3 seconds auto-calibrate the blink threshold to your face — keep your eyes open and look at the camera during this time.
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, accent = false, testId }) {
  return (
    <div className="flex items-center justify-between" data-testid={testId}>
      <div className="text-xs text-zinc-400 uppercase tracking-wider">{label}</div>
      <div className={`font-heading font-black text-2xl tabular-nums ${accent ? "text-cyan-300 text-glow-cyan" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}