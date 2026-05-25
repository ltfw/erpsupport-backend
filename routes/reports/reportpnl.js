const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const prisma2026 = new PrismaClient2026({ log: ['warn', 'error'], });

router.get("/report", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 30;
    const skip = (page - 1) * pageSize;
    const month = parseInt(req.query.bulan) || new Date().getMonth() + 1;
    const yearNow = parseInt(req.query.tahun_now) || new Date().getFullYear();
    const yearPrev = parseInt(req.query.tahun_prev) || yearNow - 1;

    const prismaBase = yearNow === 2026 ? prisma2026 : prisma;
    const PrismaWhere = yearNow === 2026 ? Prisma2026 : Prisma;

    const baseQuery = PrismaWhere.sql`
      DECLARE @bulan      INT = ${month}
      DECLARE @tahun_now  INT = ${yearNow}
      DECLARE @tahun_prev INT = ${yearPrev}

      ;WITH AllData AS (
          -- 2026 data
          SELECT
              g.KodeGl COLLATE DATABASE_DEFAULT AS KodeGl,
              g.NamaGl COLLATE DATABASE_DEFAULT AS NamaGl,
              year(gti.TglTrn) as tahun,
              month(gti.TglTrn) as bulan,
              case when g.KodeGl = '410101' or g.kodegl='710001' then abs(sum(gti.JlhDebit)-sum(gti.JlhKredit))
              else (sum(gti.JlhDebit)-sum(gti.JlhKredit)) end as total
          FROM SDLdb002.dbo.GLAccountTransactionItems gti
          JOIN SDLdb002.dbo.GLAccounts g ON gti.GeneralLedgerId = g.GeneralLedgerId
          WHERE (g.KodeGl like '4%' OR g.KodeGl like '5%' OR g.KodeGl like '6%'
              OR g.KodeGl like '7%' OR g.KodeGl like '8%' OR g.KodeGl like '9%')
              AND month(gti.TglTrn) = @bulan
              AND year(gti.TglTrn)  = @tahun_now
              AND g.KodeGl <> '710099'
          GROUP BY g.KodeGl, g.NamaGl, year(gti.TglTrn), month(gti.TglTrn)

          UNION ALL

          -- 2025 data
          SELECT
              g.KodeGl COLLATE DATABASE_DEFAULT AS KodeGl,
              g.NamaGl COLLATE DATABASE_DEFAULT AS NamaGl,
              year(gti.TglTrn) as tahun,
              month(gti.TglTrn) as bulan,
              case when g.KodeGl = '410101' or g.kodegl='710001' then abs(sum(gti.JlhDebit)-sum(gti.JlhKredit))
              else (sum(gti.JlhDebit)-sum(gti.JlhKredit)) end as total
          FROM SDLdb001.dbo.GLAccountTransactionItems gti
          JOIN SDLdb001.dbo.GLAccounts g ON gti.GeneralLedgerId = g.GeneralLedgerId
          WHERE (g.KodeGl like '4%' OR g.KodeGl like '5%' OR g.KodeGl like '6%'
              OR g.KodeGl like '7%' OR g.KodeGl like '8%' OR g.KodeGl like '9%')
              AND month(gti.TglTrn) = @bulan
              AND year(gti.TglTrn)  = @tahun_prev
              AND g.KodeGl <> '710099'
          GROUP BY g.KodeGl, g.NamaGl, year(gti.TglTrn), month(gti.TglTrn)
      ),
      Grouped AS (
          SELECT
              CASE
                  WHEN KodeGl LIKE '601%' OR KodeGl LIKE '602%'      THEN '601099-602199'
                  WHEN KodeGl LIKE '720%' OR KodeGl LIKE '810%'
                       OR KodeGl LIKE '820%'                          THEN '720099-810099-820099'
                  ELSE KodeGl
              END AS KodeGl,
              CASE
                  WHEN KodeGl LIKE '601%' OR KodeGl LIKE '602%'      THEN 'ALL. EXPENSE'
                  WHEN KodeGl LIKE '720%' OR KodeGl LIKE '810%'
                       OR KodeGl LIKE '820%'                          THEN 'Total Beban Lain-lain'
                  ELSE NamaGl
              END AS NamaGl,
              tahun,
              total
          FROM AllData
      ),
      Pivoted AS (
          SELECT
              KodeGl,
              NamaGl,
              SUM(CASE WHEN tahun = @tahun_now  THEN total ELSE 0 END) as TahunIni,
              SUM(CASE WHEN tahun = @tahun_prev THEN total ELSE 0 END) as TahunLalu
          FROM Grouped
          GROUP BY KodeGl, NamaGl
      ),
      Calc AS (
          SELECT
              MAX(CASE WHEN KodeGl = '410101'               THEN TahunIni  ELSE 0 END) as GrossSales_Now,
              MAX(CASE WHEN KodeGl = '410101'               THEN TahunLalu ELSE 0 END) as GrossSales_Prev,
              MAX(CASE WHEN KodeGl = '420102-01'            THEN TahunIni  ELSE 0 END) as DiscPrinc_Now,
              MAX(CASE WHEN KodeGl = '420102-01'            THEN TahunLalu ELSE 0 END) as DiscPrinc_Prev,
              MAX(CASE WHEN KodeGl = '420102-02'            THEN TahunIni  ELSE 0 END) as DiscDist_Now,
              MAX(CASE WHEN KodeGl = '420102-02'            THEN TahunLalu ELSE 0 END) as DiscDist_Prev,
              MAX(CASE WHEN KodeGl = '420201'               THEN TahunIni  ELSE 0 END) as Retur_Now,
              MAX(CASE WHEN KodeGl = '420201'               THEN TahunLalu ELSE 0 END) as Retur_Prev,
              MAX(CASE WHEN KodeGl = '510101'               THEN TahunIni  ELSE 0 END) as HPP_Now,
              MAX(CASE WHEN KodeGl = '510101'               THEN TahunLalu ELSE 0 END) as HPP_Prev,
              MAX(CASE WHEN KodeGl = '601099-602199'        THEN TahunIni  ELSE 0 END) as Expense_Now,
              MAX(CASE WHEN KodeGl = '601099-602199'        THEN TahunLalu ELSE 0 END) as Expense_Prev,
              MAX(CASE WHEN KodeGl = '710001'               THEN TahunIni  ELSE 0 END) as PendLain_Now,
              MAX(CASE WHEN KodeGl = '710001'               THEN TahunLalu ELSE 0 END) as PendLain_Prev,
              MAX(CASE WHEN KodeGl = '720099-810099-820099' THEN TahunIni  ELSE 0 END) as BebanLain_Now,
              MAX(CASE WHEN KodeGl = '720099-810099-820099' THEN TahunLalu ELSE 0 END) as BebanLain_Prev,
              MAX(CASE WHEN KodeGl = '910002'               THEN TahunIni  ELSE 0 END) as PPh_Now,
              MAX(CASE WHEN KodeGl = '910002'               THEN TahunLalu ELSE 0 END) as PPh_Prev
          FROM Pivoted
      ),
      SubTotals AS (
          SELECT
              -- carry all raw values forward
              GrossSales_Now,  GrossSales_Prev,
              DiscPrinc_Now,   DiscPrinc_Prev,
              DiscDist_Now,    DiscDist_Prev,
              Retur_Now,       Retur_Prev,
              HPP_Now,         HPP_Prev,
              Expense_Now,     Expense_Prev,
              PendLain_Now,    PendLain_Prev,
              BebanLain_Now,   BebanLain_Prev,
              PPh_Now,         PPh_Prev,
              -- NET SALES = GrossSales - Retur - DiscDist
              (GrossSales_Now  - Retur_Now  - DiscDist_Now)  as NetSales_Now,
              (GrossSales_Prev - Retur_Prev - DiscDist_Prev) as NetSales_Prev,
              -- GROSS PROFIT = NetSales - HPP
              (GrossSales_Now  - Retur_Now  - DiscDist_Now  - HPP_Now)  as GrossProfit_Now,
              (GrossSales_Prev - Retur_Prev - DiscDist_Prev - HPP_Prev) as GrossProfit_Prev,
              -- LABA OPERASIONAL = GrossProfit - Expense
              (GrossSales_Now  - Retur_Now  - DiscDist_Now  - HPP_Now  - Expense_Now)  as LabaOps_Now,
              (GrossSales_Prev - Retur_Prev - DiscDist_Prev - HPP_Prev - Expense_Prev) as LabaOps_Prev,
              -- LABA SEBELUM PAJAK = LabaOps + PendLain - BebanLain
              (GrossSales_Now  - Retur_Now  - DiscDist_Now  - HPP_Now  - Expense_Now  + PendLain_Now  - BebanLain_Now)  as LabaSebelumPajak_Now,
              (GrossSales_Prev - Retur_Prev - DiscDist_Prev - HPP_Prev - Expense_Prev + PendLain_Prev - BebanLain_Prev) as LabaSebelumPajak_Prev,
              -- LABA SESUDAH PAJAK = LabaSebelumPajak - PPh
              (GrossSales_Now  - Retur_Now  - DiscDist_Now  - HPP_Now  - Expense_Now  + PendLain_Now  - BebanLain_Now  - PPh_Now)  as LabaSesudahPajak_Now,
              (GrossSales_Prev - Retur_Prev - DiscDist_Prev - HPP_Prev - Expense_Prev + PendLain_Prev - BebanLain_Prev - PPh_Prev) as LabaSesudahPajak_Prev
          FROM Calc
      ),
      FinalReport AS (
        -- ── Data rows from Pivoted ──────────────────────────────────────
        SELECT KodeGl, NamaGl, TahunIni, TahunLalu,
            CASE KodeGl
                WHEN '410101'               THEN 1
                WHEN '420102-01'            THEN 2
                WHEN '420102-02'            THEN 5
                WHEN '420201'               THEN 7
                WHEN '510101'               THEN 10
                WHEN '601099-602199'        THEN 13
                WHEN '710001'               THEN 16
                WHEN '720099-810099-820099' THEN 18
                WHEN '910002'               THEN 21
                ELSE 99
            END as SortOrder
        FROM Pivoted

        UNION ALL

        -- % Disc Princ to Gross Sales
        SELECT '', '% Disc Princ to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(DiscPrinc_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(DiscPrinc_Prev / GrossSales_Prev, 2) END,
            3 FROM SubTotals

        UNION ALL

        -- KLAIM DISKON
        SELECT '', 'KLAIM DISKON', DiscPrinc_Now, DiscPrinc_Prev, 4 FROM SubTotals

        UNION ALL

        -- % Disc Dist to Gross Sales
        SELECT '', '% Disc Dist to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(DiscDist_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(DiscDist_Prev / GrossSales_Prev, 2) END,
            6 FROM SubTotals

        UNION ALL

        -- % Retur to Gross Sales
        SELECT '', '% Retur to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(Retur_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(Retur_Prev / GrossSales_Prev, 2) END,
            8 FROM SubTotals

        UNION ALL

        -- NET SALES
        SELECT '', 'NET SALES', NetSales_Now, NetSales_Prev, 9 FROM SubTotals

        UNION ALL

        -- % HPP to Gross Sales
        SELECT '', '% HPP to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(HPP_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(HPP_Prev / GrossSales_Prev, 2) END,
            11 FROM SubTotals

        UNION ALL

        -- GROSS PROFIT
        SELECT '', 'GROSS PROFIT', GrossProfit_Now, GrossProfit_Prev, 12 FROM SubTotals

        UNION ALL

        -- % Expense to Gross Sales
        SELECT '', '% Expense to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(Expense_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(Expense_Prev / GrossSales_Prev, 2) END,
            14 FROM SubTotals

        UNION ALL

        -- LABA OPERASIONAL
        SELECT '', 'LABA OPERASIONAL', LabaOps_Now, LabaOps_Prev, 15 FROM SubTotals

        UNION ALL

        -- % Pendapatan Lain-lain to Gross Sales
        SELECT '', '% Pendapatan Lain-lain to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(PendLain_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(PendLain_Prev / GrossSales_Prev, 2) END,
            17 FROM SubTotals

        UNION ALL

        -- % Total Beban Lain-lain to Gross Sales
        SELECT '', '% Total Beban Lain-lain to Gross Sales',
            CASE WHEN GrossSales_Now  = 0 THEN 0 ELSE ROUND(BebanLain_Now  / GrossSales_Now,  2) END,
            CASE WHEN GrossSales_Prev = 0 THEN 0 ELSE ROUND(BebanLain_Prev / GrossSales_Prev, 2) END,
            19 FROM SubTotals

        UNION ALL

        -- LABA BERSIH SEBELUM PAJAK
        SELECT '', 'LABA BERSIH SEBELUM PAJAK',
            LabaSebelumPajak_Now, LabaSebelumPajak_Prev,
            20 FROM SubTotals

        UNION ALL

        -- LABA BERSIH SESUDAH PAJAK
        SELECT '', 'LABA BERSIH SESUDAH PAJAK',
            LabaSesudahPajak_Now, LabaSesudahPajak_Prev,
            22 FROM SubTotals
    )
      SELECT
          KodeGl,
          NamaGl,
          CASE WHEN NamaGl = 'KLAIM DISKON'
                THEN '(' + CAST(TahunIni  AS NVARCHAR) + ')'
                ELSE CAST(TahunIni  AS NVARCHAR)
            END as TahunIni,
            CASE WHEN NamaGl = 'KLAIM DISKON'
                THEN '(' + CAST(TahunLalu AS NVARCHAR) + ')'
                ELSE CAST(TahunLalu AS NVARCHAR)
            END as TahunLalu,
            CASE
                WHEN TahunLalu = 0 THEN NULL
                ELSE FORMAT((TahunIni - TahunLalu) / ABS(TahunLalu), 'P0')
            END as Growth
      FROM FinalReport
      ORDER BY SortOrder
    `;

    const data = await prismaBase.$queryRaw`${baseQuery}`;
    const total = data.length > 0 ? data.length : 0;

    res.json({
      data: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data", errors: error });
  }
});

module.exports = router;
