const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const protocol = 'lumina-notes';

// The desktop app is a window onto the deployed web app (lumina-web on Railway),
// which talks to the Express API through its /api/v1 rewrite. Nothing is bundled:
// the web server needs CLERK_SECRET_KEY and UPLOADTHING_TOKEN, and shipping those
// inside an installer would leak them. LUMINA_APP_URL points it somewhere else.
const appUrl = (
  process.env.LUMINA_APP_URL ||
  (isDev ? 'http://localhost:3000' : 'https://lumina-web-production-e6ce.up.railway.app')
).replace(/\/$/, '');
const appOrigin = new URL(appUrl).origin;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(protocol);
}

let mainWindow;
// A sign-in ticket from a lumina-notes://auth deep link, held until the page's
// ElectronAuthBridge takes it. Clerk may still be loading when the link arrives
// (or the link launched the app), so a plain push would be dropped.
let pendingTicket = null;

function offlinePage() {
  const html = `<!doctype html><meta charset="utf-8"><title>Lumina Notes</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#050a14;color:#cbd5e1;font:15px system-ui,sans-serif">
<div style="text-align:center"><p style="font-size:18px;color:#f1f5f9">Can't reach Lumina Notes</p>
<p>Check your internet connection and try again.</p>
<button onclick="location.href='${appUrl}/sign-in'" style="padding:8px 18px;border:0;border-radius:6px;background:#6366f1;color:#fff;font:inherit;cursor:pointer">Retry</button></div>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#050a14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Don't show a blank/white window while the page is still loading
  // (fonts, Clerk) — reveal it only once there's something to see.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Links to other sites (docs, GitHub, share links opened in a new tab) belong
  // in the system browser, not in a second app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin !== appOrigin && /^https?:/.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _description, url, isMainFrame) => {
    // -3 is ERR_ABORTED: a redirect or a navigation replacing this one, not a failure.
    if (isMainFrame && errorCode !== -3 && url.startsWith(appOrigin)) {
      mainWindow.loadURL(offlinePage());
    }
  });

  if (process.env.ELECTRON_TEST_URL) {
    // Test-only hook (see tests/electron): loads a lightweight fixture instead
    // of the real app, so the shell can be tested without Clerk credentials or
    // a running web server.
    mainWindow.loadURL(process.env.ELECTRON_TEST_URL);
    return;
  }

  // Skip the marketing landing page — Clerk's <SignIn/> renders straight into
  // the window and forceRedirectUrl="/dashboard" (see app/(auth)/sign-in) takes
  // over from there, including for a session restored from a previous launch.
  mainWindow.loadURL(`${appUrl}/sign-in`);
  if (isDev) mainWindow.webContents.openDevTools();
}

function handleAuthUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }
  if (parsedUrl.hostname !== 'auth') return;

  const ticket = parsedUrl.searchParams.get('ticket');
  if (!ticket) return;
  pendingTicket = ticket;
  mainWindow?.webContents.send('auth-ticket-available');
}

function findProtocolUrl(argv) {
  return argv.find((arg) => arg.startsWith(`${protocol}://`));
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = findProtocolUrl(commandLine);
    if (url) handleAuthUrl(url);
  });

  app.whenReady().then(() => {
    // Hide default File/Edit/View… bar — web UI carries the product chrome.
    Menu.setApplicationMenu(null);
    // Windows/Linux: a deep link that launched the app arrives in argv.
    const launchUrl = findProtocolUrl(process.argv);
    if (launchUrl) handleAuthUrl(launchUrl);
    createWindow();
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith(`${protocol}://`)) {
    handleAuthUrl(url);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('take-auth-ticket', () => {
  const ticket = pendingTicket;
  pendingTicket = null;
  return ticket;
});

ipcMain.on('login-in-browser', () => {
  shell.openExternal(`${appUrl}/electron-auth`);
});
