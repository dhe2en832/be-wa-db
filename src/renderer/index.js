window.addEventListener('DOMContentLoaded', () => {
  if (!window.WACSA_UI) return;

  const btnMin = document.getElementById('btn-minimize');
  const btnClose = document.getElementById('btn-close');
  const versionElm = document.getElementById('app-version');

  if (btnMin) {
    btnMin.addEventListener('click', () => {
      window.WACSA_UI.minimize();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      window.WACSA_UI.close();
    });
  }

  window.addEventListener('wacsa-version-ready', (e) => {
    if (versionElm) {
      versionElm.textContent = `v${e.detail}`;
    }
  });

  window.WACSA_UI.init();
});
