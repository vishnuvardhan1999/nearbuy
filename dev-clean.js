/* Local preview only: mock stays off unless ?mock=1 is in the URL. Clears leftover mock flags and old service workers. */
(function () {
  var host = location.hostname;
  var local = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (!local) return;
  var mock = new URLSearchParams(location.search).get('mock') === '1';
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (/^nb_mock/i.test(k)) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach(function (k) {
      if (/mock/i.test(k)) sessionStorage.removeItem(k);
    });
  } catch (_) {}
  /* Always drop stale service workers on local preview so ?mock=1 leftovers cannot pin old scripts. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
  }
  if (window.caches && caches.keys) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) {
        if (/^shopnip-/i.test(k)) caches.delete(k);
      });
    }).catch(function () {});
  }
  if (mock) return;
})();
