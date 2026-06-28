/* Textify AI — общие клиентские утилиты: экспорт (Word/PDF/txt) + автосохранение */
(function () {
  var T = window.Textify = window.Textify || {};

  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function sanitize(name) {
    var n = (name || 'textify').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
    return n || 'textify';
  }
  function triggerDownload(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function downloadTxt(text, name) {
    triggerDownload(new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' }), sanitize(name) + '.txt');