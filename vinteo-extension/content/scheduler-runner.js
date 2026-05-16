// Scheduler runner — polls backend for due scheduled posts and publishes them on Vinted.
// Same pattern as restock-runner.js : server-side queue + content-script polls + atomic claim.
// Uses the proven 2-step Vinted publish flow : POST /drafts → sleep → GET /items/{id} → POST /drafts/{id}/completion.
(function () {
  var BACKEND = "https://vinteo.xyz";
  var POLL_MS = 30_000;
  var _running = false;

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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

  function vintedHeaders(csrf, anonId) {
    var h = { Accept: "application/json", "Content-Type": "application/json", "X-Money-Object": "true" };
    if (csrf) h["X-CSRF-Token"] = csrf;
    if (anonId) h["X-Anon-Id"] = anonId;
    return h;
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

  async function getCurrentVintedUserId(origin, csrf, anonId) {
    var res = await fetch(origin + "/api/v2/users/current", {
      credentials: "include",
      headers: vintedHeaders(csrf, anonId),
    });
    if (!res.ok) throw new Error("users/current " + res.status);
    var j = await res.json();
    var u = j.user || j;
    return u && u.id != null ? String(u.id) : null;
  }

  async function uploadPhotoToVinted(origin, csrf, anonId, blob, filename) {
    var fd = new FormData();
    fd.append("photo[type]", "item");
    fd.append("photo[file]", blob, filename);
    fd.append("photo[temp_uuid]", uuid());
    var headers = { "X-CSRF-Token": csrf, "X-Money-Object": "true" };
    if (anonId) headers["X-Anon-Id"] = anonId;
    var res = await fetch(origin + "/api/v2/photos", {
      method: "POST", credentials: "include", headers: headers, body: fd,
    });
    if (!res.ok) throw new Error("upload HTTP " + res.status);
    var j = await res.json();
    return j.photo ? j.photo.id : (j.id || null);
  }

  async function reportFail(id, msg, critical) {
    try {
      await vtoApi("/api/scheduled-posts/" + id + "/fail", {
        method: "POST",
        body: JSON.stringify({ error: String(msg || "unknown"), critical: !!critical }),
      });
    } catch {}
  }

  async function executeJob(origin, csrf, anonId, job) {
    // 1) Claim atomically
    var claim;
    try {
      claim = await vtoApi("/api/scheduled-posts/" + job.id + "/start", { method: "POST", body: "{}" });
    } catch (e) {
      // Network / auth error : no claim, skip silently (another tick will retry if still pending)
      return;
    }
    var claimJson = await claim.json();
    if (!claimJson.success) return; // Another tab claimed it first, or it's not pending

    // 2) Resolve item data : both sources (vinteo_item and vinted_draft) expect item_data
    //    to be populated at enqueue time (frontend pre-fetches full Vinted details).
    var data = job.item_data || {};
    if (!data.title && !job.item_title) {
      await reportFail(job.id, "no item data (title missing)", true);
      return;
    }

    // 3) Re-upload photos to Vinted. Photo IDs can NOT be reused across drafts :
    //    - vinteo_item : photos stored in R2, fetched via backend proxy
    //    - vinted_draft : photos on Vinted CDN, fetched directly via data.photo_urls
    var uploadedPhotos = [];
    if (job.source === "vinteo_item") {
      var photoCount = (job.photos || []).length;
      try {
        for (var i = 0; i < photoCount; i++) {
          var s = await getSession();
          if (!s) throw new Error("session lost");
          var proxyRes = await fetch(BACKEND + "/api/scheduled-posts/" + job.id + "/photo/" + i, {
            headers: { Authorization: "Bearer " + s.token }
          });
          if (!proxyRes.ok) throw new Error("proxy photo " + i + " HTTP " + proxyRes.status);
          var blob = await proxyRes.blob();
          var pid = await uploadPhotoToVinted(origin, csrf, anonId, blob, "photo_" + i + ".jpg");
          if (pid) uploadedPhotos.push({ id: pid, orientation: 0 });
          await sleep(1500 + Math.random() * 800);
        }
      } catch (upErr) {
        await reportFail(job.id, "upload: " + (upErr && upErr.message));
        return;
      }
    } else if (job.source === "vinted_draft") {
      var photoUrls = Array.isArray(data.photo_urls) ? data.photo_urls : [];
      if (photoUrls.length === 0) {
        await reportFail(job.id, "no photo_urls (re-enqueue item to refresh)", true);
        return;
      }
      try {
        for (var j = 0; j < photoUrls.length; j++) {
          var cdnRes = await fetch(photoUrls[j], { credentials: "omit" });
          if (!cdnRes.ok) throw new Error("cdn photo " + j + " HTTP " + cdnRes.status);
          var cdnBlob = await cdnRes.blob();
          var cdnPid = await uploadPhotoToVinted(origin, csrf, anonId, cdnBlob, "photo_" + j + ".jpg");
          if (!cdnPid) throw new Error("photo upload " + j + ": no id");
          uploadedPhotos.push({ id: cdnPid, orientation: 0 });
          await sleep(1500 + Math.random() * 800);
        }
      } catch (upErr2) {
        await reportFail(job.id, "upload: " + (upErr2 && upErr2.message));
        return;
      }
    }

    // 4) Build draft fields (title, desc, price, brand_id, size_id, catalog_id, status_id,
    //    color1_id, color2_id, package_size_id, is_unisex, item_attributes, assigned_photos, temp_uuid)
    var priceRaw = data.price != null ? data.price : (job.item_price || "0");
    var priceNum = Number(String(priceRaw).replace(",", "."));
    if (!isFinite(priceNum) || priceNum <= 0) {
      await reportFail(job.id, "invalid price", true);
      return;
    }
    var priceStr = String(priceNum);

    var colorIds = [];
    if (data.color1_id != null) colorIds.push(data.color1_id);
    if (data.color2_id != null) colorIds.push(data.color2_id);

    var draftUuid = uuid();
    var itemAttributes = [];
    if (data.status_id) itemAttributes.push({ code: "condition", ids: [data.status_id] });

    // For vinteo_item source : use uploadedPhotos.
    // For vinted_draft source : uploadedPhotos is empty — fall back to data.assigned_photos
    // (Vinted photo IDs extracted at enrich time, photos already on Vinted CDN).
    var finalAssignedPhotos = uploadedPhotos.length > 0
      ? uploadedPhotos
      : (Array.isArray(data.assigned_photos) ? data.assigned_photos : []);

    var draftFields = {
      id: null,
      currency: data.currency || "EUR",
      temp_uuid: draftUuid,
      title: data.title || job.item_title,
      description: data.description || "",
      brand_id: data.brand_id || null,
      brand: data.brand || null,
      size_id: data.size_id || null,
      catalog_id: data.catalog_id || null,
      isbn: null,
      is_unisex: !!data.is_unisex,
      status_id: data.status_id || null,
      video_game_rating_id: null,
      price: priceNum,
      package_size_id: data.package_size_id || 1,
      shipment_prices: { domestic: null, international: null },
      color_ids: colorIds,
      assigned_photos: finalAssignedPhotos,
      measurement_length: null,
      measurement_width: null,
      item_attributes: itemAttributes,
      manufacturer: null,
      manufacturer_labelling: null,
      model: null
    };

    // 5) Build draft wrapper and POST /api/v2/item_upload/drafts
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
      await reportFail(job.id, "draft network: " + (netErr && netErr.message));
      return;
    }

    // 6) Fallback : if !ok AND package_size_id === 1, retry with package_size_id = 8
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
      await reportFail(job.id, "draft HTTP " + draftRes.status + " " + txt.substring(0, 2000));
      return;
    }

    var draftData = await draftRes.json();
    var createdDraft = draftData.draft || draftData;
    var newDraftId = createdDraft.id;
    if (!newDraftId) { await reportFail(job.id, "no draft id", true); return; }

    // 7) sleep(2000) — critical race condition mitigation
    await sleep(2000);

    // 8) Re-fetch draft for completion : GET /api/v2/item_upload/items/{newDraftId}
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

    // 9) Restore color_ids / color1_id / color2_id if Vinted stripped them.
    if (!draftForCompletion.color_ids || draftForCompletion.color_ids.length === 0) {
      draftForCompletion.color_ids = colorIds;
    }
    if (!draftForCompletion.color1_id && colorIds[0]) draftForCompletion.color1_id = colorIds[0];
    if (!draftForCompletion.color2_id && colorIds[1]) draftForCompletion.color2_id = colorIds[1];
    if (draftForCompletion.price && typeof draftForCompletion.price === "object") {
      draftForCompletion.price = String(draftForCompletion.price.amount || priceStr);
    }
    if (!draftForCompletion.temp_uuid) draftForCompletion.temp_uuid = draftUuid;

    // 10) Build completion wrapper and POST /api/v2/item_upload/drafts/{newDraftId}/completion
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
      await reportFail(job.id, "completion network (draft=" + newDraftId + "): " + (pe && pe.message), true);
      return;
    }
    if (!pubRes.ok) {
      var pubTxt = "";
      try { pubTxt = await pubRes.text(); } catch {}
      await reportFail(job.id, "completion HTTP " + pubRes.status + " (draft=" + newDraftId + ") " + pubTxt.substring(0, 1500), true);
      return;
    }

    // 11) Parse response : item.id || id — this is the final Vinted item id
    var pubData = await pubRes.json();
    var finalItemId = (pubData.item && pubData.item.id) ? pubData.item.id : (pubData.id || newDraftId);

    // 12) Report success (retry up to 3 times with 2s backoff — Vinted publish already succeeded)
    var completeOk = false;
    for (var ci = 0; ci < 3 && !completeOk; ci++) {
      try {
        await vtoApi("/api/scheduled-posts/" + job.id + "/complete", {
          method: "POST",
          body: JSON.stringify({ newVintedItemId: String(finalItemId) }),
        });
        completeOk = true;
      } catch (e) {
        if (ci < 2) await sleep(2000);
      }
    }
    // If still not ok after 3 attempts, the post stays in 'processing' until 48h expiry
  }

  async function tick() {
    if (_running) return;
    _running = true;
    try {
      var s = await getSession();
      if (!s) return;
      var origin = window.location.origin;
      if (!origin.match(/vinted\./)) return;
      var csrf = getCsrf();
      if (!csrf) return;
      var anonId = getAnonId();
      var accountId;
      try {
        accountId = await getCurrentVintedUserId(origin, csrf, anonId);
      } catch { return; }
      if (!accountId) return;
      var res = await vtoApi("/api/scheduled-posts/due?vintedAccountId=" + encodeURIComponent(accountId));
      var json = await res.json();
      var jobs = (json && json.jobs) || [];
      for (var i = 0; i < jobs.length; i++) {
        try { await executeJob(origin, csrf, anonId, jobs[i]); }
        catch (err) {
          try { await reportFail(jobs[i].id, (err && err.message) || "unknown"); } catch {}
        }
        await sleep(2000);
      }
    } catch { /* silent */ }
    finally { _running = false; }
  }

  setTimeout(tick, 30_000);
  setInterval(tick, POLL_MS);
})();
