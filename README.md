# Codex workspace

Source of truth untuk instruksi global dan manifest engineering skills yang aman dibagikan.
Target yang diuji: Codex CLI 0.163.0, Windows native, Node 20.20.2, PowerShell 5.1.
Tidak ada dependency npm untuk installer ini.

```text
global/AGENTS.md          Instruksi global ringkas
skills/manifest.json      Source, commit, license, file dan SHA-256 skill terpilih
hooks/custom/            Sengaja tanpa registrasi hook baru
scripts/                 Install, verify, rollback dan pemeriksaan publikasi
docs/                    Arsitektur, changelog, status dan pilot memory
tests/                   Test sintetis installer dan pemeriksaan keamanan
```

Ponytail 5.3.2 dipertahankan sebagai plugin existing. Superpowers dipasang hanya untuk
systematic-debugging, test-driven-development, verification-before-completion;
wshobson/agents hanya database-migration. Tidak ada bootstrap hook Superpowers.
Isi skill diambil dari commit yang dipin beserta references/scripts dan LICENSE, lalu
diverifikasi hash-nya. Installer tidak mengeksekusi script upstream.

## Install dan verifikasi

Jalankan dari root repository pada sesi yang mempunyai izin tulis ke Codex home:

```powershell
node scripts/setup.cjs install
node scripts/setup.cjs verify
node scripts/runtime-check.cjs --home "$env:USERPROFILE\.codex"
```

`CODEX_HOME` dihormati; default memakai home pengguna. `--home PATH` dapat memilih home
sintetis atau lokasi yang sudah disetujui. `--source-root PATH` dapat memakai checkout
upstream lokal dengan susunan `<repo-basename>/<source-path>`; hash tetap diperiksa.
Tanpa source lokal, installer hanya mengambil file HTTPS dari raw.githubusercontent.com
pada commit manifest. Cache download berada di `.local/cache` dan tidak boleh di-commit.

Wrapper `scripts/install.ps1`, `verify.ps1`, dan `rollback.ps1` tersedia. Jika execution
policy melarang file PowerShell, jangan menurunkan policy; entrypoint Node di atas adalah
implementasi yang sama. Keduanya tetap membutuhkan izin filesystem normal.

`verify` hanya membuktikan hash file. `runtime-check` memakai app-server native dan mock
localhost untuk menguji discovery, instruction loading dan explicit invocation tanpa
inference eksternal. Itu bukan pengujian perilaku model atau memory. Test ini dapat
menjalankan hook existing yang dipercaya pada home yang dipilih; pakai home sintetis
untuk pengujian awal. Trust hook tidak pernah dilewati.

## Backup, update dan rollback

Installer menyimpan journal dan backup hanya file yang diubah di
`<CODEX_HOME>/.codex-workspace/backups`. Tidak menyalin auth.json, config.toml, secrets,
sessions atau database memory. Perubahan skill pengguna dan override global menghentikan
instalasi. Instalasi ulang dengan isi yang sama tidak mengubah file atau backup.

```powershell
node scripts/setup.cjs rollback
```

Rollback terbaru memeriksa hash terlebih dahulu dan menolak menimpa perubahan pengguna.
Journal tertentu dapat dipilih dengan `--journal PATH`; journal yang sudah digantikan
instalasi lebih baru ditolak. Tidak ada penghapusan rekursif. Untuk update, review commit
dan dependency upstream, perbarui manifest/hash secara sengaja, lalu ulangi seluruh test.

## Test dan publish

```powershell
node --test tests/setup.test.cjs tests/public.test.cjs
node scripts/check-public.cjs working
node scripts/check-public.cjs index
git diff --cached --check
```

Stage path publik secara spesifik; jangan memakai `git add .`.
Jangan commit backups, .local, artefak audit lama, runtime, plugin cache, transcript,
memory, database atau source repository aplikasi. Scanner adalah pemeriksaan tambahan,
bukan jaminan bahwa semua bentuk rahasia terdeteksi.

**Status saat ini:** folder audit legacy sudah dikeluarkan dari tracking sambil mempertahankan
file lokal. Source portable dan perubahan tracking disiapkan pada index. Push/commit baru
ditahan karena review menemukan metadata pribadi/lokal pada 25 file dalam commit awal;
untracking tidak membersihkan history. Lihat [review history](docs/HISTORY-REVIEW.md) dan
[status aktual](docs/STATUS.md) sebelum publikasi. Tidak ada instalasi global dalam tugas Git ini.

Claude-Mem belum aktif. Batas pilot dijelaskan dalam [dokumen pilot](docs/CLAUDE-MEM-PILOT.md).
