# WACSA-MD2

Aplikasi desktop berbasis Electron (Node.js) yang berfungsi sebagai WhatsApp API Engine. Mengirim dan menerima pesan WhatsApp via REST API, dilengkapi callback webhook untuk status pesan dan pesan masuk. Mendukung WhatsApp Multi Device sehingga HP tidak perlu terus terkoneksi ke internet.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    WACSA-MD2 (Electron)                     │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Renderer    │◄──►│  Main Process│◄──►│  Express     │  │
│  │  (UI/Login)  │    │  (IPC)       │    │  Server      │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                 │           │
│  ┌──────────────────────────────────────────────▼───────┐  │
│  │  whatsapp-web.js (Puppeteer + Chrome)                │  │
│  │  LocalAuth session → session/                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │ REST API (:8008)          │ Callback HTTP
         ▼                           ▼
  WACSA-MD2-UI              Aplikasi Penerima
  (atau client lain)        (wacsa-ui, dll)
```

---

## Cara Kerja

### Flow Login

```
User input email + password di UI
    → POST /auth/login
    → Validasi ke AuthAPI (wacsa.ini) atau credentials.json (fallback)
    → Generate sessionKey (token)
    → Token disimpan ke credentials.json (rootPath)
    → AuthKeyValue di wacsa.ini otomatis diupdate
    → Response: { status: true, sessionKey, sessionID, ... }
```

### Flow Kirim Pesan

```
Client → POST /message/send-text (header: x-access-token)
    → Middleware validasi token
    → waClient.sendMessage()
    → Response: { status: true, response: {...} }
    → Callback POST ke MessageStatusEndpoint (wacsa.ini)
```

### Flow Terima Pesan

```
WhatsApp → whatsapp-web.js event 'message'
    → Simpan ke wacsa-received.json
    → Callback POST ke MessageIncomingEndpoint (wacsa.ini)
      dengan header AuthKeyName: AuthKeyValue
```

---

## Konfigurasi (`wacsa.ini`)

```ini
[AuthAPI]
; Endpoint login eksternal (opsional). Jika kosong, pakai credentials.json
LoginEndpoint=http://192.168.x.x/api/login
LogoutEndpoint=http://192.168.x.x/api/logout
Timeout=10

[CallbackAPI]
; Endpoint penerima callback pesan masuk
MessageIncomingEndpoint=http://localhost:5000/api/callback/incoming
; Endpoint penerima callback status pesan keluar
MessageStatusEndpoint=http://localhost:5000/api/callback/status
; Header auth untuk callback request
AuthKeyName=X-API-Key
; Otomatis diupdate setiap kali user login
AuthKeyValue=
RetryFailure=3
IntervalFailure=1

[ServerOptions]
port=8008
timeout=10
attachment=true
chrome=C:/Program Files/Google/Chrome/Application/chrome.exe
```

---

## REST API

Semua endpoint (kecuali `/auth/login`) membutuhkan header:
```
x-access-token: <sessionKey>
```

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/auth/login` | Login, mendapatkan token |
| POST | `/auth/logout` | Logout, hapus sesi |
| POST | `/message/send-text` | Kirim pesan teks |
| POST | `/message/send-media` | Kirim pesan media |
| GET | `/log/received-message` | Ambil log pesan masuk (read & clear) |
| GET | `/log/sent-message` | Ambil log pesan keluar (read & clear) |
| GET | `/log/statistic` | Ambil statistik (read & clear) |

### Login Request/Response

```json
// POST /auth/login
{ "email": "user", "password": "pass" }

// Response
{
  "status": true,
  "sessionKey": "abc123...",
  "sessionID": "xyz789...",
  "userID": "user",
  "siteID": "1",
  "validThru": "20261231T23:59:59"
}
```

### Logout Request/Response

```json
// POST /auth/logout
// Headers: x-user, secretkey, sessionid
{ "action": "logout" }

// Response
{ "result": true, "onsuccess": {} }
```

---

## Struktur Project

```
wacsa-md2/
├── src/
│   ├── app.js                     # Entry point Electron main process
│   ├── index.html                 # Layout UI
│   ├── credentials.json           # Template credentials (dalam asar)
│   ├── main/
│   │   ├── logger/                # Error & stats logger
│   │   ├── middleware/            # Auth token validator (baca dari rootPath)
│   │   ├── mutex/                 # File locking untuk JSON log
│   │   ├── routes/                # Express routes (auth, log, message)
│   │   ├── server/                # Express server setup
│   │   ├── services/              # Auth service (login, logout, update wacsa.ini)
│   │   ├── system/                # Config loader, rootPath, versionTag
│   │   └── whatsapp/              # WA client, listener, callback
│   ├── renderer/
│   │   ├── pages/                 # Login & Home page
│   │   ├── components/            # Updater UI
│   │   ├── preload.js             # Context bridge
│   │   └── index.js               # Renderer entry
│   └── utils/                     # Helper functions
├── wacsa.ini                      # Konfigurasi runtime
├── wacsa.ini.bak                  # Template konfigurasi default
├── package.json
└── installer.nsh                  # Inno Setup script helper
```

---

## File Runtime

File-file berikut dibuat otomatis di folder instalasi saat app berjalan:

| File | Deskripsi |
|------|-----------|
| `credentials.json` | Token & session aktif (dibuat otomatis, tidak di-ship) |
| `wacsa-received.json` | Log pesan masuk |
| `wacsa-sent.json` | Log pesan keluar |
| `wacsa-statistic.json` | Statistik pesan |
| `wacsa-error.log` | Log error |
| `session/` | Session WhatsApp (LocalAuth) |

---

## Setup Development

### Prasyarat

- Node.js 18+
- Yarn
- Google Chrome terinstall

### Instalasi

```bash
cd wacsa-md2
yarn install
```

### Menjalankan Development

```bash
yarn dev
```

### Build Production

```bash
# Build dengan konfigurasi origin
yarn prod:origin

# Build untuk client bless
yarn prod:bless

# Build untuk client complete
yarn prod:complete
```

Hasil build ada di `dist_bless/` atau `dist_complete/`.

---

## Dependencies Utama

| Package | Versi | Fungsi |
|---------|-------|--------|
| electron | 32.2.3 | Desktop app framework |
| whatsapp-web.js | ^1.34.6 | WhatsApp Web client |
| express | 4.17.3 | REST API server |
| electron-updater | ^4.6.5 | Built-in auto updater |
| async-mutex | ^0.3.2 | File locking untuk JSON log |
| ini | ^2.0.0 | Parse & write wacsa.ini |
| node-fetch | 2.6.7 | HTTP client untuk callback |
| qrcode | 1.5.0 | Generate QR code image |

---

## Troubleshooting

### Error: SyntaxError: Unexpected end of JSON input
```
File wacsa-statistic.json / wacsa-received.json / wacsa-sent.json kosong atau corrupt.
Hapus file tersebut, app akan membuat ulang otomatis.
```

### Error: App version is not a valid semver version
```
Format versi di package.json harus MAJOR.MINOR.PATCH (3 bagian).
Contoh valid: "0.35.260414" bukan "0.35.2604.01"
```

### Error: ENOENT credentials.json
```
File credentials.json tidak ditemukan di folder instalasi.
App akan membuat otomatis saat pertama kali dijalankan.
Pastikan app punya write permission ke folder instalasi.
```

### Login gagal: Email atau Password Tidak Cocok
```
Jika AuthAPI.LoginEndpoint di wacsa.ini kosong, login menggunakan
credentials.json (fallback). Pastikan field id dan password sesuai.
```

### QR Code tidak muncul / WhatsApp tidak terhubung
```
1. Pastikan Google Chrome terinstall di path yang dikonfigurasi di wacsa.ini
2. Coba restart WACSA
3. Hapus folder session/ lalu restart untuk sesi baru
```

---

## Lisensi

© 2026 CSA Computer. All rights reserved.
