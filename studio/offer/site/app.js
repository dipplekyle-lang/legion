// The video a visitor came from (the short link /008 lands here as ?utm_campaign=008) rides along to checkout,
// so every Stripe payment says which video sold it.
(function () {
  var C = window.OFFER || {};
  var q = new URLSearchParams(location.search);
  var camp = q.get('utm_campaign') || q.get('c') || '';
  try {
    if (camp) sessionStorage.setItem('offer_c', camp);
    else camp = sessionStorage.getItem('offer_c') || '';
  } catch (e) {}
  camp = String(camp).replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  if (C.mode !== 'links' && camp) {
    document.querySelectorAll('a[data-buy]').forEach(function (a) {
      a.href = '/api/checkout?item=' + encodeURIComponent(a.getAttribute('data-buy')) + '&c=' + encodeURIComponent(camp);
    });
  }
  if (C.live && C.mode !== 'links') {
    fetch('/api/live').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || d.n < (C.liveMin || 5)) return;
      document.querySelectorAll('.live').forEach(function (el) {
        el.querySelector('b').textContent = d.n;
        el.classList.add('on');
      });
    }).catch(function () {});
  }
})();
