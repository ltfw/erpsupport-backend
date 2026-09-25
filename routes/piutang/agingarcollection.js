const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;

// Format tanggal ke 'YYYY-MM-DD' (aman untuk CONVERT style 120)
const toDateOnly = (value, fallback) => {
  const raw = (value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return fallback;
};

const defaultRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { awal: fmt(first), akhir: fmt(last) };
};

router.get("/", async (req, res) => {
  const userRole = req.user.role;

  try {
    const page = parseInt(req.query.page) || 1;
    const rawPageSize = parseInt(req.query.per_page);
    const pageSize = Number.isNaN(rawPageSize) ? 10 : rawPageSize;
    const usePagination = pageSize > 0;
    const skip = usePagination ? (page - 1) * pageSize : 0;

    const search = req.query.search?.trim() || '';
    const searchQuery = `%${search}%`;
    const cabang = req.query.cabang?.trim() || '';
    // Sembunyikan faktur yang sudah lunas (residu di bawah toleransi sudah dinolkan di CTE)
    const outstandingOnly = req.query.outstanding_only === '1' || req.query.outstanding_only === 'true';

    // tgl_awal  -> awal_bulan  (batas bawah kolom Pelunasan & Sisa Piutang JT Bln Sebelumnya)
    // tgl_akhir -> tgl_laporan (posisi piutang dihitung per tanggal ini)
    const range = defaultRange();
    const tglAwal = toDateOnly(req.query.tgl_awal, range.awal);
    const tglAkhir = toDateOnly(req.query.tgl_akhir, range.akhir);

    let cabangArray = [];
    const allowedRoles = ['ADM', 'FAS', 'MKT-SANI', 'DAT', 'MKT-SLF', 'QMS'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }

    console.log(
      "aging ar & collection =>", "role:", userRole, "cabang:", cabangArray,
      "periode:", tglAwal, "s/d", tglAkhir, "outstandingOnly:", outstandingOnly
    );

    // Cabang difilter lewat HAVING (bukan WHERE) supaya seluruh baris ledger milik satu
    // faktur tetap ikut teragregasi - kalau dipangkas di WHERE, baris pembayaran yang
    // KodeCc-nya beda akan hilang dan nilai piutang jadi salah.
    const cabangClause =
      cabangArray.length > 0 ? sql`HAVING MIN(i.KodeCc) IN (${Prisma.join(cabangArray)})` : sql``;
    const searchClause = search
      ? sql`AND (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})`
      : sql``;

    // nilai_piutang baru ada setelah CTE detail, jadi filternya dipasang di query luar
    const outstandingClause = outstandingOnly ? sql`WHERE nilai_piutang <> 0` : sql``;

    // CTE dipakai bersama oleh query data dan query total/rekap
    const baseCte = sql`
      WITH parameter AS (
          SELECT DATEADD(second, -1, DATEADD(day, 1,
                    CONVERT(datetime, ${tglAkhir}, 120)))  AS tgl_laporan,
                 CONVERT(datetime, ${tglAwal}, 120)        AS awal_bulan,
                 -- Sisa piutang di bawah nilai ini dianggap LUNAS (residu pembulatan, bukan tagihan).
                 CAST(1 AS decimal(25,5))                  AS toleransi_lunas
      ),
      ar AS (
          SELECT
              i.ParentTransactionGuid  AS faktur_id,
              i.CustomerId,
              MIN(i.ParentTransaction) AS no_faktur,
              MIN(i.KodeCc)            AS kode_cabang,
              MIN(i.TglTrnFaktur)      AS tgl_faktur,
              MIN(i.TglJtpFaktur)      AS jatuh_tempo,
              SUM(CASE WHEN i.TypeTrn IN ('A','C','F','N')
                         OR (i.TypeTrn = 'O' AND i.Kodesumber = 'RS') THEN i.JumlahTrn ELSE 0 END) AS nilai_faktur,
              SUM(CASE WHEN i.TypeTrn = 'D'                          THEN  i.JumlahTrn ELSE 0 END) AS nota_debit_ssp,
              SUM(CASE WHEN i.TypeTrn IN ('K','M')                   THEN -i.JumlahTrn ELSE 0 END) AS total_bayar,
              SUM(CASE WHEN i.TypeTrn = 'O' AND i.IsArSsp = 1 AND i.JenisSsp = 'PPN' THEN -i.JumlahTrn ELSE 0 END) AS ssp_ppn_diterima,
              SUM(CASE WHEN i.TypeTrn = 'O' AND i.IsArSsp = 1 AND i.JenisSsp = 'PPH' THEN -i.JumlahTrn ELSE 0 END) AS ssp_pph_diterima,
              MAX(CASE WHEN i.TypeTrn IN ('K','M')                   THEN i.TglTrn END)            AS tgl_bayar,
              SUM(CASE WHEN i.TypeTrn IN ('K','M')      AND i.TglTrn >= p.awal_bulan THEN -i.JumlahTrn ELSE 0 END) AS pelunasan,
              SUM(CASE WHEN i.TypeTrn = 'O' AND i.IsArSsp = 1 AND i.TglTrn >= p.awal_bulan THEN -i.JumlahTrn ELSE 0 END) AS pelunasan_ssp,
              -- fallback DPP / PPN untuk faktur tanpa header Sales Invoice (saldo awal migrasi)
              SUM(CASE WHEN i.TypeTrn IN ('A','C','N')
                         OR (i.TypeTrn = 'O' AND i.Kodesumber = 'RS') THEN i.JumlahTrn ELSE 0 END) AS dpp_ledger,
              SUM(CASE WHEN i.TypeTrn = 'F'                          THEN i.JumlahTrn ELSE 0 END)  AS ppn_ledger,
              MAX(CASE WHEN i.TypeTrn IN ('A','C','N')
                         OR (i.TypeTrn = 'O' AND i.Kodesumber = 'RS') THEN i.Keterangan END)       AS keterangan
          FROM dbo.ArTransactionItems i
          CROSS JOIN parameter p
          WHERE i.TglTrn <= p.tgl_laporan
          GROUP BY i.ParentTransactionGuid, i.CustomerId
          ${cabangClause}
      ),
      detail AS (
          SELECT
              c.KodeLgn                                    AS kode_customer,
              be.BusinessEntityName                        AS badan_usaha,
              c.NamaLgn                                    AS nama_customer,
              cg.CustomerGroupName                         AS customer_group,
              ar.no_faktur,
              ar.tgl_faktur,
              ar.jatuh_tempo,
              DATEDIFF(day, ar.tgl_faktur, p.tgl_laporan)  AS aging_ar,
              ar.nilai_faktur,
              ar.total_bayar,
              ar.tgl_bayar,
              CASE WHEN ABS(ar.nilai_faktur + ar.nota_debit_ssp - ar.total_bayar
                            - ar.ssp_ppn_diterima - ar.ssp_pph_diterima) < p.toleransi_lunas
                   THEN 0
                   ELSE ar.nilai_faktur + ar.nota_debit_ssp - ar.total_bayar
                        - ar.ssp_ppn_diterima - ar.ssp_pph_diterima
              END                                          AS nilai_piutang,
              CASE WHEN ar.jatuh_tempo < p.tgl_laporan
                   THEN DATEDIFF(day, ar.jatuh_tempo, p.tgl_laporan) ELSE 0 END AS durasi_overdue,
              COALESCE(sih.Dpp, ar.dpp_ledger)             AS dpp,
              COALESCE(sih.Pph, 0)                         AS pph,
              COALESCE(sih.PPN, ar.ppn_ledger)             AS ppn,
              ar.ssp_ppn_diterima,
              ar.ssp_pph_diterima,
              ar.keterangan,
              dc.tgl_terima_t3f,
              dc.durasi_terima_t3f,
              dc.tgl_visit,
              dc.alasan_belum_tertagih,
              ISNULL(dc.frekuensi_kunjungan, 0)            AS frekuensi_kunjungan,
              s.NamaSales                                  AS nama_salesman,
              d.NamaDept                                   AS cabang,
              arw.KodeWil                                  AS area,
              rd.RayonCode                                 AS rayon,
              r.RayonName                                  AS nama_rayon,
              sih.PoLanggan                                AS no_sp,
              ar.pelunasan,
              ar.pelunasan_ssp,
              p.awal_bulan
          FROM ar
          CROSS JOIN parameter p
          JOIN      dbo.Customers           c   ON ar.CustomerId       = c.CustomerId
          LEFT JOIN dbo.BusinessEntities    be  ON c.BusinessEntityId  = be.BusinessEntityId
          LEFT JOIN dbo.CustomerGroups      cg  ON c.CustomerGroupId   = cg.CustomerGroupId
          LEFT JOIN dbo.SalesInvoiceHeaders sih ON ar.faktur_id        = sih.SalesInvoiceHeaderId
          LEFT JOIN dbo.Departments         d   ON ar.kode_cabang      = d.KodeDept
          LEFT JOIN dbo.RayonDistricts      rd  ON c.DistrictId        = rd.DistrictId
          LEFT JOIN dbo.Rayons              r   ON rd.RayonCode        = r.RayonCode
          LEFT JOIN dbo.Salesmen            s   ON r.KodeSales         = s.KodeSales
          -- AreaRayons punya rayon yang terdaftar di >1 area (mis. MADIUN & SF01 - SDA 11
          -- ada di JATIM001 dan JATIM002). LEFT JOIN biasa bikin baris fakturnya dobel
          -- dan grand total ikut kehitung dua kali, jadi dipaksa 1 baris lewat OUTER APPLY.
          OUTER APPLY (
              SELECT TOP 1 a.KodeWil
              FROM dbo.AreaRayons a
              WHERE a.RayonCode = r.RayonCode
              ORDER BY a.KodeWil
          ) arw
          -- Seluruh riwayat kunjungan digabung jadi 1 cell per kolom, dipisah CHAR(10).
          -- STRING_AGG otomatis melewati nilai NULL, jadi kolom T3F hanya berisi kunjungan
          -- yang alasannya 'T3F diterima' / 'Pemberkasan diterima'.
          OUTER APPLY (
              SELECT STRING_AGG(v.tgl_t3f,    CHAR(10)) WITHIN GROUP (ORDER BY v.urut) AS tgl_terima_t3f,
                     STRING_AGG(v.durasi_t3f, CHAR(10)) WITHIN GROUP (ORDER BY v.urut) AS durasi_terima_t3f,
                     STRING_AGG(v.tgl,        CHAR(10)) WITHIN GROUP (ORDER BY v.urut) AS tgl_visit,
                     STRING_AGG(v.alasan,     CHAR(10)) WITHIN GROUP (ORDER BY v.urut) AS alasan_belum_tertagih,
                     COUNT(*)                                                          AS frekuensi_kunjungan
              FROM (
                  SELECT CAST(CONVERT(varchar(10), di.TglVisit, 103) AS nvarchar(max))      AS tgl,
                         CAST(ISNULL(di.AlasanBelumTertagih, '-') AS nvarchar(max))         AS alasan,
                         CAST(CASE WHEN di.AlasanBelumTertagih IN ('T3F diterima', 'Pemberkasan diterima')
                                   THEN CONVERT(varchar(10), di.TglVisit, 103) END AS nvarchar(max))  AS tgl_t3f,
                         CAST(CASE WHEN di.AlasanBelumTertagih IN ('T3F diterima', 'Pemberkasan diterima')
                                   THEN CAST(DATEDIFF(day, ar.tgl_faktur, di.TglVisit) AS varchar(10)) END AS nvarchar(max)) AS durasi_t3f,
                         ROW_NUMBER() OVER (ORDER BY di.TglVisit, di.DebtCollectionIdItemId) AS urut
                  FROM dbo.DebtCollectionItems di
                  WHERE di.ParentTransactionGuid = ar.faktur_id
                    AND di.TglVisit <= p.tgl_laporan
              ) v
          ) dc
          WHERE 1 = 1
            ${searchClause}
      )
    `;

    const offsetClause = usePagination
      ? sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`
      : sql``;

    const [rows, recapResult] = await Promise.all([
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            kode_customer                                        AS KodeCustomer,
            badan_usaha                                          AS BadanUsaha,
            nama_customer                                        AS NamaCustomer,
            customer_group                                       AS CustomerGroup,
            no_faktur                                            AS NoFaktur,
            CAST(tgl_faktur AS date)                             AS TglFaktur,
            CAST(jatuh_tempo AS date)                            AS JatuhTempo,
            aging_ar                                             AS AgingAR,
            CAST(nilai_faktur AS float)                          AS NilaiFaktur,
            CAST(total_bayar AS float)                           AS TotalBayar,
            CAST(tgl_bayar AS date)                              AS TglBayar,
            CAST(nilai_piutang AS float)                         AS NilaiPiutang,
            durasi_overdue                                       AS DurasiOverdue,
            CAST(CASE WHEN durasi_overdue BETWEEN 0   AND 30  THEN nilai_piutang ELSE 0 END AS float) AS Bucket0_30,
            CAST(CASE WHEN durasi_overdue BETWEEN 31  AND 60  THEN nilai_piutang ELSE 0 END AS float) AS Bucket31_60,
            CAST(CASE WHEN durasi_overdue BETWEEN 61  AND 90  THEN nilai_piutang ELSE 0 END AS float) AS Bucket61_90,
            CAST(CASE WHEN durasi_overdue BETWEEN 91  AND 120 THEN nilai_piutang ELSE 0 END AS float) AS Bucket91_120,
            CAST(CASE WHEN durasi_overdue > 120               THEN nilai_piutang ELSE 0 END AS float) AS BucketOver120,
            CAST(dpp AS float)                                   AS DPP,
            CAST(pph AS float)                                   AS PPh,
            CAST(ppn AS float)                                   AS PPN,
            CAST(ssp_ppn_diterima AS float)                      AS SSPPPNDiterima,
            CAST(ssp_pph_diterima AS float)                      AS SSPPPhDiterima,
            CAST(NULL AS float)                                  AS EstimasiBulanIni,   -- input manual
            keterangan                                           AS Keterangan,
            tgl_terima_t3f                                       AS TglTerimaT3F,
            durasi_terima_t3f                                    AS DurasiTerimaT3F,
            tgl_visit                                            AS TglVisitTerakhir,
            alasan_belum_tertagih                                AS AlasanBelumTertagih,
            frekuensi_kunjungan                                  AS FrekuensiKunjungan,
            nama_salesman                                        AS NamaSalesman,
            cabang                                               AS Cabang,
            area                                                 AS Area,
            rayon                                                AS Rayon,
            nama_rayon                                           AS NamaRayon,
            no_sp                                                AS NoSP,
            CAST(NULL AS nvarchar(200))                          AS Noted,             -- input manual
            CAST(pelunasan AS float)                             AS Pelunasan,
            CAST(pelunasan_ssp AS float)                         AS PelunasanSSP,
            CAST(CASE WHEN jatuh_tempo < awal_bulan THEN nilai_piutang ELSE 0 END AS float) AS SisaPiutangJTBlnSebelumnya,
            CASE WHEN nilai_piutang = 0 THEN 'Lunas' ELSE 'Blm Lunas/Cicil' END                      AS StatusPembayaran,
            CASE WHEN tgl_terima_t3f IS NOT NULL THEN 'Sudah Update T3F' ELSE 'Belum Update T3F' END AS KeteranganT3F,
            CASE WHEN durasi_overdue > 0 THEN 'Overdue' ELSE 'Belum Jatuh Tempo' END                 AS StatusDue
        FROM detail
        ${outstandingClause}
        ORDER BY cabang, kode_customer, tgl_faktur, no_faktur
        ${offsetClause}
      `,
      // Total baris + grand total digabung dalam satu query: CTE-nya berat
      // (OUTER APPLY + STRING_AGG), jadi jangan dieksekusi lebih dari perlu.
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            COUNT(*)                                AS total,
            CAST(SUM(nilai_faktur) AS float)        AS NilaiFaktur,
            CAST(SUM(total_bayar) AS float)         AS TotalBayar,
            CAST(SUM(nilai_piutang) AS float)       AS NilaiPiutang,
            CAST(SUM(CASE WHEN durasi_overdue BETWEEN 0   AND 30  THEN nilai_piutang ELSE 0 END) AS float) AS Bucket0_30,
            CAST(SUM(CASE WHEN durasi_overdue BETWEEN 31  AND 60  THEN nilai_piutang ELSE 0 END) AS float) AS Bucket31_60,
            CAST(SUM(CASE WHEN durasi_overdue BETWEEN 61  AND 90  THEN nilai_piutang ELSE 0 END) AS float) AS Bucket61_90,
            CAST(SUM(CASE WHEN durasi_overdue BETWEEN 91  AND 120 THEN nilai_piutang ELSE 0 END) AS float) AS Bucket91_120,
            CAST(SUM(CASE WHEN durasi_overdue > 120               THEN nilai_piutang ELSE 0 END) AS float) AS BucketOver120,
            CAST(SUM(dpp) AS float)                 AS DPP,
            CAST(SUM(pph) AS float)                 AS PPh,
            CAST(SUM(ppn) AS float)                 AS PPN,
            CAST(SUM(ssp_ppn_diterima) AS float)    AS SSPPPNDiterima,
            CAST(SUM(ssp_pph_diterima) AS float)    AS SSPPPhDiterima,
            CAST(SUM(pelunasan) AS float)           AS Pelunasan,
            CAST(SUM(pelunasan_ssp) AS float)       AS PelunasanSSP,
            CAST(SUM(CASE WHEN jatuh_tempo < awal_bulan THEN nilai_piutang ELSE 0 END) AS float) AS SisaPiutangJTBlnSebelumnya
        FROM detail
        ${outstandingClause}
      `,
    ]);

    const recap = recapResult[0] || {};
    const total = Number(recap.total || 0);
    const num = (v) => Number(v || 0);

    res.json({
      data: rows,
      periode: { tgl_awal: tglAwal, tgl_akhir: tglAkhir },
      outstandingOnly,
      summary: {
        NilaiFaktur: num(recap.NilaiFaktur),
        TotalBayar: num(recap.TotalBayar),
        NilaiPiutang: num(recap.NilaiPiutang),
        Bucket0_30: num(recap.Bucket0_30),
        Bucket31_60: num(recap.Bucket31_60),
        Bucket61_90: num(recap.Bucket61_90),
        Bucket91_120: num(recap.Bucket91_120),
        BucketOver120: num(recap.BucketOver120),
        DPP: num(recap.DPP),
        PPh: num(recap.PPh),
        PPN: num(recap.PPN),
        SSPPPNDiterima: num(recap.SSPPPNDiterima),
        SSPPPhDiterima: num(recap.SSPPPhDiterima),
        Pelunasan: num(recap.Pelunasan),
        PelunasanSSP: num(recap.PelunasanSSP),
        SisaPiutangJTBlnSebelumnya: num(recap.SisaPiutangJTBlnSebelumnya),
      },
      pagination: {
        page: usePagination ? page : 1,
        pageSize: usePagination ? pageSize : total,
        total,
        totalPages: usePagination ? Math.ceil(total / pageSize) : 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch aging AR & collection", errors: error });
  }
});

module.exports = router;
