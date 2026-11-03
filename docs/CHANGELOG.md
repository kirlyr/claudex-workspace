# Changelog

## 2026-11-03 — Anthropic Frontend Design

- Menambahkan satu skill `frontend-design` dari `anthropics/skills`, snapshot Git
  `ca45fc496a3436251f191354091d557da31c15b5`, dengan SHA-256 setiap file.
- Mempertahankan source dan lisensi Apache-2.0 asli, termasuk `LICENSE.txt` dan salinan
  identik `LICENSE` untuk installer existing; tidak mengubah installer atau hooks.
- Menambahkan pemeriksaan discovery dan explicit invocation pada runtime check existing;
  mock localhost tidak membuktikan kualitas desain atau pemilihan skill oleh model.
- Mendokumentasikan pemakaian untuk UI/UX tanpa mengubah Ponytail dan workflow non-UI.

## 2026-10-23 — Git tracking and history review

- Memindai seluruh 182 file pada commit awal tanpa mengeluarkan nilai sensitif.
- Menemukan metadata pribadi/lokal pada 25 file; commit/push baru ditahan.
- Mengeluarkan 182 entry audit/backup/source legacy dari index, mempertahankan file fisik.
- Memperketat ignore rules untuk evidence, transcript, private memory dan cache.
- Menambahkan history scanner, test redaksi output, dan rencana remediasi tanpa rewrite.

## 2026-10-23 — Portable configuration source

- Menambahkan global instructions 26 baris dan manifest empat skill immutable.
- Menambahkan installer idempotent, hash verification, backup/journal dan rollback.
- Mempertahankan Ponytail tanpa mengubah plugin cache atau hooks.
- Menambahkan scanner path/content publik dan pemeriksaan blob pada Git index.
- Membuktikan install/no-op/rollback/conflict protection pada home sintetis.
- Membuktikan native skill discovery dan explicit invocation melalui mock localhost.
- Mencatat blocker filesystem global, Git index dan autentikasi HTTPS.
- Claude-Mem tetap disabled sampai runtime dan recovery synthetic-only lolos pengujian.
- Artefak audit lama tetap lokal; penghapusan tracking-nya belum berhasil karena index read-only.
