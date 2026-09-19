# 📱 WarungPOS - Sistem Kasir & Manajemen Toko Modern Terpadu

![WarungPOS](public/favicon.png)

**WarungPOS** adalah aplikasi **Point of Sale (POS) & Manajemen Bisnis Terpadu** berbasis **Aplikasi Android Native (APK)**, Web, dan PWA (*Progressive Web App*) yang dirancang khusus untuk kebutuhan warung kelontong, toko retail, agen sembako, mitra hasil bumi, dan UMKM di Indonesia. 

Dirancang dengan prinsip **100% Offline-First**, seluruh data tersimpan secara lokal dan aman di perangkat pemilik warung tanpa ketergantungan server berbayar atau koneksi internet.

---

## 🎯 Kegunaan & Keunggulan Utama

1. **Aplikasi Android Native (APK)**: Tersedia file APK mandiri siap pasang dengan tampilan layar penuh (*Edge-to-Edge*), integrasi kamera barcode super responsif, dan penyimpanan backup langsung ke folder Download HP.
2. **Digitalisasi Transaksi Kasir Instan**: Pencatatan penjualan cepat, scan barcode kamera & hardware, kalkulasi kembalian, dan cetak struk thermal (58mm / 80mm).
3. **Kontrol Stok Multi-Varian Real-Time**: 1 produk induk dapat menampung banyak varian satuan (Pcs, Renceng, Pack, Dus, Sak, Kg) dengan kode SKU unik, harga beli/jual berbeda, dan peringatan stok menipis.
4. **Penyetelan Harga Jual & Aturan Markup Otomatis**: Otomasi perhitungan harga eceran dan grosir berdasarkan persentase atau margin tetap rupiah per kategori maupun massal.
5. **Buku Hutang & Piutang Pelanggan**: Pencatatan kasbon pelanggan, cicilan bertahap, status pelunasan, dan pencetakan nota rincian hutang.
6. **Manajemen Karyawan Lengkap**: Pengelolaan profil karyawan, pencatatan gaji pokok, komisi performa, pinjaman kasbon, hingga buku besar histori keuangan karyawan.
7. **Buku Rekapitulasi Mitra Pengepul / Supplier**: Pencatatan setoran barang/hasil bumi masuk, pengambilan barang atau kasbon keluar, serta pemantauan saldo kas berjalan (*Partner Ledger*).
8. **Daftar Belanja Kulakan (Shopping List)**: Pembuatan checklist barang belanjaan stok, pemindahan item otomatis, dan arsip riwayat belanjaan selesai.
9. **Laporan & Analitik Finansial**: Visualisasi grafik omset dan laba kotor, filter transaksi fleksibel (harian, mingguan, bulanan, kustom), serta ekspor laporan ke format CSV.
10. **Cadangan Selektif, Kompresi Gzip & Enkripsi AES-256**: Bebas memilih modul yang ingin di-backup, ukuran file sangat hemat dan aman (`.wbak`), serta pemulihan (*restore*) instan.
11. **Multi-Platform (PWA & Web)**: Selain APK native Android, juga dapat diakses lewat browser dan dipasang sebagai PWA di iPhone/iPad maupun laptop/PC (Windows, macOS, Linux).

---

## 🌟 Modul & Fitur Lengkap

### 1. 🛒 Kasir & Point of Sale (POS)
- **Pencarian Cepat & Barcode**: Cari instan via nama, SKU, atau pemindai barcode kamera & hardware scanner USB/Bluetooth.
- **Dukungan Grosir Otomatis**: Harga eceran otomatis berubah ke harga grosir saat jumlah beli memenuhi batas minimum (*threshold*).
- **Multi-Metode Pembayaran**: Mendukung pembayaran **Tunai** (kalkulasi kembalian cepat) dan **Hutang** (langsung terhubung ke data kontak pelanggan).
- **Cetak Struk Thermal**: Format cetak standar 58mm & 80mm dengan dukungan langsung cetak printer thermal, salin teks nota, atau unduh gambar struk.

### 2. 📦 Manajemen Produk & Multi-Varian
- **Arsitektur Multi-Varian**: Kelola banyak varian per produk (contoh: *Beras Rojolele* memiliki varian *1 Kg*, *5 Kg*, dan *1 Sak 25 Kg*).
- **Generator SKU Otomatis**: Pembuatan kode barcode/SKU terstandar secara otomatis berdasarkan prefix kode kategori.
- **Visualisasi Status Stok**: Status visual stok aman, menipis (≤ 5 item), atau habis dengan fitur penyesuaian stok langsung.

### 3. 💵 Aturan Markup Harga & Kalkulator
- **Aturan Markup Fleksibel**: Buat aturan penentuan harga jual berdasarkan margin persentase (%) atau margin tetap rupiah (Rp), berlaku global atau per kategori.
- **Pembaruan Harga Massal (*Bulk Update*)**: Perbarui harga jual eceran & grosir seluruh katalog produk dalam satu klik.
- **Kalkulator Simulasi Harga**: Hitung cepat simulasi margin keuntungan dan proyeksi harga jual sebelum diterapkan ke produk.

### 4. 👥 Manajemen Karyawan
- **Data Karyawan**: Kelola profil, jabatan, kontak, dan ringkasan saldo kasbon tiap karyawan.
- **Pendapatan & Komisi**: Pencatatan gaji pokok berkala, bonus lembur, dan komisi penjualan.
- **Kasbon & Hutang Operasional**: Catat pinjaman uang tunai/kasbon serta pelunasan cicilan karyawan.
- **Buku Keuangan Karyawan**: Rekapitulasi komprehensif riwayat pendapatan, kasbon, dan pembayaran gaji.

### 5. 🤝 Manajemen Mitra Pengepul / Supplier
- **Data Rekanan Mitra**: Kelola profil mitra pengepul dan rekanan pemasok barang.
- **Setoran Barang Masuk**: Pencatatan penerimaan barang, hasil bumi, atau barang titipan konsinyasi.
- **Pengambilan Barang & Kasbon Mitra**: Pencatatan pengambilan barang operasional toko atau pinjaman kasbon mitra.
- **Buku Kas Rekapitulasi (*Partner Ledger*)**: Histori mutasi debet/kredit dan saldo kas berjalan per mitra.

### 6. 📝 Daftar Belanja Stok (Kulakan)
- **Checklist Kulakan**: Rencanakan daftar barang yang harus dibeli saat kulakan ke pasar grosir.
- **Status Belanja Real-Time**: Tandai barang yang sudah terbeli dan pantau estimasi total biaya belanja.
- **Arsip Belanja**: Simpan histori sesi belanjaan yang sudah selesai untuk referensi kulakan berikutnya.

### 7. 💳 Manajemen Hutang Pelanggan
- **Buku Hutang Terpadu**: Pantau daftar pelanggan dengan total saldo hutang aktif.
- **Riwayat Cicilan**: Catat pembayaran cicilan bertahap hingga lunas dengan riwayat tanggal dan nominal yang transparan.
- **Cetak Nota Hutang**: Cetak struk rincian transaksi hutang untuk bukti pelanggan.

### 8. 📊 Laporan Penjualan & Dashboard
- **Dashboard KPI**: Pantau ringkasan total omset, estimasi laba bersih, transaksi harian, dan statistik produk.
- **Grafik Tren Penjualan**: Visualisasi interaktif tren omset harian dan mingguan menggunakan Recharts.
- **Laporan Transaksi**: Filter laporan berdasarkan periode (Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Rentang Tanggal Kustom).
- **Ekspor CSV**: Ekspor seluruh rekaman transaksi ke file spreadsheet (Excel / Google Sheets).

### 9. 🔐 Backup Selektif, Restore & Pengaturan Toko
- **Pilihan Modul Fleksibel**: Bebas memilih modul spesifik yang ingin dicadangkan (Produk, Transaksi, Hutang, Karyawan, Belanja, Mitra, Aturan Harga, atau Pengaturan Toko) tanpa harus mencadangkan seluruh data jika tidak diperlukan.
- **Kompresi Gzip & Enkripsi AES-256 (`.wbak`)**: Database dikompresi dengan gzip dan dilindungi enkripsi kuat AES-256, menghasilkan ukuran file cadangan yang sangat kecil, hemat memori, dan terlindungi aman.
- **Simpan Langsung ke Folder Download (Android Native)**: Pada aplikasi Android APK, file cadangan otomatis ditulis langsung ke folder `Download/` HP Anda.
- **Dukungan Web Share API**: Pada browser mobile/PWA, file cadangan dapat langsung dibagikan ke WhatsApp, Google Drive, atau media penyimpanan cloud lainnya.
- **Kustomisasi Struk Toko**: Konfigurasi nama toko, alamat, nomor WhatsApp/telepon, dan catatan footer struk.

### 10. 🤖 Aplikasi Android Native (APK) & Auto-Release
- **Performa Native Berbasis Capacitor**: Aplikasi APK Android mandiri yang ringan, responsif, dan hemat baterai.
- **Tampilan Layar Penuh Edge-to-Edge**: Pengalaman visual imersif tanpa terhalang tombol navigasi sistem atau poni kamera (*display cutout*).
- **Akses Kamera Barcode Responsif**: Izin kamera langsung aktif tanpa kendala WebView untuk pemindaian barcode produk yang instan.
- **Otomasi Pembaruan Rilis**: Terintegrasi dengan GitHub Actions yang otomatis mem-build APK siap pasang setiap kali ada rilis versi baru.

---

## 🏗️ Struktur Proyek

```text
WarungPOS/
├── android/                   # Proyek native Android (Capacitor)
│   ├── app/                   # Source code native Java, AndroidManifest, aset & icon
│   └── ...
├── public/                    # Aset statis, favicon, manifest web PWA
├── src/
│   ├── components/            # Komponen antarmuka (UI) modular
│   │   ├── admin/             # Layout dashboard & modul admin
│   │   ├── ui/                # Komponen primitif shadcn (Button, Dialog, Input, Table, dll)
│   │   ├── BarcodeScanner.tsx # Pemindai barcode kamera (html5-qrcode)
│   │   ├── Cart.tsx           # Panel keranjang belanja kasir
│   │   ├── CheckoutDialog.tsx # Modal penyelesaian transaksi & pembayaran
│   │   ├── ProductCard.tsx    # Kartu produk katalog kasir
│   │   ├── ProductForm.tsx    # Modal form kelola produk & multi-varian
│   │   ├── Receipt.tsx        # Layout & rendering cetak struk thermal
│   │   └── ...                # Komponen pendukung dialog & notifikasi
│   ├── database/              # Storage Engine berbasis IndexedDB (idb)
│   │   ├── db.ts              # Inisialisasi skema database IndexedDB
│   │   ├── products.ts        # Operasi data produk
│   │   ├── variants.ts        # Operasi data varian harga & stok
│   │   ├── transactions.ts    # Operasi data transaksi penjualan
│   │   ├── debts.ts           # Operasi data hutang pelanggan
│   │   ├── employees.ts       # Operasi data karyawan & kasbon
│   │   ├── partners.ts        # Operasi data mitra pengepul & setoran
│   │   ├── shopping-list.ts   # Operasi daftar belanja & arsip
│   │   └── markup.ts          # Operasi aturan markup harga
│   ├── hooks/                 # Custom React hooks (use-toast, use-mobile, use-search-input)
│   ├── lib/                   # Utilitas helper (format rupiah, enkripsi AES, SKU generator)
│   ├── pages/                 # Halaman aplikasi
│   │   ├── CashierPage.tsx    # Halaman utama Kasir POS
│   │   ├── Index.tsx          # Titik masuk rute utama
│   │   ├── NotFound.tsx       # Halaman error 404
│   │   └── admin/             # Modul administratif toko
│   │       ├── employee/      # Karyawan: profil, pendapatan, hutang & rekap
│   │       ├── partners/      # Mitra: profil, setoran masuk, kasbon keluar & buku kas
│   │       ├── shopping/      # Belanja: daftar belanjaan & arsip kulakan
│   │       ├── ProductsPage.tsx   # Katalog produk, multi-varian & stok
│   │       ├── HistoryPage.tsx    # Riwayat transaksi penjualan
│   │       ├── DashboardPage.tsx  # Dashboard analitik & ringkasan bisnis
│   │       ├── ReportsPage.tsx    # Laporan penjualan & ekspor CSV
│   │       ├── PricingPage.tsx    # Aturan markup & update harga massal
│   │       ├── CalculatorPage.tsx # Kalkulator simulasi margin & harga jual
│   │       ├── DebtsPage.tsx      # Manajemen hutang pelanggan
│   │       ├── MasterDataPage.tsx # Pengelolaan kategori & satuan
│   │       └── SettingsPage.tsx   # Profil toko, backup terenkripsi & restore
│   ├── stores/                # State management global (Zustand)
│   ├── types/                 # Definisi type TypeScript (pos.ts, employee.ts, partner.ts, dll)
│   ├── App.tsx                # Konfigurasi router & rute navigasi
│   ├── main.tsx               # Titik awal (entry point) React DOM
│   └── index.css              # Setup Tailwind CSS & styling sistem
├── index.html                 # Template HTML utama
├── package.json               # Konfigurasi paket & dependensi proyek
├── tailwind.config.ts         # Konfigurasi styling Tailwind CSS
├── tsconfig.json              # Konfigurasi compiler TypeScript
└── vite.config.ts             # Konfigurasi bundler Vite & PWA
```

---

## 💻 Teknologi & Dependensi

| Layer / Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | **React 18** | UI library modern & reaktif |
| **Bahasa Pemrograman** | **TypeScript 5** | Strict type-safety untuk stabilitas sistem |
| **Runtime Android** | **Capacitor 8** | Bridge hybrid native Android untuk performa APK maksimal |
| **Bundler & PWA** | **Vite 7 & vite-plugin-pwa** | Build ultra cepat & kapabilitas PWA offline |
| **State Management** | **Zustand** | Store reaktif ringan untuk produk & kategori |
| **Penyimpanan Lokal** | **IndexedDB (`idb`)** | Database lokal browser kapasitas besar tanpa kuota server |
| **Styling & CSS** | **Tailwind CSS 3** | Utilitas styling responsif mobile & desktop |
| **Komponen UI** | **shadcn/ui & Radix UI** | Primitif antarmuka yang aksesibel dan fleksibel |
| **Ikon** | **Lucide Icons** | Set ikon modern dan konsisten |
| **Grafik & Visualisasi** | **Recharts** | Visualisasi tren omset dan statistik penjualan |
| **Pemindai Barcode** | **html5-qrcode** | Pemindaian barcode/QR code langsung lewat kamera |
| **Kompresi Data** | **fflate** | Kompresi gzip ultra cepat untuk file cadangan |
| **Keamanan Data** | **Crypto-JS (AES-256)** | Enkripsi file cadangan dengan perlindungan kata sandi |
| **Formatting Waktu** | **date-fns** | Utilitas manipulasi & format tanggal Indonesia |

---

## 🚀 Panduan Memulai (Instalasi Lokal)

### Prasyarat
- **Node.js** versi 18.0 atau yang lebih baru
- **npm** atau package manager kompatibel (**pnpm** / **yarn**)

### Langkah Instalasi

1. **Clone repositori:**
   ```bash
   git clone https://github.com/RSKNET/WarungPOS.git
   cd WarungPOS
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

4. **Build untuk produksi:**
   ```bash
   npm run build
   ```

5. **Pratinjau build produksi lokal:**
   ```bash
   npm run preview
   ```

6. **Pemeriksaan kode (linting):**
   ```bash
   npm run lint
   ```

---

## 📱 Pilihan Penggunaan & Pemasangan

### 1. Unduh APK Android Native (*Sangat Direkomendasikan untuk HP Android*)
Untuk performa terbaik, tampilan layar penuh tanpa URL bar browser, serta akses scanner kamera yang instan:
1. Kunjungi halaman [Releases](https://github.com/RSKNET/WarungPOS/releases) di repositori ini.
2. Unduh file `WarungPOS-vX.X.X.apk` versi terbaru.
3. Buka file yang selesai diunduh di HP Android Anda, lalu pilih **Pasang / Install** (izinkan instalasi dari browser jika diminta).
4. Aplikasi siap digunakan secara offline penuh!

> 💡 **Versi Pengembangan (Dev APK):**
> Untuk mencoba fitur yang sedang dikembangkan, unduh `WarungPOS-vX.X.X-dev.X.apk` di tab [Pre-releases](https://github.com/RSKNET/WarungPOS/releases). Versi Dev memiliki Package ID mandiri (`com.rsknet.warungpos.dev`) sehingga dapat dipasang berdampingan dengan versi stabil di perangkat yang sama tanpa menimpa data toko.

### 2. Pemasangan PWA (Install di iPhone / Komputer / Browser)
Aplikasi web ini juga dapat dipasang tanpa perlu download file APK:
1. **Di Google Chrome / Edge (Android / PC):**
   - Buka alamat web WarungPOS di browser.
   - Klik ikon **Install Aplikasi** di address bar atau pilih menu titik tiga (⋮) → **Tambahkan ke Layar Utama / Install WarungPOS**.
2. **Di Safari (iPhone / iPad):**
   - Buka alamat web WarungPOS di Safari.
   - Ketuk tombol **Share** (ikon kotak dengan panah ke atas).
   - Gulir ke bawah lalu pilih **Add to Home Screen (Tambah ke Layar Utama)**.

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan personal maupun komersial.
