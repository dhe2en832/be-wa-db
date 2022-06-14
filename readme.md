# WACSA

## Deskripsi
WACSA-MD merupakan aplikasi yang dapat digunakan untuk mengirim pesan via API yang terhubung dengan Whatsapp Web, terdapat juga callback untuk webhook status pesan terkirim, pesan masuk dan informasi statistik. WACSA versi Multi Device adalah sistem Whatsapp yang tidak memerlukan Whatsapp di HP harus terus terkoneksi ke internet.

## Struktur
* .vscode, folder editor (tidak urgent)
* dist, folder hasil build kode proyek
* docs, folder dokumentasi penggunaan dan development aplikasi
* environment, folder aset tambahan untuk mode produksi
* node_modules, folder library kode proyek
* session, folder penyimpanan session WACSA-MD
* src, folder utama seluruh sumber kode WACSA-MD
  * images, folder aset gambar
  * main, folder kode untuk sisi backend
  * renderer, folder kode untuk sisi frontend
  * scripts, folder kode lainnya 
  * styles, folder kode untuk style
  * utils, folder kode untuk utilitas
  * app.js, file utama kode aplikasi
  * config.json, file konfigurasi non runtime
  * index.html, file html untuk layout aplikasi
* .gitignore, file untuk melakukan pengecualian git
* dev-app-update.yml, file untuk informasi update aplikasi, saat development
* installer.nsh, file konfigurasi untuk mengatur kebutuhan saat membuat installer
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