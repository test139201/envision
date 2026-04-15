/* ============================================================
 * gantt-version.js — 版本管理：保存/恢复/导出/导入
 * 依赖：gantt-renderer.js（GanttRenderer）、gantt-data.js
 * ============================================================ */
var GanttVersion = (function () {

  var KEY_PREFIX = 'gantt-ver-';
  var MAX_AUTO = 20;

  /* ── 内部工具 ── */
  function storageKey(ganttId) { return KEY_PREFIX + ganttId; }

  function loadAll(ganttId) {
    try {
      var raw = localStorage.getItem(storageKey(ganttId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveAll(ganttId, list) {
    try { localStorage.setItem(storageKey(ganttId), JSON.stringify(list)); } catch (e) {}
  }

  function ts() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ── 保存一个版本 ── */
  function pushVersion(ganttId, md, name, isAuto) {
    var list = loadAll(ganttId);
    var entry = { md: md, name: name || '', auto: !!isAuto, time: ts() };
    list.push(entry);

    /* 自动快照限 MAX_AUTO 条 */
    if (isAuto) {
      var autos = [], others = [];
      list.forEach(function (v) { (v.auto ? autos : others).push(v); });
      while (autos.length > MAX_AUTO) autos.shift();
      list = others.concat(autos);
      list.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    }

    saveAll(ganttId, list);
    return list;
  }

  /* ── 手动保存 ── */
  function manualSave(ganttId, containerId, originalMD, name) {
    var md = GanttRenderer.captureState(containerId, originalMD);
    return pushVersion(ganttId, md, name || '手动保存 ' + ts(), false);
  }

  /* ── 自动快照（拖拽结束） ── */
  function autoSnapshot(ganttId, containerId, originalMD) {
    var md = GanttRenderer.captureState(containerId, originalMD);
    return pushVersion(ganttId, md, '', true);
  }

  /* ── 恢复到某个版本 ── */
  function restore(ganttId, containerId, index) {
    var list = loadAll(ganttId);
    if (index < 0 || index >= list.length) return null;
    var entry = list[index];
    GanttRenderer.init(entry.md, containerId);
    return entry;
  }

  /* ── 重置到初始 MD ── */
  function resetToInitial(initialMD, containerId) {
    GanttRenderer.init(initialMD, containerId);
  }

  /* ── 下载为 .md 文件 ── */
  function exportMD(ganttId, containerId, originalMD, note) {
    var md = GanttRenderer.captureState(containerId, originalMD);
    /* 在 frontmatter 末尾插入版本信息 */
    var time = ts();
    var versionLine = 'version: ' + time + (note ? ' | ' + note : '');
    md = md.replace(/^(---\n[\s\S]*?)(---)/m, '$1' + versionLine + '\n$2');
    /* 文件名 */
    var safeName = note ? note.replace(/[^a-zA-Z0-9\u4e00-\u9fff_\-]/g, '_') : '';
    var fname = ganttId + '_' + time.replace(/[: ]/g, '-') + (safeName ? '_' + safeName : '') + '.md';
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ── 导入 .md 文件 ── */
  function importMD(ganttId, containerId, callback) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var md = ev.target.result;
        pushVersion(ganttId, md, '导入: ' + file.name, false);
        GanttRenderer.init(md, containerId);
        if (callback) callback(md);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ── 获取版本列表 ── */
  function getVersions(ganttId) { return loadAll(ganttId); }

  /* ── 删除单个版本 ── */
  function deleteVersion(ganttId, index) {
    var list = loadAll(ganttId);
    if (index >= 0 && index < list.length) list.splice(index, 1);
    saveAll(ganttId, list);
    return list;
  }

  /* ── 清空所有版本 ── */
  function clearAll(ganttId) {
    saveAll(ganttId, []);
  }

  /* ────────────────────────────────
   *  版本面板 UI
   * ──────────────────────────────── */
  function createPanel(ganttId, containerId, initialMD) {
    var C = document.getElementById(containerId);
    if (!C) return;

    /* 追踪当前 MD（拖拽后动态更新） */
    var currentMD = initialMD;

    /* 工具栏 */
    var toolbar = document.createElement('div');
    toolbar.className = 'gv-toolbar';
    toolbar.innerHTML =
      '<button class="gv-btn gv-export" title="下载当前状态为 .md 文件">📥 下载</button>' +
      '<button class="gv-btn gv-import" title="从 .md 文件导入">📥 导入</button>' +
      '<button class="gv-btn gv-reset" title="重置为初始配置">↩ 重置</button>' +
      '<button class="gv-btn gv-toggle" title="显示/隐藏版本历史">📋 历史</button>';

    /* 版本列表面板 */
    var panel = document.createElement('div');
    panel.className = 'gv-panel';
    panel.style.display = 'none';
    panel.innerHTML = '<div class="gv-panel-hdr">版本历史<span class="gv-close">✕</span></div><div class="gv-list"></div>';

    /* 插入 DOM */
    var wrap = C.querySelector('.gt-wrap');
    if (wrap) {
      C.insertBefore(toolbar, wrap);
    } else {
      C.appendChild(toolbar);
    }
    C.appendChild(panel);

    var listEl = panel.querySelector('.gv-list');

    /* 渲染版本列表 */
    function renderList() {
      var versions = loadAll(ganttId);
      if (!versions.length) {
        listEl.innerHTML = '<div class="gv-empty">暂无保存版本</div>';
        return;
      }
      var html = '';
      for (var i = versions.length - 1; i >= 0; i--) {
        var v = versions[i];
        var icon = v.auto ? '○' : '★';
        var cls = v.auto ? 'gv-auto' : 'gv-manual';
        var name = v.name || '自动快照';
        html += '<div class="gv-item ' + cls + '" data-idx="' + i + '">' +
          '<span class="gv-icon">' + icon + '</span>' +
          '<span class="gv-name">' + name + '</span>' +
          '<span class="gv-time">' + v.time + '</span>' +
          '<span class="gv-actions">' +
            '<button class="gv-restore" data-idx="' + i + '" title="恢复此版本">恢复</button>' +
            '<button class="gv-del" data-idx="' + i + '" title="删除">✕</button>' +
          '</span>' +
          '</div>';
      }
      listEl.innerHTML = html;
    }

    /* 事件绑定 */
    toolbar.querySelector('.gv-export').addEventListener('click', function () {
      var note = prompt('版本备注（留空跳过）：');
      if (note === null) return;
      exportMD(ganttId, containerId, currentMD, note || '');
    });

    toolbar.querySelector('.gv-import').addEventListener('click', function () {
      importMD(ganttId, containerId, function (md) {
        currentMD = md;
        renderList();
        rebindAutoSnapshot();
      });
    });

    toolbar.querySelector('.gv-reset').addEventListener('click', function () {
      if (!confirm('确定重置为初始配置？当前未保存的更改将丢失。')) return;
      currentMD = initialMD;
      resetToInitial(initialMD, containerId);
      rebindAutoSnapshot();
    });

    toolbar.querySelector('.gv-toggle').addEventListener('click', function () {
      var showing = panel.style.display !== 'none';
      panel.style.display = showing ? 'none' : '';
      if (!showing) renderList();
    });

    panel.querySelector('.gv-close').addEventListener('click', function () {
      panel.style.display = 'none';
    });

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.gv-restore');
      if (btn) {
        var idx = parseInt(btn.dataset.idx);
        var entry = restore(ganttId, containerId, idx);
        if (entry) { currentMD = entry.md; rebindAutoSnapshot(); }
        return;
      }
      var del = e.target.closest('.gv-del');
      if (del) {
        var di = parseInt(del.dataset.idx);
        deleteVersion(ganttId, di);
        renderList();
      }
    });

    /* 监听拖拽结束 → 自动快照 */
    function onDragEnd() {
      currentMD = GanttRenderer.captureState(containerId, currentMD);
      pushVersion(ganttId, currentMD, '', true);
    }

    function rebindAutoSnapshot() {
      C.removeEventListener('gantt-drag-end', onDragEnd);
      C.addEventListener('gantt-drag-end', onDragEnd);
    }
    rebindAutoSnapshot();

    return { renderList: renderList, toolbar: toolbar, panel: panel };
  }

  /* Public API */
  return {
    manualSave: manualSave,
    autoSnapshot: autoSnapshot,
    restore: restore,
    resetToInitial: resetToInitial,
    exportMD: exportMD,
    importMD: importMD,
    getVersions: getVersions,
    deleteVersion: deleteVersion,
    clearAll: clearAll,
    createPanel: createPanel
  };
})();
