import path from "node:path";
import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";

const MAIN_JS = path.join(__dirname, "../../electron/main.js");
const FIXTURE_URL = `file://${path.join(__dirname, "fixtures/auth-fixture.html")}`;

let electronApp: ElectronApplication;
let window: Page;

test.beforeEach(async () => {
  electronApp = await electron.launch({
    args: [MAIN_JS],
    env: {
      ...process.env,
      NODE_ENV: "development",
      ELECTRON_TEST_URL: FIXTURE_URL,
    },
  });
  window = await electronApp.firstWindow();
  await window.waitForLoadState("domcontentloaded");
});

test.afterEach(async () => {
  await electronApp.close();
});

async function beginBrowserLogin() {
  await electronApp.evaluate(({ shell }) => {
    (shell as unknown as { openExternal: (url: string) => Promise<void> }).openExternal = async (url) => {
      (globalThis as typeof globalThis & { __openedAuthUrl?: string }).__openedAuthUrl = url;
    };
  });
  await window.evaluate(() =>
    (globalThis as typeof globalThis & { electronAPI?: { loginInBrowser: () => void } }).electronAPI?.loginInBrowser(),
  );
  const url = await electronApp.evaluate(() =>
    (globalThis as typeof globalThis & { __openedAuthUrl?: string }).__openedAuthUrl,
  );
  expect(url).toBeTruthy();
  return url!;
}

function callbackUrl(ticket: string, browserLoginUrl: string) {
  const state = new URL(browserLoginUrl).searchParams.get("state");
  expect(state).toBeTruthy();
  return `lumina-notes://auth?ticket=${encodeURIComponent(ticket)}&state=${encodeURIComponent(state!)}`;
}

test("preload exposes a locked-down electronAPI bridge to the renderer", async () => {
  await expect(window.locator("#api-status")).toHaveText("api-ready");

  const webPreferences = await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    // getLastWebPreferences() is undocumented/untyped but is the only way to
    // read back the *effective* webPreferences Electron applied to the window.
    const prefs = (win.webContents as unknown as { getLastWebPreferences(): Electron.WebPreferences }).getLastWebPreferences();
    return {
      nodeIntegration: prefs.nodeIntegration,
      contextIsolation: prefs.contextIsolation,
    };
  });
  expect(webPreferences.nodeIntegration).toBe(false);
  expect(webPreferences.contextIsolation).toBe(true);
});

test("a lumina-notes://auth deep link delivers the ticket to the renderer over IPC", async () => {
  const testTicket = "test-ticket-123";
  const loginUrl = await beginBrowserLogin();

  await electronApp.evaluate(({ app }, url) => {
    app.emit("open-url", { preventDefault() {} }, url);
  }, callbackUrl(testTicket, loginUrl));

  await expect(window.locator("#ticket-status")).toHaveText(`ticket:${testTicket}`);
});

test("an unsolicited auth ticket without this app's login state is ignored", async () => {
  await electronApp.evaluate(({ app }) => {
    app.emit(
      "open-url",
      { preventDefault() {} },
      "lumina-notes://auth?ticket=attacker-ticket&state=attacker-state",
    );
  });

  await window.waitForTimeout(200);
  await expect(window.locator("#ticket-status")).toHaveText("no-ticket");
});

test("a ticket that arrives before the page subscribes is delivered once it does", async () => {
  const loginUrl = await beginBrowserLogin();
  await window.goto("about:blank");

  await electronApp.evaluate(({ app }, url) => {
    app.emit("open-url", { preventDefault() {} }, url);
  }, callbackUrl("early-ticket", loginUrl));

  await window.goto(FIXTURE_URL);
  await expect(window.locator("#ticket-status")).toHaveText("ticket:early-ticket");
});

test("a ticket is handed over only once", async () => {
  const loginUrl = await beginBrowserLogin();
  await electronApp.evaluate(({ app }, url) => {
    app.emit("open-url", { preventDefault() {} }, url);
  }, callbackUrl("once-ticket", loginUrl));
  await expect(window.locator("#ticket-status")).toHaveText("ticket:once-ticket");

  await window.reload();
  await expect(window.locator("#api-status")).toHaveText("api-ready");
  // Give a stray re-delivery time to show up before asserting it didn't.
  await window.waitForTimeout(500);
  await expect(window.locator("#ticket-status")).toHaveText("no-ticket");
});
