const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, screen, nativeImage, dialog } = require('electron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

// Identify app in Windows Action Center & Notification settings
app.setAppUserModelId('com.chronos.meetingclock');

let mainWindow = null;
let alertWindow = null;
let tray = null;
let userAlwaysOnTop = false;
let machineId = null;

// -------------------------------------------------------------
// MACHINE LOCK — Hardware Fingerprint
// -------------------------------------------------------------
function generateMachineFingerprint() {
  const hostname = os.hostname();
  const cpuModel = os.cpus().length > 0 ? os.cpus()[0].model : 'unknown-cpu';
  const totalMem = os.totalmem().toString();
  const username = os.userInfo().username;
  // Get the first non-internal MAC address
  const nets = os.networkInterfaces();
  let mac = '00:00:00:00:00:00';
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name]) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        mac = iface.mac;
        break;
      }
    }
    if (mac !== '00:00:00:00:00:00') break;
  }
  const raw = `${hostname}|${cpuModel}|${totalMem}|${username}|${mac}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function verifyMachineLock() {
  machineId = generateMachineFingerprint();
  const licenseFile = path.join(__dirname, '.chronos-license');

  if (fs.existsSync(licenseFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(licenseFile, 'utf-8'));
      if (data.machineId && data.machineId !== machineId) {
        dialog.showErrorBox(
          'Chronos — Machine Lock',
          `This copy of Chronos is licensed to a different machine.\n\nStored ID: ${data.machineId.substring(0, 16)}…\nThis machine: ${machineId.substring(0, 16)}…\n\nThe application will now exit.`
        );
        app.exit(1);
        return false;
      }
    } catch (e) {
      // Corrupted file — regenerate
      fs.writeFileSync(licenseFile, JSON.stringify({ machineId, createdAt: new Date().toISOString() }, null, 2));
    }
  } else {
    // First launch — write the fingerprint
    fs.writeFileSync(licenseFile, JSON.stringify({ machineId, createdAt: new Date().toISOString() }, null, 2));
  }
  return true;
}

// Ensure only one instance runs at a time
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Verify machine lock before creating any windows
    if (!verifyMachineLock()) return;

    createMainWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

function createMainWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 460,
    minHeight: 640,
    backgroundColor: '#0b0f19',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Do not freeze timers or sweep when minimized
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    // If not quitting explicitly, minimize to tray
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && !tray.isDestroyed()) {
        tray.displayBalloon?.({
          title: 'CHRONOS Clock Running',
          content: 'Chronos is running in the background. Meeting alarms will pop up on time!'
        });
      }
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('CHRONOS • Board Meeting Dual Clock & Alarms');

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Chronos',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Keep Always On Top',
        type: 'checkbox',
        checked: userAlwaysOnTop,
        click: (item) => {
          userAlwaysOnTop = item.checked;
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(userAlwaysOnTop, 'floating');
            mainWindow.webContents.send('window:always-on-top-changed', userAlwaysOnTop);
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Test Alarm Popup',
        click: () => {
          showAlarmPopup({
            time: '12:00 PM',
            label: 'Test Meeting Alarm',
            message: 'Popup test running over all desktop screens.',
            snoozeMinutes: 5
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Chronos',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * Spawns an always-on-top floating alarm popup over ANY screen,
 * without forcing the main window to open or steal focus if it is not open.
 */
function showAlarmPopup(alarm) {
  // 1. Dedicated custom alert window is the primary popup (avoids generic system notifications)
  // Native OS notification is disabled so only the custom Chronos popup displays

  // 2. Gently flash taskbar icon without restoring, un-minimizing, or showing mainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(true);
  }

  // 3. Open dedicated Floating Always-On-Top Alert Window on current display
  try {
    if (alertWindow && !alertWindow.isDestroyed()) {
      alertWindow.close();
    }

    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { x, y, width, height } = currentDisplay.workArea;

    const popW = 420;
    const popH = 260;
    const popX = Math.round(x + (width - popW) / 2);
    const popY = Math.round(y + height * 0.12);

    alertWindow = new BrowserWindow({
      width: popW,
      height: popH,
      x: popX,
      y: popY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    alertWindow.setAlwaysOnTop(true, 'screen-saver');
    alertWindow.loadFile('alert-popup.html');

    alertWindow.webContents.on('did-finish-load', () => {
      if (alertWindow && !alertWindow.isDestroyed()) {
        alertWindow.webContents.send('alert:data', alarm);
        alertWindow.show();
        alertWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Could not open floating alert window:', err);
  }
}

function dismissAlarmPopup() {
  if (alertWindow && !alertWindow.isDestroyed()) {
    alertWindow.close();
    alertWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(false);
    mainWindow.setAlwaysOnTop(userAlwaysOnTop, userAlwaysOnTop ? 'floating' : 'normal');
  }
}

// -------------------------------------------------------------
// IPC Communication with Renderer
// -------------------------------------------------------------

// Alarm triggered from alarms.js
ipcMain.on('alarm:trigger', (_event, alarm) => {
  showAlarmPopup(alarm);
});

// Alarm stopped/snoozed/dismissed
ipcMain.on('alarm:stop', () => {
  dismissAlarmPopup();
});

// Test notification
ipcMain.on('alarm:test', (_event, alarm) => {
  showAlarmPopup(alarm);
});

// Actions from the floating alert popup window (snooze / dismiss)
ipcMain.on('alert:action', (_event, action) => {
  dismissAlarmPopup();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('alarm:action', action);
  }
});

// Always on top toggle
ipcMain.on('window:set-always-on-top', (_event, flag) => {
  userAlwaysOnTop = Boolean(flag);
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(userAlwaysOnTop, userAlwaysOnTop ? 'floating' : 'normal');
    mainWindow.webContents.send('window:always-on-top-changed', userAlwaysOnTop);
  }
});

ipcMain.handle('window:get-always-on-top', () => {
  return userAlwaysOnTop;
});

// Machine ID for renderer
ipcMain.handle('machine:get-id', () => {
  return machineId;
});

// Minimize to tray
ipcMain.on('window:minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
