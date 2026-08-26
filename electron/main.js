const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const protocol = 'lumina-notes';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(protocol);
}

let mainWindow;

function getStaticPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'out');
  }
  return path.join(__dirname, '../out');
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
  // (fonts, Clerk, Convex) — reveal it only once there's something to see.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.ELECTRON_TEST_URL) {
    // Test-only hook (see tests/electron): loads a lightweight fixture instead
    // of the real Next.js app, so the shell can be tested without live
    // Clerk/Convex credentials or a running dev server.
    mainWindow.loadURL(process.env.ELECTRON_TEST_URL);
  } else if (isDev) {
    // Desktop builds skip the marketing landing page — Clerk's <SignIn/>
    // renders straight into the window and forceRedirectUrl="/dashboard"
    // (see app/(auth)/sign-in) takes over from there, including for an
    // already-authenticated session restored from a previous launch.
    mainWindow.loadURL('http://localhost:3000/sign-in');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(getStaticPath(), 'sign-in', 'index.html'));
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.pop();
    if (url && url.startsWith(`${protocol}://`)) {
      handleAuthUrl(url);
    }
  });

  app.whenReady().then(() => {
    // Hide default File/Edit/View… bar — web UI carries the product chrome.
    Menu.setApplicationMenu(null);
    createWindow();
  });
}

function handleAuthUrl(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname === 'auth') {
    const ticket = parsedUrl.searchParams.get('ticket');
    if (ticket && mainWindow) {
      mainWindow.webContents.send('auth-ticket', ticket);
    }
  }
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

ipcMain.on('login-in-browser', () => {
  const authUrl = isDev ? 'http://localhost:3000/electron-auth' : 'https://luminanotes.ai/electron-auth';
  shell.openExternal(authUrl);
});
