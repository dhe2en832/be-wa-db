const { dateTimeGeneratorClient, dateTimeGeneratorLog } = require('../../utils/dateTimeGenerator');
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
  isHiddenElem,
} = require('../../utils/stylesGenerator');

function home(ipcRenderer, wrapperElm, version) {
  const pageHome = `
  <div class="container-fluid px-3">
      <!-- loading -->
      <div id="loading" class="mt-3 pt-4">
         <div class="text-center mt-3 d-flex flex-column justify-content-center">
            <p class="h4">Mohon Tunggu <br />Sedang Memuat QR Code</p>
            <p class="fw-lighter text-muted font-smaller p-0 m-0">Jangan tutup aplikasi WACSA, proses ini membutuhkan waktu beberapa menit...</p>
            <div class="d-flex justify-content-center">
              <div class="mt-4 spinner-border text-primary spinner-custom" role="status">
                <span class="visually-hidden">Loading...</span>
                <div class="spinner-grow text-info border-light" role="status"></div>
                <div class="spinner-grow spinner-grow-sm text-light" role="status"></div>
              </div>
            </div>
         </div>
         <div class="fixed-bottom bg-light pt-3 px-3">
            <div class="d-flex fw-lighter font-smaller justify-content-between">
              <div class="d-flex">
                <p class="me-2 text-muted">Versi:</p>
                <p id="versionTagLoad"></p>
              </div>
              <div class="d-flex">
                <p class="me-2 text-muted">Waktu Berlalu:</p>
                <p id="loadingDuration">00:00:00</p>
              </div>
            </div>
         </div>
      </div>

      <!-- app -->
      <div id="app" class="row">
         <div class="col-md-12 d-flex flex-column p-3">
            <div class="d-flex flex-column text-center">
              <p class="h3 p-0 m-0">WACSA</p>
              <p id="versionTagQR" class="h5 fw-lighter font-small p-0 m-0"></p>
            </div>
            <div class="d-flex flex-column justify-content-center text-center mt-4 mb-2">
                <img class="mx-auto mb-4" src="" alt="Loading Whatsapp QR Code" id="qrcode" />
                <p class="fw-lighter font-smaller text-info border border-info p-1">Jika gagal saat scan QR Code dari Whatsapp pada perangkat Android/IOS Anda, lakukan restart WACSA terlebih dahulu.</p>
            </div>
            <p class="h5 p-0 m-0">Logs:</p>
            <div class="d-flex flex-column justify-content-center logs log-custom text-muted overflow-auto"></div>
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
         <div class="col-md-12">
            <h5>Koneksi</h5>
            <div class="card pt-3 pb-2 px-3">
               <p>Nomor Whatsapp : <span class="float-end" id="onlineNumber"></span></p>
               <p>Pengguna Whatsapp : <span class="float-end" id="onlineName"></span></p>
               <p>Platform Perangkat : <span class="float-end" id="onlinePlatform"></span></p>
               <p>Versi Whatsapp API: <span class="float-end" id="onlineVersion"></span></p>
               <p>Aktif Dari : <span class="float-end" id="onlineFrom"></span></p>
               <p>Durasi : <span class="float-end" id="onlineDuration">00:00:00</span></p>
            </div>
         </div>
         <div class="col-md-12 my-2">
            <h5>Aktivitas</h5>
            <div class="card pt-3 pb-2 px-3">
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
    setElemText("#versionTagLoad", version);

    let timeInterval;
    let timeStart = new Date();
    const timeCounter = (element) => {
      const duration = durationGenerator(timeStart);
      setElemText(element, duration);
    }
    timeInterval = setInterval(() => timeCounter('#loadingDuration'), 1000);

    window.addEventListener('beforeunload', async () => {
      const totalRev = parseInt(getElemText('#rev_counter'));
      const totalSen = parseInt(getElemText('#sen_counter'));
      if (isHiddenElem('#content') === false) await ipcRenderer.send('client_disconnected', [totalRev, totalSen]);
      ipcRenderer.send('windows-closed');
    });

    ipcRenderer.send('login-succeed');

    ipcRenderer.on('fatal-error', (event, error) => {
      hideElem('#loading');
      hideElem('#app');
      hideElem('#content');
      const timeout = 86400000;
      const errMsg =
        error +
        '<br /> "HARAP HUBUNGI SUPPORT CSA COMPUTER';
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
      if (getChildElemCount('.logs') > 99) setElemHTML('.logs', '');
      appendElem('.logs', `<p class="fw-lighter font-x-small p-0 m-0">${dateTimeGeneratorLog()} - ${msg}</p>`);
    });

    ipcRenderer.on('qr_client', (event, qr) => {
      clearInterval(timeInterval);
      setElemText('#loadingDuration', '00:00:00');
      setElemAttr('#qrcode', 'src', qr);
      hideElem('#loading');
      showElem('#app');
      setElemText("#versionTagQR", "v" + version);
      hideElem('#content');
    });

    ipcRenderer.on('ready_client', (event, data) => {
      hideElem('#loading');
      hideElem('#app');
      showElem('#content');
      setElemHTML('.logs', '');
      setElemText('#rev_counter', data.totalReceived);
      setElemText('#sen_counter', data.totalSent);
    });

    ipcRenderer.on('authenticated_client', (event, args) => {
      timeStart = new Date();
      timeInterval = setInterval(() => timeCounter('#onlineDuration', 1000));
      const authCatch = alertShow('Anda telah terhubung dengan WACSA API.', 'success');
      appendElem('#alertContainer', authCatch);
      alertDismiss(5000, 'success');
      const resetButton = document.getElementById('resetButton');
      const logoutButton = document.getElementById('logoutButton');
      resetButton.addEventListener('click', async (event) => {
        await ipcRenderer.send('client_reset');
      });
      logoutButton.addEventListener('click', async (event) => {
        await ipcRenderer.send('client_logout');
      });
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
      clearInterval(timeInterval);
      setElemText('#onlineDuration', '00:00:00');
      timeStart = new Date();
      timeInterval = setInterval(() => timeCounter('#loadingDuration'), 1000);
    });

    ipcRenderer.on('received_message', (event, data) => {
      const currentReceived = parseInt(getElemText('#rev_counter')) + data;
      setElemText('#rev_counter', currentReceived);
    });

    ipcRenderer.on('sent_message', (event, data) => {
      const currentSent = parseInt(getElemText('#sen_counter')) + data;
      setElemText('#sen_counter', currentSent);
    });

    ipcRenderer.on('info_client', (event, [pNumber, pName, pPlatform, pVersion]) => {
      setElemText('#onlineNumber', pNumber);
      setElemText('#onlineName', pName);
      setElemText('#onlinePlatform', pPlatform);
      setElemText('#onlineVersion', pVersion);
      setElemText('#onlineFrom', dateTimeGeneratorClient());
    });

    ipcRenderer.on('connected_client', () => {
      alertDismiss(500, 'warning');
      const connectedCatch = alertShow('Koneksi Online, WACSA API sudah bisa digunakan.', 'success');
      appendElem('#alertContainer', connectedCatch);
      alertDismiss(8000, 'success');
    });

    ipcRenderer.on('timeout_client', () => {
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
