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
    this.alarmToneSelect = document.getElementById('alarmToneSelect');
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

    this.initAudioUnblocker();
    this.initViewModes();
    this.initThemes();
    this.initModalForm();
    this.initQuickNaps();
    this.initNotifications();
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
     NOTIFICATIONS PERMISSION
     ------------------------------------------------------------- */
  initNotifications() {
    if (!('Notification' in window) && this.notifPermBtn) {
      this.notifPermBtn.style.display = 'none';
      return;
    }

    this.updateNotifBtnState();

    if (this.notifPermBtn) {
      this.notifPermBtn.addEventListener('click', async () => {
        if (Notification.permission === 'default') {
          const res = await Notification.requestPermission();
          this.updateNotifBtnState();
          if (res === 'granted') {
            new Notification('CHRONOS Clocks', {
              body: 'Alarm notifications are now enabled!',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="12" r="10"/></svg>'
            });
          }
        } else if (Notification.permission === 'granted') {
          alert('Notification alerts for alarms are already enabled on this device.');
        } else {
          alert('Notifications were blocked in your browser settings. Please enable them in site settings.');
        }
      });
    }
  }

  updateNotifBtnState() {
    if (!this.notifPermBtn) return;
    if (Notification.permission === 'granted') {
      this.notifPermBtn.style.color = 'var(--accent-secondary)';
      this.notifPermBtn.title = 'Desktop Notifications: Active';
    } else {
      this.notifPermBtn.style.color = 'var(--text-muted)';
      this.notifPermBtn.title = 'Click to enable System Notifications';
    }
  }

  /* -------------------------------------------------------------
     QUICK NAP PRESETS
     ------------------------------------------------------------- */
  initQuickNaps() {
    const quickButtons = document.querySelectorAll('.quick-chip-btn');
    quickButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.dataset.quickMinutes);
        if (mins && window.chronosAlarms) {
          window.chronosAlarms.addQuickAlarm(mins);
          this.showQuickToast(`Added ${mins}m nap alarm!`);
        }
      });
    });
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

  openAddModal() {
    this.alarmEditId.value = '';
    this.modalTitle.textContent = 'Set New Alarm';
    this.saveBtnLabel.textContent = 'Save Alarm';

    // Suggest default time: next half hour
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    this.alarmTimeInput.value = `${h}:${m}`;
    this.alarmLabelInput.value = 'Wake Up';
    this.alarmToneSelect.value = 'crystal-chime';
    this.alarmSnoozeSelect.value = '10';
    this.alarmVolumeRange.value = '80';
    this.volumeValueLabel.textContent = '80%';

    // Default: Every day
    this.applyRepeatPreset('daily');

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
    this.alarmToneSelect.value = alarm.tone || 'crystal-chime';
    this.alarmSnoozeSelect.value = String(alarm.snoozeMinutes || 10);
    this.alarmVolumeRange.value = String(alarm.volume || 80);
    this.volumeValueLabel.textContent = `${alarm.volume || 80}%`;

    // Set day checkboxes
    this.dayCheckboxes.forEach(cb => {
      cb.checked = alarm.repeatDays.includes(Number(cb.value));
    });

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
      this.previewToneLabel.textContent = 'Preview Sound';
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
      label: this.alarmLabelInput.value.trim() || 'Alarm',
      tone: this.alarmToneSelect.value,
      volume: Number(this.alarmVolumeRange.value) || 80,
      snoozeMinutes: Number(this.alarmSnoozeSelect.value) || 10,
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

    this.showQuickToast(alarmData.id ? 'Alarm updated!' : 'New alarm scheduled!');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.chronosApp = new ChronosApp();
});
