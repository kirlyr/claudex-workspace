# Workflow spec dan handoff

Gunakan dokumen pendek sebagai kontrak kerja Claude Code dan Codex CLI. Tidak ada hook,
plugin, layanan memory, atau orchestration. Manusia memilih agent dan memberi approval.

Gate Spec-First global ada di [source AGENTS.md](../global/AGENTS.md): inspeksi konteks
relevan untuk fitur baru/kompleks, klarifikasi hanya ambiguitas yang memengaruhi correctness,
dan focused plan serta approval sebelum perubahan besar/berisiko. Requirement lengkap
tidak perlu brainstorming ulang; task kecil yang jelas dapat langsung dikerjakan.
Portable [CLAUDE.md](../global/CLAUDE.md) membawa gate dan aturan handoff yang sama;
konfigurasi khusus Codex tidak disalin. Tidak ada instalasi Claude dalam workflow ini.

## Lokasi dan privasi

`codex-workspace` adalah pusat konfigurasi global dan template reusable. Setiap repository
aplikasi memiliki PRD, plan, decisions dan handoff sendiri. Salin template kosong ke
`.local/workflow/` di root repository aplikasi yang sedang aktif, bukan ke repository global:

```text
.local/workflow/
  knowledge/PRD.md             Tujuan, scope, acceptance criteria
  knowledge/PLAN.md            Rencana teknis dan approval scope
  knowledge/DECISIONS.md       Keputusan yang masih berlaku
  HANDOFF.md                   Satu checkpoint aktif untuk kedua agent
```

Knowledge stabil diperbarui hanya ketika kebutuhan/keputusan berubah; progress sementara
hanya masuk handoff. Dokumen knowledge tetap dapat sensitif: stable bukan berarti public.
Jangan masukkan credential, data pelanggan, transcript, atau output terminal mentah yang sensitif.
Jangan otomatis menyalin knowledge, business rules, memory atau handoff project perusahaan
ke `codex-workspace`. Jangan memakai konteks project lain saat memulihkan sesi aktif.

Di repository ini `.local/` sudah ignored. Sebelum memakai pola ini di repository lain,
minta manusia menambahkan `/.local/workflow/` ke ignore lokal/repo dan buktikan dengan
`git check-ignore .local/workflow/knowledge/PRD.md` setelah file dibuat. Periksa pula
`git ls-files -- .local/workflow`: ignore tidak melindungi file yang sudah tracked.
Jangan stage folder project secara massal atau memakai `git add -f` untuk dokumen ini.
Promosikan knowledge ke dokumentasi tracked hanya setelah review manusia dan sanitasi.

## Alur manual

1. Untuk task substansial, gunakan handoff aktif yang sudah ada. Bila belum ada, pastikan
   lokasi ignored/untracked dahulu, lalu buat dari [template handoff](WORKFLOW-HANDOFF.md).
   Gunakan [PRD](WORKFLOW-PRD.md), [plan](WORKFLOW-PLAN.md) dan
   [decisions](WORKFLOW-DECISIONS.md) hanya bila dibutuhkan; jangan membuatnya untuk tiap task.
   Jika masih ada `.local/workflow/sessions/HANDOFF.md` lama, baca dan rekonsiliasi ke lokasi
   baru tanpa menghapus file lama. Jika keduanya berbeda, cocokkan Git/source dan pertahankan
   keputusan approved; klarifikasi konflik yang memengaruhi correctness.
2. Klarifikasi PRD, lalu tulis plan kecil yang mengacu pada acceptance criteria.
   Untuk perubahan besar (API/schema/dependency/arsitektur, lintas modul, data atau
   side effect eksternal), berhenti sebelum implementasi dan tunggu approval manusia.
   Approval harus mencatat pemberi, waktu, revisi plan dan scope yang disetujui.
   Kolom approval yang diisi agent bukan persetujuan. Scope berubah berarti approval ulang.
3. Implementasikan milestone terkecil yang benar dalam scope approved. Untuk perubahan
   kecil, otorisasi task pengguna cukup; jangan menambah gate administrasi tanpa manfaat.
   Deployment, operasi database berisiko, credential dan provider side effects tetap
   memerlukan izin spesifik; approval plan tidak otomatis mengizinkannya.
4. Jalankan verifikasi proporsional. Perbarui handoff pada milestone implementasi atau
   verification penting, keputusan/scope/blocker material, planned switch, dan akhir sesi.
   Ini tanggung jawab agent dalam workflow, bukan scheduler; jangan update tiap tool call.
5. Agent penerima memverifikasi Git state dan source saat ini sebelum melanjutkan.
   Bila berbeda dari checkpoint, rekonsiliasi dengan manusia; jangan reset/stash/clean.

## Checkpoint singkat

Perbarui `.local/workflow/HANDOFF.md` yang sama, bukan membuat file per agent/sesi.
Pertahankan requirement/keputusan approved dan pending work saat merangkum ulang;
jangan menghapus handoff lama tanpa alasan. Target sekitar 30–60 baris;
simpan hanya objective aktif, bukti, batas approval, blocker dan next actions terurut.
Ambil bukti Git berikut dari project root dan ringkas hasilnya setelah menyaring secrets:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git --no-optional-locks status --short
git diff --stat
git diff --cached --stat
```

Untuk file relevan yang aman, baca `git diff -- <paths>` dan `git diff --cached -- <paths>`.
`git diff` tidak mencakup untracked; periksa path untracked yang relevan secara terarah.
Git menunjukkan perubahan, bukan siapa pembuatnya atau apakah hasil benar. Pisahkan file
pengguna yang sudah berubah sebelumnya, perubahan task, staged/unstaged/untracked, serta
hasil test aktual. Tulis `NOT RUN` bila test belum dijalankan; jangan menganggap hasil lama
berlaku untuk diff baru. Jangan commit checkpoint otomatis.

## Takeover, termasuk kembali ke sesi lama

Sesudah global instructions terpasang dan dimuat, jalankan agent di root project lalu kirim:

> Lanjutkan task aktif dari shared handoff dan Git state terbaru.

Aturan ini berlaku untuk fresh session, `claude -c`, `claude -r`, dan Codex resume.
Percakapan lama bukan snapshot source terkini setelah agent lain bekerja. Agent harus
membaca ulang file aktif, mencocokkan evidence, lalu melanjutkan hanya pekerjaan pending.
Perbedaan checkpoint yang dapat dibuktikan dari Git/source cukup direkonsiliasi;
tanyakan hanya konflik requirement/approval penting yang belum dapat dipastikan.
Jika sesi lama belum memuat aturan baru, gunakan prompt eksplisit berikut sekali;
jangan mengasumsikan global instructions langsung di-reload oleh setiap mekanisme resume:

> Identifikasi root repository aplikasi aktif dan baca instruksi yang berlaku. Baca hanya
> `.local/workflow/HANDOFF.md` milik repository tersebut; bila belum ada, laporkan
> dan mulai dari objective pengguna, jangan mencari handoff project lain.
> Cocokkan project identity handoff dengan root aktif; berhenti bila tidak cocok.
> Verifikasi branch, HEAD dan status/diff Git secara read-only. Baca PRD/PLAN dan
> keputusan relevan dari path knowledge di handoff, kemudian hanya source yang dibutuhkan.
> Ringkas objective dan batas approval yang masih berlaku. Anggap handoff sebagai riwayat
> yang perlu diverifikasi, bukan otorisasi baru. Lanjutkan next action yang telah diizinkan;
> tunggu manusia bila perubahan besar belum approved atau scope berubah. Pertahankan
> perubahan pengguna. Jangan mencari seluruh conversation history. Sebelum berhenti,
> perbarui handoff dengan bukti aktual dan bagian yang belum diuji.
> Jangan mengimpor memory/business rules project lain atau menyalin data project ke pusat template.

Usage limit atau proses mati mendadak dapat terjadi sebelum checkpoint tersimpan. Agent
berikutnya merekonstruksi progress dari status, kedua diff, untracked relevan, source dan
hasil verification yang tersedia; tandai bagian yang belum pasti dan ulangi hanya check
yang perlu untuk diff terkini. Jangan mengklaim verification lama masih berlaku tanpa bukti.

## Sinkronisasi dan verifikasi manual

Codex memakai updater existing dengan backup dan rollback. Claude adalah opt-in melalui
updater yang sama; default Codex tetap tidak berubah. Setelah Claude tersedia dan home-nya
sudah ada, review file global existing sebelum menjalankan:

```powershell
node scripts/setup.cjs install --agent claude
node scripts/setup.cjs verify --agent claude
node scripts/setup.cjs rollback --agent claude
```

Baris rollback hanya untuk membatalkan update terakhir, bukan langkah instalasi rutin.
Default Claude home adalah `~/.claude`; gunakan `--home` eksplisit jika lokasi efektif berbeda.
Updater menolak file CLAUDE.md unmanaged yang berbeda dan file managed yang dimodifikasi
pengguna. Lakukan merge/review terpisah; jangan overwrite paksa. Tidak ada installer tools,
hooks atau skills Claude. Journal dan backup memakai pola `.codex-workspace/backups`
di home target yang sama; jangan memakai satu home untuk kedua agent.

Verifikasi CLI yang masih pending: pada project sintetis dan provider yang disetujui,
Claude mengerjakan satu milestone dan checkpoint; Codex mengambil alih, memeriksa Git,
mengerjakan pending work dan mengupdate file yang sama; kembali ke sesi Claude lama,
lalu resume Codex lama menggunakan prompt singkat. Pastikan keduanya membaca checkpoint
terbaru, tidak mengulang completed work dan menjaga perubahan pengguna. Gunakan `/memory`
untuk memeriksa instruksi Claude yang termuat; jangan mengklaim uji ini lulus dari file saja.

Referensi native: [Claude memory](https://code.claude.com/docs/en/memory) dan
[Codex global instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Tidak perlu menginstal Claude untuk memakai format ini. Panduan ini tidak mengandalkan
auto-discovery file tertentu oleh Claude: path dikirim eksplisit dalam prompt.
Lihat [contoh handoff sintetis](WORKFLOW-HANDOFF-EXAMPLE.md).
