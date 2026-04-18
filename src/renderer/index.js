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
    const modal = document.getElementById('modal-confirm-exit');
    const btnCancel = document.getElementById('btn-exit-cancel');
    const btnConfirm = document.getElementById('btn-exit-confirm');

    btnClose.addEventListener('click', () => {
      modal.style.display = 'flex';
      btnConfirm.focus();
    });

    btnCancel.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    btnConfirm.addEventListener('click', () => {
      modal.style.display = 'none';
      window.WACSA_UI.close();
    });

    // Tutup modal dengan Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });
  }

  window.addEventListener('wacsa-version-ready', (e) => {
    if (versionElm) {
      versionElm.textContent = `v${e.detail}`;
    }
  });

  window.WACSA_UI.init();
});
