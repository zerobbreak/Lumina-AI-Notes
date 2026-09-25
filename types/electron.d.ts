// Exposed by electron/preload.js when the app runs inside the desktop shell.
export {};

declare global {
  interface Window {
    electronAPI?: {
      loginInBrowser: () => void;
      onAuthTicket: (callback: (ticket: string) => void) => () => void;
    };
  }
}
