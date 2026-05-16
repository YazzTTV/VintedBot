// ===== VINTEO — extendDeadlineDirect =====
// Prolonge la deadline d'envoi d'une commande Vinted pour N'IMPORTE QUEL compte.
// Stratégie : utiliser/ouvrir un onglet sur le bon domaine (Vinted refresh sa session)
// puis envoyer la commande au content script de cet onglet.
//
// Action message: "extendDeadlineDirect" { origin, shipmentId, days, reason }

(function () {
  var TAG = '[Vinteo EDD]';

  function waitMs(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function findTabOnOrigin(origin) {
    try {
      var tabs = await chrome.tabs.query({ url: origin + '/*' });
      if (tabs && tabs.length > 0) return tabs[0];
    } catch (e) { /* */ }
    return null;
  }

  async function createHiddenTab(origin) {
    // active: false → onglet créé en arrière-plan, pas de vol de focus
    var tab = await chrome.tabs.create({ url: origin + '/', active: false });
    return tab;
  }

  async function waitForTabReady(tabId, targetOrigin, maxMs) {
    var deadline = Date.now() + (maxMs || 20000);
    while (Date.now() < deadline) {
      try {
        var tab = await chrome.tabs.get(tabId);
        var isRefresh = tab.url && tab.url.indexOf('/session-refresh') !== -1;
        var isComplete = tab.status === 'complete';
        var isOnOrigin = tab.url && tab.url.indexOf(targetOrigin) === 0;
        if (isComplete && isOnOrigin && !isRefresh) {
          // Leave a little time for vinted-api.js content script to finish booting
          await waitMs(600);
          return tab;
        }
      } catch (e) { return null; }
      await waitMs(400);
    }
    return null;
  }

  async function sendVintedFetchToTab(tabId, path, method, body) {
    try {
      var resp = await chrome.tabs.sendMessage(tabId, {
        _vinteoApi: true,
        action: 'vintedFetch',
        url: path,
        method: method,
        body: body,
      });
      return resp || { success: false, error: 'No response' };
    } catch (e) {
      return { success: false, error: e && e.message ? e.message : 'sendMessage failed' };
    }
  }

  async function extendDeadlineDirect(params) {
    var origin = params.origin || '';
    var shipmentId = params.shipmentId;
    var days = params.days;
    var reason = params.reason;

    console.info(TAG, 'request', { origin: origin, shipmentId: shipmentId, days: days });

    if (!origin || !/^https:\/\/[a-z0-9.-]+\.vinted\.[a-z]{2,3}$/i.test(origin)) {
      return { success: false, error: 'origin invalide: ' + String(origin) };
    }
    if (!shipmentId) return { success: false, error: 'shipmentId manquant' };
    if (!reason || !String(reason).trim()) return { success: false, error: 'raison manquante' };

    // 1. Trouver ou créer un onglet sur le bon domaine
    var existingTab = await findTabOnOrigin(origin);
    var tab = existingTab;
    var weCreatedIt = false;
    if (!tab) {
      console.info(TAG, 'no tab on', origin, '— creating hidden tab');
      try {
        tab = await createHiddenTab(origin);
        weCreatedIt = true;
      } catch (e) {
        return { success: false, error: 'Impossible de créer un onglet : ' + (e && e.message) };
      }
      var ready = await waitForTabReady(tab.id, origin, 25000);
      if (!ready) {
        try { await chrome.tabs.remove(tab.id); } catch (e) { /* */ }
        return { success: false, error: "L'onglet " + origin + " n'a pas pu charger (session expirée ? réessaie après t'être reconnecté à ce compte)." };
      }
    } else {
      console.info(TAG, 'using existing tab', tab.id, tab.url);
    }

    // 2. Envoyer l'appel via content script
    var path = '/api/v2/shipments/' + encodeURIComponent(String(shipmentId)) + '/deadline_extension';
    var body = JSON.stringify({
      deadline_extension: {
        key: String(days || '3'),
        reason: String(reason || ''),
      },
    });
    var res = await sendVintedFetchToTab(tab.id, path, 'POST', body);
    console.info(TAG, 'vintedFetch response', res);

    // 3. Nettoyer l'onglet si on l'a créé
    if (weCreatedIt) {
      try { await chrome.tabs.remove(tab.id); } catch (e) { /* */ }
    }

    if (res.success) return { success: true, data: res.data || {} };

    var status = res.status;
    var data = res.data;
    var msg =
      (data && (data.message || data.error || data.detail)) ||
      res.error ||
      (status ? 'HTTP ' + status : 'Erreur Vinted');
    return { success: false, error: msg, status: status };
  }

  function safeRun(params, sendResponse) {
    var responded = false;
    function respondOnce(payload) {
      if (responded) return;
      responded = true;
      try { sendResponse(payload); } catch (e) { /* channel closed */ }
    }
    var killTimer = setTimeout(function () {
      respondOnce({ success: false, error: 'Timeout global (50s)' });
    }, 50000);

    extendDeadlineDirect(params).then(function (result) {
      clearTimeout(killTimer);
      respondOnce(result);
    }).catch(function (err) {
      clearTimeout(killTimer);
      respondOnce({ success: false, error: (err && err.message) ? err.message : 'Erreur interne' });
    });
  }

  function handleMessage(msg, sender, sendResponse) {
    if (!msg || msg.action !== 'extendDeadlineDirect') return false;
    safeRun({
      origin: msg.origin || '',
      shipmentId: msg.shipmentId,
      days: msg.days,
      reason: msg.reason,
    }, sendResponse);
    return true;
  }

  chrome.runtime.onMessage.addListener(handleMessage);

  chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
    var url = (sender && sender.url) || '';
    var allowed = url.startsWith('https://vinteo.xyz') || url.startsWith('http://localhost:3001');
    if (!allowed) return false;
    return handleMessage(msg, sender, sendResponse);
  });

  // Expose globally so service-worker.js's WS dispatcher can call it directly
  try {
    self._vinteoExtendDeadlineDirect = extendDeadlineDirect;
  } catch (e) { /* */ }

  try { console.info(TAG, 'listener registered (tab-based)'); } catch (e) {}
})();
