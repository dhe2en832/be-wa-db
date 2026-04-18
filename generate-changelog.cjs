#!/usr/bin/env node

/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/*
USAGE NOTES:
- Run 'npm run changelog' BEFORE staging files
- After generating changelog, stage the new changelog file:
  git add custom/docs/changelog/daily/codeChange-$(date +%Y%m%d).md
- Then commit and push
- This ensures changelog changes are included in the same commit
*/

class DynamicChangelogGenerator {
    constructor() {
        this.docsDir = path.join(process.cwd(), 'custom/docs/changelog/daily');
        this.patterns = this.initializePatterns();
        this.categories = this.initializeCategories();

        // Support --date=YYYY-MM-DD argument untuk generate changelog tanggal tertentu
        const dateArg = process.argv.find(a => a.startsWith('--date='));
        this.targetDate = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
        console.log(`📅 Generating changelog for: ${this.targetDate}`);
    }

    initializePatterns() {
        return {
            functionKeywords: {
                'selection': 'Selection mechanism',
                'error': 'Error handling',
                'display': 'UI display',
                'modal': 'Modal dialog',
                'form': 'Form processing',
                'table': 'Table functionality',
                'config': 'Configuration',
                'api': 'API integration',
                'test': 'Test functionality',
                'style': 'Styling/UI',
                'component': 'Component logic',
                'hook': 'React hook',
                'service': 'Service layer',
                'util': 'Utility function'
            },
            changeKeywords: {
                '+const': 'Add constant/function',
                '+import': 'Add import',
                '+export': 'Add export',
                '+function': 'Add function',
                '+class': 'Add class',
                '-console.log': 'Remove debug logs',
                '+return': 'Add return logic',
                'Error': 'Error handling',
                'useState': 'State management',
                'useEffect': 'Effect handling',
                'styled': 'Styling',
                'className': 'CSS class',
                'axios': 'API call',
                'fetch': 'API request'
            }
        };
    }

    initializeCategories() {
        return {
            '✨ Features': [],
            '🐞 Fixes': [],
            '📖 Documentation': [],
            '🧪 Tests': [],
            '🎨 UI/UX': [],
            '🔐 Auth/Session': [],
            '🔌 API': [],
            '⚙️ Config': [],
            '⚙️ Others': []
        };
    }

    /**
     * Kategorisasi per-FILE berdasarkan path dan isi diff,
     * bukan per-commit. Lebih akurat karena tiap file bisa beda konteks.
     */
    categorizeFile(filePath, diff, commitMessage) {
        const f = filePath.toLowerCase();
        const d = (diff || '').toLowerCase();
        const m = (commitMessage || '').toLowerCase();

        // --- Docs / changelog ---
        if (f.includes('.md') || f.includes('docs/') || f.includes('readme') || f.includes('changelog')) {
            return '📖 Documentation';
        }

        // --- Tests ---
        if (f.includes('.test.') || f.includes('.spec.') || f.includes('/test') || f.includes('/tests')) {
            return '🧪 Tests';
        }

        // --- Config / env / build ---
        if (
            f.includes('package.json') || f.includes('.env') || f.includes('webpack') ||
            f.includes('vite.config') || f.includes('tsconfig') || f.includes('eslint') ||
            f.includes('wacsa.ini') || f.includes('credentials.json') || f.includes('.cjs') ||
            f.includes('installer') || f.includes('builder')
        ) {
            return '⚙️ Config';
        }

        // --- UI / renderer pages & styles ---
        if (
            f.includes('/pages/') || f.includes('/components/') ||
            f.includes('.css') || f.includes('.scss') || f.includes('.html') ||
            f.includes('styled') || f.includes('index.html') ||
            d.includes('classname') || d.includes('innerhtml') || d.includes('getelementsby') ||
            d.includes('queryselector') || d.includes('modal') || d.includes('btn-') ||
            d.includes('display:') || d.includes('style=')
        ) {
            return '🎨 UI/UX';
        }

        // --- Auth / session ---
        if (
            f.includes('auth') || f.includes('session') || f.includes('login') ||
            d.includes('localstorage') || d.includes('sessionkey') || d.includes('password') ||
            d.includes('token') || d.includes('credential')
        ) {
            return '🔐 Auth/Session';
        }

        // --- API / service / routes ---
        if (
            f.includes('/routes/') || f.includes('/services/') || f.includes('api') ||
            d.includes('fetch(') || d.includes('axios') || d.includes('res.json') ||
            d.includes('req.body') || d.includes('ipcmain') || d.includes('ipcrenderer')
        ) {
            return '🔌 API';
        }

        // --- Fixes dari commit message ---
        if (m.startsWith('fix:') || m.includes('fix') || m.includes('bug') || m.includes('hotfix')) {
            return '🐞 Fixes';
        }

        // --- Features dari commit message ---
        if (m.startsWith('feat:') || m.includes('add ') || m.includes('new ') || m.includes('implement')) {
            return '✨ Features';
        }

        return '⚙️ Others';
    }

    // Tetap ada untuk backward compat, delegate ke categorizeFile
    categorizeCommit(commit) {
        return this.categorizeFile(commit.files[0] || '', '', commit.message);
    }

    getCommitsSinceLastRun() {
        try {
            const commits = [];
            
            // First, get commits for target date
            const today = this.targetDate;
            const gitCommand = `git log --since="${today} 00:00:00" --until="${today} 23:59:59" --pretty=format:"%H|%s|%ai" --name-only`;
            const output = execSync(gitCommand, { encoding: 'utf8' });
            
            const lines = output.split('\n');
            let currentCommit = null;
            
            lines.forEach((line) => {
                if (line.includes('|')) {
                    if (currentCommit) {
                        commits.push(currentCommit);
                    }
                    const [hash, message, date] = line.split('|');
                    currentCommit = {
                        hash: hash.trim(),
                        message: message.trim(),
                        date: date.trim(),
                        files: []
                    };
                } else if (line.trim() && currentCommit) {
                    currentCommit.files.push(line.trim());
                }
            });
            
            if (currentCommit) {
                commits.push(currentCommit);
            }
            
            // Then, check for unstaged changes
            try {
                const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
                const changedFiles = statusOutput.split('\n')
                    .filter(line => line.trim())
                    .map(line => line.substring(3).trim()); // Remove status prefix
                
                if (changedFiles.length > 0) {
                    // Create a virtual commit for unstaged changes
                    const unstagedCommit = {
                        hash: 'UNSTAGED',
                        message: this.generateUnstagedMessage(changedFiles),
                        date: new Date().toISOString(),
                        files: changedFiles
                    };
                    commits.push(unstagedCommit);
                }
            } catch (statusError) {
                // Ignore status errors
            }
            
            return commits;
        } catch (error) {
            console.warn('No commits found for today or git command failed:', error.message);
            return [];
        }
    }

    generateUnstagedMessage(files) {
        const fileTypes = files.map(file => {
            if (file.includes('Config')) return 'config';
            if (file.includes('.js')) return 'javascript';
            if (file.includes('.jsx')) return 'react';
            if (file.includes('.css')) return 'styles';
            if (file.includes('.md')) return 'docs';
            return 'files';
        });
        
        const uniqueTypes = [...new Set(fileTypes)];
        if (uniqueTypes.length === 1) {
            return `chore: update ${uniqueTypes[0]}`;
        }
        return `chore: update ${uniqueTypes.join(', ')}`;
    }

    getGitDiff(filePath, commitHash) {
        try {
            if (commitHash === 'UNSTAGED') {
                // For unstaged changes, get current working directory version
                const gitCommand = `git show HEAD:${filePath}`;
                const oldContent = execSync(gitCommand, { encoding: 'utf8' });
                const currentContent = fs.readFileSync(filePath, { encoding: 'utf8' });
                return currentContent;
            } else {
                const gitCommand = `git show ${commitHash}:${filePath}`;
                const content = execSync(gitCommand, { encoding: 'utf8' });
                return content;
            }
        } catch (error) {
            // File might not exist in this commit, try parent
            try {
                const gitCommand = `git show ${commitHash}^:${filePath}`;
                return execSync(gitCommand, { encoding: 'utf8' });
            } catch (parentError) {
                return '';
            }
        }
    }

    getFileDiff(filePath, commitHash) {
        try {
            if (commitHash === 'UNSTAGED') {
                // For unstaged changes, get diff against HEAD
                const gitCommand = `git diff HEAD -- ${filePath}`;
                const output = execSync(gitCommand, { encoding: 'utf8' });
                return output;
            } else {
                const gitCommand = `git show ${commitHash} -- ${filePath}`;
                const output = execSync(gitCommand, { encoding: 'utf8' });
                return output;
            }
        } catch (error) {
            return '';
        }
    }

    extractLineNumbers(diff) {
        const lineNumbers = [];
        const lines = diff.split('\n');
        let currentLine = 0;
        
        lines.forEach((line) => {
            if (line.startsWith('@@')) {
                // More flexible regex - match until @@, then capture the number after +
                const match = line.match(/@@ -\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
                if (match) {
                    currentLine = parseInt(match[1]);
                } else {
                    // Try alternative regex - capture first number after +
                    const altMatch = line.match(/@@ -\d+(?:,\d+)?\s+\+(\d+)/);
                    if (altMatch) {
                        currentLine = parseInt(altMatch[1]);
                    }
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                if (!isNaN(currentLine) && currentLine > 0) {
                    lineNumbers.push(currentLine);
                    currentLine++;
                }
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                // Removed line, don't increment
            } else if (!line.startsWith('@@') && !line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('index') && !line.startsWith('diff')) {
                if (!isNaN(currentLine) && currentLine > 0) {
                    currentLine++;
                }
            }
        });
        
        if (lineNumbers.length === 0) return 'N/A';
        
        if (lineNumbers.length === 1) return `${lineNumbers[0]}`;
        
        const ranges = [];
        let start = lineNumbers[0];
        let end = lineNumbers[0];
        
        for (let i = 1; i < lineNumbers.length; i++) {
            if (lineNumbers[i] === end + 1) {
                end = lineNumbers[i];
            } else {
                ranges.push(start === end ? start : `${start}-${end}`);
                start = lineNumbers[i];
                end = lineNumbers[i];
            }
        }
        ranges.push(start === end ? start : `${start}-${end}`);
        
        return ranges.join(', ');
    }

    extractFunction(filePath, message, diff) {
        const fileName = path.basename(filePath || 'unknown', path.extname(filePath || ''));
        const f = (filePath || '').toLowerCase();
        const d = (diff || '');
        const m = (message || '').toLowerCase();

        // Dari nama file — paling akurat
        const fileDescriptions = {
            'home':        'Halaman utama (dashboard)',
            'login':       'Halaman login & autentikasi',
            'session':     'Manajemen sesi pengguna',
            'app':         'Entry point aplikasi Electron',
            'auth':        'Layanan autentikasi',
            'package':     'Konfigurasi package & scripts',
            'credentials': 'Data kredensial aplikasi',
            'wacsa':       'Konfigurasi WACSA (.ini)',
            'index':       'Entry point / halaman utama',
        };
        const lowerFileName = fileName.toLowerCase();
        for (const [key, desc] of Object.entries(fileDescriptions)) {
            if (lowerFileName.includes(key)) return desc;
        }

        // Dari path folder
        if (f.includes('/pages/'))      return `Halaman ${fileName}`;
        if (f.includes('/services/'))   return `Service ${fileName}`;
        if (f.includes('/routes/'))     return `Route ${fileName}`;
        if (f.includes('/components/')) return `Komponen ${fileName}`;
        if (f.includes('/utils/'))      return `Utility ${fileName}`;
        if (f.includes('/scripts/'))    return `Script ${fileName}`;

        // Dari commit message (setelah tanda ':')
        if (m.includes(':')) {
            const afterColon = message.split(':').slice(1).join(':').trim();
            if (afterColon.length > 5 && afterColon.length < 80) return afterColon;
        }

        // Dari isi diff — cari nama fungsi/class yang ditambah
        const fnMatch = d.match(/^\+\s*(?:async\s+)?function\s+(\w+)/m);
        if (fnMatch) return `Fungsi ${fnMatch[1]}`;
        const arrowMatch = d.match(/^\+\s*(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/m);
        if (arrowMatch) return `Fungsi ${arrowMatch[1]}`;
        const classMatch = d.match(/^\+\s*class\s+(\w+)/m);
        if (classMatch) return `Class ${classMatch[1]}`;

        return `Implementasi ${fileName}`;
    }

    extractChanges(filePath, diff) {
        const changes = new Set();
        const f = (filePath || '').toLowerCase();
        const lines = (diff || '').split('\n');

        // ── Pola spesifik wacsa-md2 ──────────────────────────────────────────
        // routes
        if (f.includes('/routes/')) {
            if (diff.includes('+') && diff.includes('router.') || diff.includes('app.get') || diff.includes('app.post')) changes.add('Tambah/ubah endpoint route');
            if (diff.includes('middleware'))  changes.add('Tambah/ubah middleware pada route');
            if (diff.includes('validator'))   changes.add('Tambah validasi input');
        }
        // services
        if (f.includes('/services/')) {
            if (diff.includes('fetch(') || diff.includes('axios'))  changes.add('Tambah/ubah HTTP request ke API eksternal');
            if (diff.includes('fs.readFile') || diff.includes('fs.writeFile')) changes.add('Tambah/ubah operasi baca/tulis file');
            if (diff.includes('credentials')) changes.add('Ubah penanganan kredensial');
            if (diff.includes('token') || diff.includes('sessionKey')) changes.add('Ubah penanganan token/session');
        }
        // whatsapp
        if (f.includes('/whatsapp/')) {
            if (diff.includes('client.on'))       changes.add('Tambah/ubah event listener WhatsApp');
            if (diff.includes('sendMessage'))     changes.add('Tambah/ubah pengiriman pesan WhatsApp');
            if (diff.includes('initialize'))      changes.add('Ubah inisialisasi WhatsApp client');
            if (diff.includes('qr'))              changes.add('Ubah penanganan QR code');
            if (diff.includes('messageCallback')) changes.add('Ubah callback pesan masuk');
        }
        // logger / mutex
        if (f.includes('/logger/') || f.includes('/mutex/')) {
            if (diff.includes('writeFile') || diff.includes('appendFile')) changes.add('Ubah penulisan log/file');
            if (diff.includes('Mutex') || diff.includes('mutex'))          changes.add('Ubah mekanisme mutex/lock file');
        }
        // middleware
        if (f.includes('/middleware/')) {
            if (diff.includes('req') && diff.includes('res')) changes.add('Tambah/ubah middleware Express');
            if (diff.includes('cors'))   changes.add('Ubah konfigurasi CORS');
            if (diff.includes('auth'))   changes.add('Ubah middleware autentikasi');
        }
        // utils
        if (f.includes('/utils/')) {
            if (f.includes('alert'))       changes.add('Ubah generator alert/notifikasi');
            if (f.includes('datetime') || f.includes('date')) changes.add('Ubah format tanggal/waktu');
            if (f.includes('duration'))    changes.add('Ubah kalkulasi durasi');
            if (f.includes('phone'))       changes.add('Ubah formatter nomor telepon');
            if (f.includes('random'))      changes.add('Ubah generator nilai acak');
            if (f.includes('styles') || f.includes('style')) changes.add('Ubah helper manipulasi DOM/style');
            if (f.includes('mutex'))       changes.add('Ubah validator mutex');
        }
        // renderer pages
        if (f.includes('/pages/home')) {
            if (diff.includes('loggedInUser'))         changes.add('Tampilkan nama user yang sedang login');
            if (diff.includes('modalVerifyPassword'))  changes.add('Tambah modal verifikasi password untuk lihat secret key');
            if (diff.includes('btnRevealSecretKey'))   changes.add('Tambah tombol reveal/hide secret key');
            if (diff.includes('••••'))                 changes.add('Sembunyikan nilai secret key secara default');
            if (diff.includes('sessionValidThru'))     changes.add('Ubah tampilan waktu berlaku session');
            if (diff.includes('scheduleSessionRefresh') || diff.includes('doRefreshWithRetry')) changes.add('Ubah logika auto-refresh session');
            if (diff.includes('handleSessionExpired')) changes.add('Ubah penanganan session expired');
            if (diff.includes('ipcRenderer.on'))       changes.add('Tambah/ubah listener event dari main process');
        }
        if (f.includes('/pages/login')) {
            if (diff.includes('hashPassword'))         changes.add('Hash password sebelum disimpan ke localStorage');
            if (diff.includes('loggedInUser') || (diff.includes('emailElm') && diff.includes('home('))) changes.add('Kirim data user ke halaman home');
            if (diff.includes('expiredMessage'))       changes.add('Tampilkan pesan session expired');
            if (diff.includes('save-credentials'))     changes.add('Simpan kredensial via IPC ke main process');
        }
        if (f.includes('/services/session')) {
            if (diff.includes('passwordHash'))         changes.add('Tambah penyimpanan hash password');
            if (diff.includes('hashPassword'))         changes.add('Tambah fungsi hash password (SHA-256)');
            if (diff.includes('getPasswordHash'))      changes.add('Tambah getter hash password');
            if (diff.includes('clearSession') && diff.includes('removeItem')) changes.add('Bersihkan semua data session saat logout');
        }
        if (f.includes('/components/updater')) {
            if (diff.includes('checkForUpdates') || diff.includes('autoUpdater')) changes.add('Ubah logika auto-update aplikasi');
            if (diff.includes('download'))  changes.add('Ubah proses download update');
            if (diff.includes('install'))   changes.add('Ubah proses instalasi update');
        }
        // app.js / index.js (electron main)
        if (f.includes('app.js') || f.includes('index.js')) {
            if (diff.includes('ipcMain.on') || diff.includes('ipcMain.handle')) changes.add('Tambah/ubah handler IPC di main process');
            if (diff.includes('BrowserWindow'))  changes.add('Ubah konfigurasi BrowserWindow');
            if (diff.includes('waClient'))       changes.add('Ubah inisialisasi/penanganan WhatsApp client');
            if (diff.includes('login-succeed'))  changes.add('Ubah alur setelah login berhasil');
            if (diff.includes('save-credentials')) changes.add('Ubah penyimpanan kredensial');
        }
        // styles
        if (f.endsWith('.css') || f.endsWith('.scss')) {
            if (diff.includes('color') || diff.includes('background')) changes.add('Ubah warna/background');
            if (diff.includes('font'))    changes.add('Ubah tipografi/font');
            if (diff.includes('display') || diff.includes('flex') || diff.includes('grid')) changes.add('Ubah layout');
            if (diff.includes('margin') || diff.includes('padding')) changes.add('Ubah spacing');
            if (diff.includes('@media'))  changes.add('Ubah responsive breakpoint');
        }
        // config files
        if (f.includes('package.json')) {
            if (diff.includes('"scripts"') || diff.match(/"\w+":\s*"node /)) changes.add('Tambah/ubah npm script');
            if (diff.includes('"dependencies"') || diff.includes('"devDependencies"')) changes.add('Tambah/ubah dependency');
            if (diff.includes('"version"')) changes.add('Update versi aplikasi');
            if (diff.includes('"build"'))   changes.add('Ubah konfigurasi build electron-builder');
        }
        if (f.includes('wacsa.ini')) {
            if (diff.includes('AuthKeyValue')) changes.add('Update AuthKeyValue token');
            if (diff.includes('Endpoint'))     changes.add('Ubah endpoint API');
            if (diff.includes('AutoRefresh'))  changes.add('Ubah konfigurasi auto-refresh session');
        }
        if (f.includes('credentials.json')) {
            if (diff.includes('localUser'))  changes.add('Tambah/ubah field localUser');
            if (diff.includes('"token"'))    changes.add('Update token kredensial');
            if (diff.includes('"id"'))       changes.add('Update ID kredensial');
        }
        if (f.includes('.cjs') || f.includes('generate-changelog') || f.includes('git-push')) {
            if (diff.includes('categorizeFile'))     changes.add('Perbaiki kategorisasi per-file');
            if (diff.includes('extractFunction'))    changes.add('Perbaiki ekstraksi deskripsi fungsi');
            if (diff.includes('extractChanges'))     changes.add('Perbaiki deskripsi perubahan');
            if (diff.includes('git push'))           changes.add('Tambah auto git push');
            if (diff.includes('buildCommitMessage')) changes.add('Perbaiki format commit message');
        }

        // ── Pola generik (berlaku untuk semua project) ───────────────────────
        lines.forEach((line) => {
            const isAdd = line.startsWith('+') && !line.startsWith('+++');
            const isDel = line.startsWith('-') && !line.startsWith('---');
            if (!isAdd && !isDel) return;

            const c = line.substring(1).trim();

            if (isAdd) {
                // Fungsi & class baru
                if (c.match(/^(export\s+)?(async\s+)?function\s+\w+/))        changes.add(`Tambah fungsi: ${(c.match(/function\s+(\w+)/) || [])[1] || ''}`);
                if (c.match(/^(export\s+)?class\s+\w+/))                       changes.add(`Tambah class: ${(c.match(/class\s+(\w+)/) || [])[1] || ''}`);
                if (c.match(/^(export\s+)?(const|let)\s+\w+\s*=\s*(async\s*)?\(/)) changes.add(`Tambah fungsi: ${(c.match(/(const|let)\s+(\w+)/) || [])[2] || ''}`);

                // Import / require
                if (c.match(/^import\s+.+\s+from\s+['"]/) || c.match(/require\s*\(/)) {
                    const mod = (c.match(/from\s+['"](.+?)['"]/) || c.match(/require\s*\(\s*['"](.+?)['"]/) || [])[1];
                    if (mod) changes.add(`Import modul: ${path.basename(mod)}`);
                }

                // Event listener
                if (c.includes('addEventListener'))  changes.add(`Tambah event listener: ${(c.match(/addEventListener\s*\(\s*['"](\w+)['"]/) || [])[1] || 'event'}`);
                if (c.includes('.on('))              changes.add(`Tambah listener: ${(c.match(/\.on\s*\(\s*['"](.+?)['"]/) || [])[1] || 'event'}`);

                // Storage
                if (c.includes('localStorage.setItem'))    changes.add(`Simpan ke localStorage: ${(c.match(/setItem\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);
                if (c.includes('localStorage.removeItem')) changes.add(`Hapus dari localStorage: ${(c.match(/removeItem\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);
                if (c.includes('sessionStorage'))          changes.add('Tambah/ubah sessionStorage');

                // HTTP
                if (c.match(/fetch\s*\(/))   changes.add(`HTTP request: ${(c.match(/fetch\s*\(\s*['"](.+?)['"]/) || [])[1] || 'endpoint'}`);
                if (c.includes('axios.get'))  changes.add('HTTP GET via axios');
                if (c.includes('axios.post')) changes.add('HTTP POST via axios');

                // DOM
                if (c.includes('querySelector') || c.includes('getElementById')) {
                    const sel = (c.match(/querySelector\s*\(\s*['"](.+?)['"]/) || c.match(/getElementById\s*\(\s*['"](.+?)['"]/) || [])[1];
                    if (sel) changes.add(`Manipulasi DOM: ${sel}`);
                }
                if (c.includes('innerHTML') || c.includes('textContent')) changes.add('Update konten elemen DOM');
                if (c.includes('classList.add') || c.includes('classList.remove') || c.includes('classList.toggle')) changes.add('Ubah CSS class elemen');
                if (c.includes('style.display')) changes.add('Ubah visibilitas elemen');

                // IPC Electron
                if (c.includes('ipcRenderer.send'))    changes.add(`IPC send: ${(c.match(/ipcRenderer\.send\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);
                if (c.includes('ipcRenderer.invoke'))  changes.add(`IPC invoke: ${(c.match(/ipcRenderer\.invoke\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);
                if (c.includes('ipcMain.on'))          changes.add(`IPC handler: ${(c.match(/ipcMain\.on\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);
                if (c.includes('ipcMain.handle'))      changes.add(`IPC handle: ${(c.match(/ipcMain\.handle\s*\(\s*['"](.+?)['"]/) || [])[1] || ''}`);

                // Crypto / security
                if (c.includes('crypto.subtle') || c.includes('SHA-256')) changes.add('Tambah operasi kriptografi');
                if (c.includes('bcrypt') || c.includes('hash'))           changes.add('Tambah hashing password');

                // Error handling
                if (c.match(/^try\s*\{/) || c.match(/catch\s*\(/))  changes.add('Tambah error handling');
                if (c.includes('throw new'))                          changes.add('Tambah throw error');

                // Async/await
                if (c.includes('await ') && c.includes('async'))     changes.add('Tambah operasi async/await');

                // Return / export
                if (c.match(/^return\s+\{/) || c.match(/^module\.exports/)) changes.add('Ubah nilai return/export');

                // setTimeout / setInterval
                if (c.includes('setTimeout'))  changes.add('Tambah timer/delay');
                if (c.includes('setInterval')) changes.add('Tambah interval/polling');
                if (c.includes('clearTimeout') || c.includes('clearInterval')) changes.add('Bersihkan timer');
            }

            if (isDel) {
                if (c.includes('console.log') || c.includes('console.warn') || c.includes('console.error')) {
                    changes.add('Hapus debug log');
                }
            }
        });

        // Bersihkan label kosong (misal "Tambah fungsi: ")
        const result = [...changes]
            .map(s => s.replace(/:\s*$/, '').trim())
            .filter(s => s.length > 3);

        return result.length > 0 ? result.join('; ') : 'Pembaruan kode';
    }

    formatTimestamp(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    formatCodeDiff(diff) {
        if (!diff || diff.length < 10) return '// No significant code changes';
        
        const lines = diff.split('\n');
        const formattedLines = [];
        let lineCounter = 0;
        let inDiffBlock = false;
        let hasChanges = false;
        let blockStartLine = 0;
        
        lines.forEach((line) => {
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -\d+(?:,\d+)?\s+\+(\d+)/);
                if (match) {
                    blockStartLine = parseInt(match[1]);
                    lineCounter = blockStartLine;
                    inDiffBlock = true;
                    formattedLines.push(`// Line ${lineCounter}:`);
                }
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                if (inDiffBlock && !isNaN(lineCounter) && lineCounter > 0) {
                    formattedLines.push(`+ ${line.substring(1)}`);
                    lineCounter++;
                    hasChanges = true;
                }
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                if (inDiffBlock) {
                    // For removed lines, use the current line counter (which represents where this line was)
                    if (!isNaN(lineCounter) && lineCounter > 0) {
                        formattedLines.push(`- ${line.substring(1)}`);
                    } else {
                        // Fallback: use block start line
                        formattedLines.push(`- ${line.substring(1)}`);
                    }
                    hasChanges = true;
                }
            } else if (line.startsWith(' ')) {
                // Context line - increment counter if valid
                if (inDiffBlock && !isNaN(lineCounter) && lineCounter > 0) {
                    lineCounter++;
                }
            }
            // Skip metadata lines
        });
        
        // If no changes found, return minimal message
        if (!hasChanges) {
            return '// No significant changes detected';
        }
        
        // For very small diffs, show all
        if (formattedLines.length <= 10) {
            return formattedLines.join('\n');
        }
        
        // Limit output to prevent huge diffs
        if (formattedLines.length > 50) {
            formattedLines.splice(25, formattedLines.length - 50, '  // ... (truncated for brevity)');
        }
        
        return formattedLines.join('\n');
    }

    generateChangelog() {
        const commits = this.getCommitsSinceLastRun();
        
        if (commits.length === 0) {
            console.log('No commits found for today');
            return;
        }
        
        const categories = this.initializeCategories();
        const processedFiles = new Set();
        
        commits.forEach(commit => {
            const timestamp = this.formatTimestamp(commit.date);
            
            commit.files.forEach(filePath => {
                // Skip if already processed this file with same commit hash
                const fileKey = `${filePath}-${commit.hash}`;
                if (processedFiles.has(fileKey)) return;
                processedFiles.add(fileKey);
                
                const diff = this.getFileDiff(filePath, commit.hash);
                const lineNumbers = this.extractLineNumbers(diff);
                // Kategorisasi per-file, bukan per-commit
                const category = this.categorizeFile(filePath, diff, commit.message);
                const fungsi = this.extractFunction(filePath, commit.message, diff);
                const perubahan = this.extractChanges(filePath, diff);
                const formattedDiff = this.formatCodeDiff(diff);
                
                // Add timestamp comment to the actual file
                this.addTimestampToFile(filePath);
                
                const entry = {
                    file: filePath,
                    timestamp: timestamp,
                    fungsi: fungsi,
                    perubahan: perubahan,
                    lines: lineNumbers,
                    diff: formattedDiff,
                    commit: commit
                };
                
                categories[category].push(entry);
            });
        });
        
        return this.formatMarkdown(categories);
    }

    formatMarkdown(categories) {
        const today = new Date(this.targetDate + 'T12:00:00');
        const dateStr = today.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        let markdown = `# Code Changes Summary\n\n## ${dateStr}\n\n`;
        
        let totalFiles = 0;
        const categoryCounts = {};
        
        Object.entries(categories).forEach(([category, entries]) => {
            if (entries.length === 0) return;
            
            totalFiles += entries.length;
            categoryCounts[category] = entries.length;
            
            markdown += `### ${category}\n\n`;
            
            entries.forEach((entry, index) => {
                markdown += `#### ${index + 1}. ${entry.file} [${entry.timestamp}]\n`;
                markdown += `**Fungsi:** ${entry.fungsi}  \n`;
                markdown += `**Perubahan:** ${entry.perubahan}  \n`;
                if (entry.lines !== 'N/A') {
                    markdown += `**Lines:** ${entry.lines}\n`;
                }
                
                if (entry.diff && entry.diff !== '// No significant code changes') {
                    markdown += '\n```javascript\n';
                    markdown += entry.diff;
                    markdown += '\n```\n';
                }
                
                markdown += '\n---\n\n';
            });
        });
        
        // Add summary
        markdown += '## 📊 **Summary**\n';
        Object.entries(categoryCounts).forEach(([category, count]) => {
            markdown += `- **${category}:** ${count} item${count > 1 ? 's' : ''}\n`;
        });
        markdown += `- **Total Files Modified:** ${totalFiles}\n`;
        
        // Determine main focus
        const mainCategory = Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)[0];
        if (mainCategory) {
            markdown += `- **Main Focus:** ${mainCategory[0].replace(/[\u2700-\u27BF]\s/, '')}\n`;
        }
        
        return markdown;
    }

    addTimestampToFile(filePath) {
        try {
            const fullPath = path.join(process.cwd(), filePath);
            
            // Only process certain file types
            const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'];
            if (!allowedExtensions.some(ext => filePath.endsWith(ext))) {
                return;
            }
            
            // Check if file exists before trying to read it
            if (!fs.existsSync(fullPath)) {
                return; // Silently skip if file doesn't exist
            }
            
            // Generate current timestamp instead of using parameter
            const now = new Date();
            const currentTimestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            
            // Read file content
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Find the line that was changed (based on the most recent diff)
            const lines = content.split('\n');
            
            // Look for specific patterns - prioritize USE_BRWDEF
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // First priority: USE_BRWDEF line (more flexible pattern)
                if (line.includes('USE_BRWDEF') && line.includes(':')) {
                    // Remove existing timestamp comment if present
                    const cleanedLine = lines[i].replace(/\/\/ \[\d{8}_\d{6}\]$/, '').trim();
                    
                    // Add new timestamp comment with CURRENT timestamp
                    lines[i] = `${cleanedLine} // [${currentTimestamp}]`;
                    break;
                }
            }
            
            // Write back to file
            fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
            
        } catch (error) {
            // Silently fail if file doesn't exist or can't be modified
            // console.warn(`Could not add timestamp to ${filePath}: ${error.message}`);
        }
    }

    saveChangelog(content) {
        if (!fs.existsSync(this.docsDir)) {
            fs.mkdirSync(this.docsDir, { recursive: true });
        }
        
        const [year, month, day] = this.targetDate.split('-');
        
        const filename = `codeChange-${year}${month}${day}.md`;
        const filepath = path.join(this.docsDir, filename);
        
        // Always overwrite the file with fresh content
        fs.writeFileSync(filepath, content);
        
        console.log(`Changelog saved to: ${filepath}`);
        return filepath;
    }

    extractTodayEntries(content) {
        // Extract content between today's date header and next date or summary
        const today = new Date().toLocaleDateString('id-ID', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // More flexible pattern to match today's section
        const todayPattern = new RegExp(`## ${today}[\\s\\S]*?(?=## \\d+|## 📊|$)`, 'i');
        const match = content.match(todayPattern);
        
        if (match) {
            // Extract the content after the date header
            const afterDate = match[0].replace(`## ${today}`, '').trim();
            return afterDate;
        }
        
        return null;
    }

    appendToExistingContent(existingContent, newEntries) {
        // Find today's section or create new one
        const today = new Date().toLocaleDateString('id-ID', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const todayPattern = new RegExp(`(## ${today}[\\s\\S]*?)(?=## \\d+|## 📊|$)`, 'i');
        const existingMatch = existingContent.match(todayPattern);
        
        if (existingMatch) {
            // Extract existing entries (after date header, before next section)
            const existingTodaySection = existingMatch[1];
            const beforeToday = existingContent.split(`## ${today}`)[0];
            const afterToday = existingContent.split(existingTodaySection)[1];
            
            // Remove the date header from new entries to avoid duplication
            const cleanNewEntries = newEntries.replace(/^## \d+ \w+ \d+\n\n/, '').trim();
            
            // NEW: Put new entries on top, existing entries below
            const combinedEntries = cleanNewEntries + '\n\n' + existingTodaySection.replace(`## ${today}`, '').trim();
            
            return beforeToday + `## ${today}\n\n` + combinedEntries + afterToday;
        } else {
            // Add new today's section before summary
            const summaryIndex = existingContent.indexOf('## 📊');
            if (summaryIndex !== -1) {
                return existingContent.slice(0, summaryIndex) + 
                       `## ${today}\n\n${newEntries}\n\n` + 
                       existingContent.slice(summaryIndex);
            } else {
                return existingContent + `\n\n## ${today}\n\n${newEntries}`;
            }
        }
    }

    run() {
        try {
            console.log('Generating changelog...');
            const changelog = this.generateChangelog();
            
            if (changelog) {
                const filepath = this.saveChangelog(changelog);
                console.log('✅ Changelog generated successfully!');
                console.log(`📁 File: ${filepath}`);
            } else {
                console.log('ℹ️ No changes to document today');
            }
        } catch (error) {
            console.error('❌ Error generating changelog:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new DynamicChangelogGenerator();
    generator.run();
}

module.exports = DynamicChangelogGenerator;
