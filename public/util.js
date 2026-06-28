/* Texto — общие клиентские утилиты: экспорт (Word / PDF / txt) + автосохранение.
   Без внешних библиотек. Подключается в <head>: <script src="/util.js"></script> */
(function () {
  var T = (window.Textify = window.Textify || {});

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sanitize(name) {
    var n = (name || 'textify').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
    return n || 'textify';
  }
  function nl2br(s) { return escapeHtml(s).replace(/\n/g, '<br>'); }
  function triggerDownload(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---- Экспорт ----
  function downloadTxt(text, name) {
    triggerDownload(new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' }), sanitize(name) + '.txt');
  }

  function downloadDoc(text, name) {
    var body = nl2br(text);
    var html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>Texto</title></head>' +
      '<body style="font-family:&#39;Times New Roman&#39;,serif;font-size:14pt;line-height:1.5;">' +
      body + '</body></html>';
    triggerDownload(new Blob(['\ufeff' + html], { type: 'application/msword' }), sanitize(name) + '.doc');
  }

  function downloadPdf(text, name) {
    var w = window.open('', '_blank');
    if (!w) { alert('Разреши всплывающие окна, чтобы сохранить PDF'); return; }
    var body = nl2br(text);
    w.document.write(
      '<html><head><meta charset="utf-8"><title>' + sanitize(name) + '</title>' +
      '<style>body{font-family:Georgia,serif;font-size:13pt;line-height:1.6;margin:40px;color:#111}@media print{body{margin:18mm}}</style>' +
      '</head><body>' + body + '</body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
  }

  // Добавляет кнопки Word/PDF в контейнер действий. getText() — функция, возвращающая текст.
  function wireExport(containerId, getText, name) {
    var c = document.getElementById(containerId);
    if (!c) return;
    var word = document.createElement('button');
    word.className = 'mini'; word.type = 'button'; word.textContent = 'Скачать Word';
    word.addEventListener('click', function () { downloadDoc(getText(), name); });
    var pdf = document.createElement('button');
    pdf.className = 'mini'; pdf.type = 'button'; pdf.textContent = 'Скачать PDF';
    pdf.addEventListener('click', function () { downloadPdf(getText(), name); });
    c.appendChild(word);
    c.appendChild(pdf);
  }

  // ---- Автосохранение полей ----
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function autosave(key, fieldIds) {
    var KEY = 'textify:in:' + key;
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) {
        fieldIds.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && saved[id] != null && !el.value) el.value = saved[id];
        });
      }
    } catch (e) {}
    function save() {
      try {
        var o = {};
        fieldIds.forEach(function (id) { var el = document.getElementById(id); if (el) o[id] = el.value; });
        localStorage.setItem(KEY, JSON.stringify(o));
      } catch (e) {}
    }
    fieldIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', debounce(save, 400));
    });
    return { save: save, clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} } };
  }

  // ---- Сохранение результата ----
  function saveResult(key, text) {
    try { localStorage.setItem('textify:res:' + key, JSON.stringify({ t: String(text || ''), at: Date.now() })); } catch (e) {}
  }
  function loadResult(key) {
    try { return JSON.parse(localStorage.getItem('textify:res:' + key) || 'null'); } catch (e) { return null; }
  }
  function clearResult(key) { try { localStorage.removeItem('textify:res:' + key); } catch (e) {} }

  T.escapeHtml = escapeHtml;
  T.downloadTxt = downloadTxt;
  T.downloadDoc = downloadDoc;
  T.downloadPdf = downloadPdf;
  T.wireExport = wireExport;
  T.autosave = autosave;
  T.saveResult = saveResult;
  T.loadResult = loadResult;
  T.clearResult = clearResult;
})();
