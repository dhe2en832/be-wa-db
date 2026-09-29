#!/usr/bin/env node
/**
 * upgrade-wwebjs.js
 *
 * Script untuk upgrade whatsapp-web.js ke versi terbaru secara otomatis.
 * Mendeteksi versi saat ini, upgrade, re-apply patch kustom, dan generate patch file baru.
 *
 * Usage:
 *   node scripts/upgrade-wwebjs.js           → upgrade ke versi terbaru di npm
 *   node scripts/upgrade-wwebjs.js 1.34.8    → upgrade ke versi tertentu
 *   node scripts/upgrade-wwebjs.js --patch-only → hanya re-apply patch tanpa upgrade
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const PATCHES_DIR = path.join(ROOT, 'patches');
const WWEBJS_PKG  = path.join(ROOT, 'node_modules', 'whatsapp-web.js', 'package.json');
const UTILS_JS    = path.join(ROOT, 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

const log  = (m) => console.log(`\x1b[36m[upgrade]\x1b[0m ${m}`);
const ok   = (m) => console.log(`\x1b[32m[  ok   ]\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m[ warn  ]\x1b[0m ${m}`);
const err  = (m) => console.log(`\x1b[31m[ error ]\x1b[0m ${m}`);

function run(cmd) {
  log(`$ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`Command failed (exit ${r.status}): ${cmd}`);
}

function getInstalledVersion() {
  if (!fs.existsSync(WWEBJS_PKG)) return null;
  return JSON.parse(fs.readFileSync(WWEBJS_PKG, 'utf8')).version;
}

function getLatestVersion() {
  return execSync('npm view whatsapp-web.js version', { encoding: 'utf8' }).trim();
}

// ─── Apply custom patches ────────────────────────────────────────────────────

function applyCustomPatches() {
  if (!fs.existsSync(UTILS_JS)) {
    warn('Utils.js tidak ditemukan, skip patches');
    return { patch1: false, patch2: false };
  }

  let utils = fs.readFileSync(UTILS_JS, 'utf8');
  let changed = false;
  const result = { patch1: false, patch2: false };

  // ── Patch 1: delete __x_id ───────────────────────────────────────────────
  if (utils.includes('delete message.__x_id')) {
    ok('Patch 1 sudah ada: delete message.__x_id');
    result.patch1 = true;
  } else {
    // Cari anchor: "Bot's won't reply..." yang ada di semua versi
    const anchor = `// Bot's won't reply if canonicalUrl is set (linking)`;
    if (utils.includes(anchor)) {
      utils = utils.replace(
        anchor,
        `// MediaData is a model whose private ID field (__x_id) collides with\n        // Msg's internal ID field when its enumerable properties are spread above.\n        // Removing it prevents the memoize error: "Data passed to getter must include an id property"\n        delete message.__x_id;\n\n        ${anchor}`
      );
      if (utils.includes('delete message.__x_id')) {
        ok('Patch 1 applied: delete message.__x_id');
        changed = true;
        result.patch1 = true;
      } else {
        warn('Patch 1 gagal: context berubah di versi ini, perlu update manual');
      }
    } else {
      warn('Patch 1 gagal: anchor tidak ditemukan');
    }
  }

  // ── Patch 2: @lid fallback ───────────────────────────────────────────────
  if (utils.includes('msgFromPromise')) {
    ok('Patch 2 sudah ada: @lid fallback');
    result.patch2 = true;
  } else {
    // Dua pola yang mungkin ada tergantung versi
    const patterns = [
      // v1.34.7+: pakai require('WAWebCollections')
      {
        old: `        return window\n            .require('WAWebCollections')\n            .Msg.get(newMsgKey._serialized);\n    };`,
        get: `window.require('WAWebCollections').Msg.get(newMsgKey._serialized)`,
      },
      // v1.34.6: pakai window.Store.Msg
      {
        old: `        return window.Store.Msg.get(newMsgKey._serialized);\n    };`,
        get: `window.Store.Msg.get(newMsgKey._serialized)`,
      },
    ];

    let patched = false;
    for (const { old: oldStr, get: getExpr } of patterns) {
      if (utils.includes(oldStr)) {
        utils = utils.replace(
          oldStr,
          `        // newMsgKey._serialized menggunakan format @c.us, tapi WhatsApp menyimpan\n        // pesan dengan format @lid untuk Linked Devices. Coba @c.us dulu, fallback ke msgPromise.\n        const msgByKey = ${getExpr};\n        if (msgByKey) return msgByKey;\n        const msgFromPromise = await msgPromise;\n        return msgFromPromise || null;\n    };`
        );
        if (utils.includes('msgFromPromise')) {
          ok('Patch 2 applied: @lid fallback');
          changed = true;
          result.patch2 = true;
          patched = true;
          break;
        }
      }
    }
    if (!patched) {
      warn('Patch 2 gagal: pola return Msg.get tidak ditemukan, perlu update manual');
    }
  }

  if (changed) {
    fs.writeFileSync(UTILS_JS, utils, 'utf8');
    log('Utils.js ditulis ulang dengan patch');
  }

  return result;
}

// ─── Generate patch file secara manual (tanpa patch-package) ─────────────────

function generatePatchFile(version) {
  if (!fs.existsSync(PATCHES_DIR)) fs.mkdirSync(PATCHES_DIR);

  const patchFile = path.join(PATCHES_DIR, `whatsapp-web.js+${version}.patch`);

  // Buat konten patch dalam format yang bisa dibaca manusia
  // (bukan unified diff karena tidak ada git di node_modules)
  const content = `# whatsapp-web.js v${version} — CSA Computer custom patches
# Generated: ${new Date().toISOString()}
#
# Patches applied to: node_modules/whatsapp-web.js/src/util/Injected/Utils.js
#
# Patch 1: delete message.__x_id
#   Fix: MediaData.__x_id collides with Msg internal ID field,
#   causing "Data passed to getter must include an id property" error on send media.
#   Location: after message object construction, before isChannel check.
#
# Patch 2: @lid fallback
#   Fix: WhatsApp stores messages with @lid format (Linked Devices), but
#   newMsgKey._serialized uses @c.us format, causing Msg.get() to return undefined.
#   Location: sendMessage return value, fallback to msgPromise.
#
# To re-apply these patches after yarn install:
#   node scripts/upgrade-wwebjs.js --patch-only
`;

  fs.writeFileSync(patchFile, content, 'utf8');
  ok(`Patch file ditulis: patches/whatsapp-web.js+${version}.patch`);
  return patchFile;
}

// ─── Remove old patch files ───────────────────────────────────────────────────

function removeOldPatches(currentVersion) {
  if (!fs.existsSync(PATCHES_DIR)) return;
  const files = fs.readdirSync(PATCHES_DIR);
  for (const f of files) {
    if (f.startsWith('whatsapp-web.js+') && !f.includes(currentVersion)) {
      fs.unlinkSync(path.join(PATCHES_DIR, f));
      ok(`Patch lama dihapus: ${f}`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const patchOnly = args.includes('--patch-only');
  const targetVersion = args.find(a => !a.startsWith('--')) || null;

  const currentVersion = getInstalledVersion();
  log(`Versi terinstall : ${currentVersion || 'tidak ditemukan'}`);

  if (patchOnly) {
    log('Mode: patch-only — skip upgrade');
    applyCustomPatches();
    if (currentVersion) generatePatchFile(currentVersion);
    return;
  }

  let latestVersion;
  try {
    latestVersion = targetVersion || getLatestVersion();
  } catch (e) {
    err('Gagal cek versi npm: ' + e.message);
    log('Melanjutkan dengan apply patch saja...');
    applyCustomPatches();
    return;
  }

  log(`Target versi     : ${latestVersion}`);

  if (currentVersion === latestVersion) {
    ok(`Sudah di versi terbaru (${latestVersion})`);
    log('Memeriksa status patch...');
    const { patch1, patch2 } = applyCustomPatches();
    if (patch1 && patch2) {
      ok('Semua patch sudah ter-apply, tidak ada yang perlu dilakukan');
    } else {
      generatePatchFile(latestVersion);
    }
    return;
  }

  // ── Upgrade ──────────────────────────────────────────────────────────────
  log(`Upgrading ${currentVersion} → ${latestVersion}...`);

  try {
    run(`yarn add whatsapp-web.js@${latestVersion} --no-progress`);
  } catch (e) {
    err('yarn add gagal: ' + e.message);
    process.exit(1);
  }

  const newVersion = getInstalledVersion();
  if (newVersion !== latestVersion) {
    err(`Upgrade gagal. Versi terinstall: ${newVersion}, expected: ${latestVersion}`);
    process.exit(1);
  }
  ok(`Library berhasil di-upgrade: ${currentVersion} → ${newVersion}`);

  // ── Apply patches ─────────────────────────────────────────────────────────
  log('Applying custom patches...');
  const patchResult = applyCustomPatches();

  // ── Generate patch file ───────────────────────────────────────────────────
  generatePatchFile(newVersion);

  // ── Remove old patches ────────────────────────────────────────────────────
  removeOldPatches(newVersion);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  ok('='.repeat(50));
  ok(`Upgrade selesai: ${currentVersion} → ${newVersion}`);
  ok(`Patch 1 (__x_id)       : ${patchResult.patch1 ? '✓' : '✗ GAGAL — cek manual'}`);
  ok(`Patch 2 (@lid fallback): ${patchResult.patch2 ? '✓' : '✗ GAGAL — cek manual'}`);
  ok('='.repeat(50));
  log('Jalankan: yarn prod:complete (atau prod lainnya) untuk rebuild.');
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
