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
    const allowedRoles = ['ADM', 'FAS', 'MKT-SANI'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }

    console.log(
      "evaluasi ar =>", "role:", userRole, "cabang:", cabangArray,
      "periode:", tglAwal, "s/d", tglAkhir
    );

    const cabangClause =
      cabangArray.length > 0 ? sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})` : sql``;
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
      cust AS (
          SELECT c.CustomerId, c.KodeLgn, c.NamaLgn, c.BusinessEntityId,
                 c.CustomerGroupId, c.KodeSyarat, c.KodeDept
          FROM dbo.Customers c
          WHERE 1 = 1
            ${cabangClause}
            ${searchClause}
      ),
      mutasi AS (
          SELECT i.CustomerId,
              -- Saldo Awal: akumulasi seluruh transaksi sebelum periode
              SUM(CASE WHEN i.TglTrn < p.tgl_awal
                       THEN i.JumlahTrn ELSE 0 END) AS saldo_awal,
              -- Penjualan: seluruh penambah piutang dalam periode
              SUM(CASE WHEN i.TglTrn BETWEEN p.tgl_awal AND p.tgl_akhir
                        AND i.TypeTrn IN ('C','F','A','D','N')
                       THEN i.JumlahTrn ELSE 0 END) AS penjualan,
              -- Pembayaran tunai + giro (nilai disimpan negatif, dibalik jadi positif)
              -SUM(CASE WHEN i.TglTrn BETWEEN p.tgl_awal AND p.tgl_akhir
                         AND i.TypeTrn IN ('K','M')
                        THEN i.JumlahTrn ELSE 0 END) AS bayar_tunai,
              -- Pembayaran via SSP
              -SUM(CASE WHEN i.TglTrn BETWEEN p.tgl_awal AND p.tgl_akhir
                         AND i.TypeTrn = 'O'
                        THEN i.JumlahTrn ELSE 0 END) AS bayar_ssp,
              -- Saldo Akhir: akumulasi seluruh transaksi s/d akhir periode
              SUM(CASE WHEN i.TglTrn <= p.tgl_akhir
                       THEN i.JumlahTrn ELSE 0 END) AS saldo_akhir
          FROM dbo.ArTransactionItems i
          JOIN cust cc ON cc.CustomerId = i.CustomerId
          CROSS JOIN periode p
          GROUP BY i.CustomerId
      )
    `;

    // Sembunyikan customer yang sama sekali tidak bergerak dan bersaldo nol
    const havingFilter = sql`
      WHERE ABS(m.saldo_awal)  > 0.005 OR ABS(m.penjualan)   > 0.005
         OR ABS(m.bayar_tunai) > 0.005 OR ABS(m.bayar_ssp)   > 0.005
         OR ABS(m.saldo_akhir) > 0.005
    `;

    const offsetClause = usePagination
      ? sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`
      : sql``;

    const [rows, totalResult, summaryResult] = await Promise.all([
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            c.KodeLgn                       AS KodeCustomer,
            be.BusinessEntityName           AS BadanUsaha,
            c.NamaLgn                       AS NamaCustomer,
            cg.CustomerGroupName            AS CustomerGroup,
            pt.KetSyaratBayar               AS [TOP],
            d.NamaDept                      AS Cabang,
            CAST(m.saldo_awal  AS float)    AS SaldoAwal,
            CAST(m.penjualan   AS float)    AS Penjualan,
            CAST(m.bayar_tunai AS float)    AS Tunai,
            CAST(m.bayar_ssp   AS float)    AS SSP,
            CAST(m.saldo_akhir AS float)    AS SaldoAkhir
        FROM mutasi m
        JOIN      cust                 c  ON c.CustomerId        = m.CustomerId
        LEFT JOIN dbo.BusinessEntities be ON be.BusinessEntityId = c.BusinessEntityId
        LEFT JOIN dbo.CustomerGroups   cg ON cg.CustomerGroupId  = c.CustomerGroupId
        LEFT JOIN dbo.PaymentTerms     pt ON pt.KodeSyarat       = c.KodeSyarat
        LEFT JOIN dbo.Departments      d  ON d.KodeDept          = c.KodeDept
        ${havingFilter}
        ORDER BY m.saldo_akhir DESC
        ${offsetClause}
      `,
      prisma.$queryRaw`
        ${baseCte}
        SELECT COUNT(*) AS total
        FROM mutasi m
        JOIN cust c ON c.CustomerId = m.CustomerId
        ${havingFilter}
      `,
      prisma.$queryRaw`
        ${baseCte}
        SELECT
            CAST(SUM(m.saldo_awal)  AS float) AS SaldoAwal,
            CAST(SUM(m.penjualan)   AS float) AS Penjualan,
            CAST(SUM(m.bayar_tunai) AS float) AS Tunai,
            CAST(SUM(m.bayar_ssp)   AS float) AS SSP,
            CAST(SUM(m.saldo_akhir) AS float) AS SaldoAkhir
        FROM mutasi m
        JOIN cust c ON c.CustomerId = m.CustomerId
        ${havingFilter}
      `,
    ]);

    const total = Number(totalResult[0]?.total || 0);
    const summary = summaryResult[0] || {};

    res.json({
      data: rows,
      periode: { tgl_awal: tglAwal, tgl_akhir: tglAkhir },
      summary: {
        SaldoAwal: Number(summary.SaldoAwal || 0),
        Penjualan: Number(summary.Penjualan || 0),
        Tunai: Number(summary.Tunai || 0),
        SSP: Number(summary.SSP || 0),
        SaldoAkhir: Number(summary.SaldoAkhir || 0),
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
    res.status(500).json({ error: "Failed to fetch evaluasi AR", errors: error });
  }
});

module.exports = router;
