/* ============================================================
 * gantt-renderer.js — MD 解析器 + Gantt 渲染器 + 拖拽/依赖引擎
 * 基于 D:\gcp\cc\site 版本修改，支持动态周数和 10 个痛点
 * ============================================================ */
var GanttRenderer = (function () {

  /* ── 颜色工具 ── */
  var BLOCKER_COLORS = {
    '1': '#dc2626', '2': '#d97706', '3': '#be185d', '4': '#2563eb',
    '5': '#059669', '6': '#7c3aed', '7': '#0891b2', '8': '#64748b',
    '9': '#f59e0b', '10': '#6b7280'
  };

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return { r: r, g: g, b: b };
  }

  /* ── MD 解析器 ── */
  function parseMD(md) {
    var lines = md.split('\n');
    var config = { id: '', weeks: 12, cutover: 14, cutoverInit: null, description: '', sortNote: '', blockers: [] };
    var inFront = false, currentBlocker = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line === '---') { inFront = !inFront; continue; }

      if (inFront) {
        var m;
        if ((m = line.match(/^id:\s*(.+)/))) config.id = m[1].trim();
        else if ((m = line.match(/^weeks:\s*(\d+)/))) config.weeks = parseInt(m[1]);
        else if ((m = line.match(/^cutover:\s*W(\d+)/))) config.cutover = parseInt(m[1]) + 2;
        else if ((m = line.match(/^cutover-init:\s*W(\d+)/))) config.cutoverInit = parseInt(m[1]) + 2;
        else if ((m = line.match(/^description:\s*(.+)/))) config.description = m[1].trim();
        else if ((m = line.match(/^sort-note:\s*(.+)/))) config.sortNote = m[1].trim();
        continue;
      }

      /* Blocker header: ## #3 Security Review | P0-长线 | #dc2626 | blocker3.html */
      if (line.startsWith('## ')) {
        var parts = line.substring(3).split('|').map(function (s) { return s.trim(); });
        var nameMatch = parts[0].match(/^#(\d+)\s+(.+)/);
        if (!nameMatch) continue;
        currentBlocker = {
          id: nameMatch[1],
          name: nameMatch[2],
          priority: parts[1] || '',
          color: parts[2] || BLOCKER_COLORS[nameMatch[1]] || '#64748b',
          link: parts[3] || '',
          tasks: []
        };
        BLOCKER_COLORS[currentBlocker.id] = currentBlocker.color;
        config.blockers.push(currentBlocker);
        continue;
      }

      /* Task line: - W1~W3 | act | 提交材料 | wait:2 | dep-source */
      if (line.startsWith('- ') && currentBlocker) {
        var tparts = line.substring(2).split('|').map(function (s) { return s.trim(); });
        if (tparts.length < 3) continue;

        var range = tparts[0].match(/^W(\d+)~(?:W(\d+))?$/);
        if (!range) continue;
        var ws = parseInt(range[1]);
        var we = range[2] ? parseInt(range[2]) : null; /* null = done segment, extends to cutover */
        var colStart = ws + 1; /* W1 = column 2 */
        var colEnd = we !== null ? we + 1 : config.cutover;

        var type = tparts[1].trim();
        var label = tparts[2].trim();
        var tags = {};
        for (var t = 3; t < tparts.length; t++) {
          var tag = tparts[t].trim();
          if (tag.startsWith('wait:')) tags.waitFor = tag.substring(5);
          else if (tag === 'dep-source') tags.depSource = true;
          else if (tag.startsWith('feed:')) tags.feed = tag.substring(5);
        }

        currentBlocker.tasks.push({
          colStart: colStart, colEnd: colEnd,
          type: type, label: label, tags: tags,
          isDone: type === 'done'
        });
      }
    }

    if (config.cutoverInit === null) config.cutoverInit = config.cutover;
    return config;
  }

  /* ── HTML 渲染器 ── */
  function renderGantt(config, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    /* Dynamic grid columns based on config.weeks */
    var gridCols = '120px repeat(' + config.weeks + ', 1fr)';

    /* Reuse or create gt-wrap; preserve sibling elements (toolbar, panel) */
    var wrap = container.querySelector('.gt-wrap');
    var descEl = container.querySelector('.gt-desc');

    if (!descEl && config.description) {
      descEl = document.createElement('p');
      descEl.className = 'gt-desc';
      container.insertBefore(descEl, container.firstChild);
    }
    if (descEl) descEl.innerHTML = config.description || '';

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'gt-wrap';
      /* Insert after toolbar if it exists (from version panel), else after desc */
      var toolbar = container.querySelector('.gv-toolbar');
      if (toolbar) { toolbar.insertAdjacentElement('afterend', wrap); }
      else if (descEl) { descEl.insertAdjacentElement('afterend', wrap); }
      else { container.appendChild(wrap); }
    }
    wrap.innerHTML = '';

    /* Store weeks for cutover line */
    wrap.dataset.weeks = config.weeks;

    /* SVG overlay for arcs */
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'g2-svg');
    svg.id = containerId + '-svg';
    wrap.appendChild(svg);

    /* Header row */
    var hdr = document.createElement('div');
    hdr.className = 'gt-hdr';
    hdr.style.gridTemplateColumns = gridCols;
    hdr.innerHTML = '<span></span>';
    for (var w = 1; w <= config.weeks; w++) hdr.innerHTML += '<span>W' + w + '</span>';
    wrap.appendChild(hdr);

    /* Blocker rows */
    config.blockers.forEach(function (b, idx) {
      var row = document.createElement('div');
      row.className = 'gt-row gc-' + (idx + 1);
      row.dataset.blocker = b.id;
      row.style.gridTemplateColumns = gridCols;

      /* Label */
      var label = document.createElement('div');
      label.className = 'gt-label';
      label.style.color = b.color;
      if (b.link) {
        label.innerHTML = '<a href="' + b.link + '" style="color:inherit;text-decoration:none;border-bottom:1px dashed ' + b.color + '">#' + b.id + ' ' + b.name + '</a>';
      } else {
        label.textContent = '#' + b.id + ' ' + b.name;
      }
      row.appendChild(label);

      /* Task segments */
      b.tasks.forEach(function (task) {
        var seg = document.createElement('div');
        seg.className = 'gt-seg gt-' + task.type;
        seg.style.gridColumnStart = task.colStart;
        seg.style.gridColumnEnd = task.colEnd;

        /* Hide zero-width segments (compressed dependencies) */
        if (task.colStart >= task.colEnd) {
          seg.style.display = 'none';
        }

        /* Handle special crit segment for feed */
        if (task.type === 'crit' && task.tags.feed) {
          var feedColor = BLOCKER_COLORS[task.tags.feed] || '#dc2626';
          seg.style.background = b.color + ' repeating-linear-gradient(0deg,rgba(255,255,255,.22) 0,rgba(255,255,255,.22) 2.5px,transparent 2.5px,transparent 5px)';
          seg.style.setProperty('background', seg.style.background, 'important');
        }

        /* data attributes */
        if (task.tags.waitFor) seg.dataset.waitFor = task.tags.waitFor;
        if (task.tags.depSource) seg.setAttribute('data-dep-source', '');

        /* Inner HTML */
        if (task.tags.waitFor) {
          var waitId = task.tags.waitFor;
          var waitColor = BLOCKER_COLORS[waitId] || '#64748b';
          var badge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:.58rem;background:' + waitColor + ';color:#fff;font-weight:700">#' + waitId + '</span>';
          var labelText = task.label.replace(/#\d+/, '').replace(/等\s*/, '等 ');
          var suffix = labelText.replace('等 ', '').trim();
          seg.innerHTML = '等 ' + badge + (suffix ? ' ' + suffix : '');
        } else if (task.tags.feed) {
          var feedId = task.tags.feed;
          var fColor = BLOCKER_COLORS[feedId] || '#dc2626';
          var fBadge = '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:.58rem;background:' + fColor + ';color:#fff;font-weight:700">#' + feedId + '</span>';
          var fLabel = task.label.replace(/#\d+/, '').trim();
          seg.innerHTML = fLabel + ' ' + fBadge;
        } else {
          seg.textContent = task.label;
        }

        row.appendChild(seg);
      });

      wrap.appendChild(row);
    });

    /* Cutover line */
    var cutover = document.createElement('div');
    cutover.className = 'gt-cutover';
    cutover.dataset.init = config.cutover;
    cutover.dataset.weeks = config.weeks;
    cutover.innerHTML = '<svg viewBox="0 0 6 1" preserveAspectRatio="none"><line class="cut-halo" x1="3" y1="0" x2="3" y2="1" vector-effect="non-scaling-stroke"/><line class="cut-line" x1="3" y1="0" x2="3" y2="1" vector-effect="non-scaling-stroke"/></svg><div class="cut-dot"></div><span>目标 W' + (config.cutover - 2) + '</span>';
    wrap.appendChild(cutover);

    return wrap;
  }

  /* ── 拖拽 + 依赖弧线引擎 ── */
  function bindEngine(containerId) {
    var C = document.getElementById(containerId);
    if (!C) return;
    var svgEl = document.getElementById(containerId + '-svg');
    if (!svgEl) return;
    var ctn = svgEl.parentElement;
    var drag = null, ZONE = 10;

    function gc(el) { var s = getComputedStyle(el); return [parseInt(s.gridColumnStart), parseInt(s.gridColumnEnd)]; }
    function sc(el, a, b) { el.style.gridColumnStart = a; el.style.gridColumnEnd = b; }
    function cinfo(row) {
      var s = row.querySelector('.gt-seg');
      if (!s) return null;
      var c = gc(s), r = s.getBoundingClientRect(), w = r.width / (c[1] - c[0]);
      return { x: r.left - (c[0] - 2) * w, w: w };
    }
    function x2c(row, x) { var i = cinfo(row); return i ? (x - i.x) / i.w + 2 : 2; }

    function findEdge(segs, e) {
      for (var i = 0; i < segs.length; i++) {
        if (segs[i].style.display === 'none') continue;
        var r = segs[i].getBoundingClientRect();
        if (r.width < 1) continue;
        if (Math.abs(r.right - e.clientX) < ZONE) {
          for (var n = i + 1; n < segs.length; n++) {
            if (segs[n].style.display === 'none') continue;
            if (gc(segs[i])[1] === gc(segs[n])[0]) return { l: i, r: n }; break;
          }
        }
        if (Math.abs(r.left - e.clientX) < ZONE && i > 0) {
          for (var p = i - 1; p >= 0; p--) {
            if (segs[p].style.display === 'none') continue;
            if (gc(segs[p])[1] === gc(segs[i])[0]) return { l: p, r: i }; break;
          }
        }
      }
      return null;
    }

    /* Build dependency model */
    var rows = Array.from(C.querySelectorAll('.gt-row')), R = {};
    rows.forEach(function (r) {
      var b = r.dataset.blocker;
      if (b) R[b] = { el: r, segs: Array.from(r.querySelectorAll('.gt-seg')) };
    });

    var allD = [], outD = {}, inD = {};
    Object.keys(R).forEach(function (b) { outD[b] = []; inD[b] = []; });
    Object.keys(R).forEach(function (bn) {
      R[bn].segs.forEach(function (seg, idx) {
        var wf = seg.dataset.waitFor;
        if (!wf || !R[wf]) return;
        var si = -1;
        R[wf].segs.forEach(function (s, i) { if (s.hasAttribute('data-dep-source')) si = i; });
        if (si < 0) return;
        var d = { src: wf, si: si, dep: bn, di: idx };
        allD.push(d); outD[wf].push(d); inD[bn].push(d);
      });
    });

    var orig = {};
    Object.keys(R).forEach(function (b) { orig[b] = R[b].segs.map(gc); });

    /* SVG arcs */
    function drawSVG() {
      var cr = ctn.getBoundingClientRect(), halos = '', lines = '';
      allD.forEach(function (d) {
        var ss = R[d.src].segs[d.si], ds = R[d.dep].segs[d.di];
        if (ds.style.display === 'none') return;
        var sr = ss.getBoundingClientRect(), dr = ds.getBoundingClientRect();
        if (sr.width < 1 || dr.width < 1) return;
        var x1 = sr.right - cr.left, y1 = sr.top + sr.height / 2 - cr.top;
        var x2 = dr.right - cr.left, y2 = dr.top + dr.height / 2 - cr.top;
        var bx = Math.max(x1, x2) + 28;
        var path = 'M' + x1 + ',' + y1 + ' C' + bx + ',' + y1 + ' ' + bx + ',' + y2 + ' ' + x2 + ',' + y2;
        var col = BLOCKER_COLORS[d.src] || '#94a3b8';
        var op = drag ? '.9' : '.7', sw = drag ? '2.5' : '2';
        halos += '<path d="' + path + '" stroke="#fff" fill="none" stroke-width="' + (parseFloat(sw) + 3) + '"/>';
        lines += '<path d="' + path + '" stroke="' + col + '" fill="none" stroke-width="' + sw + '" stroke-dasharray="6,4" opacity="' + op + '"/>';
        lines += '<circle cx="' + x2 + '" cy="' + y2 + '" r="' + (drag ? '8' : '6') + '" fill="#fff"/>';
      });
      svgEl.innerHTML = halos + lines;
    }

    /* Cascade */
    function cascadeRow(bn, segs, oc, idx, nb, lastEnd) {
      sc(segs[idx], oc[idx][0], nb);
      var ns = nb;
      for (var i = idx + 1; i < segs.length; i++) {
        var dep = null;
        inD[bn].forEach(function (d) { if (d.di === i) dep = d; });
        if (dep) {
          var srcEnd = gc(R[dep.src].segs[dep.si])[1];
          if (ns >= srcEnd) {
            segs[i].style.display = 'none'; sc(segs[i], ns, ns);
          } else {
            segs[i].style.display = ''; sc(segs[i], ns, srcEnd); ns = srcEnd;
          }
        } else if (i === segs.length - 1) {
          sc(segs[i], ns, lastEnd); ns = lastEnd;
        } else {
          var w = oc[i][1] - oc[i][0]; sc(segs[i], ns, ns + w); ns += w;
        }
      }
    }

    /* Wire drag per row */
    rows.forEach(function (row) {
      var bn = row.dataset.blocker, segs = R[bn].segs;
      if (segs.length < 2) return;

      row.addEventListener('mousemove', function (e) {
        if (drag) return;
        segs.forEach(function (s) { s.style.cursor = ''; });
        var ed = findEdge(segs, e);
        if (ed) { segs[ed.l].style.cursor = 'col-resize'; segs[ed.r].style.cursor = 'col-resize'; }
      });
      row.addEventListener('mouseleave', function () {
        segs.forEach(function (s) { s.style.cursor = ''; });
      });
      row.addEventListener('mousedown', function (e) {
        var ed = findEdge(segs, e);
        if (!ed) return;
        if (inD[bn].some(function (d) { return d.di === ed.l; })) return;
        e.preventDefault();
        var snap = {};
        Object.keys(R).forEach(function (b) { snap[b] = R[b].segs.map(gc); });
        var oc = snap[bn], idx = ed.l, lastEnd = oc[oc.length - 1][1];
        var sp = 0;
        for (var i = idx + 1; i < segs.length; i++) {
          if (i === segs.length - 1) { sp += 1; break; }
          if (!inD[bn].some(function (d) { return d.di === i; })) sp += oc[i][1] - oc[i][0];
        }
        drag = {
          row: row, bn: bn, segs: segs, oc: oc, idx: idx,
          ls: oc[idx][0], ob: oc[idx][1], le: lastEnd, mx: lastEnd - sp, snap: snap
        };
        outD[bn].forEach(function (od) { R[od.dep].segs[od.di].classList.add('g2-hl'); });
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      });
    });

    var onDocMove = function (e) {
      if (!drag) return;
      var d = drag;
      var nb = Math.round(x2c(d.row, e.clientX));
      nb = Math.max(d.ls + 1, Math.min(d.mx, nb));
      cascadeRow(d.bn, d.segs, d.oc, d.idx, nb, d.le);
      outD[d.bn].forEach(function (od) {
        var srcEnd = gc(d.segs[od.si])[1];
        var ds = R[od.dep].segs, doc = d.snap[od.dep];
        var di = od.di, dle = doc[doc.length - 1][1];
        var dps = doc[di][0], dne = Math.max(dps, srcEnd);
        var minAfter = 0;
        for (var k = di + 1; k < ds.length; k++) {
          minAfter += (k === ds.length - 1) ? 1 : Math.max(1, doc[k][1] - doc[k][0]);
        }
        if (dne > dle - minAfter) dne = Math.max(dps, dle - minAfter);
        if (srcEnd <= dps) {
          ds[di].style.display = 'none'; sc(ds[di], dps, dps); dne = dps;
        } else {
          ds[di].style.display = ''; sc(ds[di], dps, dne);
        }
        var ns2 = dne;
        for (var j = di + 1; j < ds.length; j++) {
          var w = doc[j][1] - doc[j][0];
          var ne = (j === ds.length - 1) ? dle : ns2 + w;
          sc(ds[j], ns2, ne); ns2 = ne;
        }
      });
      drawSVG();
    };

    var onDocUp = function () {
      if (!drag) return;
      outD[drag.bn].forEach(function (od) { R[od.dep].segs[od.di].classList.remove('g2-hl'); });
      drag = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      drawSVG();
      C.dispatchEvent(new CustomEvent('gantt-drag-end'));
    };

    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup', onDocUp);

    setTimeout(drawSVG, 100);
    window.addEventListener('resize', drawSVG);

    if (_cleanup[containerId]) {
      _cleanup[containerId].push(
        function () { document.removeEventListener('mousemove', onDocMove); },
        function () { document.removeEventListener('mouseup', onDocUp); },
        function () { window.removeEventListener('resize', drawSVG); }
      );
    }

    C._ganttState = function () {
      var result = [];
      rows.forEach(function (row) {
        var bn = row.dataset.blocker;
        var segs = R[bn].segs;
        result.push({ id: bn, segments: segs.map(gc) });
      });
      return result;
    };

    return { R: R, drawSVG: drawSVG, orig: orig };
  }

  /* ── Cutover line drag ── */
  function bindCutover(containerId) {
    var C = document.getElementById(containerId);
    if (!C) return;
    C.querySelectorAll('.gt-cutover').forEach(function (cut) {
      var ctn = cut.parentElement;
      var rows = Array.from(ctn.querySelectorAll('.gt-row'));
      if (!rows.length) return;

      /* Dynamic ORIG based on weeks stored in data attribute */
      var weeksCount = parseInt(cut.dataset.weeks || '12');
      var ORIG = weeksCount + 2;
      var INIT = parseInt(cut.dataset.init || String(ORIG)), cur = INIT, cdrag = null;

      function gc(el) { var s = getComputedStyle(el); return [parseInt(s.gridColumnStart), parseInt(s.gridColumnEnd)]; }
      function posVert() {
        var cr = ctn.getBoundingClientRect();
        var hdr = ctn.querySelector('.gt-hdr');
        var fr = rows[0].getBoundingClientRect();
        var lr = rows[rows.length - 1].getBoundingClientRect();
        var hdrH = hdr ? (fr.top - hdr.getBoundingClientRect().top) : 0;
        cut.style.top = (fr.top - cr.top - hdrH) + 'px';
        cut.style.bottom = (cr.bottom - lr.bottom - hdrH) + 'px';
      }
      posVert();

      function refInfo() {
        for (var i = 0; i < rows.length; i++) {
          var s = rows[i].querySelector('.gt-seg');
          if (s && s.getBoundingClientRect().width > 0) {
            var c = gc(s), r = s.getBoundingClientRect(), w = r.width / (c[1] - c[0]);
            return { w: w, x: r.left - (c[0] - 2) * w };
          }
        }
        return null;
      }
      function x2col(x) { var i = refInfo(); return i ? (x - i.x) / i.w + 2 : 2; }
      function colRight(col) { var i = refInfo(); return i ? (ORIG - col) * i.w : 0; }

      function apply(nc) {
        cur = nc;
        cut.style.right = colRight(nc) + 'px';
        cut.querySelector('span').textContent = '目标 W' + (nc - 2) + '';
        rows.forEach(function (row) {
          var segs = Array.from(row.querySelectorAll('.gt-seg'));
          var last = segs[segs.length - 1];
          if (!last || !last.classList.contains('gt-done')) return;
          var st = gc(last)[0];
          if (nc <= st) { last.style.display = 'none'; }
          else { last.style.display = ''; last.style.gridColumnEnd = nc; }
        });
      }
      setTimeout(function () { apply(cur); }, 50);

      cut.addEventListener('mousedown', function (e) {
        e.preventDefault(); e.stopPropagation();
        var minC = 3;
        rows.forEach(function (row) {
          var segs = Array.from(row.querySelectorAll('.gt-seg'));
          for (var i = segs.length - 1; i >= 0; i--) {
            if (!segs[i].classList.contains('gt-done')) {
              var en = gc(segs[i])[1]; if (en + 1 > minC) minC = en + 1; break;
            }
          }
        });
        cdrag = { min: minC };
        cut.classList.add('cut-drag');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      });

      var onCutMove = function (e) {
        if (!cdrag) return;
        var nc = Math.round(x2col(e.clientX));
        nc = Math.max(cdrag.min, Math.min(ORIG, nc));
        if (nc === cur) return;
        apply(nc);
      };

      var onCutUp = function () {
        if (!cdrag) return;
        cdrag = null;
        cut.classList.remove('cut-drag');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        cut.querySelector('span').textContent = '目标 W' + (cur - 2) + '';
      };

      var onCutResize = function () {
        cut.style.right = colRight(cur) + 'px';
        posVert();
      };

      document.addEventListener('mousemove', onCutMove);
      document.addEventListener('mouseup', onCutUp);
      window.addEventListener('resize', onCutResize);

      if (_cleanup[containerId]) {
        _cleanup[containerId].push(
          function () { document.removeEventListener('mousemove', onCutMove); },
          function () { document.removeEventListener('mouseup', onCutUp); },
          function () { window.removeEventListener('resize', onCutResize); }
        );
      }
    });
  }

  /* ── 从当前 DOM 状态反向生成 MD ── */
  function captureState(containerId, originalMD) {
    var C = document.getElementById(containerId);
    if (!C) return originalMD;
    var config = parseMD(originalMD);

    var cutSpan = C.querySelector('.gt-cutover span');
    if (cutSpan) {
      var cutMatch = cutSpan.textContent.match(/W(\d+)/);
      if (cutMatch) config.cutover = parseInt(cutMatch[1]) + 2;
    }

    var rows = Array.from(C.querySelectorAll('.gt-row'));

    rows.forEach(function (row) {
      var bn = row.dataset.blocker;
      var blocker = null;
      config.blockers.forEach(function (b) { if (b.id === bn) blocker = b; });
      if (!blocker) return;

      var segs = Array.from(row.querySelectorAll('.gt-seg'));
      blocker.tasks.forEach(function (task, idx) {
        if (idx < segs.length) {
          var s = getComputedStyle(segs[idx]);
          task.colStart = parseInt(s.gridColumnStart);
          task.colEnd = parseInt(s.gridColumnEnd);
        }
      });
    });

    return configToMD(config);
  }

  /* Config object → MD string */
  function configToMD(config) {
    var lines = [];
    lines.push('---');
    lines.push('id: ' + config.id);
    lines.push('weeks: ' + config.weeks);
    lines.push('cutover: W' + (config.cutover - 2));
    if (config.cutoverInit && config.cutoverInit !== config.cutover) {
      lines.push('cutover-init: W' + (config.cutoverInit - 2));
    }
    if (config.description) lines.push('description: ' + config.description);
    if (config.sortNote) lines.push('sort-note: ' + config.sortNote);
    lines.push('---');
    lines.push('');

    config.blockers.forEach(function (b) {
      lines.push('## #' + b.id + ' ' + b.name + ' | ' + b.priority + ' | ' + b.color + ' | ' + b.link);
      b.tasks.forEach(function (t) {
        var ws = t.colStart - 1;
        var we = t.colEnd - 1;
        var range = t.isDone ? 'W' + ws + '~' : 'W' + ws + '~W' + we;
        var pad = range.length < 8 ? '        '.substring(0, 8 - range.length) : ' ';
        var parts = ['- ' + range + pad + '| ' + t.type + (t.type.length < 4 ? '  ' : ' ') + '| ' + t.label];
        if (t.tags.waitFor) parts.push('wait:' + t.tags.waitFor);
        if (t.tags.depSource) parts.push('dep-source');
        if (t.tags.feed) parts.push('feed:' + t.tags.feed);
        lines.push(parts.join(' | '));
      });
      lines.push('');
    });

    return lines.join('\n');
  }

  /* ── Cleanup registry ── */
  var _cleanup = {};

  /* ── 完整初始化入口 ── */
  function init(mdString, containerId) {
    if (_cleanup[containerId]) {
      _cleanup[containerId].forEach(function (fn) { fn(); });
    }
    _cleanup[containerId] = [];

    var config = parseMD(mdString);
    renderGantt(config, containerId);
    var engine = bindEngine(containerId);
    bindCutover(containerId);
    return { config: config, engine: engine };
  }

  /* Public API */
  return {
    parseMD: parseMD,
    renderGantt: renderGantt,
    bindEngine: bindEngine,
    bindCutover: bindCutover,
    captureState: captureState,
    configToMD: configToMD,
    init: init
  };
})();
