# Claude-Mem controlled pilot

Status: **BLOCKED**, belum diinstal atau diaktifkan.
Source: [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem/tree/dcb28a768c6be4b8e451843210558275caa8ec44),
versi 15.0.1, Apache-2.0. Commit dicatat dalam manifest; versi baru harus direview ulang.

Integrasi Codex Windows upstream tersedia, tetapi mempunyai worker dan dependency runtime
di luar empat engineering skills. Node >=20.12.0 dan Bun >=1.1.31 diperlukan. Node mesin
memenuhi syarat; Bun belum ditemukan di lokasi yang diperiksa. SQLite-only dapat menghindari
Chroma/uv, tetapi worker bundle, native grammar dan dependency closure tetap perlu ditinjau.

Provider yang disetujui hanya Codex CLI dengan login pengguna untuk data sintetis. Ini tetap
inference eksternal dan memakai kuota; bukan memory offline tanpa biaya. Jangan otomatis
menggunakan CMEM Pro, fallback provider, atau cloud opt-in lain. Jangan membuat salinan
credential sendiri; review lifecycle scoped authentication pada integrasi resmi sebelum dipakai.

Default source mempunyai redaction OFF, telemetry opt-out/on, dan validator yang mengizinkan
ingestion bila prompt row hilang. Pilot harus menonaktifkan telemetry, fallback, transcript
import, Chroma, folder instruction generation, dan capture di luar project sintetis.
Environment proses tidak boleh meneruskan credential provider lain yang tidak diperlukan.
Redaction pattern tidak menggantikan pembatasan data dan project.

Hooks upstream mencakup SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop dan
PostCompact. Dua event pertama overlap Ponytail; PostToolUse memakai matcher luas dan timeout
hingga 120 detik. Tidak ada handler ini yang didaftarkan repository installer sekarang.
Gunakan hooks resmi saja setelah review/trust, tanpa checkpoint hook duplikat.

Sebelum aktivasi, jalankan worker transient pada loopback dengan data root terpisah per
project sintetis. Jangan menyamakan project basename dengan boundary keamanan: source
mendukung grouping, remote slug, merge dan worktree adoption yang perlu diuji.

Gate penerimaan:

1. Startup dan shutdown worker terbukti; tidak ada service/task permanen tersisa.
2. Capture synthetic alpha, tutup sesi/proses, lalu retrieve di sesi alpha baru.
3. Query alpha tidak mengembalikan memory beta atau sentinel rahasia sintetis.
4. Review gabungan hook memastikan tidak ada injeksi atau observer call duplikat.
5. Ukur context bytes, quota/token nyata dan latency; laporkan baseline yang tidak tersedia.
6. Uji disable dan rollback. Backup database sebelum upgrade; jangan membuka schema baru
   memakai binary lama tanpa pemeriksaan kompatibilitas.

Kandidat command installer bukan command yang sudah dijalankan. Instalasi global saat ini
terhalang izin Codex home; menjalankan npx installer akan mempunyai efek samping yang sama.
Tidak ada klaim capture, recovery, provider atau worker aktif dalam status repository ini.
