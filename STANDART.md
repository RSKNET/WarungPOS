# STANDAR PENGEMBANGAN (ATURAN MUTLAK)

Dokumen ini adalah spec utama yang bersifat mutlak dan tidak bisa diubah. Semua kode yang dihasilkan dalam project wajib mengikuti seluruh aturan di bawah ini tanpa pengecualian.

---

## 1. Modularitas & Reusability

- Setiap fungsi hanya boleh menangani satu tanggung jawab (Single Responsibility Principle).
- Logika yang dipakai lebih dari satu kali wajib diekstrak menjadi fungsi, module, atau helper terpisah. Duplikasi logika dilarang (prinsip DRY).
- Struktur folder harus dipisah berdasarkan domain atau fitur, contoh: `services/`, `utils/`, `components/`, `models/`. Dilarang menumpuk banyak logika berbeda dalam satu file besar.

## 2. Manajemen Dependency

- Wajib memeriksa terlebih dahulu apakah fitur bawaan bahasa/framework, atau package yang sudah terinstall, sudah bisa memenuhi kebutuhan sebelum menambah dependency baru.
- Instalasi package baru hanya diperbolehkan jika:
  1. Tidak ada fitur bawaan yang setara, dan
  2. Tidak ada package yang sudah terinstall yang bisa dipakai untuk kebutuhan yang sama.
- Setiap penambahan dependency baru harus disertai alasan singkat mengapa fitur bawaan atau package existing tidak mencukupi.

## 3. Kebersihan Kode

- Dilarang ada kode yang tidak terpakai (dead code, unused import, unused variable, unused function).
- Dilarang ada komentar dalam bentuk apapun, termasuk `//`, `/* */`, `#`, docstring, dan sejenisnya.
- Dilarang ada `console.log`, `print`, atau bentuk logging/debug statement lain yang tertinggal di kode final.
- Dilarang ada file yang tidak direferensikan atau tidak digunakan dalam project.
- Kode harus ditulis seminimal mungkin tanpa mengorbankan keterbacaan. Hindari pengulangan logika atau fungsi yang sama.

## 4. Standar Profesional File & Struktur

- Penamaan file dan folder harus konsisten. Pilih satu konvensi penamaan (`kebab-case`, `camelCase`, atau `PascalCase`) sesuai standar bahasa/framework yang dipakai, lalu terapkan secara konsisten di seluruh project.
- Setiap file hanya berisi satu unit logis (satu class, satu module, atau satu komponen per file), kecuali file kecil yang memang berisi kumpulan tipe atau konstanta terkait.
- Format kode harus konsisten: indentasi, spasi, dan urutan import mengikuti formatter/linter standar bahasa yang dipakai, jika tersedia secara bawaan.

## 5. Maintainability

- Penamaan variabel, fungsi, dan class harus self-explanatory, jelas maksudnya tanpa perlu komentar tambahan.
- Alur program harus bisa dipahami orang lain hanya dengan membaca kode, tanpa penjelasan tambahan dari penulis.
- Hindari nested logic yang terlalu dalam, maksimal 2-3 level nesting. Jika lebih dari itu, pecah menjadi fungsi-fungsi kecil.

## 6. Keamanan

### 6.1 Validasi & Sanitasi Input
- Semua input dari luar (form, query parameter, body request, header, file upload, hasil scraping, environment variable eksternal) wajib divalidasi tipe, format, panjang, dan range-nya sebelum diproses.
- Validasi dilakukan di sisi server/backend meskipun sudah ada validasi di sisi client. Validasi client tidak pernah dianggap cukup.
- Gunakan whitelist (mengizinkan pola yang diketahui aman) daripada blacklist (memblokir pola yang diketahui berbahaya).
- Sanitasi output yang ditampilkan ke user (HTML escaping) untuk mencegah Cross-Site Scripting (XSS).

### 6.2 Autentikasi & Otorisasi
- Password wajib di-hash menggunakan algoritma yang dirancang untuk password (contoh: bcrypt, argon2, scrypt). Dilarang menggunakan hash cepat seperti MD5 atau SHA1 untuk password.
- Setiap endpoint/route yang mengakses data sensitif wajib memiliki pengecekan otorisasi (role/permission), bukan hanya pengecekan status login.
- Session token/JWT harus memiliki masa berlaku (expiry) yang jelas dan mekanisme refresh yang aman.
- Terapkan prinsip least privilege: setiap user/service hanya diberi akses seminimal yang dibutuhkan untuk menjalankan tugasnya.

### 6.3 Proteksi Data
- Data sensitif (password, token, API key, data pribadi) dilarang disimpan dalam bentuk plain text di database, log, atau file konfigurasi yang ter-commit ke version control.
- Semua kredensial (API key, connection string, secret key) wajib disimpan di environment variable atau secret manager, bukan hardcode di dalam kode.
- Data sensitif yang dikirim melalui jaringan wajib dienkripsi menggunakan HTTPS/TLS.
- Data sensitif yang disimpan (at rest) untuk kebutuhan compliance tertentu wajib dienkripsi sesuai kebutuhan regulasi yang berlaku.

### 6.4 Pencegahan Serangan Umum
- Gunakan parameterized query atau ORM/query builder untuk seluruh akses database guna mencegah SQL Injection. Dilarang melakukan concatenation string secara langsung untuk membentuk query.
- Terapkan proteksi Cross-Site Request Forgery (CSRF) pada setiap operasi yang mengubah state (POST, PUT, PATCH, DELETE) yang diakses melalui browser.
- Terapkan rate limiting pada endpoint yang rawan disalahgunakan (login, reset password, endpoint publik yang berat).
- Validasi dan batasi ukuran serta tipe file yang diunggah user (file upload) untuk mencegah eksekusi file berbahaya.
- Hindari deserialisasi data dari sumber yang tidak terpercaya tanpa validasi ketat, untuk mencegah Insecure Deserialization.

### 6.5 Manajemen Dependency & Konfigurasi
- Dependency pihak ketiga wajib dicek secara berkala terhadap known vulnerability (menggunakan tool audit bawaan package manager, contoh: `npm audit`, `pip-audit`, atau sejenisnya).
- Dilarang menggunakan dependency yang sudah deprecated atau tidak lagi menerima update keamanan, jika masih memungkinkan menggantinya.
- Environment production wajib menonaktifkan mode debug, stack trace detail, dan endpoint testing/development.
- Pesan error yang ditampilkan ke user tidak boleh membocorkan detail internal sistem (struktur database, path server, versi framework).

### 6.6 Audit & Monitoring Keamanan
- Setiap aktivitas sensitif (login, perubahan data penting, perubahan permission) wajib tercatat dalam audit trail yang terpisah dari log aplikasi biasa.
- Audit trail tidak termasuk dalam larangan "tidak ada log" pada bagian Kebersihan Kode, karena audit trail adalah kebutuhan keamanan dan compliance, bukan debug log.

## 7. Performa

### 7.1 Efisiensi Query & Database
- Query database wajib menggunakan index yang sesuai pada kolom yang sering dipakai untuk filter, join, atau sorting.
- Hindari N+1 query problem: gunakan eager loading/batch fetching saat mengambil data relasional dalam jumlah banyak.
- Ambil hanya kolom dan data yang benar-benar dibutuhkan (hindari `SELECT *` atau mengambil seluruh field jika tidak diperlukan).
- Gunakan pagination untuk data dalam jumlah besar, jangan mengambil seluruh dataset sekaligus.

### 7.2 Manajemen Resource
- Tutup/bebaskan resource (koneksi database, file handle, socket, stream) segera setelah selesai digunakan.
- Gunakan connection pooling untuk koneksi database dan service eksternal yang sering diakses.
- Hindari memory leak dengan memastikan referensi objek besar dibebaskan ketika sudah tidak digunakan, terutama pada proses long-running.

### 7.3 Caching
- Gunakan caching untuk data yang sering diakses namun jarang berubah (hasil query berat, hasil komputasi kompleks, response API eksternal).
- Tentukan strategi invalidasi cache yang jelas (time-based expiry, event-based invalidation) agar data cache tidak menjadi stale tanpa terkontrol.
- Manfaatkan cache bawaan platform/framework yang tersedia sebelum menambahkan tool caching baru, sesuai aturan manajemen dependency pada bagian 2.

### 7.4 Efisiensi Kode & Algoritma
- Hindari kompleksitas algoritma yang tidak perlu (contoh: nested loop O(n²) padahal bisa diselesaikan dengan struktur data yang lebih tepat).
- Hindari operasi berat (looping besar, parsing besar, komputasi kompleks) dijalankan secara sinkron pada thread utama/main thread yang dapat memblokir proses lain.
- Proses yang berjalan lama (long-running task) wajib dijalankan secara asynchronous atau melalui background job/queue.
- Hindari pemanggilan fungsi atau operasi yang sama berulang kali dalam satu alur jika hasilnya bisa disimpan sementara (memoization) dalam scope eksekusi tersebut.

### 7.5 Optimasi Jaringan & Payload
- Response API harus berisi data seminimal mungkin sesuai kebutuhan client (hindari over-fetching).
- Gunakan kompresi (contoh: gzip/br) pada response jika didukung platform secara bawaan.
- Batasi jumlah request eksternal yang dilakukan secara berurutan (sequential); gabungkan atau paralelkan request yang independen jika memungkinkan.
- Untuk aplikasi frontend, terapkan lazy loading pada aset (gambar, komponen, module) yang tidak dibutuhkan saat render awal.

### 7.6 Skalabilitas
- Desain sistem harus stateless pada layer aplikasi sebisa mungkin, agar mudah discale secara horizontal.
- Hindari menyimpan state penting hanya di memori satu instance/server jika sistem berjalan pada lebih dari satu instance.
- Operasi berat yang bisa didistribusikan (batch processing, pengiriman notifikasi massal, generate report besar) wajib menggunakan queue/worker, bukan diproses langsung dalam request-response cycle.

## 8. Kriteria Validasi (Definition of Done)

Sebuah kode dianggap selesai dan sesuai standar jika lolos seluruh checklist berikut:

- [ ] Tidak ada baris kode yang tidak dipanggil atau tidak digunakan.
- [ ] Tidak ada komentar dalam bentuk apapun.
- [ ] Tidak ada log atau debug statement.
- [ ] Tidak ada file yang tidak direferensikan di dalam project.
- [ ] Semua logika berulang sudah diekstrak menjadi satu fungsi reusable.
- [ ] Tidak ada dependency baru tanpa alasan yang tervalidasi (lihat bagian 2).
- [ ] Struktur file dan folder konsisten serta sesuai standar profesional bahasa yang dipakai.
- [ ] Kode dapat dipahami oleh developer lain tanpa penjelasan tambahan.
- [ ] Seluruh input dari luar sudah divalidasi dan disanitasi di sisi server.
- [ ] Tidak ada kredensial atau data sensitif yang hardcode di dalam kode.
- [ ] Seluruh akses database menggunakan parameterized query/ORM, bukan string concatenation.
- [ ] Endpoint sensitif sudah memiliki pengecekan otorisasi dan rate limiting jika relevan.
- [ ] Dependency sudah dicek terhadap known vulnerability.
- [ ] Query database sudah menggunakan index yang sesuai dan terhindar dari N+1 query problem.
- [ ] Data dalam jumlah besar sudah menggunakan pagination, bukan diambil sekaligus.
- [ ] Proses berat/long-running sudah berjalan secara asynchronous atau melalui queue/worker.
- [ ] Resource (koneksi, file handle, stream) sudah dipastikan dibebaskan setelah digunakan.

---

**Catatan:** Dokumen ini berlaku sebagai acuan wajib untuk seluruh kode yang dikembangkan dalam project ini. Setiap penyimpangan dari aturan di atas dianggap tidak sesuai standar dan harus diperbaiki sebelum kode dianggap final.