/* ============================================================
   AI遇见APEC · 网页教材通用脚本
   功能：阅读进度、目录高亮、图片灯箱、小测判分、一键复制、
         折叠面板、返回顶部、打印、侧栏目录开关
   ============================================================ */
(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- 1. 阅读进度 ---------- */
  var fill = $('#progressFill');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
    if (fill) fill.style.width = Math.min(100, Math.max(0, p)).toFixed(2) + '%';
    var btn = $('#toTop');
    if (btn) btn.classList.toggle('show', (h.scrollTop || 0) > 560);
    spy();
  }

  /* ---------- 2. 目录高亮 ---------- */
  var tocLinks = $$('.toc a[href^="#"]');
  var targets = tocLinks.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });
  var navLinks = $$('.topnav a[href^="#"]');

  function spy() {
    var y = (window.pageYOffset || document.documentElement.scrollTop) + 120;
    var idx = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].offsetTop <= y) idx = i;
    }
    tocLinks.forEach(function (a, i) { a.classList.toggle('on', i === idx); });
    var id = idx >= 0 && targets[idx] ? targets[idx].id : '';
    navLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
  }

  /* ---------- 3. 图片灯箱 ---------- */
  var box = null;
  function ensureBox() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<img alt="放大查看">';
    box.addEventListener('click', function () { box.classList.remove('show'); });
    document.body.appendChild(box);
    return box;
  }
  $$('figure img, .zoomable').forEach(function (img) {
    img.addEventListener('click', function () {
      var b = ensureBox();
      b.querySelector('img').src = img.src;
      b.classList.add('show');
    });
  });

  /* ---------- 4. 小测判分 ---------- */
  $$('.quiz').forEach(function (q) {
    var answer = (q.getAttribute('data-answer') || '').trim().toUpperCase();
    var fb = $('.fb', q);
    var answered = false;
    $$('.opt', q).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (answered) { return; }
        answered = true;
        var pick = (btn.getAttribute('data-opt') || '').trim().toUpperCase();
        var right = pick === answer;
        btn.classList.add(right ? 'ok' : 'no');
        if (!right) {
          $$('.opt', q).forEach(function (o) {
            if ((o.getAttribute('data-opt') || '').trim().toUpperCase() === answer) o.classList.add('ok');
          });
        }
        if (fb) {
          fb.classList.add('show', right ? 'ok' : 'no');
          fb.textContent = (right ? '✅ 答对了！' : '❌ 再想一想，正确答案是 ' + answer + '。')
            + (fb.getAttribute('data-fb') || '');
        }
      });
    });
  });

  /* ---------- 5. 一键复制 ---------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        var old = btn.innerHTML;
        btn.classList.add('done');
        btn.innerHTML = '✅ 已复制';
        setTimeout(function () { btn.classList.remove('done'); btn.innerHTML = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  });

  function fallback(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { alert('复制失败，请手动选中复制'); }
    document.body.removeChild(ta);
  }

  /* ---------- 6. 折叠全部展开/收起 ---------- */
  $$('[data-toggle-all]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sel = btn.getAttribute('data-toggle-all');
      var items = $$(sel);
      var anyClosed = items.some(function (d) { return !d.open; });
      items.forEach(function (d) { d.open = anyClosed; });
      btn.textContent = anyClosed ? '全部收起' : '全部展开';
    });
  });

  /* ---------- 7. 返回顶部 & 目录开关 ---------- */
  var top = $('#toTop');
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  var menuBtn = $('#menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var toc = $('#toc');
      if (!toc) return;
      var hidden = toc.style.display === 'none' || !toc.style.display;
      toc.style.display = hidden ? 'block' : 'none';
      menuBtn.textContent = hidden ? '收起目录' : '目录';
    });
  }

  /* ---------- 8. 打印 ---------- */
  $$('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  /* ---------- 9. 章节内的「学习任务」自动编号 ---------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
