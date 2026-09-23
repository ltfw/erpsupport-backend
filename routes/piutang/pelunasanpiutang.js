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

    const range = defaultRange();
    const tglAwal = toDateOnly(req.query.tgl_awal, range.awal);
    const tglAkhir = toDateOnly(req.query.tgl_akhir, range.akhir);

    let cabangArray = [];
    const allowedRoles = ['ADM', 'FAS', 'MKT-SANI','DAT','MKT-SLF','QMS'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }

    console.log(
      "pelunasan piutang =>", "role:", userRole, "cabang:", cabangArray,
      "periode:", tglAwal, "s/d", tglAkhir
    );

    // Filter cabang ditaruh di dalam CTE supaya baris dipangkas sebelum agregasi
    const cabangClause =
      cabangArray.length > 0 ? sql`AND i.KodeCc IN (${Prisma.join(cabangArray)})` : sql``;
    const searchClause = search
      ? sql`AND (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})`
      : sql``;

    // CTE dipakai bersama oleh query data, query total baris, dan query grand total
    const baseCte = sql`
      WITH periode AS (
          SELECT CONVERT(datetime, ${tglAwal}, 120)                         AS tgl_awal,
                 DATEADD(second, -1, DATEADD(day, 1,
                    CONVERT(datetime, ${tglAkhir}, 120)))                   AS tgl_akhir
      ),
      pelunasan AS (
          SELECT i.CustomerId,
                 i.KodeCc                AS kode_cabang,
                 i.ParentTransaction     AS no_faktur,
                 MAX(i.TglTrn)           AS tgl_pelunasan,
                 -- Pembayaran tunai + giro (nilai disimpan negatif, dibalik jadi positif)
                 SUM(CASE WHEN i.TypeTrn IN ('K', 'M')           THEN -i.JumlahTrn ELSE 0 END) AS nilai_pembayaran,
                 -- Pembayaran via SSP
                 SUM(CASE WHEN i.TypeTrn = 'O' AND i.IsArSsp = 1 THEN -i.JumlahTrn ELSE 0 END) AS ssp
          FROM dbo.ArTransactionItems i
          CROSS JOIN periode p
          WHERE i.TglTrn BETWEEN p.tgl_awal AND p.tgl_akhir
            AND (i.TypeTrn IN ('K', 'M') OR (i.TypeTrn = 'O' AND i.IsArSsp = 1))
            ${cabangClause}
          GROUP BY i.CustomerId, i.KodeCc, i.ParentTransaction
      )
    `;

    const fromClause = sql`
      FROM pelunasan pl
      JOIN      dbo.Customers        c  ON pl.CustomerId      = c.CustomerId
      LEFT JOIN dbo.CustomerGroups   cg ON c.CustomerGroupId  = cg.CustomerGroupId
      LEFT JOIN dbo.BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      LEFT JOIN dbo.RayonDistricts   rd ON c.DistrictId       = rd.DistrictId
      LEFT JOIN dbo.Rayons           r  ON rd.RayonCode       = r.RayonCode
      LEFT JOIN dbo.Salesmen         s  ON r.KodeSales        = s.KodeSales
      LEFT JOIN dbo.Departments      d  ON d.KodeDept         = pl.kode_cabang
      WHERE 1 = 1
        ${searchClause}
    `;

    const offsetClause = usePagination
      ? sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`
      : sql``;

    const [rows, totalResult, summaryResult] = await Promise.all([
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            pl.kode_cabang                                  AS KodeCbg,
            d.NamaDept                                      AS NamaCabang,
            c.KodeLgn                                       AS KodeCustomer,
            CASE WHEN cg.CustomerGroupCode IN ('SDP', 'FAS')
                 THEN 'SUBDIST' ELSE 'REGULER' END          AS TipeTagihan,
            be.BusinessEntityName                           AS BadanUsaha,
            c.NamaLgn                                       AS NamaCustomer,
            cg.CustomerGroupName                            AS CustomerGroup,
            rd.RayonCode                                    AS KodeRayon,
            s.NamaSales                                     AS Salesman,
            pl.no_faktur                                    AS NoFaktur,
            CAST(pl.tgl_pelunasan AS date)                  AS TglPelunasan,
            CAST(pl.nilai_pembayaran AS float)              AS NilaiPembayaran,
            CAST(pl.ssp AS float)                           AS SSP,
            CAST(pl.nilai_pembayaran + pl.ssp AS float)     AS Total
        ${fromClause}
        ORDER BY pl.kode_cabang, c.KodeLgn, pl.tgl_pelunasan, pl.no_faktur
        ${offsetClause}
      `,
      prisma.$queryRaw`
        ${baseCte}
        SELECT COUNT(*) AS total
        ${fromClause}
      `,
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            CAST(SUM(pl.nilai_pembayaran) AS float)             AS NilaiPembayaran,
            CAST(SUM(pl.ssp) AS float)                          AS SSP,
            CAST(SUM(pl.nilai_pembayaran + pl.ssp) AS float)    AS Total
        ${fromClause}
      `,
    ]);

    const total = Number(totalResult[0]?.total || 0);
    const summary = summaryResult[0] || {};

    res.json({
      data: rows,
      periode: { tgl_awal: tglAwal, tgl_akhir: tglAkhir },
      summary: {
        NilaiPembayaran: Number(summary.NilaiPembayaran || 0),
        SSP: Number(summary.SSP || 0),
        Total: Number(summary.Total || 0),
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
    res.status(500).json({ error: "Failed to fetch pelunasan piutang", errors: error });
  }
});

module.exports = router;
