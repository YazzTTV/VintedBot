// ===== VINTEO SALE WATCHER =====
// Polls /api/sales-cache from the service worker, detects new sales,
// and plays the kaching sound via an offscreen document — so the user
// hears it anywhere in Chrome (no need for the dashboard tab to be open).

(function () {
  'use strict';

  var SERVER_URL = 'https://vinteo.xyz';
  var KEEPALIVE_INTERVAL_MS = 20000; // 20 s — under the 30 s MV3 idle timeout
  var HEALTH_URL = SERVER_URL + '/api/health';
  var STORAGE_KEYS = {
    SEEN: 'vinteoSaleWatcher:seenIds',
    LAST_RUN: 'vinteoSaleWatcher:lastRun',
    SOUND_ENABLED: 'vinteoSoundEnabled',
    SOUND_VOLUME: 'vinteoSoundVolume',
    INITIALIZED: 'vinteoSaleWatcher:initialized',
  };
  var MAX_SEEN_IDS = 500;
  var OFFSCREEN_PATH = 'background/offscreen.html';

  // ─── Offscreen document management ──────────────────────────────────────
  var creatingOffscreen = null;

  async function ensureOffscreen() {
    try {
      if (chrome.offscreen && chrome.offscreen.hasDocument) {
        var has = await chrome.offscreen.hasDocument();
        if (has) return true;
      }
      if (creatingOffscreen) { await creatingOffscreen; return true; }
      creatingOffscreen = chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play sale notification sound browser-wide'
      });
      await creatingOffscreen;
      creatingOffscreen = null;
      return true;
    } catch (e) {
      creatingOffscreen = null;
      return false;
    }
  }

  async function playKaching(volume) {
    try {
      var ok = await ensureOffscreen();
      if (!ok) return;
      chrome.runtime.sendMessage({
        target: 'vinteo-offscreen',
        type: 'play-kaching',
        volume: typeof volume === 'number' ? volume : 0.7,
      }, function () { /* swallow if no receiver */ });
    } catch (e) { /* noop */ }
  }

  // ─── Storage helpers ────────────────────────────────────────────────────
  function storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (result) { resolve(result || {}); });
    });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(obj, function () { resolve(); });
    });
  }
  function syncStorageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(keys, function (result) { resolve(result || {}); });
    });
  }

  async function getSoundPrefs() {
    var data = await syncStorageGet([STORAGE_KEYS.SOUND_ENABLED, STORAGE_KEYS.SOUND_VOLUME]);
    var enabled = data[STORAGE_KEYS.SOUND_ENABLED];
    var volume = data[STORAGE_KEYS.SOUND_VOLUME];
    return {
      enabled: enabled === undefined ? true : !!enabled,
      volume: typeof volume === 'number' ? volume : 0.7,
    };
  }

  // ─── Sales-cache polling ────────────────────────────────────────────────
  function extractOrderIds(salesCache) {
    var ids = [];
    if (!salesCache || typeof salesCache !== 'object') return ids;
    var accounts = salesCache.accounts || (salesCache.orders ? { default: { orders: salesCache.orders } } : {});
    for (var accId in accounts) {
      if (!Object.prototype.hasOwnProperty.call(accounts, accId)) continue;
      var orders = accounts[accId].orders || [];
      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (!o || !o.id) continue;
        var status = (o.transaction_user_status || '').toLowerCase();
        if (status === 'cancelled' || status === 'refunded') continue;
        ids.push(String(o.id));
      }
    }
    return ids;
  }

  async function checkForNewSales() {
    try {
      var resp = await fetch(SERVER_URL + '/api/sales-cache', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!resp.ok) return; // not logged in or server down
      var payload = await resp.json();
      if (!payload || payload.success === false) return;

      var currentIds = extractOrderIds(payload);
      var stored = await storageGet([STORAGE_KEYS.SEEN, STORAGE_KEYS.INITIALIZED]);
      var seen = Array.isArray(stored[STORAGE_KEYS.SEEN]) ? stored[STORAGE_KEYS.SEEN] : [];
      var seenSet = new Set(seen);

      // First run: mark everything as seen, do not play sound (prevents burst at install)
      if (!stored[STORAGE_KEYS.INITIALIZED]) {
        var trimmed = currentIds.slice(-MAX_SEEN_IDS);
        await storageSet({
          [STORAGE_KEYS.SEEN]: trimmed,
          [STORAGE_KEYS.INITIALIZED]: true,
          [STORAGE_KEYS.LAST_RUN]: Date.now(),
        });
        return;
      }

      var fresh = [];
      for (var i = 0; i < currentIds.length; i++) {
        if (!seenSet.has(currentIds[i])) fresh.push(currentIds[i]);
      }

      if (fresh.length > 0) {
        var prefs = await getSoundPrefs();
        if (prefs.enabled) {
          playKaching(prefs.volume);
        }
      }

      // Persist union, cap size
      for (var j = 0; j < fresh.length; j++) seenSet.add(fresh[j]);
      var merged = Array.from(seenSet);
      if (merged.length > MAX_SEEN_IDS) merged = merged.slice(-MAX_SEEN_IDS);
      await storageSet({
        [STORAGE_KEYS.SEEN]: merged,
        [STORAGE_KEYS.LAST_RUN]: Date.now(),
      });
    } catch (e) { /* network / auth errors are silent */ }
  }

  // ─── Keepalive loop ─────────────────────────────────────────────────────
  // MV3 SWs die after ~30 s of inactivity. A pending fetch keeps them alive.
  // We ping /api/health every 20 s AND check for new sales on the same tick.
  var keepaliveTimer = null;
  var tickCount = 0;

  async function tick() {
    tickCount++;
    // Keepalive ping (cheap, no auth) — the fetch itself is what extends the SW lifetime.
    try {
      await fetch(HEALTH_URL, { cache: 'no-store', credentials: 'omit' });
    } catch (e) { /* offline — ignore */ }
    // Sale detection: runs every tick (20 s) so the sound plays fast.
    checkForNewSales();
  }

  function startKeepalive() {
    if (keepaliveTimer) return;
    // Fire immediately on (re)start, then every 20 s.
    tick();
    keepaliveTimer = setInterval(tick, KEEPALIVE_INTERVAL_MS);
  }

  chrome.runtime.onInstalled.addListener(function () { startKeepalive(); });
  chrome.runtime.onStartup.addListener(function () { startKeepalive(); });

  // Also ensure on SW warm start (script re-evaluated)
  startKeepalive();

  // ─── Manual trigger + test hook from popup / dashboard via postMessage ──
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.action) return;
    if (msg.action === 'vinteoSaleSound:test') {
      (async function () {
        var prefs = await getSoundPrefs();
        await playKaching(prefs.volume);
        sendResponse({ ok: true });
      })();
      return true;
    }
    if (msg.action === 'vinteoSaleSound:checkNow') {
      checkForNewSales().then(function () { sendResponse({ ok: true }); });
      return true;
    }
  });

  // Allow the dashboard (externally_connectable) to trigger a test or toggle prefs
  chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.action) return;
    if (msg.action === 'vinteoSaleSound:test') {
      (async function () {
        var prefs = await getSoundPrefs();
        await playKaching(prefs.volume);
        sendResponse({ ok: true });
      })();
      return true;
    }
    if (msg.action === 'vinteoSaleSound:setPrefs' && msg.prefs) {
      var update = {};
      if (typeof msg.prefs.enabled === 'boolean') update[STORAGE_KEYS.SOUND_ENABLED] = msg.prefs.enabled;
      if (typeof msg.prefs.volume === 'number') update[STORAGE_KEYS.SOUND_VOLUME] = Math.max(0, Math.min(1, msg.prefs.volume));
      chrome.storage.sync.set(update, function () { sendResponse({ ok: true }); });
      return true;
    }
    if (msg.action === 'vinteoSaleSound:ping') {
      sendResponse({ ok: true, version: 1 });
      return true;
    }
  });
})();
