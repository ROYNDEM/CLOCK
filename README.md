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
- **Persistent Storage**:
  - Alarms, preferences, and theme choices are automatically synced to `localStorage`.

## Getting Started

Simply open `index.html` in any modern web browser or serve locally:

```bash
# Python
python -m http.server 8080

# Or Node.js
npx serve .
```

Open [http://localhost:8080](http://localhost:8080) in your browser.
