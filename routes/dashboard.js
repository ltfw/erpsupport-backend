const express = require("express");
const moment = require("moment-timezone");
const { PrismaClient, Prisma } = require("../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ["warn", "error"] });
const prisma2026 = new PrismaClient2026({ log: ["warn", "error"] });

const TZ = "Asia/Jakarta";
// Roles that may view every cabang (same list as umur piutang)
const ALL_CABANG_ROLES = ["ADM", "FAS", "MKT-SANI"];

// Transactions from 2026 onward live in SDLdb002; earlier years in SDLdb001.
const dbForYear = (year) =>
  year >= 2026 ? { client: prisma2026, P: Prisma2026 } : { client: prisma, P: Prisma };

const toNumber = (v) => (v === null || v === undefined ? 0 : Number(v));

const resolveCabang = (user, requested) => {
  if (ALL_CABANG_ROLES.includes(user.role)) {
    return requested ? requested.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
  return user.cabang ? [user.cabang] : [];
};

// Item-level sales lines, valued to match the PNL report (GL):
//   Penjualan = HargaJual x Qty of non-return invoices -> "Total Penjualan" (410101)
//   Retur     = HargaJual x Qty of RS invoices         -> 420201
//   Nett      = signed, less the distributor discount  -> "Penjualan Bersih"
// The principal discount is borne by the principal, so the PNL never deducts it.
// BB- items are distributor discount claim invoices (DSI) that post to 710099
// Pendapatan Lain-lain, which the PNL excludes, so they are left out here too.
const salesLines = (P, { start, end, cabang, vendor }) => P.sql`
  SELECT
    sih.SalesInvoiceHeaderId,
    sih.TglFaktur,
    sih.KodeCc,
    sih.CustomerId,
    sih.TipeJual,
    i.KodeItem,
    i.NamaBarang,
    CASE WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' THEN 1 ELSE 0 END AS IsRetur,
    CASE WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' THEN 0
      ELSE ABS(sii.Qty) * sii.HargaJual END AS Penjualan,
    CASE WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS'
      THEN ABS(sii.Qty) * sii.HargaJual ELSE 0 END AS Retur,
    CASE WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' THEN -1 ELSE 1 END
      * ABS(sii.Qty) * sii.HargaJual
      * (1 - sii.DiscountDistributorPsn / 100) AS Nett
  FROM SalesInvoiceHeaders sih
  JOIN SalesInvoiceItems sii ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
  JOIN InventoryStocks is2 ON is2.InventoryStockId = sii.InventoryStockId
  JOIN Inventories i ON i.InventoryId = is2.InventoryId
  ${vendor ? P.sql`JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId AND is3.IsForSalesInvoice = 1` : P.sql``}
  WHERE sih.TglFaktur >= ${start} AND sih.TglFaktur < ${end}
    AND i.KodeItem NOT LIKE 'BB-%'
    ${cabang.length > 0 ? P.sql`AND sih.KodeCc IN (${P.join(cabang)})` : P.sql``}
    ${vendor ? P.sql`AND is3.KodeLgn = ${vendor}` : P.sql``}
`;

const fmt = (m) => m.format("YYYY-MM-DD");

const monthTotal = async (monthStart, cabang, vendor) => {
  const { client, P } = dbForYear(monthStart.year());
  const lines = salesLines(P, {
    start: fmt(monthStart),
    end: fmt(monthStart.clone().add(1, "month")),
    cabang,
    vendor,
  });
  const rows = await client.$queryRaw`SELECT SUM(l.Penjualan) AS Penjualan FROM (${lines}) l`;
  return toNumber(rows[0]?.Penjualan);
};

router.get("/summary", async (req, res) => {
  try {
    const now = moment.tz(TZ);
    const month = moment.tz(req.query.month || now.format("YYYY-MM"), "YYYY-MM", true, TZ);
    if (!month.isValid()) {
      return res.status(400).json({ error: "month must use the YYYY-MM format" });
    }
    if (month.isAfter(now, "month")) {
      return res.status(400).json({ error: "month cannot be in the future" });
    }

    const monthStart = month.clone().startOf("month");
    const monthEnd = monthStart.clone().add(1, "month");
    const yearStart = monthStart.clone().startOf("year");
    const cabang = resolveCabang(req.user, req.query.cabang?.trim());
    const vendor = req.user.vendor || null;

    const { client, P } = dbForYear(monthStart.year());
    const yearLines = salesLines(P, {
      start: fmt(yearStart),
      end: fmt(monthEnd),
      cabang,
      vendor,
    });
    const monthLines = salesLines(P, {
      start: fmt(monthStart),
      end: fmt(monthEnd),
      cabang,
      vendor,
    });

    const [trend, kpi, byCabang, byGroup, topProducts, topCustomers, prevMonthPenjualan] = await Promise.all([
      client.$queryRaw`
        SELECT MONTH(l.TglFaktur) AS Bulan,
          SUM(CASE WHEN l.TipeJual = 'E' THEN l.Penjualan ELSE 0 END) AS EKatalog,
          SUM(CASE WHEN l.TipeJual = 'E' THEN 0 ELSE l.Penjualan END) AS Reguler
        FROM (${yearLines}) l
        GROUP BY MONTH(l.TglFaktur)
        ORDER BY Bulan
      `,
      client.$queryRaw`
        SELECT
          SUM(l.Penjualan) AS Penjualan,
          SUM(l.Retur) AS Retur,
          SUM(l.Penjualan) - SUM(l.Retur) - SUM(l.Nett) AS DiskonDistributor,
          SUM(l.Nett) AS Bersih,
          COUNT(DISTINCT CASE WHEN l.IsRetur = 0 THEN l.SalesInvoiceHeaderId END) AS Faktur,
          COUNT(DISTINCT CASE WHEN l.IsRetur = 0 THEN l.CustomerId END) AS Pelanggan
        FROM (${monthLines}) l
      `,
      client.$queryRaw`
        SELECT l.KodeCc, d.NamaDept, SUM(l.Penjualan) AS Penjualan
        FROM (${monthLines}) l
        LEFT JOIN Departments d ON d.KodeDept = l.KodeCc
        GROUP BY l.KodeCc, d.NamaDept
        ORDER BY Penjualan DESC
      `,
      client.$queryRaw`
        SELECT cg.CustomerGroupName AS Grup, SUM(l.Penjualan) AS Penjualan, COUNT(DISTINCT l.CustomerId) AS Pelanggan
        FROM (${monthLines}) l
        JOIN Customers c ON c.CustomerId = l.CustomerId
        JOIN CustomerGroups cg ON cg.CustomerGroupId = c.CustomerGroupId
        GROUP BY cg.CustomerGroupName
        ORDER BY Penjualan DESC
      `,
      client.$queryRaw`
        SELECT TOP 10 l.KodeItem, l.NamaBarang, SUM(l.Penjualan) AS Penjualan
        FROM (${monthLines}) l
        GROUP BY l.KodeItem, l.NamaBarang
        ORDER BY Penjualan DESC
      `,
      client.$queryRaw`
        SELECT TOP 10 c.KodeLgn, c.NamaLgn, d.NamaDept, SUM(l.Penjualan) AS Penjualan
        FROM (${monthLines}) l
        JOIN Customers c ON c.CustomerId = l.CustomerId
        LEFT JOIN Departments d ON d.KodeDept = l.KodeCc
        GROUP BY c.KodeLgn, c.NamaLgn, d.NamaDept
        ORDER BY Penjualan DESC
      `,
      monthTotal(monthStart.clone().subtract(1, "month"), cabang, vendor),
    ]);

    // Receivables are customer-level, so vendor (principal) users don't see them.
    let piutang = null;
    if (!vendor) {
      const { sql, join } = Prisma2026;
      const cabangFilter = cabang.length > 0 ? sql`AND c.KodeDept IN (${join(cabang)})` : sql``;
      const outstanding = sql`
        SELECT c.KodeDept, SUM(ati.JumlahTrn) AS Outstanding,
          DATEDIFF(DAY, MIN(CAST(ati.TglJtpFaktur AS date)), CAST(GETDATE() AS date)) AS HariLewat
        FROM ArTransactionItems ati
        JOIN Customers c ON c.CustomerId = ati.CustomerId
        WHERE 1 = 1 ${cabangFilter}
        GROUP BY c.KodeDept, ati.ParentTransaction
        HAVING SUM(ati.JumlahTrn) > 0
      `;
      const [aging, perCabang] = await Promise.all([
        prisma2026.$queryRaw`
          SELECT
            COUNT(*) AS Faktur,
            SUM(o.Outstanding) AS Total,
            SUM(CASE WHEN o.HariLewat <= 0 THEN o.Outstanding ELSE 0 END) AS BelumJatuhTempo,
            SUM(CASE WHEN o.HariLewat BETWEEN 1 AND 30 THEN o.Outstanding ELSE 0 END) AS Lewat1_30,
            SUM(CASE WHEN o.HariLewat BETWEEN 31 AND 60 THEN o.Outstanding ELSE 0 END) AS Lewat31_60,
            SUM(CASE WHEN o.HariLewat BETWEEN 61 AND 90 THEN o.Outstanding ELSE 0 END) AS Lewat61_90,
            SUM(CASE WHEN o.HariLewat > 90 THEN o.Outstanding ELSE 0 END) AS Lewat90
          FROM (${outstanding}) o
        `,
        prisma2026.$queryRaw`
          SELECT o.KodeDept, d.NamaDept,
            SUM(o.Outstanding) AS Total,
            SUM(CASE WHEN o.HariLewat > 0 THEN o.Outstanding ELSE 0 END) AS JatuhTempo
          FROM (${outstanding}) o
          LEFT JOIN Departments d ON d.KodeDept = o.KodeDept
          GROUP BY o.KodeDept, d.NamaDept
          ORDER BY Total DESC
        `,
      ]);
      const a = aging[0] || {};
      piutang = {
        total: toNumber(a.Total),
        faktur: toNumber(a.Faktur),
        aging: [
          { bucket: "Belum jatuh tempo", value: toNumber(a.BelumJatuhTempo) },
          { bucket: "1–30 hari", value: toNumber(a.Lewat1_30) },
          { bucket: "31–60 hari", value: toNumber(a.Lewat31_60) },
          { bucket: "61–90 hari", value: toNumber(a.Lewat61_90) },
          { bucket: "> 90 hari", value: toNumber(a.Lewat90) },
        ],
        perCabang: perCabang.map((r) => ({
          kode: r.KodeDept,
          nama: r.NamaDept || r.KodeDept,
          total: toNumber(r.Total),
          jatuhTempo: toNumber(r.JatuhTempo),
        })),
        asOf: now.format("YYYY-MM-DD"),
      };
    }

    const k = kpi[0] || {};
    const trendByMonth = new Map(trend.map((r) => [Number(r.Bulan), r]));
    const ytd = trend.reduce((sum, r) => sum + toNumber(r.EKatalog) + toNumber(r.Reguler), 0);

    res.json({
      period: {
        month: monthStart.format("YYYY-MM"),
        isCurrentMonth: monthStart.isSame(now, "month"),
        asOfDate: now.format("YYYY-MM-DD"),
      },
      scope: { cabang, vendor: Boolean(vendor), canChooseCabang: ALL_CABANG_ROLES.includes(req.user.role) },
      penjualan: {
        // "Total Penjualan" in the PNL; the next three reconcile it to "Penjualan Bersih"
        penjualan: toNumber(k.Penjualan),
        penjualanBulanLalu: prevMonthPenjualan,
        retur: toNumber(k.Retur),
        diskonDistributor: toNumber(k.DiskonDistributor),
        penjualanBersih: toNumber(k.Bersih),
        faktur: toNumber(k.Faktur),
        pelanggan: toNumber(k.Pelanggan),
        ytd,
        trend: Array.from({ length: monthStart.month() + 1 }, (_, idx) => {
          const r = trendByMonth.get(idx + 1);
          return { bulan: idx + 1, eKatalog: toNumber(r?.EKatalog), reguler: toNumber(r?.Reguler) };
        }),
        perCabang: byCabang.map((r) => ({
          kode: r.KodeCc,
          nama: r.NamaDept || r.KodeCc,
          penjualan: toNumber(r.Penjualan),
        })),
        perGrup: byGroup.map((r) => ({
          grup: r.Grup,
          penjualan: toNumber(r.Penjualan),
          pelanggan: toNumber(r.Pelanggan),
        })),
        topProduk: topProducts.map((r) => ({ kode: r.KodeItem, nama: r.NamaBarang, penjualan: toNumber(r.Penjualan) })),
        topPelanggan: topCustomers.map((r) => ({
          kode: r.KodeLgn,
          nama: r.NamaLgn,
          cabang: r.NamaDept,
          penjualan: toNumber(r.Penjualan),
        })),
      },
      piutang,
    });
  } catch (error) {
    console.error("Failed to build dashboard summary:", error);
    res.status(500).json({ error: "Failed to build dashboard summary" });
  }
});

module.exports = router;
