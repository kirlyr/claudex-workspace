# Git history security review — 23 Oktober 2026

**PUSH BLOCKED: metadata lokal/pribadi masih berada dalam history.**
Commit yang diperiksa: `c040c5bc22aeda78bdf7f60e4a829c5364095df4`, sudah berada di origin/main.
Tidak ada rewrite, force push, penghapusan file lokal, perubahan konfigurasi global Codex,
atau instalasi skills dalam tugas pembersihan Git ini.

## Cakupan dan hasil

- 182 file / 136 Git blobs unik / 967.700 byte diproses dari objek commit, bukan working tree.
- Tidak ada file yang dilewati atau binary yang tidak ditinjau.
- Scanner pola lokal tidak menemukan kandidat credential dari detector yang tersedia.
  Ini tidak membuktikan tidak ada secret dengan format lain.
- Gitleaks, TruffleHog dan detect-secrets tidak ditemukan; tidak ada dependency baru diinstal.
- 25 file mengandung metadata identitas/path lokal atau konfigurasi trust project. Ini
  termasuk informasi layout project yang tidak diperlukan untuk repository portable.
- Seluruh 75 source upstream yang dicatat cocok dengan Git blob SHA provenance. Salinan
  third-party dan attribution publik dibedakan dari konfigurasi personal. Kecocokan source
  bukan jaminan bahwa semua kemungkinan informasi sensitif semantik terdeteksi.
- Fixture alpha/beta adalah data sintetis yang dibuat untuk test, bukan bukti memory perusahaan.
  Tidak ditemukan file database/transcript/auth yang sebenarnya pada tree commit tersebut.

Scanner melaporkan kategori, path file, dan nomor baris saja; tidak mengeluarkan nilai
credential, nama project internal atau path profil yang cocok. Detail lengkap berada pada
`.local/history-security-report.json` dan tidak boleh di-commit.

## File yang terdampak

Seluruh path berikut berada di bawah `codex-global-setup/`:

```text
ACTIVATION-AND-ROLLBACK.md
INSTALLATION-RESULT.md
REPORT.md
activation-manifest.json
backups/install-20261023-073747/config.toml
backups/install-20261023-073747/manifest.json
evidence/active-baseline.json
evidence/discovery-baseline.json
evidence/discovery-legacy.json
evidence/discovery-repo.json
evidence/discovery-user.json
evidence/discovery.json
evidence/installation-attempt.json
evidence/invocation.json
evidence/latest-backup-path.txt
evidence/package-before-preparation.txt
evidence/package-pilot-and-ponytail.txt
pilot/settings.template.json
scripts/baseline.cjs
scripts/discovery.cjs
scripts/invocation.cjs
scripts/prepare.cjs
scripts/verify-install-attempt.cjs
tests/pilot.test.cjs
tests/ponytail.test.cjs
```

## Tracking dan source yang dipertahankan

Seluruh 182 entry legacy dikeluarkan dari index menggunakan `git rm --cached`.
Hash 182 file lokal dibandingkan sebelum/sesudah untuk memastikan tidak ada penghapusan
atau perubahan fisik. Source upstream lokal tetap tersedia untuk `--source-root` dan test
lama; installer portable juga dapat mengambil source terpin tanpa folder legacy.

Source of truth yang dipertahankan adalah README.md, .gitignore, global, skills, hooks,
scripts, docs dan tests. Seluruh tambahan publik diperiksa memakai allowlist path dan
scan konten terhadap Git index. History scan dan index scan adalah gate yang berbeda.
Menghapus tracking atau membuat commit penghapusan tidak menghapus data dari commit lama.

## Rencana remediasi — belum dieksekusi

1. Tinjau siapa yang dapat mengakses repository/clone commit awal. Visibility remote belum
   diverifikasi pada tugas ini; jangan menganggap file sensitif hilang setelah untracking.
2. Review daftar temuan lokal, termasuk kategori metadata. Jangan mengunggah laporan mentah
   atau backup sebagai bagian penanganan insiden.
3. Jika metadata harus dihapus dari remote history, perlukan persetujuan eksplisit untuk
   rewrite terarah atas path legacy dan pembaruan branch remote yang melindungi perubahan
   kolaborator. Simpan recovery copy Git secara lokal di luar repository publik terlebih dahulu.
4. Persetujuan tersebut belum diberikan. Tidak ada command rewrite/force push dalam tugas ini.
   Alternatif menerima metadata historis memerlukan keputusan eksplisit pengguna, bukan
   menganggap hasil scan credential yang kosong sebagai kelulusan privacy.
5. Sesudah remediasi disetujui dan dilakukan, scan ulang seluruh history yang akan dipush,
   bukan hanya tree terbaru; periksa juga clone/cached view bila perlu.
6. Baru setelah history dan index lulus, buat commit conventional dan push normal main.
   Jika kemudian ditemukan credential nyata, revoke/rotate credential tersebut secara terarah;
   tidak ada credential yang diubah sekarang karena tidak ada credential nyata terkonfirmasi.

## Pemeriksaan ulang dari CMD

Jalankan dari root repository:

```bat
node scripts/audit-history.cjs c040c5b
node scripts/check-public.cjs index
git diff --cached --check
git diff --cached --stat
```

History scanner saat ini sengaja exit nonzero karena temuan privacy. Jangan menambahkan
perintah commit/push setelah command di atas sebelum blocker history diselesaikan.
