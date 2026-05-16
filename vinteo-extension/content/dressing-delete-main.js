// Runs in Vinted's MAIN world (injected by dressing-delete-watcher.js).
// Hooks fetch + XMLHttpRequest, detects successful Vinted item deletions across
// the three known endpoint shapes, posts { type: "vinteo:vinted-item-deleted",
// itemId } for the content-script (isolated world) to relay to the Vinteo backend.
(function () {
  "use strict";
  if (window.__vinteoDressingDeleteHooked) return;
  window.__vinteoDressingDeleteHooked = true;

  // Match both DELETE /api/v2/items/{id} and POST /api/v2/items/{id}/delete.
  // Returns itemId string or null.
  function matchDelete(method, url) {
    if (!url) return null;
    var m = (method || "GET").toUpperCase();
    var u = String(url);
    if (m === "DELETE") {
      var a = u.match(/\/api\/v2\/items\/(\d+)(?:[\/?#]|$)/);
      if (a) return a[1];
      var b = u.match(/\/api\/v2\/item_upload\/drafts\/(\d+)(?:[\/?#]|$)/);
      if (b) return b[1];
    }
    if (m === "POST") {
      var c = u.match(/\/api\/v2\/items\/(\d+)\/delete(?:[\/?#]|$)/);
      if (c) return c[1];
    }
    return null;
  }

  function notify(itemId) {
    try {
      console.log("[Vinteo] detected Vinted item delete:", itemId);
      window.postMessage({ type: "vinteo:vinted-item-deleted", itemId: String(itemId) }, "*");
    } catch (_) {}
  }

  // fetch hook
  try {
    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function () {
        var req = arguments[0];
        var opts = arguments[1] || {};
        var url = typeof req === "string" ? req : (req && req.url) || "";
        var method = opts.method || (req && req.method) || "GET";
        var id = matchDelete(method, url);
        var promise = origFetch.apply(this, arguments);
        if (id) {
          promise.then(function (resp) {
            if (resp && resp.ok) notify(id);
          }).catch(function () {});
        }
        return promise;
      };
    }
  } catch (_) {}

  // XMLHttpRequest hook
  try {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        this.__vinteoMethod = method;
        this.__vinteoUrl = url;
      } catch (_) {}
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      try {
        var xhr = this;
        var id = matchDelete(xhr.__vinteoMethod, xhr.__vinteoUrl);
        if (id) {
          xhr.addEventListener("load", function () {
            if (xhr.status >= 200 && xhr.status < 300) notify(id);
          });
        }
      } catch (_) {}
      return origSend.apply(this, arguments);
    };
  } catch (_) {}
})();
