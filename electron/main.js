const { app, BrowserWindow, ipcMain, shell, Menu, utilityProcess } = require('electron');
const path = require('path');
const net = require('net');

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
let serverProcess;
let serverPort;

// Packaged builds bundle a real Next.js server (see scripts/prepare-electron-server.js
// and npm run build:electron-server) rather than a static export — Clerk's App Router
// integration doesn't support `output: export`. utilityProcess is Electron's sandboxed
// way to run a Node.js script without the RunAsNode fuse we deliberately keep disabled
// (see forge.config.js).
function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Bundled server did not start within ${timeoutMs}ms`));
        } else {
          setTimeout(tryConnect, 150);
        }
      });
    };
    tryConnect();
  });
}

async function startBundledServer() {
  if (serverProcess) return;

  serverPort = await getFreePort();
  const serverEntry = path.join(process.resourcesPath, 'standalone', 'server.js');

  // Don't set HOSTNAME here: Next's standalone server.js internally
  // self-proxies requests to a hardcoded `localhost:PORT` target, and
  // binding the listener to a specific address (e.g. 127.0.0.1) instead of
  // the default 0.0.0.0 makes that self-proxy step fail with ECONNREFUSED
  // and crash the process on the very first request. Confirmed by testing
  // both ways directly against the built server.
  serverProcess = utilityProcess.fork(serverEntry, [], {
    env: { ...process.env, PORT: String(serverPort) },
    stdio: 'pipe',
  });

  serverProcess.stderr?.on('data', (chunk) => console.error('[next-server]', chunk.toString()));
  serverProcess.on('exit', (code) => console.error('Bundled Next.js server exited with code', code));

  await waitForServer(serverPort);
}

async function createWindow() {
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
    // Clerk/Convex credentials, a running dev server, or the bundled server.
    mainWindow.loadURL(process.env.ELECTRON_TEST_URL);
    return;
  }

  // Desktop builds skip the marketing landing page — Clerk's <SignIn/> renders
  // straight into the window and forceRedirectUrl="/dashboard" (see
  // app/(auth)/sign-in) takes over from there, including for an
  // already-authenticated session restored from a previous launch.
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/sign-in');
    mainWindow.webContents.openDevTools();
    return;
  }

  try {
    await startBundledServer();
    mainWindow.loadURL(`http://127.0.0.1:${serverPort}/sign-in`);
  } catch (error) {
    console.error('Failed to start the bundled Next.js server:', error);
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

app.on('before-quit', () => {
  serverProcess?.kill();
});

ipcMain.on('login-in-browser', () => {
  const authUrl = isDev ? 'http://localhost:3000/electron-auth' : 'https://luminanotes.ai/electron-auth';
  shell.openExternal(authUrl);
});
