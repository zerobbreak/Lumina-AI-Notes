const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loginInBrowser: () => ipcRenderer.send('login-in-browser'),
  onAuthTicket: (callback) => {
    const listener = (_event, ticket) => callback(ticket);
    ipcRenderer.on('auth-ticket', listener);
    return () => ipcRenderer.removeListener('auth-ticket', listener);
  },
});
