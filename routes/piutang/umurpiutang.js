const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const parentTransaction = req.query.parentTransaction?.trim() || '';
    const skip = (page - 1) * pageSize;
    const searchQuery = `%${search}%`;
    const cabang = req.query.cabang?.trim() || '';

    let cabangArray = [];
    const allowedRoles = ['ADM', 'FAS'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang.split(',').map(s => s.trim());
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }

    console.log("user role:", userRole, "Cabang Array:", cabangArray, "ParentTransaction:", parentTransaction);

    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [umurPiutang, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          d.NamaDept,
          c.KodeLgn,
          c.NamaLgn,
          be.BusinessEntityName,
          c.KodeSyarat,
          ati.parenttransaction AS NoFaktur,
          FORMAT(CAST(ati.TglTrnFaktur AS date), 'dd/MM/yyyy') AS TglFaktur,
          FORMAT(CAST(ati.TglJtpFaktur AS date), 'dd/MM/yyyy') AS TglJtpFakturAsli,
          FORMAT(
            CASE
              WHEN cm.TopInternal IS NOT NULL
                THEN DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date))
              ELSE CAST(ati.TglJtpFaktur AS date)
            END,
            'dd/MM/yyyy'
          ) AS TglJtpFakturInternal,
          DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) AS AgingARAsli,
          CASE
            WHEN cm.TopInternal IS NOT NULL
              THEN DATEDIFF(DAY, DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date)), GETDATE())
            ELSE DATEDIFF(DAY, CAST(ati.TglJtpFaktur AS date), GETDATE())
          END AS AgingARInternal,
          CAST(ath.JumlahTrn AS bigint) AS TotalFaktur,
          CAST(ath.JumlahTrn - SUM(ati.JumlahTrn) AS bigint) AS TotalBayar,
          CAST(SUM(ati.JumlahTrn) AS bigint) AS OutstandingAR,
          CASE
            WHEN DATEDIFF(DAY, CAST(ati.TglJtpFaktur AS date), GETDATE()) < 0 THEN 0
            ELSE DATEDIFF(DAY, CAST(ati.TglJtpFaktur AS date), GETDATE())
          END AS OverDueAsli,
          CASE
            WHEN DATEDIFF(DAY, DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date)), GETDATE()) < 0 THEN 0
            ELSE DATEDIFF(DAY, DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date)), GETDATE())
          END AS OverDueInternal,
          CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 0   AND 30  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE '0' END AS [0-30],
          CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 31  AND 60  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE '0' END AS [31-60],
          CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 61  AND 90  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE '0' END AS [61-90],
          CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 91  AND 120 THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE '0' END AS [91-120],
          CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) > 120               THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE '0' END AS [>120],
          s.NamaSales,
          sih.PoLanggan,
          rd.RayonCode
        FROM artransactionitems ati
        LEFT JOIN ArTransactionHeaders ath on ati.ParentTransaction = ath.NoBukti
        JOIN customers c ON c.Customerid = ati.customerid
        JOIN RayonDistricts rd on c.DistrictId = rd.DistrictId
        LEFT JOIN SalesInvoiceHeaders sih ON sih.NoBukti = ati.parenttransaction
        JOIN departments d ON d.KodeDept = c.KodeDept
        JOIN BusinessEntities be ON be.BusinessEntityId = c.BusinessEntityId
        JOIN salesmen s ON s.KodeSales = c.KodeSales
        LEFT JOIN ERPSupport.dbo.CustomerMapping cm on c.KodeLgn = cm.KodeCustomer
        WHERE
          1 = 1
          ${parentTransaction ? sql`AND ati.ParentTransaction = ${parentTransaction}` : sql``}
          AND (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})
          ${cabangArray.length > 0 ? sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
        GROUP BY
          d.NamaDept,
          c.KodeLgn,
          c.NamaLgn,
          be.BusinessEntityName,
          c.KodeSyarat,
          ati.parenttransaction,
          ati.TglTrnFaktur,
          ati.TglJtpFaktur,
          cm.TopInternal,
          s.NamaSales,
          sih.GrandTotal,
          ath.JumlahTrn,
          sih.PoLanggan,
          rd.RayonCode
        HAVING SUM(ati.JumlahTrn) > 0
        ORDER BY c.KodeLgn
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as total FROM (
          SELECT
            d.NamaDept,
            c.KodeLgn,
            c.NamaLgn,
            be.BusinessEntityName,
            c.KodeSyarat,
            ati.parenttransaction as NoFaktur,
            cast(ati.TglTrnFaktur as date) as TglFaktur,
            CAST(ati.TglJtpFaktur AS date) AS TglJtpFakturAsli,
            case when cm.TopInternal is not null then DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date))
            else CAST(ati.TglJtpFaktur AS date) end as TglJtpFakturInternal,
            DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date),GETDATE()) AS AgingARAsli,
            CAST(ath.JumlahTrn AS bigint) as TotalFaktur,
            CAST(ath.JumlahTrn - SUM(ati.JumlahTrn) AS bigint) as TotalBayar,
            CAST(SUM(ati.JumlahTrn) AS bigint) AS OutstandingAR,
            CASE 
              WHEN DATEDIFF(DAY, CAST(ati.TglJtpFaktur AS date), GETDATE()) < 0 THEN 0 
              ELSE DATEDIFF(DAY, CAST(ati.TglJtpFaktur AS date), GETDATE()) 
            END AS OverDueAsli,
            CASE 
              WHEN DATEDIFF(DAY, DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date)), GETDATE()) < 0 THEN 0 
              ELSE DATEDIFF(DAY, DATEADD(day, cm.TopInternal, CAST(ati.TglTrnFaktur AS date)), GETDATE()) 
            END AS OverDueInternal,
            CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 0   AND 30  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE 0 END AS [0-30],
            CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 31  AND 60  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE 0 END AS [31-60],
            CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 61  AND 90  THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE 0 END AS [61-90],
            CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) BETWEEN 91  AND 120 THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE 0 END AS [91-120],
            CASE WHEN DATEDIFF(DAY, CAST(ati.TglTrnFaktur AS date), GETDATE()) > 120               THEN CAST(SUM(ati.JumlahTrn) AS bigint) ELSE 0 END AS [>120],
            s.NamaSales,
            sih.PoLanggan,
            rd.RayonCode
          FROM artransactionitems ati
          LEFT JOIN ArTransactionHeaders ath on ati.ParentTransaction = ath.NoBukti
          JOIN customers c ON c.Customerid = ati.customerid
          JOIN RayonDistricts rd on c.DistrictId = rd.DistrictId
          LEFT JOIN SalesInvoiceHeaders sih ON sih.NoBukti = ati.parenttransaction
          JOIN departments d ON d.KodeDept = c.KodeDept
          JOIN BusinessEntities be ON be.BusinessEntityId = c.BusinessEntityId
          JOIN salesmen s ON s.KodeSales = c.KodeSales
          LEFT JOIN ERPSupport.dbo.CustomerMapping cm on c.KodeLgn = cm.KodeCustomer
          WHERE
            1 = 1
            ${parentTransaction ? sql`AND ati.ParentTransaction = ${parentTransaction}` : sql``}
            AND (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})
            ${cabangArray.length > 0 ? sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
          GROUP BY
            d.NamaDept,
            c.KodeLgn,
            c.NamaLgn,
            be.BusinessEntityName,
            c.KodeSyarat,
            ati.parenttransaction,
            ati.TglTrnFaktur,
            ati.TglJtpFaktur,
            cm.TopInternal,
            s.NamaSales,
            sih.GrandTotal,
            ath.JumlahTrn,
            sih.PoLanggan,
            rd.RayonCode
          HAVING SUM(ati.JumlahTrn) > 0
        ) AS grouped_results;
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: umurPiutang,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch umur piutang", errors: error });
  }
});

module.exports = router;
