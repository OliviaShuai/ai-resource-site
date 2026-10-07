/* ============================================================
   AI遇见APEC · 学生自评与评价提交表 通用脚本
   —— 自动评分 / 本地保存 / 导出提交内容 / 打印 / 清空
   依赖的 HTML 约定：
     [data-type="scale"][data-dim]       四选一李克特量表（4/3/2/1）
     [data-type="check"][data-dim]       任务清单（勾选数换算 1~4 分）
     [data-type="quiz"][data-dim][data-answer]  知识小测（对 4 分 / 错 1 分）
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var KEY = 'apec-form-' + (body.getAttribute('data-key') || 'x');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. 数据处理 ---------- */
  function fields() {
    return $$('input, select, textarea').filter(function (el) {
      return el.type !== 'button' && el.type !== 'submit' && el.name;
    });
  }

  function collect() {
    var data = {};
    fields().forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else if (el.type === 'checkbox') { data[el.name] = el.checked; }
      else { data[el.name] = el.value; }
    });
    data.__time = new Date().toLocaleString('zh-CN');
    return data;
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    fields().forEach(function (el) {
      if (!(el.name in data)) return;
      if (el.type === 'radio') el.checked = (data[el.name] === el.value);
      else if (el.type === 'checkbox') el.checked = !!data[el.name];
      else el.value = data[el.name];
    });
  }

  var saveTimer = null;
  function save(silent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(collect()));
      if (!silent) hint('✅ 已保存到本机浏览器，关闭页面也不丢');
    } catch (e) { if (!silent) hint('⚠️ 本机保存失败（浏览器隐私模式？），请导出 JSON 备份'); }
  }

  function hint(msg) {
    var el = $('#hint') || (function () {
      var d = document.createElement('div');
      d.className = 'hint'; d.id = 'hint'; document.body.appendChild(d); return d;
    })();
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /* ---------- 2. 评分 ---------- */
  function compute() {
    var dims = {}, quizTotal = 0, quizRight = 0;
    var selfSum = 0, selfCount = 0;

    $$('[data-type="scale"][data-dim]').forEach(function (item) {
      var dim = item.getAttribute('data-dim');
      var picked = $$('input[type="radio"]', item).filter(function (r) { return r.checked; })[0];
      var v = picked ? parseFloat(picked.value) : 0;
      if (picked) { selfSum += v; selfCount++; }
      push(dims, dim, picked ? v : null);
    });

    $$('[data-type="check"][data-dim]').forEach(function (item) {
      var dim = item.getAttribute('data-dim');
      var boxes = $$('input[type="checkbox"]', item);
      var exp = parseFloat(item.getAttribute('data-expected') || boxes.length) || boxes.length;
      var got = boxes.filter(function (b) { return b.checked; }).length;
      var v = Math.min(4, got / exp * 4);
      selfSum += v; selfCount++;
      push(dims, dim, v);
    });

    $$('[data-type="quiz"][data-dim]').forEach(function (item) {
      var dim = item.getAttribute('data-dim');
      var ans = (item.getAttribute('data-answer') || '').trim().toUpperCase();
      var picked = $$('input[type="radio"]', item).filter(function (r) { return r.checked; })[0];
      var ok = !!picked && picked.value.toUpperCase() === ans;
      if (picked) { quizTotal++; if (ok) quizRight++; }
      push(dims, dim, picked ? (ok ? 4 : 1) : null);
    });

    var selfRatio = selfCount ? selfSum / selfCount / 4 : 0;
    var quizRatio = quizTotal ? quizRight / quizTotal : 0;
    var total = Math.round(selfRatio * 70 + quizRatio * 30);
    var level = total >= 90 ? 'A' : total >= 75 ? 'B' : total >= 60 ? 'C' : 'D';

    var dimList = Object.keys(dims).map(function (k) {
      var vals = dims[k].filter(function (v) { return v !== null && v !== undefined; });
      return { name: k, score: vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0 };
    });

    return {
      total: total, level: level, selfRatio: selfRatio, quizRatio: quizRatio,
      quizRight: quizRight, quizTotal: quizTotal, dims: dimList
    };
  }

  function push(o, k, v) { (o[k] = o[k] || []).push(v); }

  var LEVEL_TEXT = {
    A: 'A 优秀 · 学得很扎实，还能帮助同学',
    B: 'B 良好 · 掌握得不错，个别地方可再练',
    C: 'C 合格 · 基本学会，需要再巩固一遍',
    D: 'D 待提高 · 别着急，找老师和同伴一起补一补'
  };

  function renderScore() {
    var r = compute();
    var box = $('#scoreBody');
    if (!box) return r;
    $('#gaugeVal').innerHTML = r.total + '<small> / 100</small>';
    var lv = $('#gaugeLv');
    lv.className = 'lv ' + r.level;
    lv.textContent = r.level + ' 等级';
    $('#lvText').textContent = LEVEL_TEXT[r.level];
    $('#splitSelf').innerHTML = Math.round(r.selfRatio * 70) + '<small style="font-size:13px;color:#6B7280"> / 70</small>';
    $('#splitQuiz').innerHTML = (r.quizTotal ? r.quizRight + ' / ' + r.quizTotal + ' 题正确' : '未作答') +
      '<small style="font-size:13px;color:#6B7280"> → ' + Math.round(r.quizRatio * 30) + ' / 30</small>';

    var bars = $('#bars');
    if (bars) {
      bars.innerHTML = '';
      var base = ['信息意识', '计算思维', '数字化学习与创新', '信息社会责任'];
      var names = base.filter(function (n) { return r.dims.some(function (d) { return d.name === n; }); });
      r.dims.forEach(function (d) { if (names.indexOf(d.name) < 0) names.push(d.name); });
      names.forEach(function (n) {
        var d = r.dims.filter(function (x) { return x.name === n; })[0];
        var pct = d ? d.score / 4 * 100 : 0;
        var row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = '<span style="color:#6B7280;font-size:12.5px">' + n + '</span>' +
          '<span class="bar"><i style="width:' + pct.toFixed(0) + '%"></i></span>' +
          '<span class="pv">' + (d ? Math.round(pct) + '%' : '—') + '</span>';
        bars.appendChild(row);
      });
    }
    return r;
  }

  /* ---------- 3. 小测即时反馈 ---------- */
  $$('[data-type="quiz"]').forEach(function (item) {
    var ans = (item.getAttribute('data-answer') || '').trim().toUpperCase();
    var feedback = $('.qfb', item);
    $$('input[type="radio"]', item).forEach(function (r) {
      r.addEventListener('change', function () {
        $$('input[type="radio"]', item).forEach(function (o) {
          var span = o.parentNode.querySelector('span');
          if (span) span.classList.remove('right', 'wrong');
        });
        var span = r.parentNode.querySelector('span');
        var ok = r.value.toUpperCase() === ans;
        if (span) span.classList.add(ok ? 'right' : 'wrong');
        if (!ok) {
          $$('input[type="radio"]', item).forEach(function (o) {
            if (o.value.toUpperCase() === ans) {
              var s2 = o.parentNode.querySelector('span');
              if (s2) s2.classList.add('right');
            }
          });
        }
        if (feedback) {
          feedback.classList.add('show');
          feedback.classList.toggle('ok', ok);
          feedback.classList.toggle('no', !ok);
          feedback.textContent = (ok ? '✅ 答对了！' : '❌ 正确答案是 ' + ans + '。') +
            (item.getAttribute('data-fb') || '');
        }
        renderScore();
      });
    });
  });

  /* ---------- 4. 导出提交内容 ---------- */
  function buildReport() {
    var r = renderScore ? compute() : null;
    var d = collect();
    var L = [];
    L.push('【AI遇见APEC · ' + (body.getAttribute('data-title') || '学习评价提交表') + '】');
    L.push('提交时间：' + d.__time);
    L.push('');
    L.push('一、学生信息');
    L.push('  姓名：' + (d.name || '') + '　班级：' + (d.cls || '') + '　学号：' + (d.sid || '') + '　日期：' + (d.date || ''));
    L.push('');
    L.push('二、自评量表（每题 4 档：完全达成 / 基本达成 / 部分达成 / 还需努力）');
    $$('[data-type="scale"],[data-type="check"]').forEach(function (item) {
      var q = $('.fq', item);
      var label = q ? q.innerText.replace(/\s+/g, ' ').trim() : '';
      var val = '';
      if (item.getAttribute('data-type') === 'scale') {
        var picked = $$('input[type="radio"]', item).filter(function (x) { return x.checked; })[0];
        val = picked ? picked.parentNode.innerText.trim() : '未作答';
      } else {
        var boxes = $$('input[type="checkbox"]', item);
        var done = boxes.filter(function (b) { return b.checked; });
        val = '已完成 ' + done.length + '/' + boxes.length + ' 项：' +
          done.map(function (b) { return b.parentNode.innerText.trim(); }).join('、');
      }
      L.push('  · ' + label);
      L.push('    → ' + val);
    });
    L.push('');
    L.push('三、知识小测');
    $$('[data-type="quiz"]').forEach(function (item, i) {
      var q = $('.fq', item);
      var ans = (item.getAttribute('data-answer') || '').trim().toUpperCase();
      var picked = $$('input[type="radio"]', item).filter(function (x) { return x.checked; })[0];
      var mine = picked ? picked.value.toUpperCase() : '未作答';
      L.push('  ' + (i + 1) + '. ' + (q ? q.innerText.replace(/\s+/g, ' ').trim() : ''));
      L.push('     我的答案：' + mine + '　' + (picked ? (mine === ans ? '✅ 正确' : '❌ 错误，正确答案 ' + ans) : ''));
    });
    L.push('');
    L.push('四、学习反思');
    $$('.qbox').forEach(function (b) {
      var q = $('.qq', b);
      var t = $('textarea', b);
      L.push('  · ' + (q ? q.innerText.replace(/\s+/g, ' ').trim() : ''));
      L.push('    ' + ((t && t.value.trim()) || '（未填写）'));
    });
    L.push('');
    L.push('五、学习成果提交');
    $$('[data-export]').forEach(function (el) {
      var lab = el.getAttribute('data-export');
      L.push('  ' + lab + '：' + (el.value || '（未填写）'));
    });
    L.push('');
    L.push('六、系统汇总（依据自评与答题自动计算）');
    L.push('  综合得分：' + r.total + ' / 100（自评部分 70 分 + 知识小测 30 分）');
    L.push('  自评得分率：' + Math.round(r.selfRatio * 100) + '%　小测正确率：' +
      Math.round(r.quizRatio * 100) + '%（' + r.quizRight + '/' + r.quizTotal + ' 题）');
    r.dims.forEach(function (x) { L.push('  · ' + x.name + '：' + Math.round(x.score / 4 * 100) + '%'); });
    L.push('  等级：' + r.level);
    return L.join('\n');
  }

  /* ---------- 5. 按钮绑定 ---------- */
  var onReady = function () {
    restore();
    renderScore();

    $$('input, select, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { save(true); }, 800);
      });
      el.addEventListener('change', function () { renderScore(); });
    });

    var bSave = $('#btnSave');
    if (bSave) bSave.addEventListener('click', function () { save(false); });

    var bCalc = $('#btnCalc');
    if (bCalc) bCalc.addEventListener('click', function () {
      var r = renderScore();
      var sc = $('#scoreCard');
      if (sc) sc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      hint('当前综合得分：' + r.total + ' 分（' + r.level + ' 等级）');
    });

    var bPrint = $('#btnPrint');
    if (bPrint) bPrint.addEventListener('click', function () { renderScore(); setTimeout(function () { window.print(); }, 200); });

    var bReport = $('#btnReport');
    if (bReport) bReport.addEventListener('click', function () {
      var txt = buildReport();
      var box = $('#exportBox');
      var ta = $('#exportText');
      ta.value = txt;
      box.classList.add('show');
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ta.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { hint('✅ 提交内容已生成并复制到剪贴板'); },
          function () { hint('提交内容已生成，请点「复制」按钮'); });
      } else { hint('提交内容已生成，请手动选中复制'); }
    });

    var bCopy = $('#btnCopy');
    if (bCopy) bCopy.addEventListener('click', function () {
      var ta = $('#exportText');
      if (!ta.value) ta.value = buildReport();
      ta.select();
      try { document.execCommand('copy'); hint('✅ 已复制，粘贴给老师即可'); } catch (e) { hint('请手动复制'); }
    });

    var bJson = $('#btnJson');
    if (bJson) bJson.addEventListener('click', function () {
      var r = compute();
      var payload = { 课程: body.getAttribute('data-title'), 汇总: r, 作答: collect() };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (body.getAttribute('data-filename') || '评价提交表') + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      hint('✅ 已导出 JSON 文件，可发给老师');
    });

    var bClear = $('#btnClear');
    if (bClear) bClear.addEventListener('click', function () {
      if (!confirm('确定要清空本表所有内容吗？此操作不可撤销。')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      fields().forEach(function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });
      $$('.qfb').forEach(function (f) { f.classList.remove('show', 'ok', 'no'); });
      $$('.opts span').forEach(function (s) { s.classList.remove('right', 'wrong'); });
      var box = $('#exportBox'); if (box) box.classList.remove('show');
      renderScore();
      hint('已清空，可以重新填写');
    });

    // 默认日期
    var dEl = $('input[name="date"]');
    if (dEl && !dEl.value) {
      var t = new Date();
      dEl.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
