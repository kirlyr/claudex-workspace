# Workflow spec dan handoff

Gunakan dokumen pendek sebagai kontrak kerja Claude Code dan Codex CLI. Tidak ada hook,
plugin, layanan memory, atau orchestration. Manusia memilih agent dan memberi approval.

## Lokasi dan privasi

`codex-workspace` adalah pusat konfigurasi global dan template reusable. Setiap repository
aplikasi memiliki PRD, plan, decisions dan handoff sendiri. Salin template kosong ke
`.local/workflow/` di root repository aplikasi yang sedang aktif, bukan ke repository global:

```text
.local/workflow/
  knowledge/PRD.md             Tujuan, scope, acceptance criteria
  knowledge/PLAN.md            Rencana teknis dan approval scope
  knowledge/DECISIONS.md       Keputusan yang masih berlaku
  sessions/HANDOFF.md          Checkpoint terbaru, ditimpa secara manual
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

1. Salin [PRD](WORKFLOW-PRD.md), [plan](WORKFLOW-PLAN.md),
   [decisions](WORKFLOW-DECISIONS.md), dan [handoff](WORKFLOW-HANDOFF.md) dari pusat template
   ke lokasi di atas dalam repository aplikasi aktif.
   Isi hanya bagian yang relevan; tulis `N/A` untuk sisanya.
2. Klarifikasi PRD, lalu tulis plan kecil yang mengacu pada acceptance criteria.
   Untuk perubahan besar (API/schema/dependency/arsitektur, lintas modul, data atau
   side effect eksternal), berhenti sebelum implementasi dan tunggu approval manusia.
   Approval harus mencatat pemberi, waktu, revisi plan dan scope yang disetujui.
   Kolom approval yang diisi agent bukan persetujuan. Scope berubah berarti approval ulang.
3. Implementasikan milestone terkecil yang benar dalam scope approved. Untuk perubahan
   kecil, otorisasi task pengguna cukup; jangan menambah gate administrasi tanpa manfaat.
   Deployment, operasi database berisiko, credential dan provider side effects tetap
   memerlukan izin spesifik; approval plan tidak otomatis mengizinkannya.
4. Jalankan verifikasi proporsional. Perbarui decisions bila ada keputusan baru, lalu
   checkpoint ketika milestone selesai, sebelum berganti agent, atau saat harus berhenti.
5. Agent penerima memverifikasi Git state dan source saat ini sebelum melanjutkan.
   Bila berbeda dari checkpoint, rekonsiliasi dengan manusia; jangan reset/stash/clean.

## Checkpoint singkat

Perbarui satu HANDOFF.md, bukan menyalin percakapan. Target sekitar 30–60 baris;
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

## Prompt pembuka yang sama untuk kedua agent

Sesuaikan path dan objective, lalu kirim secara manual ke Claude Code atau Codex CLI:

> Identifikasi root repository aplikasi aktif dan baca instruksi yang berlaku. Baca hanya
> `.local/workflow/sessions/HANDOFF.md` milik repository tersebut; bila belum ada, laporkan
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

Tidak perlu menginstal Claude untuk memakai format ini. Panduan ini tidak mengandalkan
auto-discovery file tertentu oleh Claude: path dikirim eksplisit dalam prompt.
Lihat [contoh handoff sintetis](WORKFLOW-HANDOFF-EXAMPLE.md).
