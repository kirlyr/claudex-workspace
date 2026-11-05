# Status

Diperbarui: 4 November 2026. Tabel ini hanya memuat apa yang dibuktikan repo ini; instalasi pada
home pengguna tidak dapat dibuktikan dari sini.

| Komponen | Status | Bukti/batas |
|---|---|---|
| Source portable (`global/`, `skills/manifest.json`, `scripts/`) | Ada di `main` | 5 skill dipin per commit + SHA-256 |
| Automated tests | VERIFIED_SYNTHETIC | `node --test`: 24 test, home dan jaringan sintetis |
| Pemeriksaan publikasi | Lulus | `check-public.cjs working` dan `index`; `audit-history.cjs HEAD` |
| Instalasi pada `~/.codex` / `~/.claude` | Tidak dibuktikan di sini | Jalankan `node scripts/setup.cjs verify [--agent claude]` pada mesin target |
| Discovery/invocation native | VERIFIED_SYNTHETIC (fase lama) | Via `runtime-check.cjs` dan mock localhost; tidak dijalankan ulang |
| Alur bergantian Claude ↔ Codex | Belum diuji | Lihat verifikasi manual di [WORKFLOW.md](WORKFLOW.md) |
| Claude-Mem | Belum aktif | [Dokumen pilot](CLAUDE-MEM-PILOT.md) |

Pengujian inference nyata, pemilihan skill otomatis oleh model dan wrapper PowerShell
(`*.ps1`) belum diuji. Engine yang diuji adalah Node (v22 saat tes terakhir).

## Insiden: metadata pribadi di commit awal

**Terbuka — menunggu keputusan pemilik repo.**

- Commit awal `c040c5bc22aeda78bdf7f60e4a829c5364095df4` berisi metadata pribadi/lokal pada
  25 file di `codex-global-setup/` (path profil, layout project, konfigurasi trust project).
  Scanner pola tidak menemukan kandidat credential; itu bukan bukti bahwa tidak ada secret.
- History `main` kemudian ditulis ulang menjadi 5 commit bersih. Commit lama tidak lagi
  terjangkau dari `main`, tetapi GitHub bisa tetap melayaninya lewat SHA langsung. Cek
  sendiri: buka `https://github.com/kirlyr/claudex-workspace/commit/c040c5bc22aeda78bdf7f60e4a829c5364095df4`
  dalam keadaan logout. Jika terbuka, metadata itu masih publik.
- Jangan force-push lagi sebagai solusi: itu tidak menghapus commit lama dari GitHub.

Pilihan (pilih salah satu secara eksplisit):

1. **Terima risiko**, jika setelah membaca 25 file itu isinya hanya path/nama lokal. Catat keputusan di sini.
2. **Minta GitHub Support** menghapus commit yang tidak terjangkau tersebut.
3. **Hapus dan buat ulang repository** dari history bersih saat ini. Biayanya kecil karena baru 5 commit.

Setelah memilih opsi 2 atau 3, jalankan `git gc --prune=now` pada clone lokal. Bila ternyata ada
credential nyata, revoke/rotate credential itu; tidak ada yang terkonfirmasi sejauh ini.

## Pemeriksaan ulang

```bash
node scripts/audit-history.cjs HEAD      # scan tree commit; laporan lokal di .local/ (jangan di-commit)
node scripts/check-public.cjs working
node scripts/check-public.cjs index
node --test
```

`audit-history.cjs` memindai satu tree commit (default `HEAD`), bukan seluruh history; jalankan
dengan SHA lain untuk commit lain. Laporan hanya memuat kategori, path dan nomor baris.
