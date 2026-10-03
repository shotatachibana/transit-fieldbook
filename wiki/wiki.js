(function () {
  var body = document.body, root = body.dataset.root, input = document.getElementById('q'), box = document.getElementById('results');
  var index = null, sel = -1, wide = window.matchMedia('(min-width: 1012px)');
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // サイドバーの開閉(広い画面は畳む/広げる，狭い画面は全面表示)
  var toggle = document.getElementById('side-toggle');
  function syncToggle() {
    var open = wide.matches ? !body.classList.contains('side-collapsed') : body.classList.contains('nav-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.dataset.tip = open ? 'サイドバーを折りたたむ' : 'サイドバーを展開する';
    toggle.setAttribute('aria-label', toggle.dataset.tip);
  }
  toggle.addEventListener('click', function () {
    if (wide.matches) {
      body.classList.toggle('side-collapsed');
      store('wiki-side', body.classList.contains('side-collapsed') ? '0' : '1');
    } else {
      body.classList.toggle('nav-open');
    }
    syncToggle(); scrollSideToCurrent();
  });
  wide.addEventListener('change', function () { body.classList.remove('nav-open'); syncToggle(); });
  syncToggle();
  function scrollSideToCurrent() {
    var side = document.querySelector('.side'), cur = side && side.querySelector('a.current');
    if (!cur || !side.clientHeight) return;
    var top = cur.getBoundingClientRect().top - side.getBoundingClientRect().top + side.scrollTop;
    if (top > side.clientHeight - 80) side.scrollTop = top - side.clientHeight / 3;
  }
  scrollSideToCurrent();

  // ヘッダー(狭い画面の検索・メニュー)
  var menuBtn = document.getElementById('menu-btn'), menu = document.getElementById('hdr-menu');
  menuBtn.addEventListener('click', function (ev) { ev.stopPropagation(); menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', !menu.hidden); });
  document.getElementById('search-btn').addEventListener('click', function () { body.classList.add('search-open'); input.focus(); });

  // ページ内目次(狭い画面の「この記事で」と，いま読んでいる節の強調)
  var tocBtn = document.getElementById('toc-btn'), tocPop = document.getElementById('toc-pop');
  function closeToc() { if (tocBtn) { tocPop.hidden = true; tocBtn.setAttribute('aria-expanded', 'false'); } }
  if (tocBtn) {
    tocBtn.addEventListener('click', function (ev) { ev.stopPropagation(); tocPop.hidden = !tocPop.hidden; tocBtn.setAttribute('aria-expanded', !tocPop.hidden); });
    tocPop.addEventListener('click', function (ev) { if (ev.target.closest('a')) closeToc(); });
  }
  var heads = [].slice.call(document.querySelectorAll('.md h2[id]')), tocLinks = document.querySelectorAll('.toc a, .toc-pop a');
  function spy() {
    if (!heads.length) return;
    var line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0, id = null;
    heads.forEach(function (h) { if (h.getBoundingClientRect().top <= line + 8) id = h.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = heads[heads.length - 1].id;
    tocLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); } }, {passive: true});
  spy();

  document.getElementById('to-top').addEventListener('click', function () { window.scrollTo({top: 0, behavior: 'smooth'}); });

  // 検索
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
    } else if (ev.key === 'Escape') { box.hidden = true; input.blur(); body.classList.remove('search-open'); }
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.search')) box.hidden = true;
    if (!ev.target.closest('.hdr-search') && !ev.target.closest('#search-btn')) body.classList.remove('search-open');
    if (!ev.target.closest('#hdr-menu')) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
    if (!ev.target.closest('.toc-bar')) closeToc();
  });
  document.addEventListener('keydown', function (ev) {
    var t = document.activeElement && document.activeElement.tagName;
    if (ev.key === '/' && t !== 'INPUT' && t !== 'TEXTAREA') {
      ev.preventDefault(); if (!wide.matches && window.innerWidth < 768) body.classList.add('search-open'); input.focus();
    } else if (ev.key === 'Escape') { closeToc(); menu.hidden = true; body.classList.remove('nav-open'); syncToggle(); }
  });
})();
