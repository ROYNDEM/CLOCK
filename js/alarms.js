/**
 * CHRONOS ALARM MANAGER
 * Handles multiple alarms, persistence, scheduling, snooze, dismiss, and UI list rendering.
 */

class ChronosAlarmManager {
  constructor() {
    this.alarms = this.loadAlarms();
    this.activeRingingAlarm = null;
    this.checkIntervalId = null;

    // DOM Elements
    this.alarmsList = document.getElementById('alarmsList');
    this.noAlarmsPlaceholder = document.getElementById('noAlarmsPlaceholder');
    this.totalAlarmsCount = document.getElementById('totalAlarmsCount');
    this.activeAlarmsCount = document.getElementById('activeAlarmsCount');
    this.inactiveAlarmsCount = document.getElementById('inactiveAlarmsCount');
    this.nextAlarmStatus = document.getElementById('nextAlarmStatus');
    this.nextAlarmCountdown = document.getElementById('nextAlarmCountdown');

    // Ringing Modal Elements
    this.ringingModal = document.getElementById('ringingModal');
    this.ringingTitle = document.getElementById('ringingTitle');
    this.ringingLabel = document.getElementById('ringingLabel');
    this.ringingToneName = document.getElementById('ringingToneName');
    this.snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');
    this.snoozeBtnLabel = document.getElementById('snoozeBtnLabel');
    this.dismissAlarmBtn = document.getElementById('dismissAlarmBtn');

    this.initEventListeners();
    this.render();
    this.startChecker();
  }

  loadAlarms() {
    const saved = localStorage.getItem('chronos_alarms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved alarms', e);
      }
    }

    // Default starter alarms if none exist
    return [
      {
        id: 'alarm_default_1',
        time: '07:30',
        label: 'Morning Awakening',
        tone: 'crystal-chime',
        volume: 85,
        snoozeMinutes: 10,
        repeatDays: [1, 2, 3, 4, 5], // Weekdays
        enabled: true,
        snoozeUntil: null,
        lastTriggered: null
      },
      {
        id: 'alarm_default_2',
        time: '18:00',
        label: 'Evening Workout',
        tone: 'marimba-sunshine',
        volume: 80,
        snoozeMinutes: 5,
        repeatDays: [1, 2, 3, 4, 5, 6, 0], // Daily
        enabled: false,
        snoozeUntil: null,
        lastTriggered: null
      }
    ];
  }

  saveAlarms() {
    localStorage.setItem('chronos_alarms', JSON.stringify(this.alarms));
    this.render();
  }

  initEventListeners() {
    // Snooze button
    if (this.snoozeAlarmBtn) {
      this.snoozeAlarmBtn.addEventListener('click', () => {
        this.snoozeCurrentAlarm();
      });
    }

    // Dismiss button
    if (this.dismissAlarmBtn) {
      this.dismissAlarmBtn.addEventListener('click', () => {
        this.dismissCurrentAlarm();
      });
    }

    // Keyboard shortcuts when ringing
    window.addEventListener('keydown', (e) => {
      if (this.activeRingingAlarm && this.ringingModal && this.ringingModal.open) {
        if (e.code === 'Space' || e.code === 'Escape') {
          e.preventDefault();
          this.dismissCurrentAlarm();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.snoozeCurrentAlarm();
        }
      }
    });

    // Listen for format change from clock
    window.addEventListener('chronos:formatchanged', () => {
      this.render();
    });
  }

  startChecker() {
    this.checkAlarms();
    this.checkIntervalId = setInterval(() => {
      this.checkAlarms();
      this.updateNextAlarmCountdown();
    }, 1000);
  }

  /**
   * Evaluates active alarms every second against current wall clock time.
   */
  checkAlarms() {
    if (this.activeRingingAlarm) return; // Already ringing an alarm

    const now = new Date();
    const currentDay = now.getDay();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayDateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${currentTimeStr}`;
    const nowTimeMs = now.getTime();

    for (const alarm of this.alarms) {
      if (!alarm.enabled) continue;

      // 1. Check if alarm was snoozed and snooze time elapsed
      if (alarm.snoozeUntil && nowTimeMs >= alarm.snoozeUntil) {
        alarm.snoozeUntil = null;
        this.triggerAlarm(alarm);
        break;
      }

      // 2. Check regular schedule
      if (alarm.time === currentTimeStr && alarm.lastTriggered !== todayDateKey) {
        const isRepeatedDay = alarm.repeatDays.length === 0 || alarm.repeatDays.includes(currentDay);

        if (isRepeatedDay) {
          alarm.lastTriggered = todayDateKey;
          // If it was a one-time alarm (no repeat days), disable after firing
          if (alarm.repeatDays.length === 0) {
            alarm.enabled = false;
          }
          this.saveAlarms();
          this.triggerAlarm(alarm);
          break;
        }
      }
    }
  }

  /**
   * Fires the alarm: opens modal, loops tone, vibrates, triggers system notification.
   */
  triggerAlarm(alarm) {
    this.activeRingingAlarm = alarm;

    // 1. Play Synthesized Tone in loop
    if (window.chronosAudio) {
      window.chronosAudio.play(alarm.tone, alarm.volume, true);
    }

    // 2. Physical device vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }

    // 3. System Notification if granted
    this.sendNotification(alarm);

    // 4. Update Ringing Dialog UI
    if (this.ringingTitle) {
      this.ringingTitle.textContent = this.formatTimeDisplay(alarm.time);
    }
    if (this.ringingLabel) {
      this.ringingLabel.textContent = alarm.label || 'Alarm Alert';
    }
    if (this.ringingToneName && window.chronosAudio) {
      const toneMeta = window.chronosAudio.tones[alarm.tone];
      this.ringingToneName.textContent = toneMeta ? toneMeta.name : alarm.tone;
    }
    if (this.snoozeBtnLabel) {
      this.snoozeBtnLabel.textContent = `Snooze (${alarm.snoozeMinutes || 10}m)`;
    }

    if (this.ringingModal) {
      try {
        if (!this.ringingModal.open) {
          this.ringingModal.showModal();
        }
      } catch (e) {
        this.ringingModal.setAttribute('open', '');
      }
    }
  }

  snoozeCurrentAlarm() {
    if (!this.activeRingingAlarm) return;

    const alarm = this.activeRingingAlarm;
    const snoozeDurationMs = (alarm.snoozeMinutes || 10) * 60 * 1000;
    alarm.snoozeUntil = Date.now() + snoozeDurationMs;

    this.stopRinging();
    this.saveAlarms();
  }

  dismissCurrentAlarm() {
    if (!this.activeRingingAlarm) return;

    this.activeRingingAlarm.snoozeUntil = null;
    this.stopRinging();
    this.saveAlarms();
  }

  stopRinging() {
    if (window.chronosAudio) {
      window.chronosAudio.stop();
    }
    if (this.ringingModal) {
      try {
        this.ringingModal.close();
      } catch (e) {
        this.ringingModal.removeAttribute('open');
      }
    }
    this.activeRingingAlarm = null;
  }

  sendNotification(alarm) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`⏰ CHRONOS ALARM: ${alarm.label || 'Wake Up!'}`, {
          body: `It is now ${this.formatTimeDisplay(alarm.time)}. Click to view alarm.`,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="12" r="10"/></svg>',
          tag: 'chronos-alarm'
        });
      } catch (e) {
        console.warn('Notification could not be dispatched', e);
      }
    }
  }

  /**
   * Helper to format "HH:MM" (24h) into 12H or 24H string based on global setting.
   */
  formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const is24 = window.chronosClock ? window.chronosClock.is24Hour : false;

    if (is24) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;
    return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  /**
   * Add a new alarm or update existing.
   */
  saveAlarmItem(alarmData) {
    if (alarmData.id) {
      const idx = this.alarms.findIndex(a => a.id === alarmData.id);
      if (idx !== -1) {
        this.alarms[idx] = { ...this.alarms[idx], ...alarmData };
      }
    } else {
      const newAlarm = {
        id: `alarm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        time: alarmData.time,
        label: alarmData.label || 'Alarm',
        tone: alarmData.tone || 'crystal-chime',
        volume: alarmData.volume || 80,
        snoozeMinutes: Number(alarmData.snoozeMinutes) || 10,
        repeatDays: alarmData.repeatDays || [],
        enabled: true,
        snoozeUntil: null,
        lastTriggered: null
      };
      this.alarms.unshift(newAlarm);
    }

    this.saveAlarms();
  }

  toggleAlarm(id, enabled) {
    const alarm = this.alarms.find(a => a.id === id);
    if (alarm) {
      alarm.enabled = enabled;
      alarm.snoozeUntil = null; // Clear snooze when toggled
      this.saveAlarms();
    }
  }

  deleteAlarm(id) {
    this.alarms = this.alarms.filter(a => a.id !== id);
    this.saveAlarms();
  }

  /**
   * Quick Nap preset: sets an alarm for `N` minutes from now.
   */
  addQuickAlarm(minutes) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    this.saveAlarmItem({
      time: `${h}:${m}`,
      label: `Quick ${minutes}m Nap`,
      tone: 'marimba-sunshine',
      volume: 85,
      snoozeMinutes: 5,
      repeatDays: [], // Once
      enabled: true
    });
  }

  /**
   * Calculates the next soonest upcoming alarm timestamp and returns details.
   */
  getNextAlarm() {
    const activeAlarms = this.alarms.filter(a => a.enabled);
    if (activeAlarms.length === 0) return null;

    const now = new Date();
    let earliestTime = Infinity;
    let earliestAlarm = null;

    for (const alarm of activeAlarms) {
      if (alarm.snoozeUntil && alarm.snoozeUntil > now.getTime()) {
        if (alarm.snoozeUntil < earliestTime) {
          earliestTime = alarm.snoozeUntil;
          earliestAlarm = alarm;
        }
        continue;
      }

      const [targetH, targetM] = alarm.time.split(':').map(Number);
      const isOneTime = alarm.repeatDays.length === 0;

      // Check next 7 days for the earliest trigger
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(targetH, targetM, 0, 0);

        if (candidate.getTime() <= now.getTime()) {
          continue; // Already passed today
        }

        const candidateDay = candidate.getDay();
        if (isOneTime || alarm.repeatDays.includes(candidateDay)) {
          if (candidate.getTime() < earliestTime) {
            earliestTime = candidate.getTime();
            earliestAlarm = alarm;
          }
          break; // Found earliest instance for this alarm
        }
      }
    }

    if (!earliestAlarm || earliestTime === Infinity) return null;

    return {
      alarm: earliestAlarm,
      timestamp: earliestTime,
      diffMs: earliestTime - now.getTime()
    };
  }

  /**
   * Updates the digital countdown badge and the analog clock's bezel indicator.
   */
  updateNextAlarmCountdown() {
    const next = this.getNextAlarm();

    if (!next) {
      if (this.nextAlarmStatus) this.nextAlarmStatus.classList.remove('has-alarm');
      if (this.nextAlarmCountdown) this.nextAlarmCountdown.textContent = 'No alarms scheduled';
      if (window.chronosClock) window.chronosClock.setAlarmMarkerAngle(null);
      return;
    }

    if (this.nextAlarmStatus) this.nextAlarmStatus.classList.add('has-alarm');

    const totalSeconds = Math.floor(next.diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let countdownText = '';
    if (hours > 0) {
      countdownText = `${hours}h ${minutes}m ${seconds}s • ${next.alarm.label}`;
    } else if (minutes > 0) {
      countdownText = `${minutes}m ${seconds}s • ${next.alarm.label}`;
    } else {
      countdownText = `${seconds}s • ${next.alarm.label}`;
    }

    if (this.nextAlarmCountdown) {
      this.nextAlarmCountdown.textContent = `${this.formatTimeDisplay(next.alarm.time)} (in ${countdownText})`;
    }

    // Update Analog Bezel Marker Angle (Hour Hand position on 12H dial)
    const targetDate = new Date(next.timestamp);
    const h = targetDate.getHours() % 12;
    const m = targetDate.getMinutes();
    const angle = (h + m / 60) * 30; // 360 / 12 = 30 deg/hr
    if (window.chronosClock) {
      window.chronosClock.setAlarmMarkerAngle(angle);
    }
  }

  /**
   * Render the alarms list cards.
   */
  render() {
    const is24 = window.chronosClock ? window.chronosClock.is24Hour : false;

    // Update stats
    const total = this.alarms.length;
    const active = this.alarms.filter(a => a.enabled).length;
    const inactive = total - active;

    if (this.totalAlarmsCount) this.totalAlarmsCount.textContent = total;
    if (this.activeAlarmsCount) this.activeAlarmsCount.textContent = active;
    if (this.inactiveAlarmsCount) this.inactiveAlarmsCount.textContent = inactive;

    if (total === 0) {
      if (this.alarmsList) this.alarmsList.innerHTML = '';
      if (this.noAlarmsPlaceholder) this.noAlarmsPlaceholder.classList.remove('hidden');
      this.updateNextAlarmCountdown();
      return;
    }

    if (this.noAlarmsPlaceholder) this.noAlarmsPlaceholder.classList.add('hidden');
    if (!this.alarmsList) return;

    this.alarmsList.innerHTML = '';

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    this.alarms.forEach(alarm => {
      const card = document.createElement('div');
      card.className = `alarm-card ${alarm.enabled ? 'is-active' : 'is-inactive'}`;
      card.dataset.id = alarm.id;

      // Time breakdown
      const [rawH, rawM] = alarm.time.split(':').map(Number);
      let displayH = rawH;
      let ampm = '';

      if (!is24) {
        ampm = rawH >= 12 ? 'PM' : 'AM';
        displayH = rawH % 12;
        if (displayH === 0) displayH = 12;
      }

      const timeText = `${String(displayH).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;

      // Repeat badge string
      let repeatStr = 'Once';
      if (alarm.repeatDays.length === 7) {
        repeatStr = 'Every Day';
      } else if (alarm.repeatDays.length === 5 && !alarm.repeatDays.includes(0) && !alarm.repeatDays.includes(6)) {
        repeatStr = 'Weekdays';
      } else if (alarm.repeatDays.length === 2 && alarm.repeatDays.includes(0) && alarm.repeatDays.includes(6)) {
        repeatStr = 'Weekends';
      } else if (alarm.repeatDays.length > 0) {
        repeatStr = alarm.repeatDays.map(d => dayLabels[d]).join(', ');
      }

      // Tone display name
      const toneMeta = window.chronosAudio ? window.chronosAudio.tones[alarm.tone] : null;
      const toneName = toneMeta ? toneMeta.name : alarm.tone;

      card.innerHTML = `
        <div class="alarm-card-top">
          <div class="alarm-time-wrap">
            <span class="alarm-card-time">${timeText}</span>
            ${!is24 ? `<span class="alarm-card-ampm">${ampm}</span>` : ''}
          </div>
          <label class="switch" title="Toggle Alarm">
            <input type="checkbox" class="alarm-toggle-input" ${alarm.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <div class="alarm-card-mid">
          <span class="alarm-card-label">${this.escapeHtml(alarm.label || 'Alarm')}</span>
          <div class="alarm-card-tags">
            <span class="alarm-tag">${repeatStr}</span>
            <span class="alarm-tag tag-sound">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              ${toneName}
            </span>
            <span class="alarm-tag">Vol: ${alarm.volume || 80}%</span>
          </div>
        </div>

        <div class="alarm-card-bottom">
          <span class="alarm-countdown-text">${alarm.enabled ? (alarm.snoozeUntil ? '⚠️ Snoozed' : 'Active') : 'Disabled'}</span>
          <div class="alarm-card-actions">
            <button class="action-icon-btn btn-play-sample" title="Play sound preview" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <button class="action-icon-btn btn-edit" title="Edit alarm" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-icon-btn btn-delete" title="Delete alarm" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Event handlers for this card
      const toggle = card.querySelector('.alarm-toggle-input');
      toggle.addEventListener('change', (e) => {
        this.toggleAlarm(alarm.id, e.target.checked);
      });

      const playBtn = card.querySelector('.btn-play-sample');
      playBtn.addEventListener('click', () => {
        if (window.chronosAudio) {
          window.chronosAudio.preview(alarm.tone, alarm.volume);
        }
      });

      const editBtn = card.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => {
        if (window.chronosApp) {
          window.chronosApp.openEditModal(alarm);
        }
      });

      const deleteBtn = card.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete alarm "${alarm.label || alarm.time}"?`)) {
          this.deleteAlarm(alarm.id);
        }
      });

      this.alarmsList.appendChild(card);
    });

    this.updateNextAlarmCountdown();
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global alarm manager singleton
window.chronosAlarms = new ChronosAlarmManager();
