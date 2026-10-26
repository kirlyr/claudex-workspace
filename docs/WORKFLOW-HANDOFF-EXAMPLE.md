# Contoh handoff sintetis — pembulatan invoice

ILUSTRASI saja: project, SHA, approval dan hasil di bawah fiktif, bukan hasil test task ini.
Setelah disalin ke `.local/workflow/HANDOFF.md`, path knowledge relatif mengacu struktur panduan.

- Checkpoint: 2026-10-26 14:00 +07:00; last updating agent: Codex; milestone: M1
- Status: ready for review
- Project identity: synthetic-invoice, root diverifikasi dengan git rev-parse
- Objective: bulatkan diskon dalam sen sebelum pengurangan subtotal.
- Knowledge: knowledge/PRD.md AC1; knowledge/PLAN.md r1; knowledge/DECISIONS.md D1
- Approval: ilustrasi manusia menyetujui plan r1, M1 untuk src/invoice.js dan test/invoice.test.js;
  bukan izin deployment atau perubahan database.

## Progress dan keputusan

- Selesai: regression half-cent ditambahkan, rumus pembulatan diperbaiki.
- In progress: none.
- Pending: review manusia; tidak ada commit atau push.
- Keputusan: D1 memakai integer cents; API tetap sama.

## Git evidence — ilustrasi checkpoint

- Branch / HEAD: fix/discount / 1111111111111111111111111111111111111111
- `git status --short`: tiga file unstaged, tidak ada staged/untracked.
- Perubahan pengguna sebelumnya: README.md; tidak disentuh agent.
- Task: src/invoice.js (rumus), test/invoice.test.js (regression), keduanya unstaged.
- `git diff -- src/invoice.js test/invoice.test.js`: hanya rumus dan satu test berubah.
- `git diff --cached --stat`: kosong. Diff README milik pengguna tidak disalin ke handoff.

## Verifikasi dan kelanjutan

- `npm test`: ilustrasi sebelum fix exit 1, 3 pass/1 fail; sesudah fix exit 0, 4 pass/0 fail.
- Keterbatasan: integrasi UI NOT RUN; suite unit tidak membuktikan perilaku UI.
- Blockers: none.
- Next actions: (1) Claude cocokkan HEAD/status dan baca diff dua file task;
  (2) review AC1 dan source terkait; (3) laporkan hasil ke manusia, perbarui checkpoint.
- Stop: HEAD/diff berbeda, kebutuhan UI/API baru, atau tindakan di luar approval M1.
