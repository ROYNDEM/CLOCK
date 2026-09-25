/**
 * CHRONOS CLOCK CONTROLLER
 * High-precision dual Analog and Digital clock updater with smooth 60FPS sweeping second hand.
 */

class ChronosClock {
  constructor() {
    this.is24Hour = localStorage.getItem('chronos_format') === '24h';
    this.animationFrameId = null;

    // DOM Elements - Analog
    this.dialTicksGroup = document.getElementById('dialTicksGroup');
    this.hourHand = document.getElementById('hourHand');
    this.minuteHand = document.getElementById('minuteHand');
    this.secondHandGroup = document.getElementById('secondHandGroup');
    this.alarmTargetMarker = document.getElementById('alarmTargetMarker');

    // DOM Elements - Digital
    this.digitalHours = document.getElementById('digitalHours');
    this.digitalMinutes = document.getElementById('digitalMinutes');
    this.digitalSeconds = document.getElementById('digitalSeconds');
    this.digitalMillis = document.getElementById('digitalMillis');
    this.digitalAmpm = document.getElementById('digitalAmpm');
    this.ampmContainer = document.getElementById('ampmContainer');
    this.digitalDayOfWeek = document.getElementById('digitalDayOfWeek');
    this.digitalFullDate = document.getElementById('digitalFullDate');
    this.secondsProgressBar = document.getElementById('secondsProgressBar');
    this.formatToggleBtn = document.getElementById('formatToggleBtn');
    this.currentFormatLabel = document.getElementById('currentFormatLabel');

    this.initTicks();
    this.initFormatToggle();
    this.startLoop();
  }

  /**
   * Procedurally generate 60 precision SVG tick marks around the dial.
   */
  initTicks() {
    if (!this.dialTicksGroup) return;
    this.dialTicksGroup.innerHTML = '';

    const cx = 180;
    const cy = 180;
    const radius = 158;

    for (let i = 0; i < 60; i++) {
      const angleDeg = i * 6;
      const angleRad = (angleDeg - 90) * (Math.PI / 180);
      const isMajor = i % 5 === 0;
      const tickLength = isMajor ? 12 : 6;

      const x1 = cx + (radius - tickLength) * Math.cos(angleRad);
      const y1 = cy + (radius - tickLength) * Math.sin(angleRad);
      const x2 = cx + radius * Math.cos(angleRad);
      const y2 = cy + radius * Math.sin(angleRad);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toFixed(2));
      line.setAttribute('y1', y1.toFixed(2));
      line.setAttribute('x2', x2.toFixed(2));
      line.setAttribute('y2', y2.toFixed(2));
      line.setAttribute('class', isMajor ? 'tick-major' : 'tick-minor');

      this.dialTicksGroup.appendChild(line);
    }
  }

  initFormatToggle() {
    this.updateFormatUI();
    if (this.formatToggleBtn) {
      this.formatToggleBtn.addEventListener('click', () => {
        this.is24Hour = !this.is24Hour;
        localStorage.setItem('chronos_format', this.is24Hour ? '24h' : '12h');
        this.updateFormatUI();
        window.dispatchEvent(new CustomEvent('chronos:formatchanged', { detail: { is24Hour: this.is24Hour } }));
      });
    }
  }

  updateFormatUI() {
    if (this.currentFormatLabel) {
      this.currentFormatLabel.textContent = this.is24Hour ? '24H' : '12H';
    }
    if (this.ampmContainer) {
      this.ampmContainer.style.display = this.is24Hour ? 'none' : 'flex';
    }
  }

  /**
   * Main 60FPS animation loop for ultra-smooth fluid sweeps.
   */
  startLoop() {
    const tick = () => {
      const now = new Date();
      this.renderAnalog(now);
      this.renderDigital(now);
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  renderAnalog(now) {
    const ms = now.getMilliseconds();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    // Fractional sweep angles
    const secondFraction = seconds + ms / 1000;
    const secondAngle = secondFraction * 6; // 360 / 60 = 6 deg/sec

    const minuteFraction = minutes + secondFraction / 60;
    const minuteAngle = minuteFraction * 6;

    const hourFraction = (hours % 12) + minuteFraction / 60;
    const hourAngle = hourFraction * 30; // 360 / 12 = 30 deg/hr

    if (this.secondHandGroup) {
      this.secondHandGroup.style.transform = `rotate(${secondAngle}deg)`;
    }
    if (this.minuteHand) {
      this.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    }
    if (this.hourHand) {
      this.hourHand.style.transform = `rotate(${hourAngle}deg)`;
    }
  }

  renderDigital(now) {
    const rawHours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();

    // 12 vs 24 hour calculations
    let displayHours = rawHours;
    let ampm = 'AM';

    if (!this.is24Hour) {
      ampm = rawHours >= 12 ? 'PM' : 'AM';
      displayHours = rawHours % 12;
      if (displayHours === 0) displayHours = 12;
    }

    const pad = (n) => String(n).padStart(2, '0');

    if (this.digitalHours) this.digitalHours.textContent = pad(displayHours);
    if (this.digitalMinutes) this.digitalMinutes.textContent = pad(minutes);
    if (this.digitalSeconds) this.digitalSeconds.textContent = pad(seconds);
    if (this.digitalAmpm) this.digitalAmpm.textContent = ampm;

    // 2-digit millis (.00 to .99)
    if (this.digitalMillis) {
      const centis = Math.floor(ms / 10);
      this.digitalMillis.textContent = `.${pad(centis)}`;
    }

    // Second progress bar (0% to 100%)
    if (this.secondsProgressBar) {
      const secondProgressPercent = ((seconds + ms / 1000) / 60) * 100;
      this.secondsProgressBar.style.width = `${secondProgressPercent.toFixed(1)}%`;
    }

    // Date formatting (cached check every second)
    if (seconds !== this._lastSec) {
      this._lastSec = seconds;
      this.updateDateDisplay(now);
    }
  }

  updateDateDisplay(now) {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    if (this.digitalDayOfWeek) {
      this.digitalDayOfWeek.textContent = dayNames[now.getDay()];
    }
    if (this.digitalFullDate) {
      const month = monthNames[now.getMonth()];
      const day = now.getDate();
      const year = now.getFullYear();
      this.digitalFullDate.textContent = `${month} ${day}, ${year}`;
    }
  }

  /**
   * Set upcoming alarm position indicator on the analog bezel.
   */
  setAlarmMarkerAngle(angleDeg) {
    if (!this.alarmTargetMarker) return;
    if (angleDeg === null) {
      this.alarmTargetMarker.classList.add('hidden');
    } else {
      this.alarmTargetMarker.classList.remove('hidden');
      this.alarmTargetMarker.style.transform = `rotate(${angleDeg}deg)`;
    }
  }
}

// Global clock instance
window.chronosClock = new ChronosClock();
