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

test("preload exposes a locked-down electronAPI bridge to the renderer", async () => {
  await expect(window.locator("#api-status")).toHaveText("api-ready");

  const webPreferences = await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return {
      nodeIntegration: win.webContents.getLastWebPreferences().nodeIntegration,
      contextIsolation: win.webContents.getLastWebPreferences().contextIsolation,
    };
  });
  expect(webPreferences.nodeIntegration).toBe(false);
  expect(webPreferences.contextIsolation).toBe(true);
});

test("a lumina-notes://auth deep link delivers the ticket to the renderer over IPC", async () => {
  const testTicket = "test-ticket-123";

  await electronApp.evaluate(({ app }, url) => {
    app.emit("open-url", { preventDefault() {} }, url);
  }, `lumina-notes://auth?ticket=${testTicket}`);

  await expect(window.locator("#ticket-status")).toHaveText(`ticket:${testTicket}`);
});
