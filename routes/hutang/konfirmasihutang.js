const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const rawVendorId = req.query.vendor?.trim() || '';
    // get startDate and endDate
    const startDate = req.query.start_date?.trim() || '';
    const endDate = req.query.end_date?.trim() || '';

    const dateFilter = startDate && endDate
      ? sql`
      AND ati2.TglJthTmp >= ${startDate}
      AND ati2.TglJthTmp <  DATEADD(day, 1, ${endDate})
    `
      : sql``;

    const vendorIds = Array.isArray(rawVendorId)
      ? rawVendorId.map(id => id.trim()).filter(Boolean)
      : rawVendorId
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
    const vendorFilter = vendorIds.length > 0
      ? sql` AND v.KodeLgn IN (${Prisma.join(vendorIds)})`
      : sql``;
    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [hutang, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          v.NamaLgn,
          ati.NoFaktur,
          ath.NoFakturSupplier,
          FORMAT(ath.TglTrn, 'yyyy-MM-dd') AS TglTrn,
          ati.Nominal,
          FORMAT(ati2.TglJthTmp, 'yyyy-MM-dd') AS TglJthTmp,
          DATEDIFF(DAY, ati2.TglJthTmp, GETDATE()) AS UmurHutang
        FROM
          (
          SELECT
            ati.VendorId,
            ati.ParentTransaction AS NoFaktur,
            ROUND(SUM(ati.jumlahtrn), 2) AS Nominal
          FROM
            aptransactionitems ati
          GROUP BY
            ati.VendorId,
            ati.ParentTransaction
          HAVING
            SUM(ati.JumlahTrn) > 1
          ) as ati
        join ApTransactionItems as ati2 on 
          ati.NoFaktur = ati2.ParentTransaction
        JOIN Vendors v ON
          ati.vendorId = v.VendorId
        JOIN ApTransactionHeaders ath ON
          ati.NoFaktur = ath.NoBukti
        WHERE 1 = 1
        ${vendorFilter}
        ${dateFilter}
        ORDER BY
          UmurHutang DESC,
          Nominal DESC
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM (
          SELECT
            v.NamaLgn,
            ati.NoFaktur,
            ath.NoFakturSupplier,
            FORMAT(ath.TglTrn, 'yyyy-MM-dd') AS TglTrn,
            ati.Nominal,
            FORMAT(ati2.TglJthTmp, 'yyyy-MM-dd') AS TglJthTmp,
            DATEDIFF(DAY, ati2.TglJthTmp, GETDATE()) AS UmurHutang
          FROM
            (
            SELECT
              ati.VendorId,
              ati.ParentTransaction AS NoFaktur,
              ROUND(SUM(ati.jumlahtrn), 2) AS Nominal
            FROM
              aptransactionitems ati
            GROUP BY
              ati.VendorId,
              ati.ParentTransaction
            HAVING
              SUM(ati.JumlahTrn) > 1
            ) as ati
          join ApTransactionItems as ati2 on 
            ati.NoFaktur = ati2.ParentTransaction
          JOIN Vendors v ON
            ati.vendorId = v.VendorId
          JOIN ApTransactionHeaders ath ON
            ati.NoFaktur = ath.NoBukti
          WHERE 1 = 1
            ${vendorFilter}
            ${dateFilter}
        ) AS grouped_results
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: hutang,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch hutang", errors: error });
  }
});


module.exports = router;
