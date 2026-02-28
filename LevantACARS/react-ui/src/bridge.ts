/**
 * SimBridge — WebView2 ↔ React interop layer.
 *
 * C# → React:  CoreWebView2.PostWebMessageAsJson  → window.chrome.webview 'message' event
 * React → C#:  window.chrome.webview.hostObjects.simBridge.MethodName()
 */

// Augment the Window type for WebView2 interop
declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage: (msg: string) => void;
        addEventListener: (type: string, listener: (e: MessageEvent) => void) => void;
        removeEventListener: (type: string, listener: (e: MessageEvent) => void) => void;
        hostObjects?: {
          simBridge?: SimBridgeHost;
        };
      };
    };
  }
}

/** COM-visible methods exposed by C# SimBridge class */
interface SimBridgeHost {
  Login(): Promise<void>;
  Logout(): Promise<void>;
  StartFlight(json: string): Promise<void>;
  EndFlight(): Promise<void>;
  CancelFlight(): Promise<void>;
  GetVersion(): Promise<string>;
  MinimizeWindow(): Promise<void>;
  MaximizeWindow(): Promise<void>;
  CloseWindow(): Promise<void>;
}

/** Whether we're running inside WebView2 */
export function isWebView2(): boolean {
  return !!window.chrome?.webview;
}

/** Subscribe to messages from C# (PostWebMessageAsJson) */
export function onBridgeMessage(handler: (data: unknown) => void): () => void {
  if (!isWebView2()) return () => {};

  const listener = (e: MessageEvent) => {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      handler(data);
    } catch {
      // ignore malformed messages
    }
  };

  window.chrome!.webview!.addEventListener('message', listener);
  return () => window.chrome!.webview!.removeEventListener('message', listener);
}

/** Call a method on the C# SimBridge COM object */
async function callHost<T = void>(method: keyof SimBridgeHost, ...args: string[]): Promise<T | undefined> {
  if (!isWebView2() || !window.chrome?.webview?.hostObjects?.simBridge) {
    console.warn(`[Bridge] SimBridge not available — cannot call ${method}`);
    return undefined;
  }
  const bridge = window.chrome.webview.hostObjects.simBridge;
  const fn = bridge[method] as (...a: string[]) => Promise<T>;
  return fn.call(bridge, ...args);
}

/** Send a fire-and-forget message to C# via postMessage (sync on UI thread) */
function sendAction(action: string) {
  if (isWebView2()) {
    window.chrome!.webview!.postMessage(JSON.stringify({ action }));
  }
}

// ── Public API ────────────────────────────────────────────────────

export const SimBridge = {
  login: () => callHost('Login'),
  logout: () => callHost('Logout'),
  startFlight: (params: Record<string, unknown>) =>
    callHost('StartFlight', JSON.stringify(params)),
  endFlight: () => callHost('EndFlight'),
  cancelFlight: () => callHost('CancelFlight'),
  fetchBid: () => sendAction('fetchBid'),
  cancelBid: () => sendAction('cancelBid'),
  getVersion: () => callHost<string>('GetVersion'),
  minimizeWindow: () => callHost('MinimizeWindow'),
  maximizeWindow: () => callHost('MaximizeWindow'),
  closeWindow: () => callHost('CloseWindow'),
  checkForUpdate: () => sendAction('checkForUpdate'),
} as const;
