(function () {
  var root = document.body.dataset.root, input = document.getElementById('q'), box = document.getElementById('results');
  var index = null, sel = -1;
  document.getElementById('menu').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  function norm(s) { return s.normalize('NFKC').toLowerCase().replace(/\s+/g, ''); }
  function load() {
    if (index) return Promise.resolve(index);
    return fetch(root + 'search-index.json').then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (e) { e.n = norm(e.t + ' ' + (e.a || '')); return e; }); return index;
    });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function render(q) {
    if (!q) { box.hidden = true; return; }
    load().then(function (idx) {
      var nq = norm(q), hits = idx.filter(function (e) { return e.n.indexOf(nq) >= 0; });
      hits.sort(function (a, b) { return (norm(a.t).indexOf(nq) === 0 ? 0 : 1) - (norm(b.t).indexOf(nq) === 0 ? 0 : 1) || a.t.length - b.t.length; });
      sel = -1;
      box.innerHTML = hits.length ? hits.slice(0, 30).map(function (e) {
        return '<a href="' + root + e.u + '">' + esc(e.t) + '<small>' + esc(e.d || '') + '</small></a>';
      }).join('') : '<div class="empty">見つかりませんでした</div>';
      box.hidden = false;
    }).catch(function () { box.innerHTML = '<div class="empty">検索の読み込みに失敗しました</div>'; box.hidden = false; });
  }
  input.addEventListener('input', function () { render(input.value.trim()); });
  input.addEventListener('focus', function () { load(); if (input.value.trim()) render(input.value.trim()); });
  input.addEventListener('keydown', function (ev) {
    var links = box.querySelectorAll('a');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault(); if (!links.length) return;
      sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
      links[sel].scrollIntoView({block: 'nearest'});
    } else if (ev.key === 'Enter' && links.length) {
      location.href = links[Math.max(sel, 0)].href;
    } else if (ev.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('.search')) box.hidden = true; });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== input) { ev.preventDefault(); input.focus(); }
  });
})();
