# Claudex workspace

Source of truth untuk instruksi global dan manifest skills terpilih yang aman dibagikan.
Target yang diuji untuk Codex: Codex CLI 0.163.0, Windows native, Node 20.20.2, PowerShell 5.1.
Instalasi Claude (`--agent claude`) hanya memasang `global/CLAUDE.md`; versi Claude Code belum dicatat.
Tidak ada dependency npm untuk installer ini.

Workflow spec, approval, dan handoff lintas agent tersedia di
[panduan workflow](docs/WORKFLOW.md). Template bersifat portable dan tidak mengubah
konfigurasi atau mengaktifkan otomatisasi agent.
Shared checkpoint per project: `.local/workflow/HANDOFF.md`; portable Claude instructions
tersedia di `global/CLAUDE.md`, dengan sinkronisasi opt-in dijelaskan dalam panduan tersebut.

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

Frontend Design resmi Anthropic juga dikelola manifest dari
[`anthropics/skills`, commit `ca45fc496a3436251f191354091d557da31c15b5`](https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5/skills/frontend-design).
Versi memakai `git:<commit>` karena skill tidak mendeklarasikan versi tersendiri.
Bundle hanya berisi `SKILL.md` asli dan lisensi Apache-2.0 asli: `LICENSE.txt` tetap
tersedia untuk rujukan skill, dengan salinan identik `LICENSE` sesuai kontrak installer.
Tidak ada dependency tambahan. Gunakan `$frontend-design` secara manual, misalnya
`Gunakan $frontend-design untuk merancang UI halaman kartu akses` di project mana pun.
Codex dapat memilihnya berdasarkan deskripsi untuk tugas UI/UX; tugas non-UI tidak perlu
memuatnya. Instalasi ini tidak mengubah hooks, Ponytail, approval, atau workflow existing.

## Install dan verifikasi

Jalankan dari root repository pada sesi yang mempunyai izin tulis ke Codex home:

```powershell
node scripts/setup.cjs install
node scripts/setup.cjs verify
node scripts/runtime-check.cjs --home "$env:USERPROFILE\.codex"
```

`CODEX_HOME` dihormati; default memakai home pengguna. `--home PATH` dapat memilih home
sintetis atau lokasi yang sudah disetujui; folder itu harus sudah ada (buat dulu, misalnya
`mkdir .local\trial-home`). `node --test` tanpa argumen dipakai karena Node 20 belum mendukung glob. `--source-root PATH` dapat memakai checkout
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
instalasi. `AGENTS.md`/`CLAUDE.md` global existing yang berbeda dan belum dikelola installer
juga menghentikan instalasi; review dulu, lalu ulangi dengan `--adopt` (backup tetap dibuat
dan dapat di-rollback). `--adopt` tidak melewati perubahan pengguna pada file yang sudah dikelola. Instalasi ulang dengan isi yang sama tidak mengubah file atau backup.

```powershell
node scripts/setup.cjs rollback
```

Rollback terbaru memeriksa hash terlebih dahulu dan menolak menimpa perubahan pengguna.
Journal tertentu dapat dipilih dengan `--journal PATH`; journal yang sudah digantikan
instalasi lebih baru ditolak. Tidak ada penghapusan rekursif. Untuk update, review commit
dan dependency upstream, perbarui manifest/hash secara sengaja, lalu ulangi seluruh test.

## Test dan publish

```powershell
node --test
node scripts/check-public.cjs working
node scripts/check-public.cjs index
node scripts/audit-history.cjs HEAD
git diff --cached --check
```

Stage path publik secara spesifik; jangan memakai `git add .`.
Jangan commit backups, .local, artefak audit lama, runtime, plugin cache, transcript,
memory, database atau source repository aplikasi. Scanner adalah pemeriksaan tambahan,
bukan jaminan bahwa semua bentuk rahasia terdeteksi.

**Status saat ini:** lihat [STATUS.md](docs/STATUS.md). Ada satu keputusan terbuka tentang metadata
pribadi di commit awal yang mungkin masih dapat diakses lewat SHA; baca sebelum menganggap repo ini aman dipublikasikan.

Claude-Mem belum aktif. Batas pilot dijelaskan dalam [dokumen pilot](docs/CLAUDE-MEM-PILOT.md).
