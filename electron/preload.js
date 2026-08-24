const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loginInBrowser: () => ipcRenderer.send('login-in-browser'),
  onAuthToken: (callback) => ipcRenderer.on('auth-token', (_event, token) => callback(token)),
});
