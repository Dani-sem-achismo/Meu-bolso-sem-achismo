/* Tema claro/escuro do Meu Bolso Sem Achismo.
   Salvo em localStorage ('finapp_theme'): 'claro' | 'escuro' | 'auto'.
   Carregue este arquivo no <head>, ANTES do CSS terminar de aplicar,
   para não piscar o tema errado ao abrir. */
(function () {
  var KEY = 'finapp_theme';
  var THEME_COLOR = { claro: '#FFF9F4', escuro: '#0F0E2A' };

  function prefers() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }

  function resolve(pref) {
    return pref === 'auto' || !pref ? prefers() : pref;
  }

  function apply(pref) {
    var theme = resolve(pref);
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  }

  window.MBTheme = {
    get: function () { return localStorage.getItem(KEY) || 'auto'; },
    resolved: function () { return resolve(window.MBTheme.get()); },
    set: function (pref) {
      localStorage.setItem(KEY, pref);
      apply(pref);
      document.dispatchEvent(new CustomEvent('mb-theme-change', { detail: { pref: pref, theme: resolve(pref) } }));
    },
    toggle: function () {
      window.MBTheme.set(window.MBTheme.resolved() === 'escuro' ? 'claro' : 'escuro');
    },
    apply: apply
  };

  apply(window.MBTheme.get());

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (window.MBTheme.get() === 'auto') apply('auto');
    });
  }
})();
