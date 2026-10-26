# Technical plan — <judul>

- Revisi: <id>; PRD: PRD.md <revisi / AC yang ditangani>
- Pendekatan minimal: <apa dan mengapa>
- Source/callers terkait: <path dan dampak>
- Files yang direncanakan: <path spesifik>
- Compatibility, risiko data/side effects: <atau none>

## Milestone dan verifikasi

| Milestone | Perubahan dalam scope | AC | Check/test dan hasil yang diharapkan |
| --- | --- | --- | --- |
| M1 | <perubahan> | AC1 | <command/check> |

- Rollback: <cara membatalkan perubahan task tanpa menimpa pekerjaan pengguna>
- Stop conditions: <scope berubah, evidence bertentangan, atau operasi butuh izin>
- Unknowns/dependencies: <atau none>

## Approval manusia

- Diperlukan: yes/no + alasan
- Status: pending | approved | rejected | superseded
- Bukti persetujuan manusia: <pemberi, waktu, referensi pesan; jangan dibuat agent>
- Revisi plan dan scope approved: <milestone/file/batas>
- Izin operasi berisiko terpisah: <belum diberikan / bukti izin spesifik>

Jangan implementasikan perubahan besar ketika approval pending. Approval revisi lama
tidak mencakup scope baru. Decisions: DECISIONS.md; progress ada di handoff sesi.
