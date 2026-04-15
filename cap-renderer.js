/* ============================================================
 * blocker-renderer.js — Markdown-driven blocker page renderer
 * Loads .md → parses → renders HTML table
 * Double-click cell → contenteditable (Excel-style: edit + RAG
 * highlight in one unified rich-text mode).
 * Full-MD source editor available as fallback.
 * ============================================================ */
var BlockerRenderer = (function () {
  'use strict';

  var META_KEYS = ['id','title','badge','badge-class','status','status-class','subtitle'];

  /* ── Parse YAML-like frontmatter ── */
  function parseFrontmatter(text) {
    var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return { meta: {}, body: text };
    var meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    return { meta: meta, body: text.slice(m[0].length).trim() };
  }

  /* ── Inline formatting: **bold** → <b>, `code` → <code>  ── */
  /* <mark> and <br> in the source pass through untouched.       */
  function fmt(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  /* ── Split on pipe, respect escaped \| ── */
  function splitPipe(text) {
    return text.split(/(?<!\\)\|/).map(function (p) { return p.trim(); });
  }

  /* ── Parse body into sections ── */
  function parseBody(bodyText) {
    var sections = [];
    var parts = bodyText.split(/^## /m);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (i === 0 || !part.trim()) continue;
      var lines = part.split(/\r?\n/);
      var titleLine = lines[0].trim();
      var sectionClass = '';
      var tm = titleLine.match(/^(.+?)\s*\{(\w+)\}\s*$/);
      if (tm) { titleLine = tm[1].trim(); sectionClass = tm[2]; }

      var section = { title: titleLine, cls: sectionClass, rows: [] };
      var curHyp = null;

      for (var j = 1; j < lines.length; j++) {
        var raw = lines[j];
        var trimmed = raw.trim();
        if (!trimmed) continue;
        if (trimmed.indexOf('### ') === 0) {
          curHyp = { type: 'sub-hyp', title: trimmed.slice(4).trim(), desc: '', children: [] };
          section.rows.push(curHyp);
        } else if (/^✅\s*\|/.test(trimmed)) {
          var pv = splitPipe(trimmed.replace(/^✅\s*\|\s*/, ''));
          var vr = { type: 'validate', content: pv[0] || '', ref: pv[1] || '' };
          if (curHyp) curHyp.children.push(vr); else section.rows.push(vr);
        } else if (/^❌\s*\|/.test(trimmed)) {
          var pi = splitPipe(trimmed.replace(/^❌\s*\|\s*/, ''));
          var ir = { type: 'invalidate', content: pi[0] || '', ref: pi[1] || '' };
          if (curHyp) curHyp.children.push(ir); else section.rows.push(ir);
        } else if (/^→\s*\|/.test(trimmed)) {
          var pf = splitPipe(trimmed.replace(/^→\s*\|\s*/, ''));
          var fr = { type: 'fallback', content: pf[0] || '', ref: pf[1] || '' };
          if (curHyp) curHyp.children.push(fr); else section.rows.push(fr);
        } else if (trimmed.charAt(0) === '|') {
          curHyp = null;
          var cols = trimmed.split(/(?<!\\)\|/).filter(function (c) { return c.trim() !== ''; });
          section.rows.push({ type: 'row', label: (cols[0] || '').trim(), content: (cols[1] || '').trim(), ref: (cols[2] || '').trim() });
        } else if (curHyp) {
          curHyp.desc = curHyp.desc ? curHyp.desc + '<br>' + trimmed : trimmed;
        }
      }
      sections.push(section);
    }
    return sections;
  }

  /* ── Serialize data → Markdown ── */
  function serialize(meta, sections) {
    var lines = ['---'];
    META_KEYS.forEach(function (k) {
      if (meta[k] !== undefined && meta[k] !== '') lines.push(k + ': ' + meta[k]);
    });
    Object.keys(meta).forEach(function (k) {
      if (META_KEYS.indexOf(k) === -1 && meta[k] !== undefined && meta[k] !== '')
        lines.push(k + ': ' + meta[k]);
    });
    lines.push('---');
    lines.push('');
    sections.forEach(function (sec) {
      var cls = sec.cls ? ' {' + sec.cls + '}' : '';
      lines.push('## ' + sec.title + cls);
      sec.rows.forEach(function (row) {
        if (row.type === 'sub-hyp') {
          lines.push('');
          lines.push('### ' + row.title);
          if (row.desc) row.desc.split(/<br\s*\/?>/gi).forEach(function (d) { lines.push(d); });
          (row.children || []).forEach(function (ch) {
            var pfx = ch.type === 'validate' ? '✅' : ch.type === 'invalidate' ? '❌' : '→';
            lines.push(pfx + ' | ' + ch.content + (ch.ref ? ' | ' + ch.ref : ''));
          });
        } else if (row.type === 'row') {
          lines.push('| ' + row.label + ' | ' + row.content + (row.ref ? ' | ' + row.ref : '') + (row.ref ? '' : ' |'));
        }
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  /* ── Render parsed data → HTML with data-* attributes ── */
  function renderHTML(meta, sections) {
    var h = '';
    h += '<div class="nav"><a href="index.html">\u2190 返回总览</a></div>';
    var bc = meta['badge-class'] || 'p0';
    var sc = meta['status-class'] || 'active';
    h += '<div class="page-header">';
    h += '<h1>#' + meta.id + ' ' + (meta.title || '') + '</h1>';
    h += '<span class="badge badge-' + bc + '">' + (meta.badge || '') + '</span>';
    h += '<span class="status status-' + sc + '">' + (meta.status || '') + '</span>';
    h += '</div>';
    h += '<p class="subtitle" data-meta="subtitle">' + fmt(meta.subtitle || '') + '</p>';
    h += '<div class="card"><table>';
    sections.forEach(function (sec, si) {
      var cls = sec.cls ? ' ' + sec.cls : '';
      h += '<tr class="section-header' + cls + '"><td colspan="3">' + sec.title + '</td></tr>';
      sec.rows.forEach(function (row, ri) {
        if (row.type === 'sub-hyp') {
          h += '<tr class="sub-hyp">';
          h += '<th data-sec="' + si + '" data-row="' + ri + '" data-field="title">' + fmt(row.title) + '</th>';
          h += '<td data-sec="' + si + '" data-row="' + ri + '" data-field="desc">' + fmt(row.desc) + '</td>';
          h += '<td class="ref-col"></td></tr>';
          (row.children || []).forEach(function (ch, ci) {
            var label, trCls;
            if (ch.type === 'validate')        { label = '\u2705 Validate';   trCls = 'validate'; }
            else if (ch.type === 'invalidate') { label = '\u274C Invalidate'; trCls = 'invalidate'; }
            else                               { label = '\u2192 若排除';      trCls = 'fallback'; }
            h += '<tr class="' + trCls + '"><th>' + label + '</th>';
            h += '<td data-sec="' + si + '" data-row="' + ri + '" data-child="' + ci + '" data-field="content">' + fmt(ch.content) + '</td>';
            h += '<td class="ref-col" data-sec="' + si + '" data-row="' + ri + '" data-child="' + ci + '" data-field="ref">' + fmt(ch.ref) + '</td></tr>';
          });
        } else if (row.type === 'row') {
          h += '<tr>';
          h += '<th data-sec="' + si + '" data-row="' + ri + '" data-field="label">' + fmt(row.label) + '</th>';
          h += '<td data-sec="' + si + '" data-row="' + ri + '" data-field="content">' + fmt(row.content) + '</td>';
          h += '<td class="ref-col" data-sec="' + si + '" data-row="' + ri + '" data-field="ref">' + fmt(row.ref) + '</td></tr>';
        }
      });
    });
    h += '</table></div>';
    h += '<div class="nav" style="margin-top:1rem"><a href="index.html">\u2190 返回总览</a></div>';
    h += '<div class="footer">远景能源 \u2014 能力域 ' + meta.id + ' · ' + (meta.title || '') + '</div>';
    return h;
  }

  /* ── DOM → MD (reverse of fmt, preserves <mark>, handles contenteditable artefacts) ── */
  function cellHtmlToMd(el) {
    function walk(node) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      var tag = node.tagName.toLowerCase();
      var inner = Array.prototype.map.call(node.childNodes, walk).join('');
      switch (tag) {
        case 'b': case 'strong': return '**' + inner + '**';
        case 'code': return '`' + inner + '`';
        case 'br': return '<br>';
        case 'mark': return '<mark class="' + (node.className || '') + '">' + inner + '</mark>';
        case 'div': case 'p': return '<br>' + inner; /* contenteditable line-wrap */
        default: return inner;
      }
    }
    var result = Array.prototype.map.call(el.childNodes, walk).join('');
    if (result.indexOf('<br>') === 0) result = result.substring(4); /* strip leading break */
    return result;
  }

  /* ════════════════════════════════════════════════════════════
   * init — boots a single blocker page
   * ════════════════════════════════════════════════════════════ */
  function init(mdFile, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var storageKey  = 'blocker-md-' + mdFile;
    var originalMd  = '';
    var sessionStartMd = '';   /* state when page opened (may include prior edits) */
    var currentMeta = null;
    var currentSections = null;

    /* ── Contenteditable state ── */
    var activeCell = null;   /* the td/th/p currently being edited */
    var savedHtml  = '';     /* original innerHTML for Escape cancel */

    /* ── Undo / Redo ── */
    var undoStack = [];
    var redoStack = [];
    var lastSavedMd = '';
    var MAX_UNDO = 50;

    function updateUndoButtons() {
      var u = container.querySelector('[data-act="undo"]');
      var r = container.querySelector('[data-act="redo"]');
      if (u) u.disabled = !undoStack.length;
      if (r) r.disabled = !redoStack.length;
    }

    function doUndo() {
      if (!undoStack.length) return;
      if (activeCell) cancelEdit();
      hideRagToolbar();
      redoStack.push(lastSavedMd);
      lastSavedMd = undoStack.pop();
      var parsed = parseFrontmatter(lastSavedMd);
      currentMeta = parsed.meta;
      currentSections = parseBody(parsed.body);
      var view = container.querySelector('.blocker-view');
      if (view) view.innerHTML = renderHTML(currentMeta, currentSections);
      localStorage.setItem(storageKey, lastSavedMd);
      updateUndoButtons();
    }

    function doRedo() {
      if (!redoStack.length) return;
      if (activeCell) cancelEdit();
      hideRagToolbar();
      undoStack.push(lastSavedMd);
      lastSavedMd = redoStack.pop();
      var parsed = parseFrontmatter(lastSavedMd);
      currentMeta = parsed.meta;
      currentSections = parseBody(parsed.body);
      var view = container.querySelector('.blocker-view');
      if (view) view.innerHTML = renderHTML(currentMeta, currentSections);
      localStorage.setItem(storageKey, lastSavedMd);
      updateUndoButtons();
    }

    /* ══════ RAG Toolbar (one instance, lives on <body>) ══════ */
    var ragToolbar = document.createElement('div');
    ragToolbar.className = 'rag-toolbar';
    ragToolbar.style.display = 'none';
    ragToolbar.innerHTML =
      '<button class="rag-btn rag-btn-r" data-rag="r" title="紧急 Red"></button>' +
      '<button class="rag-btn rag-btn-a" data-rag="a" title="关注 Amber"></button>' +
      '<button class="rag-btn rag-btn-g" data-rag="g" title="正常 Green"></button>' +
      '<span class="rag-sep"></span>' +
      '<button class="rag-btn rag-btn-clear" data-rag="clear" title="清除高亮">\u2715</button>';
    document.body.appendChild(ragToolbar);

    var ragTargetCell = null;

    function showRagToolbar(rect) {
      var tw = 152, th = 36;
      var x = rect.left + rect.width / 2 - tw / 2;
      var y = rect.top - th - 8;
      x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
      if (y < 8) y = rect.bottom + 8;
      ragToolbar.style.left = x + 'px';
      ragToolbar.style.top  = y + 'px';
      ragToolbar.style.display = 'flex';
    }
    function hideRagToolbar() {
      ragToolbar.style.display = 'none';
      ragTargetCell = null;
    }

    /* ── RAG apply / clear — always DOM, one code path ── */
    ragToolbar.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = e.target.closest('[data-rag]');
      if (!btn || !ragTargetCell) return;
      var rag = btn.dataset.rag;

      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) { hideRagToolbar(); return; }
      var range = sel.getRangeAt(0);

      if (rag === 'clear') {
        var marks = ragTargetCell.querySelectorAll('mark');
        for (var i = marks.length - 1; i >= 0; i--) {
          if (range.intersectsNode(marks[i])) {
            var p = marks[i].parentNode;
            while (marks[i].firstChild) p.insertBefore(marks[i].firstChild, marks[i]);
            p.removeChild(marks[i]);
          }
        }
        ragTargetCell.normalize();
      } else {
        var anc = range.commonAncestorContainer;
        if (anc.nodeType === 3) anc = anc.parentElement;
        var existing = anc.closest ? anc.closest('mark') : null;
        if (existing && ragTargetCell.contains(existing)) {
          existing.className = 'rag-' + rag;
        } else {
          var mark = document.createElement('mark');
          mark.className = 'rag-' + rag;
          try { range.surroundContents(mark); }
          catch (ex) { var frag = range.extractContents(); mark.appendChild(frag); range.insertNode(mark); }
        }
      }

      /* Persist change — works whether cell is editable or not */
      var md = cellHtmlToMd(ragTargetCell);
      setRaw(ragTargetCell, md);
      persistCurrent();

      sel.removeAllRanges();
      hideRagToolbar();
    });

    /* ══════ Data accessors ══════ */
    function getRaw(cell) {
      if (cell.dataset.meta) return currentMeta[cell.dataset.meta] || '';
      var sec = currentSections[+cell.dataset.sec];
      if (!sec) return '';
      var row = sec.rows[+cell.dataset.row];
      if (!row) return '';
      var ci = cell.dataset.child;
      if (ci !== undefined && ci !== '') {
        var ch = row.children && row.children[+ci];
        return ch ? (ch[cell.dataset.field] || '') : '';
      }
      return row[cell.dataset.field] || '';
    }

    function setRaw(cell, value) {
      if (cell.dataset.meta) { currentMeta[cell.dataset.meta] = value; return; }
      var sec = currentSections[+cell.dataset.sec];
      if (!sec) return;
      var row = sec.rows[+cell.dataset.row];
      if (!row) return;
      var ci = cell.dataset.child;
      if (ci !== undefined && ci !== '') {
        var ch = row.children && row.children[+ci];
        if (ch) ch[cell.dataset.field] = value;
      } else {
        row[cell.dataset.field] = value;
      }
    }

    function persistCurrent() {
      undoStack.push(lastSavedMd);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0;
      var md = serialize(currentMeta, currentSections);
      lastSavedMd = md;
      localStorage.setItem(storageKey, md);
      updateUndoButtons();
      /* ensure reset button is visible */
      if (!container.querySelector('[data-act="reset"]')) {
        var tb = container.querySelector('.blocker-toolbar');
        if (tb) {
          var btn = document.createElement('button');
          btn.className = 'gv-btn blocker-btn-reset';
          btn.setAttribute('data-act', 'reset');
          btn.textContent = '\u21A9 重置';
          btn.onclick = resetHandler;
          tb.appendChild(btn);
        }
      }
    }

    /* ══════ Contenteditable editing ══════ */
    function startEdit(cell) {
      if (activeCell) finishEdit();
      hideRagToolbar();

      savedHtml  = cell.innerHTML;
      activeCell = cell;
      cell.contentEditable = 'true';
      cell.classList.add('editing');
      cell.focus();

      /* Place cursor at end */
      var range = document.createRange();
      range.selectNodeContents(cell);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function finishEdit() {
      if (!activeCell) return;
      var cell = activeCell;
      cell.contentEditable = 'false';
      cell.classList.remove('editing');

      /* DOM → MD → data model → re-render cell → persist */
      var md = cellHtmlToMd(cell);
      setRaw(cell, md);
      cell.innerHTML = fmt(md);   /* normalize: strips browser artefacts */
      activeCell = null;
      savedHtml  = '';
      persistCurrent();
    }

    function cancelEdit() {
      if (!activeCell) return;
      activeCell.contentEditable = 'false';
      activeCell.classList.remove('editing');
      activeCell.innerHTML = savedHtml;
      activeCell = null;
      savedHtml  = '';
    }

    function resetHandler() {
      if (confirm('重置为本次打开时的内容？')) {
        undoStack.length = 0;
        redoStack.length = 0;
        lastSavedMd = sessionStartMd;
        if (sessionStartMd === originalMd) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, sessionStartMd);
        }
        doRender(sessionStartMd);
      }
    }

    /* ── Global: click-outside saves, hides RAG toolbar ── */
    document.addEventListener('mousedown', function (e) {
      if (ragToolbar.contains(e.target)) return;
      hideRagToolbar();
      if (activeCell && !activeCell.contains(e.target)) finishEdit();
    });

    /* ── Global: keyboard — undo/redo (idle) + contenteditable keys ── */
    document.addEventListener('keydown', function (e) {
      /* Undo / Redo when not editing a cell */
      if (!activeCell && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' && !e.shiftKey) { doUndo(); e.preventDefault(); return; }
        if (e.key === 'z' && e.shiftKey)  { doRedo(); e.preventDefault(); return; }
        if (e.key === 'y')                { doRedo(); e.preventDefault(); return; }
      }
      if (!activeCell) return;

      if (e.key === 'Escape') {
        cancelEdit();
        e.preventDefault();
        return;
      }

      /* Enter → insert <br> (not browser-default <div>) */
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        range.deleteContents();
        var br = document.createElement('br');
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    /* ── Global: paste as plain text ── */
    document.addEventListener('paste', function (e) {
      if (!activeCell) return;
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    /* ══════ RAG selection detection (unified: works in both view & edit) ══════ */
    var ragViewRef = null;

    document.addEventListener('mouseup', function () {
      setTimeout(function () {
        if (!ragViewRef) return;
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;
        var selText = sel.toString().trim();
        if (!selText) return;

        /* Walk up to find a [data-field] / [data-meta] cell */
        var range = sel.getRangeAt(0);
        var node = range.startContainer;
        if (node.nodeType === 3) node = node.parentNode;
        var cell = null;
        while (node && node !== document.body) {
          if (node.nodeType === 1 && (node.hasAttribute('data-field') || node.hasAttribute('data-meta'))) {
            cell = node; break;
          }
          node = node.parentNode;
        }
        if (!cell) return;
        if (!ragViewRef.contains(cell)) return;

        ragTargetCell = cell;
        var rect = range.getBoundingClientRect();
        showRagToolbar(rect);
      }, 20);
    });

    /* ══════ Main render ══════ */
    function doRender(mdText) {
      if (activeCell) { activeCell.contentEditable = 'false'; activeCell = null; }
      hideRagToolbar();

      var parsed = parseFrontmatter(mdText);
      currentMeta     = parsed.meta;
      currentSections = parseBody(parsed.body);

      var hasLocal = !!localStorage.getItem(storageKey);
      var tb = '<div class="blocker-toolbar">' +
        '<span class="edit-hint">双击编辑 · 选中文字可标注 RAG 颜色</span>' +
        '<button class="gv-btn" data-act="undo" disabled title="撤销 Ctrl+Z">\u21B6</button>' +
        '<button class="gv-btn" data-act="redo" disabled title="重做 Ctrl+Y">\u21B7</button>' +
        '<button class="gv-btn blocker-btn-edit" data-act="edit">\u270F\uFE0F 源码编辑</button>' +
        (hasLocal ? '<button class="gv-btn blocker-btn-reset" data-act="reset">\u21A9 重置</button>' : '') +
        '</div>';

      container.innerHTML = tb +
        '<div class="blocker-view">' + renderHTML(currentMeta, currentSections) + '</div>' +
        '<div class="blocker-editor" style="display:none">' +
        '<textarea class="blocker-textarea" spellcheck="false"></textarea>' +
        '<div class="blocker-editor-actions">' +
        '<button class="gv-btn blocker-btn-save" data-act="save">保存</button>' +
        '<button class="gv-btn" data-act="preview">预览</button>' +
        '<button class="gv-btn" data-act="cancel">取消</button>' +
        '</div></div>';

      if (currentMeta.title)
        document.title = '能力域 ' + currentMeta.id + ' ' + currentMeta.title + ' \u2014 远景能源 IaaS';

      var view = container.querySelector('.blocker-view');
      ragViewRef = view;

      /* Double-click → enter contenteditable */
      view.addEventListener('dblclick', function (e) {
        var cell = e.target.closest('[data-field],[data-meta]');
        if (!cell) return;
        if (cell === activeCell) return;    /* already editing — let browser select word */
        e.preventDefault();
        startEdit(cell);
      });

      /* ── Full source editor wiring ── */
      var editor   = container.querySelector('.blocker-editor');
      var textarea = container.querySelector('.blocker-textarea');

      container.querySelector('[data-act="edit"]').onclick = function () {
        if (activeCell) finishEdit();
        hideRagToolbar();
        textarea.value = serialize(currentMeta, currentSections);
        view.style.display = 'none';
        editor.style.display = '';
        this.style.display = 'none';
        var rb = container.querySelector('[data-act="reset"]');
        if (rb) rb.style.display = 'none';
        container.querySelector('.edit-hint').style.display = 'none';
        textarea.focus();
      };

      container.querySelector('[data-act="cancel"]').onclick = function () {
        view.style.display = '';
        editor.style.display = 'none';
        container.querySelector('[data-act="edit"]').style.display = '';
        container.querySelector('.edit-hint').style.display = '';
        var rb = container.querySelector('[data-act="reset"]');
        if (rb) rb.style.display = '';
      };

      container.querySelector('[data-act="save"]').onclick = function () {
        undoStack.push(lastSavedMd);
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack.length = 0;
        lastSavedMd = textarea.value;
        localStorage.setItem(storageKey, textarea.value);
        doRender(textarea.value);
      };

      var previewBtn = container.querySelector('[data-act="preview"]');
      if (previewBtn) previewBtn.onclick = function () {
        var p2 = parseFrontmatter(textarea.value);
        var s2 = parseBody(p2.body);
        view.innerHTML = renderHTML(p2.meta, s2);
        view.style.display = '';
        editor.style.display = 'none';
        container.querySelector('[data-act="edit"]').style.display = '';
        container.querySelector('.edit-hint').style.display = '';
        container.querySelector('[data-act="edit"]').textContent = '\u270F\uFE0F 继续编辑';
        ragViewRef = view;
        currentMeta = p2.meta;
        currentSections = s2;
        view.addEventListener('dblclick', function (e) {
          var cell = e.target.closest('[data-field],[data-meta]');
          if (!cell) return;
          if (cell === activeCell) return;
          e.preventDefault();
          startEdit(cell);
        });
        container.querySelector('[data-act="edit"]').onclick = function () {
          view.style.display = 'none';
          editor.style.display = '';
          this.style.display = 'none';
          container.querySelector('.edit-hint').style.display = 'none';
          textarea.focus();
        };
      };

      var undoBtn = container.querySelector('[data-act="undo"]');
      var redoBtn = container.querySelector('[data-act="redo"]');
      if (undoBtn) undoBtn.onclick = doUndo;
      if (redoBtn) redoBtn.onclick = doRedo;

      var resetBtn = container.querySelector('[data-act="reset"]');
      if (resetBtn) resetBtn.onclick = resetHandler;
    }

    /* ── Boot ── */
    var saved = localStorage.getItem(storageKey);
    fetch(mdFile).then(function (r) { return r.text(); }).then(function (text) {
      originalMd = text;
      sessionStartMd = saved || text;
      lastSavedMd = sessionStartMd;
      doRender(sessionStartMd);
    }).catch(function (err) {
      container.innerHTML = '<p style="color:var(--danger)">Failed to load ' + mdFile + ': ' + err.message + '</p>';
    });
  }

  return { init: init };
})();
