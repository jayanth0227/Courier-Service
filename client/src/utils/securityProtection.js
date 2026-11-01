/**
 * FastTrack Logistics - Client Security & Anti-Inspection Module (Silent Mode)
 * 
 * Responsibilities:
 * 1. Silently block right-click (context menu) across the application with NO popups.
 * 2. Silently block Developer Tools & Source inspection shortcuts (F12, Ctrl+Shift+I/J/C/K/E, Ctrl+U, Ctrl+S) with NO popups.
 * 3. EXPLICITLY PRESERVE Copy (Ctrl+C), Paste (Ctrl+V), and Cut (Ctrl+X).
 * 4. Silently prevent image and UI dragging.
 * 5. Run silent anti-debugger safeguards without showing any popup messages.
 */

/**
 * Initialize silent security protection.
 */
export function initSecurityProtection(options = {}) {
  // Remove any legacy notice or overlay elements if they exist
  try {
    const existingNotice = document.getElementById('security-toast-notice');
    if (existingNotice) existingNotice.remove();
    const existingOverlay = document.getElementById('security-devtools-shield');
    if (existingOverlay) existingOverlay.remove();
  } catch {
    // Ignore cleanup errors
  }

  // Allow explicit bypass query parameter if needed during development (e.g., ?bypass_security=1)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('bypass_security') === '1' || sessionStorage.getItem('security_bypass') === 'true') {
    return;
  }

  // 1. Silently Block Context Menu (Right-Click) - No popups
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Silently Block Developer Tools & Source Inspection Keyboard Shortcuts - No popups
  window.addEventListener('keydown', (e) => {
    const key = e.key ? e.key.toUpperCase() : '';
    const keyCode = e.keyCode || e.which;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // F12 key
    if (key === 'F12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    // Ctrl+Shift+C / Cmd+Opt+C (Element Picker)
    // Ctrl+Shift+K / Cmd+Opt+K (Firefox Console)
    // Ctrl+Shift+E (Firefox Network)
    if (isCtrlOrCmd && e.shiftKey && ['I', 'J', 'C', 'K', 'E'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Page Source)
    if (isCtrlOrCmd && key === 'U') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page HTML)
    if (isCtrlOrCmd && key === 'S') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // NOTE: Copy (Ctrl+C), Paste (Ctrl+V), and Cut (Ctrl+X) are INTENTIONALLY NOT BLOCKED!
  }, { capture: true });

  // 3. Silently Prevent dragging images and draggable assets
  document.addEventListener('dragstart', (e) => {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'A' || e.target.tagName === 'SVG')) {
      e.preventDefault();
    }
  });

  // 4. Silent anti-debugger safeguard (halts unauthorized active debugger step-through when DevTools opens)
  if (options.enableDebuggerLoop !== false) {
    setInterval(() => {
      // eslint-disable-next-line no-debugger
      debugger;
    }, 2000);
  }

  // 5. Console Protection in Production
  if (import.meta.env.PROD && options.silentConsole !== false) {
    try {
      const noop = () => {};
      window.console.debug = noop;
      window.console.dir = noop;
    } catch {
      // Ignore if console is frozen
    }
  }
}
