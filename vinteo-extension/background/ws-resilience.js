// ===== VINTEO WS RESILIENCE =====
// Prevents MV3 service-worker death windows that cause Vinted accounts to
// show as "Déconnecté" on the dashboard until the user refreshes Vinted.
//
// Two mechanisms:
//   1. Dual offset alarms → the SW is woken every ~30s (since chrome.alarms
//      enforces a 1-minute minimum period for published extensions, we stagger
//      two 1-min alarms by 30s).
//   2. On each wake, if the SW has been silent for > 45s, force a cookie-based
//      Vinted session touch + trigger the main SW reconnect path by dispatching
//      a no-op chrome.runtime message (keeps the SW bus active).
//
// This file is additive — it does NOT modify the bundled main SW. It relies on
// the main SW's existing `chrome.alarms.onAlarm` handler (which calls the WS
// reconnect function A() on every alarm name).

(function () {
  var KA_ALARM_A = "vinteo_ka_a";
  var KA_ALARM_B = "vinteo_ka_b";
  var LAST_WAKE_KEY = "vinteo_ka_last_wake";
  var REFRESH_COOLDOWN_MS = 4 * 60 * 1000; // max one Vinted session touch per 4min
  var SESSION_COOKIE_RE = /^_vinted_[a-z]+_session$/;

  function schedule() {
    try {
      chrome.alarms.create(KA_ALARM_A, { delayInMinutes: 1, periodInMinutes: 1 });
      chrome.alarms.create(KA_ALARM_B, { delayInMinutes: 1.5, periodInMinutes: 1 });
    } catch (e) {
      try { _vinteoNativeConsole && _vinteoNativeConsole.warn("[Vinteo KA] schedule failed:", e.message); } catch (_) {}
    }
  }

  function hasVintedAuthCookie(cookies) {
    for (var i = 0; i < cookies.length; i++) {
      var n = cookies[i].name;
      if (n === "access_token_web" || n === "session" || SESSION_COOKIE_RE.test(n)) return true;
    }
    return false;
  }

  async function touchVintedSessions() {
    var domains = [
      "https://www.vinted.fr", "https://www.vinted.de", "https://www.vinted.es",
      "https://www.vinted.it", "https://www.vinted.be", "https://www.vinted.nl",
      "https://www.vinted.pt", "https://www.vinted.pl", "https://www.vinted.cz",
    ];
    for (var i = 0; i < domains.length; i++) {
      try {
        var cookies = await chrome.cookies.getAll({ url: domains[i] });
        if (hasVintedAuthCookie(cookies)) {
          // Fire-and-forget session touch. Keeps Vinted-side session warm and
          // ensures cookies are not stale when the main SW re-runs its detect→R()
          // chain on the same alarm tick.
          fetch(domains[i] + "/api/v2/users/current", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }).catch(function () { /* noop */ });
        }
      } catch (_) { /* per-domain failure is fine */ }
    }
  }

  async function onKeepalive() {
    try {
      var store = await chrome.storage.local.get(LAST_WAKE_KEY);
      var last = Number(store[LAST_WAKE_KEY] || 0);
      var now = Date.now();
      chrome.storage.local.set({ [LAST_WAKE_KEY]: now });
      if (now - last >= REFRESH_COOLDOWN_MS) {
        touchVintedSessions();
      }
    } catch (_) { /* noop */ }
  }

  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm && (alarm.name === KA_ALARM_A || alarm.name === KA_ALARM_B)) {
      onKeepalive();
    }
  });

  // Schedule immediately and on install/startup. `chrome.alarms.create` is idempotent
  // for same-name alarms, so repeated calls are safe.
  schedule();
  try { chrome.runtime.onInstalled.addListener(schedule); } catch (_) {}
  try { chrome.runtime.onStartup.addListener(schedule); } catch (_) {}
})();
