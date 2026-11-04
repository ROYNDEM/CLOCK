# CHRONOS • Dual Analog & Digital Clock with Smart Alarms

A modern, high-precision dual analog and digital clock web application with multiple alarm scheduling, snooze capabilities, and zero-dependency procedural audio synthesized in real time via the Web Audio API.

## Features

- **Dual Clock System**:
  - **Swiss-Style Analog Clock**: High-precision SVG dial with 60 tick marks, luminous baton indices, and a fluid 60 FPS sweeping second hand. Includes an analog bezel marker indicating upcoming alarm targets.
  - **Precision Digital Clock**: Large glowing typography with hours, minutes, seconds, milliseconds, date, seconds progress bar, and 12H/24H format toggle.
- **View Modes**:
  - **Dual View**: Both analog and digital clocks side by side.
  - **Analog Focus**: Dedicated analog timepiece view.
  - **Digital Focus**: Prominent digital clock view.
- **Visual Themes**:
  - Midnight Obsidian
  - Cyber Neon
  - Aurora Emerald
  - Minimal Pearl
- **Multi-Alarm Scheduling**:
  - Set unlimited alarms with custom titles.
  - Repeat options: Once, Daily, Weekdays, Weekends, or specific days of the week.
  - Quick nap presets (`+10m`, `+20m`, `+30m`, `+45m`, `+1h`).
  - Active/inactive toggle switches.
  - Live countdown to the next upcoming alarm.
- **8 Synthesized Procedural Alarm Tones (Web Audio API)**:
  - 🔔 Classic Mechanical Bell
  - ⏰ Retro Digital Watch Beep
  - ✨ Crystal Singing Chime
  - 🎵 Marimba Sunshine
  - 🚀 Cosmic Radar Pulse
  - 🎼 Soothing Acoustic Harp
  - ⚡ Energetic Siren
  - 🐦 Forest Birdsong
  - Tone preview and volume control.
- **Ringing Alert Screen**:
  - Fullscreen modal with animated radar ripples and shaking bell indicator.
  - Snooze (5m, 10m, 15m, 20m) and Dismiss/Stop controls.
  - Keyboard shortcuts (<kbd>Space</kbd> or <kbd>Esc</kbd> to stop, <kbd>S</kbd> to snooze).
  - Web Notification API and vibration support.
- **True Always-On-Top Desktop Popups (Electron App)**:
  - Displays over any full-screen game, PowerPoint presentation, Zoom call, or code editor.
  - Windows System Tray integration with minimize-to-tray background monitoring.
  - Dedicated floating always-on-top alarm alert card on the active screen.
  - Taskbar flashing and native Windows OS notifications.
  - Pinned "Always-On-Top" toggle button right on the header toolbar.
- **PWA & Web Notification Support**:
  - `manifest.json` + `sw.js` (Service Worker) for installable PWA behavior and notification click focus.
  - `documentPictureInPicture` floating mini-timer fallback for modern browsers.
- **Persistent Storage**:
  - Alarms, preferences, and theme choices are automatically synced to `localStorage`.

---

## How to Run Chronos

### Option 1: True Always-On-Top Desktop App (Recommended)
This displays alarms **over any screen, app, or game** even when minimized or working in other windows:

```cmd
# Method A: Double-click launcher
Double-click Launch-Chronos-Desktop.bat

# Method B: Command Line
npm start
# or
npm run app
```

Features in Desktop Mode:
1. **Always-On-Top Alert**: Rings with a floating, glowing alert card directly on your active monitor.
2. **System Tray**: Minimizing Chronos hides it quietly in the Windows system tray while alarms stay 100% active.
3. **Pin Window**: Click the **"📌 On Top"** button in the header toolbar to pin the entire clock on top while working.

---

### Option 2: Local Web Server (Browser Mode)
If you prefer running inside Chrome, Edge, or Firefox:

```cmd
# Method A: Double-click launcher
Double-click Launch-Meeting-Clock.bat

# Method B: Command Line
npm run web
# or
python -m http.server 8080
```

Then open **http://localhost:8080** in your browser and click **"Enable Desktop Popups"**.
You can also click **"📌 Floating Timer (Always On Top)"** to keep a live Picture-in-Picture window visible over other apps.
