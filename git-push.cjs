#!/usr/bin/env node

/* eslint-env node */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return e.stdout || '';
  }
}

/**
 * Baca changelog hari ini dan ekstrak summary untuk commit message.
 */
function buildCommitMessage() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const changelogPath = path.join(process.cwd(), `custom/docs/changelog/daily/codeChange-${y}${m}${d}.md`);

  let bodyLines = [];

  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf8');

    // Ambil semua entry per kategori: ### Kategori → file + deskripsi perubahan
    const categoryBlocks = [...content.matchAll(/^### (.+?)\n([\s\S]*?)(?=^### |\n## 📊|$)/gm)];

    categoryBlocks.forEach(([, catName, block]) => {
      // Ambil tiap entry: #### N. file [...] + baris Perubahan
      const entries = [...block.matchAll(/^#### \d+\. (.+?) \[[\d_]+\]\n\*\*Fungsi:\*\* (.+?)\s*\n\*\*Perubahan:\*\* (.+?)\s*\n/gm)];
      if (entries.length === 0) return;

      bodyLines.push(`${catName.trim()}`);
      entries.forEach(([, file, fungsi, perubahan]) => {
        bodyLines.push(`  • ${path.basename(file)} — ${perubahan}`);
      });
      bodyLines.push('');
    });

    // Fallback ke summary jika tidak ada entry detail
    if (bodyLines.length === 0) {
      const summaryMatch = content.match(/## 📊 \*\*Summary\*\*([\s\S]*?)$/);
      if (summaryMatch) {
        bodyLines = summaryMatch[1].trim().split('\n')
          .filter(l => l.startsWith('-'))
          .map(l => l.replace(/^- /, '').trim());
      }
    }
  }

  // Fallback: daftar file yang di-stage
  if (bodyLines.length === 0) {
    const staged = runSilent('git diff --cached --name-only').trim();
    if (staged) bodyLines = staged.split('\n').map(f => `  • ${f}`);
  }

  const dateLabel = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const subject = `chore: update ${dateLabel}`;
  const body = bodyLines.join('\n').trim();

  return body ? `${subject}\n\n${body}` : subject;
}

function main() {
  console.log('🔄 Generating changelog...');
  try {
    run('node generate-changelog.cjs');
  } catch (e) {
    console.warn('⚠️  Changelog generation failed, continuing...');
  }

  // Cek apakah ada perubahan
  const status = runSilent('git status --porcelain').trim();
  if (!status) {
    console.log('✅ Nothing to commit, working tree clean.');
    process.exit(0);
  }

  console.log('\n📦 Staging all changes...');
  run('git add -A');

  const message = buildCommitMessage();
  console.log('\n📝 Commit message:\n');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));

  // Tulis message ke temp file agar aman dari karakter spesial
  const tmpFile = path.join(process.cwd(), '.git', '_commit_msg_tmp');
  fs.writeFileSync(tmpFile, message, 'utf8');

  console.log('\n✍️  Committing...');
  run(`git commit -F "${tmpFile}"`);
  fs.unlinkSync(tmpFile);

  console.log('\n🚀 Pushing...');
  run('git push');

  console.log('\n✅ Done!');
}

main();
