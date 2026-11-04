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
    this.ringingMemoBox = document.getElementById('ringingMemoBox');
    this.ringingMemoText = document.getElementById('ringingMemoText');
    this.snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');
    this.snoozeBtnLabel = document.getElementById('snoozeBtnLabel');
    // Custom Alarm Notification Popup Elements
    this.customAlarmPopup = document.getElementById('customAlarmPopup');
    this.customPopupHeader = document.getElementById('customPopupHeader');
    this.customPopupTime = document.getElementById('customPopupTime');
    this.customPopupLabel = document.getElementById('customPopupLabel');
    this.customPopupToneTag = document.getElementById('customPopupToneTag');
    this.customPopupToneName = document.getElementById('customPopupToneName');
    this.customPopupMemoBox = document.getElementById('customPopupMemoBox');
    this.customPopupMemoText = document.getElementById('customPopupMemoText');
    this.customPopupSnoozeBtn = document.getElementById('customPopupSnoozeBtn');
    this.customPopupSnoozeLabel = document.getElementById('customPopupSnoozeLabel');
    this.customPopupDismissBtn = document.getElementById('customPopupDismissBtn');
    this.customPopupCloseBtn = document.getElementById('customPopupCloseBtn');

    // Background Worker and Title Flasher
    this.worker = null;
    this.isWorkerActive = false;
    this.originalTitle = document.title;
    this.titleFlashTimer = null;

    // Cross-window and popup communication channel
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('chronos_alarm_channel') : null;
    this.activeCustomPopupAlarm = null;

    this.initEventListeners();
    this.initCustomAlarmPopup();
    this.initBackgroundWorker();
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
        time: '14:30',
        label: 'Board Meeting: Strategy Review',
        message: 'Agenda Item 2: Financial Forecast Discussion (5-min warning)',
        tone: 'grandfather-westminster',
        volume: 85,
        snoozeMinutes: 5,
        repeatDays: [1, 2, 3, 4, 5], // Weekdays
        enabled: true,
        snoozeUntil: null,
        lastTriggered: null
      },
      {
        id: 'alarm_default_2',
        time: '18:00',
        label: 'Executive Session Wrap-Up',
        message: 'Adjourn meeting & confirm next committee action items',
        tone: 'grandfather-single-strike',
        volume: 75,
        snoozeMinutes: 5,
        repeatDays: [1, 2, 3, 4, 5],
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

    // Listen for actions from Desktop App (Tray or Floating Alert window)
    if (window.chronosDesktop && typeof window.chronosDesktop.onAlarmAction === 'function') {
      window.chronosDesktop.onAlarmAction((action) => {
        if (action === 'snooze') {
          this.snoozeCurrentAlarm();
        } else if (action === 'dismiss') {
          this.dismissCurrentAlarm();
        }
      });
    }

    // Window focus & tab visibility change handlers to ensure instant alarm trigger
    document.addEventListener('visibilitychange', () => {
      this.checkAlarms();
      this.updateNextAlarmCountdown();
    });
    window.addEventListener('focus', () => {
      this.checkAlarms();
      this.updateNextAlarmCountdown();
    });
  }

  /**
   * Initializes a dedicated background Web Worker timer.
   * Web Workers run in a separate OS thread and are NOT throttled or suspended
   * when the browser tab is minimized or hidden on another screen during meetings.
   */
  initBackgroundWorker() {
    try {
      const workerScript = `
        let intervalId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!intervalId) {
              intervalId = setInterval(function() {
                self.postMessage('tick');
              }, 500); // 500ms high-precision background pulse
            }
          } else if (e.data === 'stop') {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.checkAlarms();
          this.updateNextAlarmCountdown();
        }
      };

      this.worker.postMessage('start');
      this.isWorkerActive = true;

      // Update worker indicator if present
      const workerChip = document.getElementById('workerStatusChip');
      if (workerChip) {
        workerChip.classList.add('active');
        workerChip.innerHTML = '<span class="pulse-dot"></span> Background Engine: Active';
      }
    } catch (err) {
      console.warn('Background worker fallback to standard window timer', err);
      this.isWorkerActive = false;
    }
  }

  startChecker() {
    this.checkAlarms();
    // Fallback interval in case Web Workers are restricted in any environment
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
   * Fires the alarm: opens modal, loops tone (if not silent), vibrates,
   * triggers OS desktop notification with custom message, and flashes the tab title.
   */
  triggerAlarm(alarm) {
    this.activeRingingAlarm = alarm;

    // 1. Play Synthesized Tone in loop (unless user selected 'none')
    if (window.chronosAudio) {
      if (alarm.tone !== 'none') {
        window.chronosAudio.play(alarm.tone, alarm.volume, true);
      }
    }

    // 2. Physical device vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }

    // 3. Custom Chronos Alarm Popup Notification (displays directly from Chronos, not Chrome)
    this.showCustomAlarmPopup(alarm);

    // 3b. Real OS Desktop Popup via Electron (displays over any screen, app or game)
    if (window.chronosDesktop && window.chronosDesktop.isDesktop) {
      window.chronosDesktop.triggerAlarm({
        id: alarm.id,
        time: this.formatTimeDisplay(alarm.time),
        label: alarm.label || 'Meeting Alert',
        message: alarm.message || '',
        snoozeMinutes: alarm.snoozeMinutes || 10,
        tone: alarm.tone || 'grandfather-westminster',
        autoDismissSeconds: alarm.autoDismissSeconds !== undefined ? Number(alarm.autoDismissSeconds) : 10,
        isBlinking: alarm.tone === 'none' || Boolean(alarm.isBlinking)
      });
    }

    // 4. Flash Tab Title so background tab is immediately noticeable
    this.startTitleFlashing(alarm);

    // 5. Update Ringing Dialog UI
    if (this.ringingTitle) {
      this.ringingTitle.textContent = this.formatTimeDisplay(alarm.time);
    }
    if (this.ringingLabel) {
      this.ringingLabel.textContent = alarm.label || 'Meeting Alert';
    }
    if (this.ringingToneName && window.chronosAudio) {
      if (alarm.tone === 'none') {
        this.ringingToneName.textContent = '🔕 Silent Alert (Desktop Popup & Visual Only)';
      } else {
        const toneMeta = window.chronosAudio.tones[alarm.tone];
        this.ringingToneName.textContent = toneMeta ? toneMeta.name : alarm.tone;
      }
    }
    if (this.snoozeBtnLabel) {
      this.snoozeBtnLabel.textContent = `Snooze (${alarm.snoozeMinutes || 10}m)`;
    }

    // Optional Meeting Note / Agenda Memo in Ringing Card
    if (this.ringingMemoBox && this.ringingMemoText) {
      if (alarm.message && alarm.message.trim()) {
        this.ringingMemoText.textContent = alarm.message.trim();
        this.ringingMemoBox.classList.remove('hidden');
      } else {
        this.ringingMemoBox.classList.add('hidden');
      }
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

    // 6. Update Always-On-Top Floating Window if open
    if (window.chronosApp && typeof window.chronosApp.updatePiP === 'function') {
      window.chronosApp.updatePiP();
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
    this.clearCustomPopupAutoClose();
    if (window.chronosAudio) {
      window.chronosAudio.stop();
    }
    this.stopTitleFlashing();
    if (this.ringingMemoBox) {
      this.ringingMemoBox.classList.add('hidden');
    }
    if (this.ringingModal) {
      try {
        this.ringingModal.close();
      } catch (e) {
        this.ringingModal.removeAttribute('open');
      }
    }
    this.activeRingingAlarm = null;

    // Hide Custom Alarm Notification Popup
    this.hideCustomAlarmPopup();

    // Signal desktop app to close floating alert & reset always-on-top
    if (window.chronosDesktop && window.chronosDesktop.isDesktop) {
      window.chronosDesktop.stopAlarm();
    }

    // Update Always-On-Top Floating Window
    if (window.chronosApp && typeof window.chronosApp.updatePiP === 'function') {
      window.chronosApp.updatePiP();
    }
  }

  startTitleFlashing(alarm) {
    this.stopTitleFlashing();
    let isAlert = true;
    const timeFormatted = this.formatTimeDisplay(alarm.time);
    const alertMsg = `🔔 [ALERT] ${alarm.label || 'Meeting'}!`;
    const altMsg = `⏰ ${timeFormatted} • CHRONOS`;

    this.titleFlashTimer = setInterval(() => {
      document.title = isAlert ? alertMsg : altMsg;
      isAlert = !isAlert;
    }, 900);
  }

  stopTitleFlashing() {
    if (this.titleFlashTimer) {
      clearInterval(this.titleFlashTimer);
      this.titleFlashTimer = null;
    }
    document.title = this.originalTitle || 'Chronos • Dual Analog & Digital Clock with Smart Alarms';
  }

  /* -------------------------------------------------------------
     CUSTOM CHRONOS ALARM POPUP NOTIFICATION CONTROLS
     Replaces generic Chrome browser notifications with rich Chronos popup
     ------------------------------------------------------------- */
  initCustomAlarmPopup() {
    if (!this.customAlarmPopup) return;

    if (this.customPopupSnoozeBtn) {
      this.customPopupSnoozeBtn.addEventListener('click', () => {
        if (this.activeCustomPopupAlarm && this.activeCustomPopupAlarm.isTest) {
          this.hideCustomAlarmPopup();
          if (window.chronosApp) {
            window.chronosApp.showQuickToast('💤 Test alert snoozed');
          }
        } else {
          this.snoozeCurrentAlarm();
        }
      });
    }

    if (this.customPopupDismissBtn) {
      this.customPopupDismissBtn.addEventListener('click', () => {
        if (this.activeCustomPopupAlarm && this.activeCustomPopupAlarm.isTest) {
          this.hideCustomAlarmPopup();
          if (window.chronosApp) {
            window.chronosApp.showQuickToast('⏹️ Test alert dismissed');
          }
        } else {
          this.dismissCurrentAlarm();
        }
      });
    }

    if (this.customPopupCloseBtn) {
      this.customPopupCloseBtn.addEventListener('click', () => {
        if (this.activeCustomPopupAlarm && this.activeCustomPopupAlarm.isTest) {
          this.hideCustomAlarmPopup();
        } else {
          this.dismissCurrentAlarm();
        }
      });
    }

    // Drag header to reposition popup freely across screen
    if (this.customPopupHeader) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      this.customPopupHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = this.customAlarmPopup.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        this.customAlarmPopup.style.right = 'auto';
        this.customAlarmPopup.style.left = `${initialLeft}px`;
        this.customAlarmPopup.style.top = `${initialTop}px`;
        this.customAlarmPopup.style.transition = 'none';

        const onMouseMove = (moveEvt) => {
          if (!isDragging) return;
          const deltaX = moveEvt.clientX - startX;
          const deltaY = moveEvt.clientY - startY;

          const newLeft = Math.max(10, Math.min(window.innerWidth - rect.width - 10, initialLeft + deltaX));
          const newTop = Math.max(10, Math.min(window.innerHeight - rect.height - 10, initialTop + deltaY));

          this.customAlarmPopup.style.left = `${newLeft}px`;
          this.customAlarmPopup.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.customAlarmPopup.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    // Cross-tab / external alert popup sync
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'alert:action') {
          if (event.data.action === 'snooze') {
            this.snoozeCurrentAlarm();
          } else if (event.data.action === 'dismiss') {
            this.dismissCurrentAlarm();
          }
        }
      };
    }

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'chronos:alert:action') {
        if (event.data.action === 'snooze') {
          this.snoozeCurrentAlarm();
        } else if (event.data.action === 'dismiss') {
          this.dismissCurrentAlarm();
        }
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'chronos_last_action' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.action && Date.now() - parsed.timestamp < 3000) {
            if (parsed.action === 'snooze') this.snoozeCurrentAlarm();
            else if (parsed.action === 'dismiss') this.dismissCurrentAlarm();
          }
        } catch (_) {}
      }
    });
  }

  /**
   * Displays Chronos's custom alarm notification popup on screen.
   */
  showCustomAlarmPopup(alarm) {
    if (!this.customAlarmPopup) return;

    this.activeCustomPopupAlarm = alarm;

    if (this.customPopupTime) {
      this.customPopupTime.textContent = this.formatTimeDisplay(alarm.time);
    }
    if (this.customPopupLabel) {
      this.customPopupLabel.textContent = alarm.label || 'Meeting Alert';
    }
    if (this.customPopupToneName) {
      if (alarm.tone === 'none') {
        this.customPopupToneName.textContent = 'Silent Alert';
      } else if (window.chronosAudio && window.chronosAudio.tones[alarm.tone]) {
        this.customPopupToneName.textContent = window.chronosAudio.tones[alarm.tone].name;
      } else {
        this.customPopupToneName.textContent = alarm.tone || 'Chime';
      }
    }
    if (this.customPopupSnoozeLabel) {
      this.customPopupSnoozeLabel.textContent = `Snooze (${alarm.snoozeMinutes || 10}m)`;
    }

    if (this.customPopupMemoBox && this.customPopupMemoText) {
      if (alarm.message && alarm.message.trim()) {
        this.customPopupMemoText.textContent = alarm.message.trim();
        this.customPopupMemoBox.classList.remove('hidden');
      } else {
        this.customPopupMemoBox.classList.add('hidden');
      }
    }

    this.customAlarmPopup.classList.remove('hidden');

    // Blinking mode check (discreet meeting pulse)
    const isBlinking = Boolean(alarm.isBlinking || alarm.tone === 'none');
    if (isBlinking) {
      this.customAlarmPopup.classList.add('is-blinking');
    } else {
      this.customAlarmPopup.classList.remove('is-blinking');
    }

    // Auto-dismiss countdown timer (avoids meeting distraction)
    this.clearCustomPopupAutoClose();
    const autoSec = alarm.autoDismissSeconds !== undefined ? Number(alarm.autoDismissSeconds) : 10;
    if (autoSec > 0) {
      const badge = document.getElementById('customPopupAutoCloseBadge');
      const barWrap = document.getElementById('customPopupBarWrap');
      const barFill = document.getElementById('customPopupBarFill');

      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = `Auto-close: ${autoSec}s`;
      }
      if (barWrap) barWrap.classList.remove('hidden');

      const startTime = Date.now();
      const totalMs = autoSec * 1000;

      this.customPopupAutoInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingMs = Math.max(0, totalMs - elapsed);
        const remSec = Math.ceil(remainingMs / 1000);
        if (badge) badge.textContent = `Auto-close: ${remSec}s`;
        if (barFill) barFill.style.width = `${Math.max(0, (remainingMs / totalMs) * 100)}%`;

        if (remainingMs <= 0) {
          this.clearCustomPopupAutoClose();
          this.dismissCurrentAlarm();
        }
      }, 100);

      this.customPopupAutoTimer = setTimeout(() => {
        this.clearCustomPopupAutoClose();
        this.dismissCurrentAlarm();
      }, totalMs);
    }

    // Broadcast data to any open floating alert window or child tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'alert:data',
          data: {
            time: this.formatTimeDisplay(alarm.time),
            label: alarm.label || 'Meeting Alert',
            message: alarm.message || '',
            snoozeMinutes: alarm.snoozeMinutes || 10,
            tone: alarm.tone || 'grandfather-westminster',
            autoDismissSeconds: autoSec,
            isBlinking: isBlinking
          }
        });
      } catch (_) {}
    }
  }

  /**
   * Hides the custom alarm notification popup.
   */
  
  clearCustomPopupAutoClose() {
    if (this.customPopupAutoTimer) {
      clearTimeout(this.customPopupAutoTimer);
      this.customPopupAutoTimer = null;
    }
    if (this.customPopupAutoInterval) {
      clearInterval(this.customPopupAutoInterval);
      this.customPopupAutoInterval = null;
    }
    const badge = document.getElementById('customPopupAutoCloseBadge');
    const barWrap = document.getElementById('customPopupBarWrap');
    if (badge) badge.classList.add('hidden');
    if (barWrap) barWrap.classList.add('hidden');
  }

  hideCustomAlarmPopup() {
    this.clearCustomPopupAutoClose();
    if (this.customAlarmPopup) this.customAlarmPopup.classList.remove('is-blinking');
    if (this.customAlarmPopup) {
      this.customAlarmPopup.classList.add('hidden');
    }
    this.activeCustomPopupAlarm = null;

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'alert:dismiss' });
      } catch (_) {}
    }
  }

  /**
   * Dispatches alarm notification: displays custom Chronos popup (avoids Chrome notifications).
   */
  sendNotification(alarm) {
    // 1. Show Chronos custom alarm notification popup
    this.showCustomAlarmPopup(alarm);

    // 2. Only if the user explicitly opted into Chrome native notifications in settings, dispatch window notification
    const useSystemNotif = localStorage.getItem('chronos_use_system_notification') === 'true';
    if (useSystemNotif && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const timeFormatted = this.formatTimeDisplay(alarm.time);
        const title = `⏰ ALARM! ${alarm.label || "Time's up!"} (${timeFormatted})`;

        let bodyText = alarm.message && alarm.message.trim() 
          ? `${alarm.message.trim()}\nTime's up! (${timeFormatted})` 
          : `Time's up! (${timeFormatted}) • Chronos`;

        const notifOptions = {
          body: bodyText,
          icon: 'clock.png',
          badge: 'clock.png',
          tag: `chronos-alarm-${alarm.id || Date.now()}`,
          requireInteraction: true,
          silent: alarm.tone === 'none'
        };

        this.dispatchWindowNotification(title, notifOptions);
      } catch (e) {
        console.warn('System Notification fallback error', e);
      }
    }
  }

  dispatchWindowNotification(title, options) {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      console.warn('Window Notification fallback error', err);
    }
  }

  /**
   * Sends an immediate test alarm popup notification:
   * Displays the custom Chronos notification popup right on screen with acoustic sound!
   */
  sendTestNotification(customMessage = null) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const testTime = this.formatTimeDisplay(`${h}:${m}`);

    const testAlarm = {
      id: 'test_custom_popup_' + Date.now(),
      time: `${h}:${m}`,
      label: 'Board Meeting Test Alert',
      message: customMessage || 'Item 3: Executive Committee Presentation • Custom alarm notification test',
      tone: 'grandfather-single-strike',
      volume: 80,
      snoozeMinutes: 5,
      isTest: true,
      autoDismissSeconds: 10,
      isBlinking: false
    };

    // 1. Show the Custom Chronos Alarm Notification Popup directly on screen!
    this.showCustomAlarmPopup(testAlarm);

    // 2. Play acoustic tone preview
    if (window.chronosAudio) {
      window.chronosAudio.preview('grandfather-single-strike', 80);
    }

    // 3. Real OS Desktop Popup via Electron if running Desktop App
    if (window.chronosDesktop && window.chronosDesktop.isDesktop) {
      window.chronosDesktop.testNotification({
        id: testAlarm.id,
        time: testTime,
        label: testAlarm.label,
        message: testAlarm.message,
        snoozeMinutes: testAlarm.snoozeMinutes,
        tone: testAlarm.tone,
        autoDismissSeconds: 10,
        isBlinking: testAlarm.tone === 'none'
      });
    }

    return true;
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
        this.alarms[idx] = {
        ...this.alarms[idx],
        ...alarmData,
        autoDismissSeconds: alarmData.autoDismissSeconds !== undefined ? Number(alarmData.autoDismissSeconds) : (this.alarms[idx].autoDismissSeconds !== undefined ? this.alarms[idx].autoDismissSeconds : 10),
        isBlinking: alarmData.tone === 'none' || Boolean(alarmData.isBlinking)
      };
      }
    } else {
      const newAlarm = {
        id: `alarm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        time: alarmData.time,
        label: alarmData.label || 'Alarm',
        message: alarmData.message || '',
        tone: alarmData.tone || 'grandfather-westminster',
        volume: alarmData.volume !== undefined ? alarmData.volume : 80,
        snoozeMinutes: Number(alarmData.snoozeMinutes) || 10,
        autoDismissSeconds: alarmData.autoDismissSeconds !== undefined ? Number(alarmData.autoDismissSeconds) : 10,
        isBlinking: alarmData.tone === 'none' || Boolean(alarmData.isBlinking),
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
   * Quick Alarm preset: sets an alarm for `N` minutes from now with optional label/message/tone.
   */
  addQuickAlarm(minutes, label = null, message = null, tone = null) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    this.saveAlarmItem({
      time: `${h}:${m}`,
      label: label || `Quick ${minutes}m Meeting Alert`,
      message: message || `Meeting Agenda checkpoint • ${minutes}m reminder`,
      tone: tone || 'grandfather-single-strike',
      volume: 80,
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
          ${alarm.message ? `<div class="alarm-card-memo"><span class="memo-icon">📝</span> <span>${this.escapeHtml(alarm.message)}</span></div>` : ''}
          <div class="alarm-card-tags">
            <span class="alarm-tag">${repeatStr}</span>
            <span class="alarm-tag tag-sound ${alarm.tone === 'none' ? 'tag-silent' : (alarm.tone.startsWith('grandfather-') ? 'tag-grandfather' : '')}">
              ${alarm.tone === 'none' ? '🔕 Silent' : (alarm.tone.startsWith('grandfather-') ? '🕰️ ' + toneName : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> ${toneName}`)}
            </span>
            ${alarm.tone === 'none' ? '<span class="alarm-tag tag-blinking">⚡ Blinking</span>' : ''}
            ${alarm.autoDismissSeconds > 0 ? `<span class="alarm-tag tag-autodismiss">⏳ Auto-close: ${alarm.autoDismissSeconds}s</span>` : '<span class="alarm-tag">📌 Stay open</span>'}
            ${alarm.tone !== 'none' ? `<span class="alarm-tag">Vol: ${alarm.volume || 80}%</span>` : ''}
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
