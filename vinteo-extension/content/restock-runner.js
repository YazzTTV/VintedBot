// Restock runner — polls backend for due restock jobs and republishes items on Vinted.
// Uses Vinted's wrapped draft payload format (same as repost flow in service-worker).
(function () {
  var BACKEND = "https://vinteo.xyz";
  var POLL_MS = 30_000;
  var _running = false;

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    // fallback v4
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCsrf() {
    if (window._vinteoCSRF) return window._vinteoCSRF;
    var re = /"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/;
    var scripts = document.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) {
      var m = (scripts[i].textContent || "").match(re);
      if (m && m[1]) { window._vinteoCSRF = m[1]; return m[1]; }
    }
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) { var v = meta.getAttribute("content"); if (v) { window._vinteoCSRF = v; return v; } }
    return null;
  }

  function getAnonId() {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.startsWith("anon_id=")) return p.substring(8);
    }
    return null;
  }

  function getSession() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(["vinteo_session"], function (r) {
          if (!r || !r.vinteo_session) return resolve(null);
          try {
            var v = typeof r.vinteo_session === "string" ? JSON.parse(r.vinteo_session) : r.vinteo_session;
            resolve(v && v.token ? v : null);
          } catch { resolve(null); }
        });
      } catch { resolve(null); }
    });
  }

  async function vtoApi(path, opts) {
    var s = await getSession();
    if (!s) throw new Error("No Vinteo session");
    opts = opts || {};
    opts.headers = Object.assign({
      "Content-Type": "application/json",
      Authorization: "Bearer " + s.token
    }, opts.headers || {});
    var res = await fetch(BACKEND + path, opts);
    if (!res.ok) throw new Error("Backend HTTP " + res.status);
    return res;
  }

  function vintedHeaders(csrf, anonId) {
    var h = { Accept: "application/json", "Content-Type": "application/json", "X-Money-Object": "true" };
    if (csrf) h["X-CSRF-Token"] = csrf;
    if (anonId) h["X-Anon-Id"] = anonId;
    return h;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function getCurrentVintedUserId(origin, csrf, anonId) {
    var res = await fetch(origin + "/api/v2/users/current", { credentials: "include", headers: vintedHeaders(csrf, anonId) });
    if (!res.ok) throw new Error("users/current " + res.status);
    var j = await res.json();
    var u = j.user || j;
    return u && u.id != null ? String(u.id) : null;
  }

  async function uploadPhotoToVinted(origin, csrf, anonId, blob, fileName) {
    var form = new FormData();
    form.append("photo[type]", "item");
    form.append("photo[file]", blob, fileName);
    form.append("photo[temp_uuid]", uuid());
    var headers = {};
    if (csrf) headers["X-CSRF-Token"] = csrf;
    if (anonId) headers["X-Anon-Id"] = anonId;
    var res = await fetch(origin + "/api/v2/photos", { method: "POST", credentials: "include", headers: headers, body: form });
    if (!res.ok) throw new Error("photo upload " + res.status);
    var j = await res.json();
    var id = j.photo ? j.photo.id : j.id;
    if (!id) throw new Error("photo upload: no id");
    return id;
  }

  async function reportFail(pendingId, message, critical) {
    try {
      await vtoApi("/api/restock/pending/" + pendingId + "/fail", {
        method: "POST",
        body: JSON.stringify({ error: String(message || "").substring(0, 2500), critical: !!critical })
      });
    } catch {}
  }

  async function executeJob(job) {
    var origin = window.location.origin;
    var item = job.item;
    if (!item) { await reportFail(job.pending_id, "no item", true); return; }

    // Origin check (skip if mismatch — another tab handles it)
    if (item.vinted_origin && item.vinted_origin !== origin) return;
    if (!item.photos || item.photos.length === 0) { await reportFail(job.pending_id, "no photos saved", true); return; }

    var csrf = getCsrf();
    var anonId = getAnonId();
    if (!csrf) { await reportFail(job.pending_id, "no CSRF"); return; }

    // Account check
    if (item.vinted_account_id) {
      var currentUid;
      try { currentUid = await getCurrentVintedUserId(origin, csrf, anonId); }
      catch (e) { await reportFail(job.pending_id, "current user: " + e.message); return; }
      if (!currentUid) { await reportFail(job.pending_id, "no current user"); return; }
      var expected = String(item.vinted_account_id).replace(/^vinted_/, "");
      if (String(currentUid) !== expected) return;
    }

    // Claim the job
    var start = await vtoApi("/api/restock/pending/" + job.pending_id + "/start", { method: "POST", body: "{}" });
    var startJson = await start.json();
    if (!startJson.success) return;

    // Re-upload photos via backend proxy → Vinted
    var uploadedPhotos = [];
    try {
      for (var i = 0; i < item.photos.length; i++) {
        var s = await getSession();
        if (!s) throw new Error("session lost");
        var proxyRes = await fetch(BACKEND + "/api/restock/pending/" + job.pending_id + "/photo/" + i, {
          headers: { Authorization: "Bearer " + s.token }
        });
        if (!proxyRes.ok) throw new Error("proxy photo " + i + " HTTP " + proxyRes.status);
        var blob = await proxyRes.blob();
        var photoId = await uploadPhotoToVinted(origin, csrf, anonId, blob, "photo_" + i + ".jpg");
        uploadedPhotos.push({ id: photoId, orientation: 0 });
        await sleep(1500 + Math.random() * 800);
      }
    } catch (upErr) {
      await reportFail(job.pending_id, "upload: " + (upErr && upErr.message));
      return;
    }

    // Price (string for Vinted)
    var price = item.restock_price != null ? item.restock_price : item.price;
    var priceNum = Number(String(price).replace(",", "."));
    if (!isFinite(priceNum) || priceNum <= 0) { await reportFail(job.pending_id, "invalid price", true); return; }
    var priceStr = String(priceNum);

    var colorIds = [];
    if (item.color1_id != null) colorIds.push(item.color1_id);
    if (item.color2_id != null) colorIds.push(item.color2_id);

    var draftUuid = uuid();
    var itemAttributes = [];
    if (item.status_id) itemAttributes.push({ code: "condition", ids: [item.status_id] });
    var draftFields = {
      id: null,
      currency: item.currency || "EUR",
      temp_uuid: draftUuid,
      title: item.title,
      description: item.description || "",
      brand_id: item.brand_id || null,
      brand: item.brand || null,
      size_id: item.size_id || null,
      catalog_id: item.catalog_id || null,
      isbn: null,
      is_unisex: !!item.is_unisex,
      status_id: item.status_id || null,
      video_game_rating_id: null,
      price: priceNum,
      package_size_id: item.package_size_id || null,
      shipment_prices: { domestic: null, international: null },
      color_ids: colorIds,
      assigned_photos: uploadedPhotos,
      measurement_length: null,
      measurement_width: null,
      item_attributes: itemAttributes,
      manufacturer: null,
      manufacturer_labelling: null,
      model: null
    };

    var draftWrapper = {
      draft: draftFields,
      feedback_id: null,
      parcel: null,
      upload_session_id: draftUuid
    };

    var draftRes;
    try {
      draftRes = await fetch(origin + "/api/v2/item_upload/drafts", {
        method: "POST",
        credentials: "include",
        headers: vintedHeaders(csrf, anonId),
        body: JSON.stringify(draftWrapper)
      });
    } catch (netErr) {
      await reportFail(job.pending_id, "draft network: " + (netErr && netErr.message));
      return;
    }

    // Fallback: if sold and package_size_id=1 fails → retry with 8
    if (!draftRes.ok && draftFields.package_size_id === 1) {
      draftFields.package_size_id = 8;
      draftWrapper.draft = draftFields;
      try {
        draftRes = await fetch(origin + "/api/v2/item_upload/drafts", {
          method: "POST",
          credentials: "include",
          headers: vintedHeaders(csrf, anonId),
          body: JSON.stringify(draftWrapper)
        });
      } catch {}
    }

    if (!draftRes.ok) {
      var txt = "";
      try { txt = await draftRes.text(); } catch {}
      await reportFail(job.pending_id, "draft HTTP " + draftRes.status + " " + txt.substring(0, 2000));
      return;
    }

    var draftData = await draftRes.json();
    var createdDraft = draftData.draft || draftData;
    var newDraftId = createdDraft.id;
    if (!newDraftId) { await reportFail(job.pending_id, "no draft id", true); return; }

    await sleep(2000);

    // Re-fetch draft for completion
    var draftForCompletion = createdDraft;
    try {
      var refetch = await fetch(origin + "/api/v2/item_upload/items/" + newDraftId, {
        credentials: "include",
        headers: vintedHeaders(csrf, anonId)
      });
      if (refetch.ok) {
        var rj = await refetch.json();
        draftForCompletion = rj.item || rj;
      }
    } catch {}

    // Restore color_ids on draft-for-completion if Vinted stripped them
    if (!draftForCompletion.color_ids || draftForCompletion.color_ids.length === 0) {
      draftForCompletion.color_ids = colorIds;
    }
    if (!draftForCompletion.color1_id && colorIds[0]) draftForCompletion.color1_id = colorIds[0];
    if (!draftForCompletion.color2_id && colorIds[1]) draftForCompletion.color2_id = colorIds[1];
    if (draftForCompletion.price && typeof draftForCompletion.price === "object") {
      draftForCompletion.price = String(draftForCompletion.price.amount || priceStr);
    }

    // Reuse draft's temp_uuid for completion session id (DotB convention)
    if (!draftForCompletion.temp_uuid) draftForCompletion.temp_uuid = draftUuid;
    var completionWrapper = {
      draft: draftForCompletion,
      feedback_id: null,
      parcel: null,
      push_up: false,
      upload_session_id: draftForCompletion.temp_uuid
    };

    var pubRes;
    try {
      pubRes = await fetch(origin + "/api/v2/item_upload/drafts/" + newDraftId + "/completion", {
        method: "POST",
        credentials: "include",
        headers: vintedHeaders(csrf, anonId),
        body: JSON.stringify(completionWrapper)
      });
    } catch (pe) {
      await reportFail(job.pending_id, "completion network (draft=" + newDraftId + "): " + (pe && pe.message), true);
      return;
    }
    if (!pubRes.ok) {
      var pubTxt = "";
      try { pubTxt = await pubRes.text(); } catch {}
      await reportFail(job.pending_id, "completion HTTP " + pubRes.status + " (draft=" + newDraftId + ") " + pubTxt.substring(0, 1500), true);
      return;
    }

    var pubData = await pubRes.json();
    var finalItemId = pubData.item && pubData.item.id ? pubData.item.id : (pubData.id || newDraftId);

    await vtoApi("/api/restock/pending/" + job.pending_id + "/complete", {
      method: "POST",
      body: JSON.stringify({ newVintedItemId: String(finalItemId) })
    });
  }

  async function tick() {
    if (_running) return;
    _running = true;
    try {
      var s = await getSession();
      if (!s) return;
      var res = await vtoApi("/api/restock/pending");
      var json = await res.json();
      var jobs = (json && json.jobs) || [];
      for (var i = 0; i < jobs.length; i++) {
        try { await executeJob(jobs[i]); }
        catch (err) {
          try { await reportFail(jobs[i].pending_id, (err && err.message) || "unknown"); } catch {}
        }
        await sleep(2000);
      }
    } catch { /* silent */ }
    finally { _running = false; }
  }

  setTimeout(tick, 30_000);
  setInterval(tick, POLL_MS);
})();
