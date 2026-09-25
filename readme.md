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

**Cara penanganan saat ini:**
Menggunakan `patch-package` — setiap bugfix dari library diterapkan sebagai file patch di folder `patches/`. Patch ini otomatis diapply saat `yarn install` dan saat build, sehingga kode yang masuk ke `app.asar` sudah dalam kondisi ter-patch. Jika ada bugfix baru dari library, alurnya adalah: terapkan patch → rebuild → deploy via electron-updater → client mendapat versi baru otomatis.

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

