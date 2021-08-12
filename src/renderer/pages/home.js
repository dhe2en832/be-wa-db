const { dateTimeGeneratorClient } = require('../../utils/dateTimeGenerator');
const { durationGenerator } = require('../../utils/durationGenerator');
const { alertShow, alertDismiss } = require('../../utils/alertGenerator');
const {
  hideElem,
  showElem,
  getElemText,
  getChildElemCount,
  setElemText,
  setElemHTML,
  setElemAttr,
  appendElem,
} = require('../../utils/stylesGenerator');

function home(ipcRenderer, wrapperElm) {
  const pageHome = `
  <div class="container-fluid px-3">
      <!-- loading -->
      <div id="loading" class="row mt-5 pt-4">
         <div class="col-12 text-center mt-5">
            <h5>Mohon Tunggu <br />Sedang Memuat QR Code...</h5>
            <div class="mt-4 spinner-grow text-primary" role="status"></div>
         </div>
      </div>

      <!-- app -->
      <div id="app" class="row">
         <div class="col-md-12 text-center">
            <h5>&nbsp;</h5>
            <h1>Whatsapp API</h1>
            <p>Powered by CSA Computer</p>
            <img src="" alt="Loading Whatsapp QR Code" id="qrcode" />
            <h3>Logs:</h3>
            <ul class="list-unstyled logs"></ul>
         </div>
      </div>

      <!-- alert -->
      <div id="alert" class="row">
         <div class="col-md-12 text-center my-2">
            <div id="alertContainer"></div>
         </div>
      </div>

      <!-- content -->
      <div id="content" class="row">
         <div class="col-md-12 my-2">
            <h5>Koneksi</h5>
            <div class="card p-4">
               <p>Nomor Whatsapp : <span class="float-end" id="onlineNumber"></span></p>
               <p>Pengguna Whatsapp : <span class="float-end" id="onlineName"></span></p>
               <p>Platform Perangkat : <span class="float-end" id="onlinePlatform"></span></p>
               <p>Versi Whatsapp di Perangkat : <span class="float-end" id="onlineVersion"></span></p>
               <p>Aktif Dari : <span class="float-end" id="onlineFrom"></span><span class="d-none" id="onlineFromHidden"></span></p>
               <p>Durasi : <span class="float-end" id="onlineDuration"></span></p>
            </div>
         </div>
         <div class="col-md-12 my-2">
            <h5>Aktivitas</h5>
            <div class="card p-4">
               <p>Pesan Masuk : <span class="float-end" id="rev_counter">0</span></p>
               <p>Pesan Keluar : <span class="float-end" id="sen_counter">0</span></p>
            </div>
         </div>
      </div>
   </div>
   `;
  const scriptsHome = () => {
    showElem('#loading');
    hideElem('#app');
    hideElem('#content');

    ipcRenderer.send('login-succeed');

    window.addEventListener('beforeunload', () => {
      const totalRev = parseInt(getElemText('#rev_counter'));
      const totalSen = parseInt(getElemText('#sen_counter'));
      ipcRenderer.send('windows-closed', [totalRev, totalSen]);
    });

    ipcRenderer.on('fatal-error', (event, error) => {
      hideElem('#loading');
      hideElem('#app');
      hideElem('#content');
      const timeout = 86400000;
      const errMsg =
        'UPDATE DIBUTUHKAN ATAU TERJADI ERROR : ' +
        error +
        '<br /> HARAP HUBUNGI CSA COMPUTER SUPPORT';
      const errCatch = alertShow(errMsg, 'danger');
      appendElem('#alertContainer', errCatch);
      alertDismiss(timeout, 'danger');
    });

    ipcRenderer.on('error', (event, error) => {
      const timeout = error.code === 'ENOENT' ? 100000 : 80000;
      const errMsg =
        error.code === 'ENOENT'
          ? error.code + ' : TIDAK DITEMUKAN ENTITAS FILE PENYIMPANAN JSON - ' + error.path || ' '
          : error.code;
      const errCatch = alertShow(errMsg, 'danger');
      appendElem('#alertContainer', errCatch);
      alertDismiss(timeout, 'danger');
    });

    ipcRenderer.on('logs', (event, msg) => {
      if (getChildElemCount('.logs') > 4) setElemHTML('.logs', '');
      appendElem('.logs', `<p>${msg}</p>`);
    });

    ipcRenderer.on('qr', (event, qr) => {
      setElemAttr('#qrcode', 'src', qr);
      hideElem('#loading');
      showElem('#app');
      hideElem('#content');
    });

    ipcRenderer.on('ready', (event, data) => {
      hideElem('#loading');
      hideElem('#app');
      showElem('#content');
      setElemHTML('.logs', '');
      setElemText('#rev_counter', data.totalReceived);
      setElemText('#sen_counter', data.totalSent);
    });

    ipcRenderer.on('authenticated', (event, args) => {
      window.setInterval(() => {
        const lastTime = getElemText('#onlineFromHidden');
        const duration = durationGenerator(lastTime);
        setElemText('#onlineDuration', duration);
      }, 1000);
      const authCatch = alertShow('Anda telah terhubung dengan WACSA API.', 'success');
      appendElem('#alertContainer', authCatch);
      alertDismiss(5000, 'success');
    });

    ipcRenderer.on('disconnected_client', async (event, args) => {
      const totalRev = parseInt(getElemText('#rev_counter'));
      const totalSen = parseInt(getElemText('#sen_counter'));
      await ipcRenderer.send('client_disconnected', [totalRev, totalSen]);
      setElemText('#rev_counter', 0);
      setElemText('#sen_counter', 0);
      showElem('#loading');
      hideElem('#app');
      hideElem('#content');
      const disconnectedCatch = alertShow(
        'Whatsapp Telah Terputus, Silahkan Scan QR Code Kembali',
        'danger'
      );
      appendElem('#alertContainer', disconnectedCatch);
      alertDismiss(15000, 'danger');
    });

    ipcRenderer.on('received_message', (event, data) => {
      const currentReceived = parseInt(getElemText('#rev_counter')) + data;
      setElemText('#rev_counter', currentReceived);
    });

    ipcRenderer.on('sent_message', (event, data) => {
      const currentSent = parseInt(getElemText('#sen_counter')) + data;
      setElemText('#sen_counter', currentSent);
    });

    ipcRenderer.on('info', (event, [pNumber, pName, pPlatform, pVersion]) => {
      setElemText('#onlineNumber', pNumber);
      setElemText('#onlineName', pName);
      setElemText('#onlinePlatform', pPlatform);
      setElemText('#onlineVersion', pVersion);
      setElemText('#onlineFrom', dateTimeGeneratorClient());
      setElemText('#onlineFromHidden', new Date());
    });

    ipcRenderer.on('connected', () => {
      alertDismiss(1000, 'warning');
      const connectedCatch = alertShow('Koneksi Online, WACSA API sudah bisa digunakan.', 'success');
      appendElem('#alertContainer', connectedCatch);
      alertDismiss(6000, 'success');
    });

    ipcRenderer.on('timeout', () => {
      const timeoutCatch = alertShow(
        'Koneksi Offline, periksa koneksi pada Whatsapp di device Anda.',
        'warning'
      );
      appendElem('#alertContainer', timeoutCatch);
    });
  };

  wrapperElm.innerHTML = pageHome;
  scriptsHome();
}

module.exports = { home };
