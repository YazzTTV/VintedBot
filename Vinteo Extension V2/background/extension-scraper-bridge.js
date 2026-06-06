(function () {
  "use strict";
  var URL_API = "https://vinteo.xyz/api/extension/scraped-product";
  var TAG = "[Vinteo scraper-bridge]";
  console.log(TAG, "loaded, registering listener");

  async function getToken() {
    try {
      var s = await chrome.storage.local.get("vinteo_session");
      if (!s.vinteo_session) return null;
      var sess = typeof s.vinteo_session === "string" ? JSON.parse(s.vinteo_session) : s.vinteo_session;
      return sess && sess.token ? sess.token : null;
    } catch (e) { console.warn(TAG, "getToken fail:", e); return null; }
  }

  async function push(payload) {
    var token = await getToken();
    if (!token) return { success: false, error: "Pas connecté à vinteo.xyz" };
    try {
      console.log(TAG, "POST", URL_API, "with", ((payload && payload.images) || []).length, "images");
      var r = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(payload || {})
      });
      console.log(TAG, "response status:", r.status);
      var body = null;
      try { body = await r.json(); } catch (e) { console.warn(TAG, "body parse fail:", e); }
      if (!r.ok || !body || !body.success) {
        return { success: false, error: (body && body.error) || ("HTTP " + r.status) };
      }
      return { success: true, count: body.count, id: body.id };
    } catch (e) {
      console.warn(TAG, "fetch fail:", e);
      return { success: false, error: (e && e.message) || String(e) };
    }
  }

  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg || msg.action !== "vinteoPushScraped") return false;
      console.log(TAG, "received vinteoPushScraped from tab", sender && sender.tab && sender.tab.id);
      push(msg.payload || {})
        .then(function (r) {
          try { sendResponse(r); } catch (e) { console.warn(TAG, "sendResponse fail:", e); }
        })
        .catch(function (e) {
          console.warn(TAG, "push error:", e);
          try { sendResponse({ success: false, error: (e && e.message) || String(e) }); } catch (_) {}
        });
      return true; // garde le port ouvert pour la réponse async
    });
    console.log(TAG, "listener registered");
  } catch (e) {
    console.error(TAG, "register failed:", e);
  }
})();
