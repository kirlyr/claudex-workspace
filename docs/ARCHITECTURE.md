# Architecture

Repository ini menyimpan instruksi dan metadata instalasi, bukan salinan plugin cache.
`global/AGENTS.md` adalah satu-satunya sumber global instructions yang dipasang oleh
installer. Stack dan aturan bisnis spesifik tetap berada di AGENTS.md tiap project.

## Ownership

| Lokasi | Pemilik dan kebijakan |
|---|---|
| global/AGENTS.md | Source yang di-review melalui Git |
| skills/manifest.json | Empat engineering skills dan Frontend Design, commit immutable dan hash setiap file |
| CODEX_HOME/AGENTS.md | Salinan source dengan backup sebelum perubahan |
| CODEX_HOME/skills/nama | Bundle lengkap + LICENSE + provenance |
| CODEX_HOME/.codex-workspace | State/backup lokal; tidak pernah masuk Git |
| Ponytail/plugin cache | Dikelola plugin; installer tidak menyentuhnya |
| .local | Cache/test/evidence sementara yang diabaikan Git |

Node standard library dipakai sebagai engine agar tidak membutuhkan package install.
PowerShell hanya wrapper. Target symlink/junction dan path traversal ditolak. Upstream
harus berupa repository dan commit SHA valid; body download harus cocok dengan SHA-256.
Tidak ada installer atau script upstream yang dieksekusi saat memasang engineering skills.

Install merencanakan dan memverifikasi source sebelum mengubah home, lalu membuat backup
dan journal. Konflik file pengguna menghentikan operasi. Kegagalan setelah sebagian write
menyimpan journal untuk rollback eksplisit; tidak diklaim sebagai transaksi filesystem atomik.
Jangan jalankan dua installer bersamaan. Perubahan yang terjadi selama preflight diperiksa
lagi sebelum write. Rollback memvalidasi seluruh hash sebelum memulihkan file.

## Workflow dan hooks

Ponytail tetap menyediakan SessionStart, SubagentStart dan UserPromptSubmit. Engineering
skills memakai native discovery tanpa handler tambahan. Tidak ada custom hook atau file
hooks.json yang dipasang. Trust hash tidak disalin atau dibuat oleh installer ini.

TDD upstream lebih ketat daripada workflow Ponytail untuk pekerjaan kecil dan dapat meminta
full test suite. Source tidak dimodifikasi diam-diam. Pilih skill berdasarkan task; aturan
project dan instruksi pengguna tetap berlaku. Contoh migration/rollback upstream bukan
izin mengeksekusinya pada production atau shared database.

## Verification boundary

Hash file membuktikan INSTALLED_NEEDS_VERIFICATION. App-server baru dapat membuktikan
discovery dan explicit skill expansion. Mock localhost menguji mekanisme loading, bukan
kemampuan model atau correctness pada project nyata. Recovery persistent memory hanya boleh
berstatus PILOT_VERIFIED setelah capture, restart dan retrieval lintas sesi benar-benar diuji.

## Git boundary

Path publik dibatasi allowlist di check-public.cjs dan .gitignore. Pemeriksaan index membaca
blob staged, bukan hanya working tree; path private langsung ditolak tanpa membaca isinya.
Commit/push hanya boleh setelah index check dan review diff berhasil. Ignore rule tidak
menghapus file yang sudah tracked. Riwayat existing tidak di-rewrite tanpa instruksi terpisah.

Rujukan: [Codex skills](https://learn.chatgpt.com/docs/build-skills),
[Codex hooks](https://learn.chatgpt.com/docs/hooks), dan source immutable di manifest.
