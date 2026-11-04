/**
 * CHRONOS APPLICATION CONTROLLER
 * Orchestrates themes, view modes, modal workflows, quick naps, and audio context lifecycle.
 */

class ChronosApp {
  constructor() {
    this.isPreviewing = false;

    // Modals
    this.alarmModal = document.getElementById('alarmModal');
    this.alarmForm = document.getElementById('alarmForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.saveBtnLabel = document.getElementById('saveBtnLabel');
    this.openAddAlarmBtn = document.getElementById('openAddAlarmBtn');
    this.emptyAddBtn = document.getElementById('emptyAddBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelModalBtn = document.getElementById('cancelModalBtn');

    // Form Fields
    this.alarmEditId = document.getElementById('alarmEditId');
    this.alarmTimeInput = document.getElementById('alarmTimeInput');
    this.timeFormattedPreview = document.getElementById('timeFormattedPreview');
    this.alarmTargetDeltaHint = document.getElementById('alarmTargetDeltaHint');
    this.alarmLabelInput = document.getElementById('alarmLabelInput');
    this.alarmMessageInput = document.getElementById('alarmMessageInput');
    this.alarmToneSelect = document.getElementById('alarmToneSelect');
    this.alarmAutoDismissSelect = document.getElementById('alarmAutoDismissSelect');
    this.alertStyleToneBtn = document.getElementById('alertStyleToneBtn');
    this.alertStyleBlinkBtn = document.getElementById('alertStyleBlinkBtn');
    this.toneSectionWrapper = document.getElementById('toneSectionWrapper');
    this.previewToneBtn = document.getElementById('previewToneBtn');
    this.previewPlayIcon = document.getElementById('previewPlayIcon');
    this.previewToneLabel = document.getElementById('previewToneLabel');
    this.alarmSnoozeSelect = document.getElementById('alarmSnoozeSelect');
    this.alarmVolumeRange = document.getElementById('alarmVolumeRange');
    this.volumeValueLabel = document.getElementById('volumeValueLabel');
    this.repeatPresetChips = document.querySelectorAll('.repeat-preset-chip');
    this.dayCheckboxes = document.querySelectorAll('input[name="days"]');

    // Theme & Views
    this.clocksShowcase = document.getElementById('clocksShowcase');
    this.viewTabs = document.querySelectorAll('.view-tab');
    this.themeMenuBtn = document.getElementById('themeMenuBtn');
    this.themeDropdownMenu = document.getElementById('themeDropdownMenu');
    this.themeDropdownItems = document.querySelectorAll('.dropdown-item');

    // Controls
    this.audioUnlockBanner = document.getElementById('audioUnlockBanner');
    this.enableAudioBtn = document.getElementById('enableAudioBtn');
    this.testSoundBtn = document.getElementById('testSoundBtn');
    this.notifPermBtn = document.getElementById('notifPermBtn');

    // Board Meeting Toolbar Elements
    this.testDesktopPopupBtn = document.getElementById('testDesktopPopupBtn');
    this.quickMeetingAlarmBtn = document.getElementById('quickMeetingAlarmBtn');
    this.meetingNotifPermBtn = document.getElementById('meetingNotifPermBtn');
    this.meetingNotifDot = document.getElementById('meetingNotifDot');
    this.meetingNotifStatusText = document.getElementById('meetingNotifStatusText');
    this.floatingPipBtn = document.getElementById('floatingPipBtn');
    this.desktopPinBtn = document.getElementById('desktopPinBtn');
    this.desktopPinLabel = document.getElementById('desktopPinLabel');
    this.fileProtocolBanner = document.getElementById('fileProtocolBanner');
    this.dismissProtocolBannerBtn = document.getElementById('dismissProtocolBannerBtn');

    // Always-On-Top Floating Window
    this.pipWindow = null;

    this.initAudioUnblocker();
    this.initViewModes();
    this.initThemes();
    this.initModalForm();
    this.initQuickNaps();
    this.initNotifications();
    this.initBoardMeetingControls();
    this.initProtocolCheck();
    this.initFloatingPiP();
    this.initDesktopIntegration();

    // Heartbeat to update floating PiP window clock
    setInterval(() => {
      this.updatePiP();
    }, 1000);
  }

  /* -------------------------------------------------------------
     AUDIO CONTEXT AUTOPLAY UNLOCK
     ------------------------------------------------------------- */
  initAudioUnblocker() {
    // Check if AudioContext is ready or suspended
    const unlock = () => {
      if (window.chronosAudio) {
        window.chronosAudio.initContext();
      }
      if (this.audioUnlockBanner) {
        this.audioUnlockBanner.classList.add('hidden');
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    if (this.enableAudioBtn) {
      this.enableAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        unlock();
      });
    }

    if (this.testSoundBtn) {
      this.testSoundBtn.addEventListener('click', () => {
        if (window.chronosAudio) {
          const testTones = ['crystal-chime', 'marimba-sunshine', 'classic-bell'];
          const randomTone = testTones[Math.floor(Math.random() * testTones.length)];
          window.chronosAudio.preview(randomTone, 80);
        }
      });
    }
  }

  /* -------------------------------------------------------------
     VIEW MODES (Split, Analog Only, Digital Only)
     ------------------------------------------------------------- */
  initViewModes() {
    const savedView = localStorage.getItem('chronos_view') || 'split';
    this.setViewMode(savedView);

    this.viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.view;
        this.setViewMode(mode);
      });
    });
  }

  setViewMode(mode) {
    if (!this.clocksShowcase) return;

    this.clocksShowcase.className = `clocks-showcase view-mode-${mode}`;
    this.viewTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === mode);
    });

    localStorage.setItem('chronos_view', mode);
  }

  /* -------------------------------------------------------------
     THEMES (Obsidian, Cyberpunk, Emerald, Pearl Light)
     ------------------------------------------------------------- */
  initThemes() {
    const savedTheme = localStorage.getItem('chronos_theme') || 'obsidian';
    this.setTheme(savedTheme);

    // Toggle menu
    if (this.themeMenuBtn && this.themeDropdownMenu) {
      this.themeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = this.themeDropdownMenu.classList.contains('hidden');
        this.themeDropdownMenu.classList.toggle('hidden', !isHidden);
        this.themeMenuBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.themeMenuBtn.contains(e.target) && !this.themeDropdownMenu.contains(e.target)) {
          this.themeDropdownMenu.classList.add('hidden');
          this.themeMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    this.themeDropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const theme = item.dataset.theme;
        this.setTheme(theme);
        if (this.themeDropdownMenu) {
          this.themeDropdownMenu.classList.add('hidden');
          this.themeMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('chronos_theme', theme);

    this.themeDropdownItems.forEach(item => {
      item.classList.toggle('active', item.dataset.theme === theme);
    });
  }

  /* -------------------------------------------------------------
     NOTIFICATIONS CONTROLLER (Custom Alarm Popups)
     ------------------------------------------------------------- */
  initNotifications() {
    // Register Service Worker for PWA when on web
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('ServiceWorker registration note:', err);
      });
    }

    this.updateNotifBtnState();

    const triggerCustomPopupTest = () => {
      if (window.chronosAlarms) {
        window.chronosAlarms.sendTestNotification('Item 3: Executive Committee Review • Custom alarm notification test');
        this.showQuickToast('🔔 Custom Alarm Popup is active and displayed!');
      }
    };

    if (this.notifPermBtn) {
      this.notifPermBtn.addEventListener('click', triggerCustomPopupTest);
    }
    if (this.meetingNotifPermBtn) {
      this.meetingNotifPermBtn.addEventListener('click', triggerCustomPopupTest);
    }
  }

  updateNotifBtnState() {
    // Chronos Custom Alarm Notification is active and custom-styled directly in the app
    if (this.notifPermBtn) {
      this.notifPermBtn.style.color = 'var(--accent-secondary)';
      this.notifPermBtn.title = 'Custom Alarm Popup: Active (Displays custom Chronos notification directly on screen)';
    }

    // Meeting Assistant Toolbar Chip
    if (this.meetingNotifStatusText) {
      this.meetingNotifStatusText.textContent = 'Custom Alarm Popup: Active';
    }

    if (this.meetingNotifDot) {
      this.meetingNotifDot.className = 'notif-state-dot dot-active';
    }

    if (this.meetingNotifPermBtn) {
      this.meetingNotifPermBtn.classList.add('active');
      this.meetingNotifPermBtn.title = 'Custom Alarm Popup: Active (Displays custom Chronos notification directly on screen)';
    }
  }

  /* -------------------------------------------------------------
     QUICK NAP & MEETING PRESETS
     ------------------------------------------------------------- */
  initQuickNaps() {
    // Quick Nap Buttons
    const quickButtons = document.querySelectorAll('.quick-chip-btn:not(.meeting-preset)');
    quickButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.dataset.quickMinutes);
        if (mins && window.chronosAlarms) {
          window.chronosAlarms.addQuickAlarm(mins, `Quick ${mins}m Nap`, '', 'crystal-chime');
          this.showQuickToast(`Added ${mins}m nap alarm!`);
        }
      });
    });

    // Meeting Quick Presets
    const meetingButtons = document.querySelectorAll('.meeting-preset');
    meetingButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.dataset.meetingMinutes);
        const label = btn.dataset.meetingLabel || `Meeting ${mins}m Alert`;
        const msg = btn.dataset.meetingMsg || `Scheduled ${mins}m meeting checkpoint`;

        if (mins && window.chronosAlarms) {
          window.chronosAlarms.addQuickAlarm(mins, label, msg, 'grandfather-westminster');
          this.showQuickToast(`Added ${mins}m Meeting Timer: ${label}`);
        }
      });
    });
  }

  /* -------------------------------------------------------------
     BOARD MEETING ASSISTANT TOOLBAR CONTROLS
     ------------------------------------------------------------- */
  initBoardMeetingControls() {
    // Test Custom Alarm Notification button
    if (this.testDesktopPopupBtn) {
      this.testDesktopPopupBtn.addEventListener('click', () => {
        if (window.chronosAlarms) {
          const sent = window.chronosAlarms.sendTestNotification(
            'Item 3: Executive Committee Review • Custom alarm notification test'
          );
          if (sent) {
            this.showQuickToast('🔔 Custom Alarm Popup displayed! Test Snooze or Dismiss.');
          }
        }
      });
    }

    // Set Meeting Alert button
    if (this.quickMeetingAlarmBtn) {
      this.quickMeetingAlarmBtn.addEventListener('click', () => {
        this.openAddModal({
          label: 'Board Meeting Checkpoint',
          message: 'Item 3: Review Financial Forecast & Vote on Resolutions (5-min warning)',
          tone: 'grandfather-westminster'
        });
      });
    }
  }

  /* -------------------------------------------------------------
     PROTOCOL CHECK (file:// vs http://localhost)
     ------------------------------------------------------------- */
  initProtocolCheck() {
    // If running inside Electron desktop app, suppress browser file:// protocol warning
    if (window.chronosDesktop && window.chronosDesktop.isDesktop) {
      if (this.fileProtocolBanner) {
        this.fileProtocolBanner.classList.add('hidden');
      }
      return;
    }

    const isFile = window.location.protocol === 'file:';
    if (isFile && this.fileProtocolBanner) {
      this.fileProtocolBanner.classList.remove('hidden');

      if (this.dismissProtocolBannerBtn) {
        this.dismissProtocolBannerBtn.addEventListener('click', () => {
          this.fileProtocolBanner.classList.add('hidden');
        });
      }

      if (this.meetingNotifStatusText) {
        this.meetingNotifStatusText.textContent = 'Desktop Popups: Run via Localhost or Desktop App';
      }
    }
  }

  /* -------------------------------------------------------------
     ELECTRON DESKTOP INTEGRATION (Always-on-top pin & status)
     ------------------------------------------------------------- */
  initDesktopIntegration() {
    if (!window.chronosDesktop || !window.chronosDesktop.isDesktop) return;

    if (this.desktopPinBtn) {
      this.desktopPinBtn.classList.remove('hidden');

      let isPinned = false;
      if (typeof window.chronosDesktop.getAlwaysOnTop === 'function') {
        window.chronosDesktop.getAlwaysOnTop().then(flag => {
          isPinned = Boolean(flag);
          this.updateDesktopPinUI(isPinned);
        }).catch(() => {});
      }

      this.desktopPinBtn.addEventListener('click', () => {
        isPinned = !isPinned;
        if (typeof window.chronosDesktop.setAlwaysOnTop === 'function') {
          window.chronosDesktop.setAlwaysOnTop(isPinned);
        }
        this.updateDesktopPinUI(isPinned);
        this.showQuickToast(isPinned ? '📌 Chronos pinned Always-On-Top' : 'Chronos unpinned from top');
      });

      if (typeof window.chronosDesktop.onToggleAlwaysOnTop === 'function') {
        window.chronosDesktop.onToggleAlwaysOnTop((flag) => {
          isPinned = Boolean(flag);
          this.updateDesktopPinUI(isPinned);
        });
      }
    }
  }

  updateDesktopPinUI(isPinned) {
    if (this.desktopPinBtn && this.desktopPinLabel) {
      this.desktopPinLabel.textContent = isPinned ? 'ON' : 'OFF';
      this.desktopPinBtn.classList.toggle('active', isPinned);
      this.desktopPinLabel.style.color = isPinned ? 'var(--alarm-gold)' : 'var(--text-muted)';
    }
  }

  /* -------------------------------------------------------------
     ALWAYS-ON-TOP FLOATING MEETING TIMER (Document Picture-in-Picture)
     Stays physically floating over Antigravity, PowerPoint, Zoom, etc.
     ------------------------------------------------------------- */
  initFloatingPiP() {
    if (this.floatingPipBtn) {
      this.floatingPipBtn.addEventListener('click', async () => {
        await this.toggleFloatingPiP();
      });
    }
  }

  async toggleFloatingPiP() {
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
      this.pipWindow = null;
      if (this.floatingPipBtn) this.floatingPipBtn.classList.remove('active');
      return;
    }

    if ('documentPictureInPicture' in window) {
      try {
        this.pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 380,
          height: 195
        });
        this.setupPiPContent(this.pipWindow);
      } catch (err) {
        console.warn('Document Picture-in-Picture failed, falling back to popup window', err);
        this.openMiniPopupWindow();
      }
    } else {
      this.openMiniPopupWindow();
    }
  }

  openMiniPopupWindow() {
    const w = 380;
    const h = 210;
    const left = window.screen.width - w - 24;
    const top = 60;
    this.pipWindow = window.open('', 'ChronosFloatingMeetingTimer', `width=${w},height=${h},top=${top},left=${left},resizable=yes`);
    if (this.pipWindow) {
      this.setupPiPContent(this.pipWindow);
    } else {
      alert('Popup was blocked by your browser. Please allow popups for this site to use the floating timer.');
    }
  }

  setupPiPContent(win) {
    win.document.title = 'CHRONOS • Always-On-Top Meeting Timer';

    win.document.head.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', -apple-system, Roboto, sans-serif;
          background: #0b0f19;
          color: #f8fafc;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100vh;
          user-select: none;
          transition: all 0.3s ease;
        }
        body.is-ringing {
          background: #240a15 !important;
          border: 3px solid #f43f5e;
          animation: pipPulseBorder 0.8s infinite alternate;
        }
        @keyframes pipPulseBorder {
          0% { border-color: #f43f5e; box-shadow: inset 0 0 20px rgba(244,63,94,0.5); }
          100% { border-color: #fbbf24; box-shadow: inset 0 0 35px rgba(251,191,36,0.7); }
        }
        .pip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .pip-badge {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        .pip-time {
          font-family: 'JetBrains Mono', Consolas, monospace;
          font-size: 2.1rem;
          font-weight: 800;
          color: #38bdf8;
          letter-spacing: 0.02em;
          text-align: center;
          margin: 3px 0;
          text-shadow: 0 0 15px rgba(56, 189, 248, 0.45);
        }
        .pip-next {
          font-size: 0.76rem;
          color: #cbd5e1;
          text-align: center;
          background: rgba(15, 23, 42, 0.85);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Ringing View */
        .pip-alert-box {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: rgba(244, 63, 94, 0.25);
          border: 1px solid rgba(244, 63, 94, 0.6);
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
        }
        body.is-ringing .pip-default-view { display: none; }
        body.is-ringing .pip-alert-box { display: flex; }
        .pip-alert-title {
          font-size: 0.82rem;
          font-weight: 800;
          color: #f43f5e;
          letter-spacing: 0.05em;
        }
        .pip-alert-memo {
          font-size: 0.86rem;
          color: #fff;
          font-weight: 600;
          line-height: 1.3;
          max-height: 48px;
          overflow-y: auto;
        }
        .pip-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .pip-btn {
          flex: 1;
          padding: 7px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: transform 0.1s;
        }
        .pip-btn:active { transform: scale(0.97); }
        .pip-dismiss {
          background: #f43f5e;
          color: #fff;
          box-shadow: 0 2px 8px rgba(244, 63, 94, 0.4);
        }
        .pip-dismiss:hover { background: #e11d48; }
        .pip-snooze {
          background: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .pip-snooze:hover { background: rgba(255, 255, 255, 0.25); }
      </style>
      <div class="pip-header">
        <span>CHRONOS MEETING TIMER</span>
        <span class="pip-badge">ALWAYS ON TOP</span>
      </div>

      <div class="pip-default-view">
        <div id="pipTime" class="pip-time">12:00:00 PM</div>
        <div id="pipNext" class="pip-next">Loading meeting schedule...</div>
      </div>

      <div class="pip-alert-box" id="pipAlertBox">
        <div class="pip-alert-title" id="pipAlertTitle">⏰ MEETING ALERT</div>
        <div class="pip-alert-memo" id="pipAlertMemo">Agenda Checkpoint Reached</div>
        <div class="pip-actions">
          <button id="pipSnoozeBtn" class="pip-btn pip-snooze" type="button">Snooze (5m)</button>
          <button id="pipDismissBtn" class="pip-btn pip-dismiss" type="button">Dismiss / Stop</button>
        </div>
      </div>
    `;

    // Wire buttons
    const snoozeBtn = win.document.getElementById('pipSnoozeBtn');
    const dismissBtn = win.document.getElementById('pipDismissBtn');

    if (snoozeBtn) {
      snoozeBtn.addEventListener('click', () => {
        if (window.chronosAlarms) window.chronosAlarms.snoozeCurrentAlarm();
      });
    }
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        if (window.chronosAlarms) window.chronosAlarms.dismissCurrentAlarm();
      });
    }

    win.addEventListener('unload', () => {
      this.pipWindow = null;
      if (this.floatingPipBtn) {
        this.floatingPipBtn.classList.remove('active');
      }
    });

    if (this.floatingPipBtn) {
      this.floatingPipBtn.classList.add('active');
    }

    this.showQuickToast('📌 Always-On-Top Meeting Timer opened! It floats over all apps.');
    this.updatePiP();
  }

  updatePiP() {
    if (!this.pipWindow || this.pipWindow.closed) return;
    try {
      const doc = this.pipWindow.document;
      const timeEl = doc.getElementById('pipTime');
      const nextEl = doc.getElementById('pipNext');
      const alertTitle = doc.getElementById('pipAlertTitle');
      const alertMemo = doc.getElementById('pipAlertMemo');

      // Update time
      const now = new Date();
      const is24 = window.chronosClock ? window.chronosClock.is24Hour : false;
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      let ampm = '';

      if (!is24) {
        ampm = h >= 12 ? ' PM' : ' AM';
        h = h % 12 || 12;
      }
      const formatted = `${String(h).padStart(2, '0')}:${m}:${s}${ampm}`;
      if (timeEl) timeEl.textContent = formatted;

      // Check active ringing alarm
      const ringing = window.chronosAlarms ? window.chronosAlarms.activeRingingAlarm : null;
      if (ringing) {
        doc.body.classList.add('is-ringing');
        if (alertTitle) alertTitle.textContent = `⏰ ${ringing.label || 'MEETING ALERT'}`;
        if (alertMemo) alertMemo.textContent = ringing.message || 'Scheduled meeting target reached!';
      } else {
        doc.body.classList.remove('is-ringing');
        if (window.chronosAlarms && nextEl) {
          const next = window.chronosAlarms.getNextAlarm();
          if (next) {
            const totalSecs = Math.max(0, Math.floor(next.diffMs / 1000));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            nextEl.textContent = `Next in ${mins}m ${secs}s: ${next.alarm.label}`;
          } else {
            nextEl.textContent = 'No upcoming meeting alerts';
          }
        }
      }
    } catch (e) {
      // Window might be transitioning
    }
  }

  showQuickToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'pill-btn';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '3000';
    toast.style.background = 'var(--accent-gradient)';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 6px 20px var(--accent-glow)';
    toast.style.fontWeight = '700';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  /* -------------------------------------------------------------
     ALARM MODAL & FORM LOGIC
     ------------------------------------------------------------- */
  initModalForm() {
    // Open Add Modal
    if (this.openAddAlarmBtn) {
      this.openAddAlarmBtn.addEventListener('click', () => this.openAddModal());
    }
    if (this.emptyAddBtn) {
      this.emptyAddBtn.addEventListener('click', () => this.openAddModal());
    }

    // Close Modal
    const closeModal = () => {
      this.stopTonePreview();
      if (this.alarmModal) {
        try {
          this.alarmModal.close();
        } catch (e) {
          this.alarmModal.removeAttribute('open');
        }
      }
    };

    if (this.closeModalBtn) this.closeModalBtn.addEventListener('click', closeModal);
    if (this.cancelModalBtn) this.cancelModalBtn.addEventListener('click', closeModal);

    // Live preview formatted time when time input changes
    if (this.alarmTimeInput) {
      this.alarmTimeInput.addEventListener('input', () => this.updateTimePreviewBadge());
    }

    // Volume range slider
    if (this.alarmVolumeRange && this.volumeValueLabel) {
      this.alarmVolumeRange.addEventListener('input', (e) => {
        this.volumeValueLabel.textContent = `${e.target.value}%`;
      });
    }

    // Tone select change listener (handles mute when 'none' is chosen)
    if (this.alarmToneSelect) {
      this.alarmToneSelect.addEventListener('change', () => {
        this.handleToneChange();
      });
    }

    if (this.alertStyleToneBtn) {
      this.alertStyleToneBtn.addEventListener('click', () => {
        this.setAlertStyle('tone');
      });
    }
    if (this.alertStyleBlinkBtn) {
      this.alertStyleBlinkBtn.addEventListener('click', () => {
        this.setAlertStyle('blinking');
      });
    }

    // Tone preview button
    if (this.previewToneBtn) {
      this.previewToneBtn.addEventListener('click', () => {
        this.toggleTonePreview();
      });
    }

    // Repeat Presets
    this.repeatPresetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.repeatPresetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const preset = chip.dataset.preset;
        this.applyRepeatPreset(preset);
        this.updateTimePreviewBadge();
      });
    });

    // Day checkboxes change
    this.dayCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        this.syncPresetChipsFromCheckboxes();
        this.updateTimePreviewBadge();
      });
    });

    // Form Submission
    if (this.alarmForm) {
      this.alarmForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }
  }

  
  setAlertStyle(style) {
    const isBlinking = style === 'blinking';
    if (this.alertStyleBlinkBtn) this.alertStyleBlinkBtn.classList.toggle('active', isBlinking);
    if (this.alertStyleToneBtn) this.alertStyleToneBtn.classList.toggle('active', !isBlinking);

    if (isBlinking) {
      if (this.alarmToneSelect) this.alarmToneSelect.value = 'none';
      if (this.toneSectionWrapper) this.toneSectionWrapper.classList.add('tone-section-muted');
    } else {
      if (this.alarmToneSelect && this.alarmToneSelect.value === 'none') {
        this.alarmToneSelect.value = 'grandfather-westminster';
      }
      if (this.toneSectionWrapper) this.toneSectionWrapper.classList.remove('tone-section-muted');
    }
    this.handleToneChange();
  }

  handleToneChange() {
    const isSilent = this.alarmToneSelect && this.alarmToneSelect.value === 'none';
    if (this.alertStyleBlinkBtn) this.alertStyleBlinkBtn.classList.toggle('active', isSilent);
    if (this.alertStyleToneBtn) this.alertStyleToneBtn.classList.toggle('active', !isSilent);
    if (this.toneSectionWrapper) this.toneSectionWrapper.classList.toggle('tone-section-muted', isSilent);

    if (isSilent) {
      if (this.alarmVolumeRange) this.alarmVolumeRange.disabled = true;
      if (this.volumeValueLabel) this.volumeValueLabel.textContent = 'Muted (0%)';
      if (this.previewToneLabel) this.previewToneLabel.textContent = 'Silent (Visual Only)';
    } else {
      if (this.alarmVolumeRange) {
        this.alarmVolumeRange.disabled = false;
        if (this.volumeValueLabel) this.volumeValueLabel.textContent = `${this.alarmVolumeRange.value}%`;
      }
      if (this.previewToneLabel) this.previewToneLabel.textContent = 'Preview Sound';
    }
  }

  openAddModal(defaults = {}) {
    this.alarmEditId.value = '';
    this.modalTitle.textContent = defaults.modalTitle || 'Set New Alarm';
    this.saveBtnLabel.textContent = 'Save Alarm';

    // Suggest default time: next 15 or 30 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    this.alarmTimeInput.value = `${h}:${m}`;
    this.alarmLabelInput.value = defaults.label || 'Board Meeting Alert';
    if (this.alarmMessageInput) {
      this.alarmMessageInput.value = defaults.message || 'Agenda checkpoint • Time limit reached for current topic';
    }
    this.alarmToneSelect.value = defaults.tone || 'grandfather-westminster';
    this.alarmSnoozeSelect.value = '5';
    this.alarmVolumeRange.value = '80';
    this.volumeValueLabel.textContent = '80%';
    if (this.alarmAutoDismissSelect) {
      this.alarmAutoDismissSelect.value = defaults.autoDismissSeconds !== undefined ? String(defaults.autoDismissSeconds) : '10';
    }
    this.setAlertStyle(defaults.tone === 'none' || defaults.isBlinking ? 'blinking' : 'tone');

    // Default: Every day or Weekdays for meetings
    this.applyRepeatPreset(defaults.label ? 'weekdays' : 'daily');

    this.handleToneChange();
    this.updateTimePreviewBadge();
    this.stopTonePreview();

    try {
      this.alarmModal.showModal();
    } catch (e) {
      this.alarmModal.setAttribute('open', '');
    }
  }

  openEditModal(alarm) {
    this.alarmEditId.value = alarm.id;
    this.modalTitle.textContent = 'Edit Alarm';
    this.saveBtnLabel.textContent = 'Update Alarm';

    this.alarmTimeInput.value = alarm.time;
    this.alarmLabelInput.value = alarm.label || '';
    if (this.alarmMessageInput) {
      this.alarmMessageInput.value = alarm.message || '';
    }
    this.alarmToneSelect.value = alarm.tone || 'grandfather-westminster';
    this.alarmSnoozeSelect.value = String(alarm.snoozeMinutes || 5);
    this.alarmVolumeRange.value = String(alarm.volume !== undefined ? alarm.volume : 80);
    this.volumeValueLabel.textContent = `${alarm.volume || 80}%`;
    if (this.alarmAutoDismissSelect) {
      this.alarmAutoDismissSelect.value = String(alarm.autoDismissSeconds !== undefined ? alarm.autoDismissSeconds : 10);
    }
    this.setAlertStyle(alarm.tone === 'none' || alarm.isBlinking ? 'blinking' : 'tone');

    // Set day checkboxes
    this.dayCheckboxes.forEach(cb => {
      cb.checked = alarm.repeatDays.includes(Number(cb.value));
    });

    this.handleToneChange();
    this.syncPresetChipsFromCheckboxes();
    this.updateTimePreviewBadge();
    this.stopTonePreview();

    try {
      this.alarmModal.showModal();
    } catch (e) {
      this.alarmModal.setAttribute('open', '');
    }
  }

  applyRepeatPreset(preset) {
    this.repeatPresetChips.forEach(c => {
      c.classList.toggle('active', c.dataset.preset === preset);
    });

    switch (preset) {
      case 'once':
        this.dayCheckboxes.forEach(cb => cb.checked = false);
        break;
      case 'daily':
        this.dayCheckboxes.forEach(cb => cb.checked = true);
        break;
      case 'weekdays':
        this.dayCheckboxes.forEach(cb => {
          const val = Number(cb.value);
          cb.checked = val >= 1 && val <= 5;
        });
        break;
      case 'weekends':
        this.dayCheckboxes.forEach(cb => {
          const val = Number(cb.value);
          cb.checked = val === 0 || val === 6;
        });
        break;
    }
  }

  syncPresetChipsFromCheckboxes() {
    const checkedDays = Array.from(this.dayCheckboxes).filter(cb => cb.checked).map(cb => Number(cb.value));
    let matched = '';

    if (checkedDays.length === 0) matched = 'once';
    else if (checkedDays.length === 7) matched = 'daily';
    else if (checkedDays.length === 5 && !checkedDays.includes(0) && !checkedDays.includes(6)) matched = 'weekdays';
    else if (checkedDays.length === 2 && checkedDays.includes(0) && checkedDays.includes(6)) matched = 'weekends';

    this.repeatPresetChips.forEach(c => {
      c.classList.toggle('active', c.dataset.preset === matched);
    });
  }

  updateTimePreviewBadge() {
    const timeStr = this.alarmTimeInput.value;
    if (!timeStr) return;

    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;

    const is24 = window.chronosClock ? window.chronosClock.is24Hour : false;
    const formatted = is24
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      : `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

    if (this.timeFormattedPreview) {
      this.timeFormattedPreview.textContent = formatted;
    }

    // Target delta hint
    if (this.alarmTargetDeltaHint) {
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);

      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let hint = 'Rings in ';
      if (diffHrs > 0) hint += `${diffHrs}h `;
      hint += `${diffMins}m`;

      this.alarmTargetDeltaHint.textContent = `${hint} (at ${formatted})`;
    }
  }

  toggleTonePreview() {
    if (this.isPreviewing) {
      this.stopTonePreview();
    } else {
      const toneId = this.alarmToneSelect.value;
      if (toneId === 'none') {
        this.showQuickToast('🔕 Silent Mode selected - No audio will play.');
        return;
      }

      const vol = Number(this.alarmVolumeRange.value);

      if (window.chronosAudio) {
        this.isPreviewing = true;
        this.previewToneBtn.classList.add('is-playing');
        this.previewToneLabel.textContent = 'Stop';
        this.previewPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

        window.chronosAudio.preview(toneId, vol, () => {
          this.stopTonePreview();
        });
      }
    }
  }

  stopTonePreview() {
    this.isPreviewing = false;
    if (window.chronosAudio) {
      window.chronosAudio.stop();
    }
    if (this.previewToneBtn) {
      this.previewToneBtn.classList.remove('is-playing');
      const isSilent = this.alarmToneSelect && this.alarmToneSelect.value === 'none';
      this.previewToneLabel.textContent = isSilent ? 'Silent (Visual Only)' : 'Preview Sound';
      this.previewPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    }
  }

  handleFormSubmit() {
    const timeVal = this.alarmTimeInput.value;
    if (!timeVal) return;

    const checkedDays = Array.from(this.dayCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => Number(cb.value));

    const alarmData = {
      id: this.alarmEditId.value || undefined,
      time: timeVal,
      label: this.alarmLabelInput.value.trim() || 'Meeting Alert',
      message: this.alarmMessageInput ? this.alarmMessageInput.value.trim() : '',
      tone: this.alarmToneSelect.value,
      volume: Number(this.alarmVolumeRange.value) || 80,
      snoozeMinutes: Number(this.alarmSnoozeSelect.value) || 5,
      autoDismissSeconds: this.alarmAutoDismissSelect ? Number(this.alarmAutoDismissSelect.value) : 10,
      isBlinking: this.alarmToneSelect.value === 'none',
      repeatDays: checkedDays,
      enabled: true
    };

    if (window.chronosAlarms) {
      window.chronosAlarms.saveAlarmItem(alarmData);
    }

    this.stopTonePreview();
    try {
      this.alarmModal.close();
    } catch (e) {
      this.alarmModal.removeAttribute('open');
    }

    this.showQuickToast(alarmData.id ? 'Meeting alert updated!' : 'New meeting alert scheduled!');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.chronosApp = new ChronosApp();
});
