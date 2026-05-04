"""
FocusGuard AI - Desktop Client (reference)
==========================================
Real-time eye fatigue detection using OpenCV + MediaPipe.
Runs on the user's Windows/macOS/Linux machine. Sends session payloads
directly to your FocusGuard backend (or n8n webhook) every 60 seconds.

REQUIREMENTS (install with: pip install -r requirements.txt)
    opencv-python
    mediapipe
    numpy
    requests

ENV variables expected:
    FOCUSGUARD_API_URL   e.g. https://your-host/api/sessions
    FOCUSGUARD_TOKEN     Bearer token (from /api/auth/login response cookie or refresh)
    FOCUSGUARD_USER      Display name
    FOCUSGUARD_EMAIL     Email associated with account

NOTE: This file is provided as a reference. It does NOT run inside the
container — it requires a real webcam.
"""
import os
import time
import math
import threading
from datetime import datetime, timezone

import cv2
import numpy as np
import mediapipe as mp
import requests

API_URL = os.environ.get("FOCUSGUARD_API_URL", "http://localhost:8001/api/sessions")
TOKEN = os.environ.get("FOCUSGUARD_TOKEN", "")
USER_NAME = os.environ.get("FOCUSGUARD_USER", "Aarya")
USER_EMAIL = os.environ.get("FOCUSGUARD_EMAIL", "user@example.com")

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
EAR_THRESHOLD = 0.21
EAR_CONSEC = 2
REPORT_INTERVAL_SEC = 60


def euclidean(p1, p2):
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def eye_aspect_ratio(landmarks, eye_idx, w, h):
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_idx]
    A = euclidean(pts[1], pts[5])
    B = euclidean(pts[2], pts[4])
    C = euclidean(pts[0], pts[3])
    return (A + B) / (2.0 * C)


def classify(bpm):
    if bpm < 8:
        return "STRAIN DETECTED"
    if bpm < 12:
        return "LOW BLINK RATE"
    return "HEALTHY"


def report_session(blink_count, bpm, status, duration_sec):
    payload = {
        "blink_count": blink_count,
        "blinks_per_min": bpm,
        "fatigue_status": status,
        "session_duration_sec": int(duration_sec),
        "alert": status != "HEALTHY",
    }
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
    try:
        r = requests.post(API_URL, json=payload, headers=headers, timeout=8)
        print(f"[{datetime.now(timezone.utc).isoformat()}] reported {status} bpm={bpm} -> {r.status_code}")
    except Exception as e:
        print(f"report failed: {e}")


def main():
    cap = cv2.VideoCapture(0)
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=False,
                                     min_detection_confidence=0.5, min_tracking_confidence=0.5)

    blink_counter = 0
    consec = 0
    blink_timestamps = []
    session_start = time.time()
    last_report = session_start

    print("FocusGuard desktop client running. Press Q to quit.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if results.multi_face_landmarks:
            lm = results.multi_face_landmarks[0].landmark
            l_ear = eye_aspect_ratio(lm, LEFT_EYE, w, h)
            r_ear = eye_aspect_ratio(lm, RIGHT_EYE, w, h)
            avg_ear = (l_ear + r_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                consec += 1
            else:
                if consec >= EAR_CONSEC:
                    blink_counter += 1
                    blink_timestamps.append(time.time())
                consec = 0

            now = time.time()
            blink_timestamps = [t for t in blink_timestamps if now - t < 60]
            elapsed = now - session_start
            bpm = len(blink_timestamps) if elapsed >= 60 else int((len(blink_timestamps) / max(elapsed, 1)) * 60)
            status = classify(bpm)

            cv2.putText(frame, f"Blinks: {blink_counter}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 229, 255), 2)
            cv2.putText(frame, f"BPM: {bpm}  EAR: {avg_ear:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 229, 255), 2)
            cv2.putText(frame, f"Status: {status}", (10, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (138, 43, 226), 2)

            if now - last_report >= REPORT_INTERVAL_SEC:
                threading.Thread(target=report_session,
                                 args=(blink_counter, bpm, status, elapsed),
                                 daemon=True).start()
                last_report = now

        cv2.imshow("FocusGuard AI", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
