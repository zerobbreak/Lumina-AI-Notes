const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loginInBrowser: () => ipcRenderer.send('login-in-browser'),
  // Calls back with each sign-in ticket from a lumina-notes://auth deep link,
  // including one that arrived before this was subscribed (see electron/main.js).
  onAuthTicket: (callback) => {
    const take = async () => {
      const ticket = await ipcRenderer.invoke('take-auth-ticket');
      if (ticket) callback(ticket);
    };
    const listener = () => void take();
    ipcRenderer.on('auth-ticket-available', listener);
    void take();
    return () => ipcRenderer.removeListener('auth-ticket-available', listener);
  },
});
