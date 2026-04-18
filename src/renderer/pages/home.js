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

function home(ipcRenderer, wrapperElm, base_url, version, secretKey = '', validThru = null, loginFn = null, sessionConfig = {}, loggedInUser = '') {
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
               <p>Login sebagai : <span class="float-end text-primary fw-semibold" id="loggedInUser"></span></p>
               <p>Nomor Whatsapp : <span class="float-end" id="onlineNumber"></span></p>
               <p>Pengguna Whatsapp : <span class="float-end" id="onlineName"></span></p>
               <p>Platform Perangkat : <span class="float-end" id="onlinePlatform"></span></p>
               <p>Versi Whatsapp API: <span class="float-end" id="onlineVersion"></span></p>
               <p>Aktif Dari : <span class="float-end" id="onlineFrom"></span></p>
               <p>Durasi : <span class="float-end" id="onlineDuration">00:00:00</span></p>
               <div class="d-flex align-items-center border border-danger rounded px-2 py-1 mt-1">
                 <span class="text-muted me-2" style="white-space:nowrap;font-size:0.85rem;">Secret Key :</span>
                 <span id="onlineSecretKey" class="flex-grow-1 text-truncate font-monospace" style="font-size:0.85rem;">••••••••••••••••••••••••••••••••</span>
                 <button id="btnRevealSecretKey" class="btn btn-sm btn-outline-secondary ms-2 py-0 px-2" style="font-size:0.8rem;" title="Lihat Secret Key">👁</button>
                 <button id="btnCopySecretKey" class="btn btn-sm btn-outline-danger ms-1 py-0 px-2" style="font-size:0.8rem;" disabled>cop</button>
               </div>
               <div class="d-flex align-items-center justify-content-between mt-2" style="font-size:0.85rem;">
                 <span class="text-muted">Session Berlaku Hingga :</span>
                 <span id="sessionValidThru" class="font-monospace text-end">-</span>
               </div>
            </div>
         </div>

      <!-- Modal verifikasi password untuk lihat secret key -->
      <div id="modalVerifyPassword" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
        <div class="card p-4" style="width:320px;max-width:90%;">
          <h6 class="mb-3">Verifikasi Password</h6>
          <p class="text-muted small mb-3">Masukkan password login Anda untuk melihat Secret Key.</p>
          <input type="password" id="verifyPasswordInput" class="form-control mb-2" placeholder="Password" />
          <p id="verifyPasswordError" class="text-danger small mb-2" style="display:none;">Password salah.</p>
          <div class="d-flex gap-2 justify-content-end mt-1">
            <button id="btnVerifyCancel" class="btn btn-sm btn-secondary">Batal</button>
            <button id="btnVerifyConfirm" class="btn btn-sm btn-primary">Konfirmasi</button>
          </div>
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

    // Tampilkan user yang login
    setElemText('#loggedInUser', loggedInUser || localStorage.getItem('userID') || '-');

    // Secret key disembunyikan — hanya tampil setelah verifikasi password
    let secretKeyRevealed = false;

    document.querySelector('#btnRevealSecretKey').addEventListener('click', () => {
      if (secretKeyRevealed) {
        // Sembunyikan kembali
        document.querySelector('#onlineSecretKey').textContent = '••••••••••••••••••••••••••••••••';
        document.querySelector('#btnCopySecretKey').disabled = true;
        document.querySelector('#btnRevealSecretKey').title = 'Lihat Secret Key';
        secretKeyRevealed = false;
        return;
      }
      // Tampilkan modal verifikasi
      const modal = document.querySelector('#modalVerifyPassword');
      modal.style.display = 'flex';
      document.querySelector('#verifyPasswordInput').value = '';
      document.querySelector('#verifyPasswordError').style.display = 'none';
      setTimeout(() => document.querySelector('#verifyPasswordInput').focus(), 100);
    });

    document.querySelector('#btnVerifyCancel').addEventListener('click', () => {
      document.querySelector('#modalVerifyPassword').style.display = 'none';
    });

    document.querySelector('#btnVerifyConfirm').addEventListener('click', async () => {
      const inputPw = document.querySelector('#verifyPasswordInput').value;
      if (!inputPw) return;
      const storedHash = localStorage.getItem('passwordHash');
      const inputHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(inputPw))
        .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));
      if (inputHash === storedHash) {
        document.querySelector('#modalVerifyPassword').style.display = 'none';
        document.querySelector('#onlineSecretKey').textContent = secretKey;
        document.querySelector('#btnCopySecretKey').disabled = false;
        document.querySelector('#btnRevealSecretKey').title = 'Sembunyikan Secret Key';
        secretKeyRevealed = true;
      } else {
        document.querySelector('#verifyPasswordError').style.display = 'block';
      }
    });

    // Enter key di input password modal
    document.querySelector('#verifyPasswordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.querySelector('#btnVerifyConfirm').click();
    });

    // Isi session valid thru
    function updateSessionValidThruDisplay(vt) {
      const el = document.querySelector('#sessionValidThru');
      if (!el) return;
      const d = parseValidThru(vt);
      if (d) {
        // Format: HH:MM:SS - DD/MM/YYYY
        const pad = (n) => String(n).padStart(2, '0');
        el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
        el.classList.remove('text-danger');
        el.classList.add('text-success');
      } else {
        el.textContent = '-';
        el.classList.remove('text-success', 'text-danger');
      }
    }
    updateSessionValidThruDisplay(validThru);
    document.querySelector('#btnCopySecretKey').addEventListener('click', () => {
      if (!secretKey || !secretKeyRevealed) return;
      navigator.clipboard.writeText(secretKey).then(() => {
        const btn = document.querySelector('#btnCopySecretKey');
        btn.textContent = '✓';
        btn.classList.replace('btn-outline-danger', 'btn-success');
        setTimeout(() => {
          btn.textContent = 'cop';
          btn.classList.replace('btn-success', 'btn-outline-danger');
        }, 1500);
      });
    });

    let timeInterval;
    let timeStart = new Date();
    const timeCounter = (element) => {
      const duration = durationGenerator(timeStart);
      setElemText(element, duration);
    }
    timeInterval = setInterval(() => timeCounter('#loadingDuration'), 1000);

    window.addEventListener('beforeunload', async () => {
      if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
      const totalRev = parseInt(getElemText('#rev_counter'));
      const totalSen = parseInt(getElemText('#sen_counter'));
      if (isHiddenElem('#content') === false) await ipcRenderer.send('client_disconnected', [totalRev, totalSen]);
      ipcRenderer.send('windows-closed');
    });

    ipcRenderer.send('login-succeed');

    // ─── Session Expiration Management ───────────────────────────────────────
    // Konfigurasi dari wacsa.ini [SessionOptions]
    const SESSION_AUTO_REFRESH     = sessionConfig.autoRefresh !== false;
    const SESSION_REFRESH_RETRY_MAX   = sessionConfig.refreshRetryMax   || 3;
    const SESSION_REFRESH_RETRY_DELAY = (sessionConfig.refreshRetryDelay || 5) * 1000;
    const SESSION_REFRESH_BEFORE_EXPIRE = sessionConfig.refreshBeforeExpire || 30;

    console.log(`[SESSION] Config — autoRefresh:${SESSION_AUTO_REFRESH}, beforeExpire:${SESSION_REFRESH_BEFORE_EXPIRE}s, retryMax:${SESSION_REFRESH_RETRY_MAX}, retryDelay:${SESSION_REFRESH_RETRY_DELAY/1000}s`);

    let sessionTimer = null;

    /**
     * Parse timestamp format YYYYMMDDTHH:mm:ss menjadi Date object
     */
    function parseValidThru(ts) {
      if (!ts || typeof ts !== 'string') return null;
      // Format: 20260416T09:04:28
      const m = ts.match(/^(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
      if (!m) return null;
      return new Date(
        parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
        parseInt(m[4]), parseInt(m[5]), parseInt(m[6])
      );
    }

    /**
     * Lakukan refresh dengan retry. Jika semua retry gagal → session expired.
     */
    async function doRefreshWithRetry(attempt = 1) {
      console.log(`[SESSION] Refresh attempt ${attempt}/${SESSION_REFRESH_RETRY_MAX}`);
      try {
        const result = await ipcRenderer.invoke('session-refresh');
        if (result && result.success) {
          console.log('[SESSION] Refresh berhasil, validThru baru:', result.validThru);
          const alertContainer = document.querySelector('#alertContainer');
          if (alertContainer) {
            appendElem('#alertContainer', alertShow('Session diperpanjang.', 'info'));
            alertDismiss(4000, 'info');
          }
          // Update tampilan validThru
          updateSessionValidThruDisplay(result.validThru);
          // Jadwalkan refresh berikutnya berdasarkan validThru baru
          scheduleSessionRefresh(result.validThru);
        } else {
          console.warn(`[SESSION] Refresh gagal (attempt ${attempt}):`, result?.message);
          if (attempt < SESSION_REFRESH_RETRY_MAX) {
            setTimeout(() => doRefreshWithRetry(attempt + 1), SESSION_REFRESH_RETRY_DELAY);
          } else {
            console.error('[SESSION] Semua retry gagal. Session expired, melakukan logout...');
            handleSessionExpired();
          }
        }
      } catch (err) {
        console.error('[SESSION] Error saat refresh:', err);
        if (attempt < SESSION_REFRESH_RETRY_MAX) {
          setTimeout(() => doRefreshWithRetry(attempt + 1), SESSION_REFRESH_RETRY_DELAY);
        } else {
          console.error('[SESSION] Semua retry gagal. Session expired, melakukan logout...');
          handleSessionExpired();
        }
      }
    }

    /**
     * Tangani session yang sudah expired: tampilkan pesan, logout, kembali ke login.
     */
    function handleSessionExpired() {
      if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
      // Beritahu main process untuk logout dan destroy WA client
      ipcRenderer.send('session-expired');
      // Tandai display merah
      const el = document.querySelector('#sessionValidThru');
      if (el) {
        el.textContent = 'EXPIRED';
        el.classList.remove('text-success');
        el.classList.add('text-danger', 'fw-bold');
      }
      // Tampilkan pesan countdown ke user
      const alertContainer = document.querySelector('#alertContainer');
      if (alertContainer) {
        appendElem('#alertContainer', alertShow(
          'Session Anda telah berakhir. Kembali ke halaman login dalam 3 detik...',
          'danger'
        ));
      }
      // Kembali ke halaman login setelah 3 detik, bawa pesan expired
      setTimeout(() => {
        if (loginFn) {
          loginFn(
            ipcRenderer, wrapperElm, base_url, version,
            { showSVG: '', hideSVG: '' },
            home,
            sessionConfig,
            'Session Anda telah berakhir. Silahkan login kembali.'
          );
        }
      }, 3000);
    }

    /**
     * Jadwalkan refresh berdasarkan validThru timestamp.
     * Refresh dilakukan SESSION_REFRESH_BEFORE_EXPIRE detik sebelum expire.
     * Jika AutoRefresh=false, tetap jadwalkan expired handler tepat saat expire.
     */
    function scheduleSessionRefresh(vt) {
      if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }

      const expireDate = parseValidThru(vt);
      if (!expireDate) {
        console.log('[SESSION] validThru tidak tersedia atau tidak valid, session timer tidak diaktifkan.');
        return;
      }

      const now = Date.now();
      const expireMs = expireDate.getTime();

      if (!SESSION_AUTO_REFRESH) {
        // AutoRefresh off — tidak refresh, tapi tetap pantau waktu expire
        const delayToExpire = expireMs - now;
        if (delayToExpire <= 0) {
          console.log('[SESSION] AutoRefresh off — session sudah expire, langsung logout...');
          handleSessionExpired();
        } else {
          console.log(`[SESSION] AutoRefresh off — session akan expire dalam ${Math.round(delayToExpire / 1000)} detik (${expireDate.toLocaleTimeString()})`);
          sessionTimer = setTimeout(() => handleSessionExpired(), delayToExpire);
        }
        return;
      }

      // AutoRefresh on — refresh sebelum expire
      const refreshAt = expireMs - (SESSION_REFRESH_BEFORE_EXPIRE * 1000);
      const delay = refreshAt - now;

      if (delay <= 0) {
        console.log('[SESSION] Waktu refresh sudah lewat, langsung refresh...');
        doRefreshWithRetry(1);
      } else {
        console.log(`[SESSION] Refresh dijadwalkan dalam ${Math.round(delay / 1000)} detik (expire: ${expireDate.toLocaleTimeString()})`);
        sessionTimer = setTimeout(() => doRefreshWithRetry(1), delay);
      }
    }

    // Mulai session timer jika validThru tersedia
    scheduleSessionRefresh(validThru);
    // ─────────────────────────────────────────────────────────────────────────

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
