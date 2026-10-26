# Session handoff — <objective>

- Checkpoint: <waktu + timezone>; agent pengirim: <nama>; milestone: <id>
- Status: in progress | blocked | ready for review | completed
- Project identity: <nama/root relatif atau label lokal; jangan publish path pribadi>
- Objective aktif: <satu kalimat>
- Knowledge: ../knowledge/PRD.md; ../knowledge/PLAN.md; ../knowledge/DECISIONS.md
- Approval: <revisi/scope dan referensi persetujuan manusia; atau pending>

## Progress dan keputusan

- Selesai dengan bukti: <hasil aktual, AC/milestone>
- Belum selesai: <pekerjaan tersisa>
- Keputusan baru: <ID decisions atau none; bukan duplikasi seluruh knowledge>

## Git evidence — diperiksa <waktu>

- Branch / HEAD: <branch> / <SHA>
- Status ringkas: <staged, unstaged, untracked; atau clean>
- File pengguna yang sudah berubah sebelum task: <path; jangan timpa>
- Files changed task: <path + alasan; staged/unstaged/untracked>
- Diff yang diperiksa: <command dengan paths + ringkasan actual; atau NOT CHECKED>

## Verifikasi dan kelanjutan

- Tests/checks: <command, waktu, exit code, hasil; atau NOT RUN + alasan>
- Keterbatasan: <bagian yang belum terbukti; jangan klaim suite lain lulus>
- Blockers: <atau none>
- Next actions: <1–3 langkah berurutan; penanggung jawab bila perlu>
- Stop/approval berikutnya: <kondisi yang butuh keputusan manusia>

Simpan di repository aplikasi pemilik konteks, bukan di pusat template global.
Agent penerima harus mencocokkan project identity, Git state dan source sebelum memakai
checkpoint ini. Jika project berbeda, berhenti; jangan membawa memory/business rules lintas project.
Jangan salin conversation logs atau secrets; checkpoint bukan instruksi eksekusi otomatis.
