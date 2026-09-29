# WACSA-MD
***

## Status
Active

## Deskripsi
WACSA-MD merupakan aplikasi yang dapat digunakan untuk mengirim pesan via API yang terhubung dengan Whatsapp Web, terdapat juga callback untuk webhook status pesan terkirim, pesan masuk dan informasi statistik. WACSA versi Multi Device adalah sistem Whatsapp yang tidak memerlukan Whatsapp di HP harus terus terkoneksi ke internet.
WACSA-MD ini juga sering disebut WA ENGINE dari CSA Computer.

## Struktur
* .vscode, folder editor (tidak urgent)
* dist, folder hasil build kode proyek
* docs, folder dokumentasi penggunaan dan development aplikasi
* environment, folder aset tambahan untuk mode produksi
* node_modules, folder library kode proyek
* patches, folder file patch untuk library pihak ketiga (dikelola oleh patch-package)
* session, folder penyimpanan session WACSA-MD
* src, folder utama seluruh sumber kode WACSA-MD
  * images, folder aset gambar
  * main, folder kode untuk sisi backend
  * renderer, folder kode untuk sisi frontend
  * scripts, folder kode lainnya 
  * styles, folder kode untuk style
  * utils, folder kode untuk utilitas
  * app.js, file utama kode aplikasi
  * credentials.json, file yang dihasilkan dari make-credentials.json
  * index.html, file html untuk layout aplikasi
* .env.{nama clint}, file konfigurasi per client
* .env.origin, file konfigurasi template
* .gitignore, file untuk melakukan pengecualian git
* dev-app-update.yml, file untuk informasi update aplikasi, saat development
* installer.nsh, file konfigurasi untuk mengatur kebutuhan saat membuat installer
* make-credentials.js, file konfigurasi untuk credentials.json
* package.json, file utama untuk mengatur versi, dependensi, command
* readme.md, file dokumentasi project
* wacsa.ini, file konfigurasi yang digunakan WACSA saat berjalan
* yarn.lock, file kunci untuk menetapkan dependensi yang digunakan

## Fitur
* Halaman Login
* Halaman Scan QR Code
* Halaman Statistik
* API Kirim Pesan Teks
* API Kirim Pesan Media
* API Log Statistik, Kirim Pesan dan Terima Pesan
* Webhook Status Kirim Pesan
* Multi Device Beta Support
* Built-in Updater
* Session Expiration — auto-refresh, retry, dan logout otomatis saat session habis

## Library Utama
[https://github.com/pedroslopez/whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)

## Keterbatasan Update Library

WACSA tidak bisa otomatis memperbarui atau memperbaiki bug dari library whatsapp-web.js saat aplikasi sudah berjalan sebagai exe. Ada dua alasan mendasar:

**1. Kode library terkunci di dalam app.asar**
Saat build production, electron-builder mem-bundle seluruh source code dan node_modules ke dalam satu file terenkripsi bernama `app.asar`. File ini bersifat read-only saat runtime — tidak bisa dimodifikasi dari dalam aplikasi. Artinya meski ada bugfix dari library, file yang sudah ter-bundle tidak bisa diganti tanpa rebuild.

**2. Library diinjeksikan ke browser Puppeteer**
whatsapp-web.js bekerja dengan cara menginjeksikan kode JavaScript (`Utils.js`, dll) ke dalam halaman WhatsApp Web yang berjalan di Chromium. Kode injeksi ini sudah di-load saat Puppeteer pertama kali diinisialisasi dan tidak bisa di-hot-swap selama aplikasi berjalan.

**Mengapa tidak bisa cek update library saat runtime?**
Ada dua layer di whatsapp-web.js:

| Layer | Isi | Bisa diupdate tanpa rebuild? |
|-------|-----|------------------------------|
| WWeb HTML | Halaman WhatsApp Web yang diload Puppeteer | Sebagian bisa, via webVersionCache di credentials.json |
| Library JS (Utils.js, Client.js, dll) | Kode Node.js + injeksi ke browser | Tidak bisa — terkunci di dalam app.asar |

Bugfix seperti `__x_id` dan `@lid fallback` ada di layer Library JS. Karena terkunci di asar, tidak ada cara untuk meng-update atau mengeceknya saat runtime tanpa rebuild. Bahkan jika WACSA berhasil mendeteksi ada versi library baru di npm, tidak ada yang bisa dilakukan dengan informasi itu selain menunggu developer melakukan rebuild dan deploy.

**Cara penanganan saat ini:**
Menggunakan `patch-package` — setiap bugfix dari library diterapkan sebagai file patch di folder `patches/`. Patch ini otomatis diapply saat `yarn install` dan saat build, sehingga kode yang masuk ke `app.asar` sudah dalam kondisi ter-patch.

**Alur penanganan saat ada bug atau update library baru:**
1. Bug ditemukan atau ada update library yang relevan
2. Jalankan `yarn upgrade:wwebjs` — script otomatis upgrade dan apply patch
3. Bump versi di `package.json`
4. Build ulang: `yarn prod:bless` atau `yarn prod:complete`
5. Deploy installer baru ke server updater
6. `electron-updater` di semua client pull versi baru otomatis saat WACSA dibuka

**Yang perlu dipantau secara berkala:**
* Watch commits di repo [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — khususnya perubahan di `src/util/Injected/Utils.js` dan `src/Client.js`
* Pantau `wacsa-error.log` di folder instalasi client — jika muncul kembali error `Data passed to getter must include an id property` atau `sendMessage resolved to undefined`, itu sinyal WhatsApp berganti format internal dan patch perlu ditinjau ulang

## Upgrade Library whatsapp-web.js

Script `scripts/upgrade-wwebjs.js` menangani upgrade library beserta patch secara otomatis.

**Cek versi dan apply patch (tanpa upgrade):**
```powershell
yarn postinstall
# atau langsung:
node scripts/upgrade-wwebjs.js --patch-only
```
Dijalankan otomatis setiap `yarn install`.

**Upgrade ke versi terbaru di npm + apply patch:**
```powershell
yarn upgrade:wwebjs
```
Script akan:
1. Cek versi terinstall vs versi terbaru di npm
2. Jika ada versi baru — jalankan `yarn add whatsapp-web.js@x.x.x`
3. Apply kedua patch kustom (`__x_id` dan `@lid fallback`) ke `node_modules`
4. Generate file patch baru di folder `patches/`
5. Hapus patch file versi lama
6. Tampilkan summary hasil

**Upgrade ke versi tertentu:**
```powershell
node scripts/upgrade-wwebjs.js 1.34.8
```

**Output script saat sudah up to date:**
```
[upgrade] Versi terinstall : 1.34.7
[upgrade] Target versi     : 1.34.7
[  ok   ] Sudah di versi terbaru (1.34.7)
[  ok   ] Patch 1 sudah ada: delete message.__x_id
[  ok   ] Patch 2 sudah ada: @lid fallback
[  ok   ] Semua patch sudah ter-apply, tidak ada yang perlu dilakukan
```

**Output script saat upgrade berhasil:**
```
[upgrade] Versi terinstall : 1.34.7
[upgrade] Target versi     : 1.34.8
[upgrade] Upgrading 1.34.7 → 1.34.8...
[  ok   ] Library berhasil di-upgrade: 1.34.7 → 1.34.8
[  ok   ] Patch 1 applied: delete message.__x_id
[  ok   ] Patch 2 applied: @lid fallback
[  ok   ] Patch file ditulis: patches/whatsapp-web.js+1.34.8.patch
[  ok   ] Patch lama dihapus: whatsapp-web.js+1.34.7.patch
[  ok   ] Upgrade selesai: 1.34.7 → 1.34.8
[upgrade] Jalankan: yarn prod:complete (atau prod lainnya) untuk rebuild.
```

**Catatan:** Jika salah satu patch gagal apply (ditandai `✗ GAGAL`), berarti struktur kode di versi baru library berubah dan perlu update manual di `scripts/upgrade-wwebjs.js` fungsi `applyCustomPatches()`.

## Log
11/03/2022 - v0.9.3.rc.17
* Fitur: Tambah sistem penyimpanan untuk Multi Device
* Fitur: Tambah informasi versi, waktu loading dan memperbaiki layout space
* Fitur: Tambah UI baru untuk loading indikator
* Perbaiki: import dan bug penyimpanan statistik
* Sistem: Update library ke wawebjs versi 1.16.4

01/04/2022 - v0.9.4
* Sistem: Update library ke wawebjs versi 1.16.4
* Fitur: konfigurasi untuk headless, window position dan window size
* Perbaiki: parameter waState yang tidak digunakan

## Masalah
28/03/2022 - v0.9.3.rc.17
* Session tidak bisa bekerja dengan baik dengan mode headless = true
* Login selalu gagal dengan informasi "Tidak ada koneksi internet, silahkan coba lagi" saat scan QR Code dengan mode headless = true
* WACSA-MD berjalan baik dengan headless = false, namun akan menampilkan browser layaknya menggunakan Whatsapp Web  
sehingga chat OTP atau history pesan akan tampil ke user

01/04/2022 - v0.9.4
* Pembuatan sistem MD menjadi headless configurable
* Pembuatan konfigurasi headless, winPos, winSize
* Perbaikan timeout API Call WACSA
* Update library wwebjs ke versi 1.16.5
* Perbaikan konfigurasi backup log

05/04/2022 - v0.9.4
* Session WACSA di MSIS masih tidak stabil, diperikarakan karena out of memory
* Konfirmasi dari pak Meka Linked Devices di MSIS belum Join Beta, sehingga koneksi WACSA akan offline jika WA di Hp tidak aktif.

07/04/2022 - v0.9.5
* Penambahan resource untuk wacsa Built-in Updater
* Implementasi wacsa Built-in Updater
* Percobaan updater pada mode production

11/04/2022 - v0.10.0
* Peningkatan versi, dengan tujuan pembedaan dengan versi wacsa non md.
* Penambahan folder docs untuk dokumentasi penggunaan dan development.

23/04/2022 - v0.10.1
* Update dependensi terbaru waweb.js versi 1.16.6

14/06/2022 - v0.10.2
* Update dependensi terbaru waweb.js versi 1.16.7

20/03/2023 - v0.11.54
* Pemindahan env dan pembuatan satu sumber kode program saja.

2024/09/11 - v0.12.2401
* Library utama saat ini menggunakan "whatsapp-web.js":"github:pedroslopez/whatsapp-web.js#webpack-exodus" untuk masalah version change

2025/04/11 - v0.12.2402
* Update library whatsapp-web.js ke versi terbaru 1.27.0

2025/04/25 - v0.12.2410
* Tambah config untuk disableReceivedLog dan disabledSentLog agar file log tidak membesar terutama received log.

2026/02/07 - v0.34.2602
* Perbaikan kompatibilitas Electron dengan whatsapp-web.js (Puppeteer)
* Upgrade Electron ke versi stabil 32 dan update electron-builder
* Penyesuaian preload, contextIsolation, dan sandbox
* Penggantian custom-electron-titlebar ke native titlebar
* Perbaikan flow logout dan relogin WhatsApp Linked Devices

2026/04/14 - v0.35.260414
* Perbaiki: SyntaxError saat wacsa-statistic.json kosong — tambah try/catch di stats-file.js
* Perbaiki: label "Versi" di home page menampilkan URL server — perbaikan parameter fungsi home()
* Perbaiki: ENOENT credentials.json saat dijalankan dari exe — credentials.json dibuat otomatis di rootPath saat pertama kali app jalan, tidak lagi di-ship dalam installer
* Perbaiki: komentar di wacsa.ini terhapus saat login — updateAuthKeyValue() kini pakai regex replace pada raw string, bukan ini.stringify()
* Fitur: AuthKeyValue di wacsa.ini otomatis diupdate dengan token baru setiap user login
* Fitur: useWWebCache dan wwebCacheVersion tetap dibaca dari credentials.json dalam asar (tidak dipindah ke wacsa.ini)
* Sistem: format versi package.json harus semver 3 bagian (MAJOR.MINOR.PATCH) agar electron-updater tidak error

2026/04/16 - v0.35.260416
* Fitur: Session expiration — session otomatis dipantau berdasarkan validThru dari server
* Fitur: Auto-refresh session sebelum expire dengan retry otomatis (configurable)
* Fitur: Jika semua retry gagal, WACSA logout otomatis dan kembali ke form login dengan pesan informasi
* Fitur: Informasi "Session Berlaku Hingga" ditampilkan di card Koneksi (hijau = aktif, merah = expired)
* Fitur: Konfigurasi session di wacsa.ini via seksi [SessionOptions] — AutoRefresh, RefreshBeforeExpire, RefreshRetryMax, RefreshRetryDelay
* Sistem: Endpoint login/logout/refresh digabung menjadi satu key Endpoint di [AuthAPI]
* Sistem: Session config dibaca dari main process dan dikirim ke renderer via IPC saat startup

2026/09/01 - v0.35.260425
* Perbaiki: Kirim pesan media gagal dengan error "Data passed to getter must include an id property (it's how we memoize) but got undefined"
* Analisa: Bug ada di library whatsapp-web.js v1.34.6 — properti __x_id dari MediaData model ter-spread ke object Msg saat konstruksi, menimpa newMsgKey yang valid sehingga Msg.initialize gagal meresolvasi sender
* Sistem: Implementasi patch-package untuk mempatch library secara permanen tanpa modifikasi langsung di node_modules
* Sistem: patch diterapkan otomatis via postinstall script setiap yarn install, termasuk saat build production ke asar

2026/09/25 - v0.36.260925
* Perbaiki: Counter "Pesan Masuk" hanya naik satu kali — downloadMedia() dipanggil tanpa guard hasMedia, throw untuk pesan teks menyebabkan counter tidak naik di pesan berikutnya
* Perbaiki: Counter "Pesan Keluar" tidak pernah naik — sentFileHandle early return tanpa resolve/reject saat disableSentLog=true menyebabkan Promise hang selamanya
* Perbaiki: response sendMessage selalu undefined untuk pesan teks — WhatsApp kini menggunakan format ID @lid (Linked Device ID) untuk Linked Devices, sementara newMsgKey._serialized masih menggunakan format @c.us; window.Store.Msg.get() tidak menemukan pesan; fix dengan fallback ke msgPromise langsung
* Perbaiki: Counter "Pesan Keluar" dari HP tidak naik — reaktifkan event message_create untuk menangkap semua pesan keluar (dari API maupun dari HP), counter dipindahkan sepenuhnya ke sini agar tidak dobel
* Perbaiki: QR Code tidak langsung hilang setelah scan — tambah handler di event authenticated_client untuk sembunyikan QR dan tampilkan spinner "Menghubungkan ke WhatsApp..." sambil menunggu event ready
* Perbaiki: Perintah build gagal di Windows (rm not recognized) — ganti rm -rf dan mv dengan rimraf dan fs.renameSync yang cross-platform
* Fitur: Log panel dipindahkan ke luar #app agar tetap tampil saat QR maupun saat spinner connecting
* Fitur: Timer "Waktu Berlalu" aktif saat spinner connecting agar user tahu durasi proses
* Fitur: Log informatif di event ready (tahap memuat statistik, info client) untuk memudahkan diagnosa jika loading lama
* Sistem: patch whatsapp-web.js diperluas — mencakup fix __x_id (Utils.js) dan fix @lid fallback (Utils.js)

2026/09/28 - v0.36.260928
* Fitur: Auto-refresh session menggunakan action "refresh" ke endpoint login_x — session diperpanjang otomatis tanpa user perlu login ulang
* Fitur: DevTools renderer bisa dibuka via F12 di semua mode (development maupun production exe)
* Perbaiki: logout otomatis berulang — penyebabnya endpoint login_x belum support action "refresh", sudah diselesaikan dari sisi server; implementasi refresh dikembalikan ke action "refresh" yang simpel
* Sistem: IgnoreRefreshError di wacsa.ini diset false — karena secretkey dedicated untuk WACSA, error session invalid harus ditangani dengan logout, bukan diabaikan

2026/09/29 - v0.37.260929
* Perbaiki: ready event tidak pernah fired setelah scan QR — bug di whatsapp-web.js v1.34.6, hasSynced sudah true sebelum listener dipasang sehingga onAppStateHasSyncedEvent tidak pernah dipanggil; fix dengan upgrade ke v1.34.7 yang sudah ada atomic hasSynced check
* Perbaiki: authenticated event fired berkali-kali — tambah flag authenticatedSent agar hanya satu kali per siklus login
* Perbaiki: waClient.destroy() dipanggil sebelum initialize padahal belum pernah init (fresh install) menyebabkan timeout; fix dengan cek pupBrowser sebelum destroy
* Sistem: Ganti mekanisme patch dari patch-package ke script upgrade-wwebjs.js yang lebih robust — tidak bergantung pada lockfile resolution, mendukung deteksi versi otomatis, dan apply patch kustom langsung ke node_modules
* Sistem: Upgrade whatsapp-web.js ke versi 1.34.7
* Sistem: postinstall script diganti dari patch-package ke node scripts/upgrade-wwebjs.js --patch-only

## Catatan Teknis: Alternatif Refresh Session (jika action "refresh" tidak tersedia)

Jika di kemudian hari endpoint login_x tidak lagi support action "refresh", ada dua alternatif yang pernah diimplementasikan dan bisa diaktifkan kembali:

**Alternatif A — Logout lalu Login ulang (tanpa password)**
Pernah dicoba saat server belum support action "refresh". Alurnya:
1. Kirim `{ action: "logout" }` ke login_x untuk bebaskan slot session lama
2. Kirim `{ action: "login" }` dengan secretkey yang sama (tanpa password) untuk login ulang

Ternyata gagal karena server memerlukan password untuk action "login". Kode ini tidak ada di repo tapi bisa direkonstruksi di `auth.service.js` fungsi `refreshSession()`.

**Alternatif B — Logout lalu Login ulang (dengan password terenkripsi)**
Solusi lengkap menggunakan `safeStorage` bawaan Electron (enkripsi OS-level / Windows DPAPI).
Password dienkripsi saat user login dan disimpan ke `wacsa-auth.bin`. Saat refresh, password dibaca, didekripsi, lalu dikirim ke server.

File yang perlu diubah:

---

### 1. `src/app.js`

**Tambahkan `safeStorage` ke import electron:**
```js
// SEBELUM:
const { app, BrowserWindow, ipcMain, dialog } = require("electron/main");

// SESUDAH:
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require("electron/main");
```

**Ubah `save-credentials` IPC untuk terima dan enkripsi password:**
```js
// SEBELUM:
ipcMain.on("save-credentials", (event, { token, id, sessionid }) => {
  try {
    // ... (kode simpan credentials.json)
    authService.updateAuthKeyValue(token);
    console.log("[APP] Credentials saved from local login, token:", token);
  } catch (error) {
    console.error("[APP] Failed to save credentials:", error);
  }
});

// SESUDAH — tambahkan blok enkripsi setelah console.log:
ipcMain.on("save-credentials", (event, { token, id, sessionid, password }) => {
  try {
    // ... (kode simpan credentials.json — tidak berubah)
    authService.updateAuthKeyValue(token);
    console.log("[APP] Credentials saved from local login, token:", token);

    // Enkripsi dan simpan password untuk keperluan auto-refresh session
    if (password && safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = safeStorage.encryptString(password);
        const authBinPath = path.resolve(rootPath + "/wacsa-auth.bin");
        fs.writeFileSync(authBinPath, encrypted);
        console.log("[APP] Password encrypted and saved to wacsa-auth.bin");
      } catch (encErr) {
        console.error("[APP] Failed to encrypt password:", encErr.message);
      }
    }
  } catch (error) {
    console.error("[APP] Failed to save credentials:", error);
  }
});
```

**Ubah `session-refresh` IPC handler untuk dekripsi password:**
```js
// SEBELUM:
ipcMain.handle("session-refresh", async () => {
  try {
    const result = await authService.refreshSession();
    console.log("[APP] Session refresh result:", result);

// SESUDAH:
ipcMain.handle("session-refresh", async () => {
  try {
    let decryptedPassword = null;
    const authBinPath = path.resolve(rootPath + "/wacsa-auth.bin");
    if (fs.existsSync(authBinPath) && safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = fs.readFileSync(authBinPath);
        decryptedPassword = safeStorage.decryptString(encrypted);
      } catch (decErr) {
        console.error("[APP] Failed to decrypt password:", decErr.message);
      }
    }
    const result = await authService.refreshSession(decryptedPassword);
    console.log("[APP] Session refresh result:", result);
```

---

### 2. `src/main/services/auth.service.js`

**Ganti seluruh fungsi `refreshSession` dengan versi berikut:**
```js
/**
 * Refresh session ke server auth.
 * Karena server tidak support action "refresh", alurnya adalah:
 * 1. Logout session lama (action: "logout") agar slot tersedia
 * 2. Login ulang (action: "login") dengan secretkey + password
 * Mengembalikan { success, validThru, message }
 * @param {string|null} password - Password terdekripsi dari safeStorage
 */
async function refreshSession(password = null) {
  const authConfig = config.AuthAPI || {};
  const refreshEndpoint = authConfig.Endpoint;

  if (!refreshEndpoint) {
    return { success: true, validThru: null, message: "No refresh endpoint configured" };
  }

  const credentialsPath = path.resolve(rootPath + "/credentials.json");
  let creds = {};
  if (fs.existsSync(credentialsPath)) {
    try { creds = JSON.parse(fs.readFileSync(credentialsPath, "utf8")); } catch(e) {}
  }

  const secretkey = creds.token;
  const xuser = creds.id;
  const sessionid = creds.sessionid;

  if (!secretkey || !xuser) {
    return { success: false, message: "No active credentials to refresh" };
  }

  const timeout = parseInt(authConfig.Timeout) || 10;

  try {
    // Step 1: Logout session lama agar slot tersedia
    const logoutController = new AbortController();
    const logoutTimeout = setTimeout(() => logoutController.abort(), timeout * 1000);
    try {
      await fetch(refreshEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user": xuser,
          "secretkey": secretkey,
          "sessionid": sessionid || "",
        },
        body: JSON.stringify({ action: "logout" }),
        signal: logoutController.signal,
      });
    } catch(e) {
      console.warn("[AUTH] Refresh: logout gagal (diabaikan):", e.message);
    } finally {
      clearTimeout(logoutTimeout);
    }

    // Step 2: Login ulang dengan secretkey + password
    const loginController = new AbortController();
    const loginTimeout = setTimeout(() => loginController.abort(), timeout * 1000);

    const loginHeaders = {
      "content-type": "application/json",
      "x-user": xuser,
      "secretkey": secretkey,
      "sessionid": sessionid || "",
    };
    if (password) loginHeaders["x-password"] = password;

    const response = await fetch(refreshEndpoint, {
      method: "POST",
      headers: loginHeaders,
      body: JSON.stringify({ action: "login" }),
      signal: loginController.signal,
    });

    clearTimeout(loginTimeout);

    const responseBody = await response.json();
    console.log("[AUTH] Refresh (re-login) response:", JSON.stringify(responseBody));

    if (responseBody.result === true) {
      const newValidThru = responseBody.validthru || null;
      const newSessionId = response.headers.get("sessionid") || null;
      if (newSessionId && newSessionId !== sessionid && fs.existsSync(credentialsPath)) {
        const updatedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
        updatedCreds.sessionid = newSessionId;
        fs.writeFileSync(credentialsPath, JSON.stringify(updatedCreds, null, 2));
      }
      return { success: true, validThru: newValidThru, message: "Session refreshed" };
    } else {
      const errorMsg = responseBody?.onfail?.cerror || responseBody?.message || "Re-login failed";
      return { success: false, message: errorMsg };
    }
  } catch (error) {
    return { success: false, message: `Refresh failed: ${error.message}` };
  }
}
```

---

### 3. `src/renderer/pages/login.js`

**Tambahkan field `password` ke `save-credentials` IPC:**
```js
// SEBELUM:
ipcRenderer.send('save-credentials', {
  token: resJson.sessionKey,
  id: emailElm.value,
  sessionid: resJson.sessionID || '',
});

// SESUDAH:
ipcRenderer.send('save-credentials', {
  token: resJson.sessionKey,
  id: emailElm.value,
  sessionid: resJson.sessionID || '',
  password: passwordElm.value,
});
```

---

### 4. `.gitignore`

**Tambahkan baris berikut** agar file password terenkripsi tidak masuk ke git:
```
wacsa-auth.bin
```

> **Catatan keamanan:** `wacsa-auth.bin` dienkripsi dengan Windows DPAPI via Electron `safeStorage` — file ini hanya bisa didekripsi di mesin dan user account Windows yang sama. Tidak bisa dibaca di mesin lain meski file dicopy.

