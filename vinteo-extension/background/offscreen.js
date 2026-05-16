// ===== VINTEO OFFSCREEN AUDIO =====
// Plays the sale notification sound on request from the service worker.
// Chrome MV3 service workers cannot play audio directly — offscreen documents can.

(function () {
  var audio = document.getElementById('kaching');
  if (!audio) return;

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || msg.target !== 'vinteo-offscreen') return;

    if (msg.type === 'play-kaching') {
      try {
        var volume = typeof msg.volume === 'number' ? msg.volume : 0.7;
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.currentTime = 0;
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () { /* ignore autoplay blocks */ });
        }
      } catch (e) { /* noop */ }
      sendResponse({ ok: true });
      return true;
    }
  });
})();
