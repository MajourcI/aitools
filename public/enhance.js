(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var result = document.getElementById('result');
    if (!result) return; // на странице нет блока результата — выходим

    // стили кнопок (берём цвета из дизайна сайта)
    var st = document.createElement('style');
    st.textContent =
      '.tx-exp-btn{background:none;border:1px solid var(--card-border);color:var(--text2);font-size:13px;padding:8px 14px;border-radius:99px;cursor:pointer;transition:.2s}' +
      '.tx-exp-btn:hover{color:var(--text);border-color:var(--accent)}' +
      '#tx-export-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}';
    document.head.appendChild(st);

    var injected = false;
    function getText() { return (result.innerText || result.textContent || '').trim(); }

    function inject() {
      if (injected || !getText()) return;
      injected = true;

      var bar = document.getElementById('actions');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'tx-export-bar';
        result.insertAdjacentElement('afterend', bar);
      }

      var copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'tx-exp-btn';
      copy.textContent = '📋 Копировать';
      copy.onclick = function () {
        var t = getText(); if (!t) return;
        navigator.clipboard.writeText(t).then(function () {
          var o = copy.textContent; copy.textContent = '✓ Скопировано';
          setTimeout(function () { copy.textContent = o; }, 1500);
        });
      };

      var dl = document.createElement('button');
      dl.type = 'button';
      dl.className = 'tx-exp-btn';
      dl.textContent = '⬇ Скачать';
      dl.onclick = function () {
        var t = getText(); if (!t) return;
        var name = ('textify' + location.pathname.replace(/\//g, '-')).replace(/--+/g, '-').replace(/-$/, '') || 'textify-result';
        var blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
      };

      bar.appendChild(copy);
      bar.appendChild(dl);
    }

    // следим за появлением результата
    new MutationObserver(inject).observe(result, { childList: true, subtree: true, characterData: true });
    inject();
  });
})();
