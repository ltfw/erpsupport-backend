/**
 * Penyesuaian manual PNL untuk Januari & Februari 2025.
 *
 * Transaksi Jan-Feb 2025 untuk Krian (Head Office / KodeDept 00) dan Semarang
 * (KodeDept 02) tidak tersimpan di SDLdb001, sehingga tidak ikut terhitung saat
 * query PNL menjumlahkan tahun lalu. Angka di bawah diambil dari file
 * "Laporan PNL Master 2026.xlsx" (kolom Krian & Semarang, header 01/2025 dan
 * 02/2025) dan disuntikkan ke kolom tahun lalu (bulanan bila bulan terpilih
 * Januari/Februari, dan selalu ke YTD tahun lalu).
 *
 * Nilai mengikuti konvensi tampilan laporan (positif), sama seperti hasil query
 * GL. Baris turunan (Penjualan Bersih, Laba Kotor, LABA OPERASIONAL, dll.) dan
 * baris persentase tidak perlu didaftarkan di sini — semuanya dihitung ulang
 * oleh query dari akun-akun berikut.
 *
 * KodeGl '601099-602199' dan '720099-810099-820099' adalah kode gabungan yang
 * dibentuk query, bukan akun GL sungguhan.
 */
const PNL_ADJUSTMENT_2025 = [
  // KodeGl,                 NamaGl,                              KodeDept, bulan, total
  ['410101', 'Total Penjualan', '00', 1, 7169646333.35],
  ['410101', 'Total Penjualan', '00', 2, 8950437760.9],
  ['410101', 'Total Penjualan', '02', 1, 2146878490.86],
  ['410101', 'Total Penjualan', '02', 2, 2209033495.39],

  ['420102-01', 'Sales Item Discount (Principal)', '00', 1, 1219349024.13],
  ['420102-01', 'Sales Item Discount (Principal)', '00', 2, 1711630242.21],
  ['420102-01', 'Sales Item Discount (Principal)', '02', 1, 194594373.19],
  ['420102-01', 'Sales Item Discount (Principal)', '02', 2, 148721256.65],

  ['420102-02', 'Sales Item Discount (Distributor)', '00', 1, 11698764],
  ['420102-02', 'Sales Item Discount (Distributor)', '00', 2, 15860423],
  ['420102-02', 'Sales Item Discount (Distributor)', '02', 1, 17482162.16],
  ['420102-02', 'Sales Item Discount (Distributor)', '02', 2, 8295135.14],

  ['510101', 'HPP Usaha', '00', 1, 6326492151.54],
  ['510101', 'HPP Usaha', '00', 2, 8021349673.68],
  ['510101', 'HPP Usaha', '02', 1, 2020246319.91],
  ['510101', 'HPP Usaha', '02', 2, 2172090481.13],

  ['601099-602199', 'Beban Operasional', '00', 1, 610125648.59],
  ['601099-602199', 'Beban Operasional', '00', 2, 625305751.61],
  ['601099-602199', 'Beban Operasional', '02', 1, 238089021.3],
  ['601099-602199', 'Beban Operasional', '02', 2, 154956551.47],

  ['710001', 'Pendapatan Jasa Giro dan Deposito', '00', 1, 112115.24],
  ['710001', 'Pendapatan Jasa Giro dan Deposito', '00', 2, 143759.05],
  ['710001', 'Pendapatan Jasa Giro dan Deposito', '02', 1, 63243.28],
  ['710001', 'Pendapatan Jasa Giro dan Deposito', '02', 2, 43399.63],

  ['720099-810099-820099', 'Total Beban Lain-lain', '00', 1, 33024177.92],
  ['720099-810099-820099', 'Total Beban Lain-lain', '00', 2, 108222866.21],
  ['720099-810099-820099', 'Total Beban Lain-lain', '02', 1, 251130.35],
  ['720099-810099-820099', 'Total Beban Lain-lain', '02', 2, 291362.37],

  ['910002', 'PPh Badan Tangguhan', '00', 1, 60846],
  ['910002', 'PPh Badan Tangguhan', '00', 2, 72425],
  // Semarang tidak punya nilai PPh Badan Tangguhan di Jan-Feb 2025

  // Retur Penjualan (420201) Jan-Feb 2025 nihil untuk kedua cabang
].map(([KodeGl, NamaGl, KodeDept, bulan, total]) => ({
  KodeGl,
  NamaGl,
  KodeDept,
  bulan,
  total,
}));

// Tahun yang datanya dilengkapi oleh tabel di atas
const PNL_ADJUSTMENT_YEAR = 2025;

module.exports = { PNL_ADJUSTMENT_2025, PNL_ADJUSTMENT_YEAR };
