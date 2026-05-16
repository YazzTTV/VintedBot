// ===== VINTEO SW WRAPPER =====
// Loads the sale watcher alongside the main service worker.
// The main service-worker.js is a bundled IIFE that overrides console.* with no-ops
// as its first line, so we capture the native console before importing it and
// restore it right after — otherwise any log from sale-watcher / offscreen / debugging
// would be silenced.

var _vinteoNativeConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace,
};

try { importScripts('sale-watcher.js'); } catch (e) { /* isolated failure — main SW still loads */ }
try { importScripts('service-worker.js'); } catch (e) {
  var _vinteoSwErr = e;
}
try { importScripts('ws-resilience.js'); } catch (e) { /* isolated failure — main SW still loads */ }
// extend-deadline-direct.js is now inlined at the top of service-worker.js — no longer imported separately
if (typeof _vinteoSwErr !== 'undefined') {
  // service-worker.js hasn't run yet, so console is still native here
  console.error('[Vinteo] core SW failed to load:', _vinteoSwErr);
}

// Restore console for our own code + debugging. The bundled SW's internal log calls
// become visible too, which is fine for diagnostics.
try {
  console.log = _vinteoNativeConsole.log;
  console.info = _vinteoNativeConsole.info;
  console.warn = _vinteoNativeConsole.warn;
  console.error = _vinteoNativeConsole.error;
  console.debug = _vinteoNativeConsole.debug;
  console.trace = _vinteoNativeConsole.trace;
} catch (e) { /* noop */ }
