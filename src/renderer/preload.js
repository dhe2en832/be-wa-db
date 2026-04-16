const path = require('path');
const { contextBridge, ipcRenderer } = require('electron/renderer');
const { home } = require('./pages/home');
const { login } = require('./pages/login');
const { updaterCustom } = require('./components/updaterCustom');

const showSVG = path.join(__dirname, '../images/show.svg');
const hideSVG = path.join(__dirname, '../images/hide.svg');
const updateSVG = path.join(__dirname, '../images/update.svg');
const restartSVG = path.join(__dirname, '../images/restart.svg');

contextBridge.exposeInMainWorld('WACSA_UI', {
  init: () => {
    const icons = { showSVG, hideSVG };
    const wrapperElm = document.querySelector('main');

    ipcRenderer.on('dom-loaded', (_, { port, version, sessionConfig }) => {
      updaterCustom(ipcRenderer, updateSVG, restartSVG);

      const base_url = 'http://localhost:' + port;

      window.dispatchEvent(
        new CustomEvent('wacsa-version-ready', {
          detail: version
        })
      );

      login(ipcRenderer, wrapperElm, base_url, version, icons, home, sessionConfig || {});
    });
  },

  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close')
});
