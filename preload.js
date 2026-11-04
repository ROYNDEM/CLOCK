const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chronosDesktop', {
  isDesktop: true,

  // Alarm lifecycle events
  triggerAlarm: (alarm) => ipcRenderer.send('alarm:trigger', alarm),
  stopAlarm: () => ipcRenderer.send('alarm:stop'),
  testNotification: (alarm) => ipcRenderer.send('alarm:test', alarm),

  // Window controls
  setAlwaysOnTop: (flag) => ipcRenderer.send('window:set-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  minimizeToTray: () => ipcRenderer.send('window:minimize-to-tray'),

  // Machine lock
  getMachineId: () => ipcRenderer.invoke('machine:get-id'),

  // Listeners from Main process (e.g. from System Tray or Alert Window)
  onAlarmAction: (callback) => {
    ipcRenderer.on('alarm:action', (_event, action) => callback(action));
  },
  onToggleAlwaysOnTop: (callback) => {
    ipcRenderer.on('window:always-on-top-changed', (_event, isAlwaysOnTop) => callback(isAlwaysOnTop));
  }
});
