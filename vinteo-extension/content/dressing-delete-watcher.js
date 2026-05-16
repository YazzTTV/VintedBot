// Isolated-world content script : injects dressing-delete-main.js into the
// Vinted page's main world, listens for deletion notifications, and relays
// them to the Vinteo backend so the matching restock_items row is removed
// immediately instead of waiting for the next dressing sync.
(function () {
  "use strict";
  var BACKEND = "https://vinteo.xyz";

  try {
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("content/dressing-delete-main.js");
    s.onload = function () { s.remove(); };
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}

  function getSession() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(["vinteo_session"], function (r) {
          if (!r || !r.vinteo_session) return resolve(null);
          try {
            var v = typeof r.vinteo_session === "string" ? JSON.parse(r.vinteo_session) : r.vinteo_session;
            resolve(v && v.token ? v : null);
          } catch (_) { resolve(null); }
        });
      } catch (_) { resolve(null); }
    });
  }

  window.addEventListener("message", async function (ev) {
    if (ev.source !== window || !ev.data || ev.data.type !== "vinteo:vinted-item-deleted") return;
    var itemId = ev.data.itemId;
    if (!itemId) return;
    try {
      var s = await getSession();
      if (!s) { console.warn("[Vinteo] delete watcher: no session"); return; }
      var r = await fetch(BACKEND + "/api/restock/vinted-item-deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.token },
        body: JSON.stringify({ vintedItemId: String(itemId) })
      });
      console.log("[Vinteo] delete watcher: notified backend for", itemId, "→", r.status);
    } catch (e) { console.warn("[Vinteo] delete watcher error", e); }
  });
})();
