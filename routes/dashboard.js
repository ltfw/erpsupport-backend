const express = require("express");
const moment = require("moment-timezone");
const { PrismaClient, Prisma } = require("../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../generated/dbtrans2026");
const targets = require("../services/dashboardTargets");
const { customers: HO_CUSTOMER_LIST } = require("../config/ho-customers.json");

const router = express.Router();
const prisma = new PrismaClient({ log: ["warn", "error"] });
const prisma2026 = new PrismaClient2026({ log: ["warn", "error"] });

const TZ = "Asia/Jakarta";
// Roles that may view every cabang (same list as umur piutang)
const ALL_CABANG_ROLES = ["ADM", "FAS", "MKT-SANI"];
// Roles that may change the monthly sales/collection targets
const TARGET_EDIT_ROLES = ["ADM", "FAS"];

// Transactions from 2026 onward live in SDLdb002; earlier years in SDLdb001.
const dbForYear = (year) =>
  year >= 2026 ? { client: prisma2026, P: Prisma2026 } : { client: prisma, P: Prisma };

// The ERP books Sidoarjo's business under Head Office (00). Only the customers listed in
// config/ho-customers.json are really Head Office; every other 00 transaction is Sidoarjo.
const HO = "00";
const SIDOARJO = "01";
const HO_CUSTOMERS = [...new Set(HO_CUSTOMER_LIST.map((c) => c.kode))];

// SQL for the cabang a row belongs to on the dashboard. kodeCc and kodeLgn are trusted column names.
const effectiveCabang = (P, kodeCc, kodeLgn) => {
  const cc = P.raw(kodeCc);
  const notHoCustomer =
    HO_CUSTOMERS.length > 0
      ? P.sql`AND ISNULL(${P.raw(kodeLgn)}, '') NOT IN (${P.join(HO_CUSTOMERS)})`
      : P.sql``;
  return P.sql`CASE WHEN ${cc} = ${HO} ${notHoCustomer} THEN ${SIDOARJO} ELSE ${cc} END`;
};

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
// Distributor discount claim invoices (YY/DSI/HO/MM/nnnnn, BB- items) post to 710099
// Pendapatan Lain-lain, which the PNL excludes, so they are left out here too.
const salesLines = (P, { start, end, cabang, vendor }) => {
  const cabangOf = effectiveCabang(P, "sih.KodeCc", "cu.KodeLgn");
  return P.sql`
  SELECT
    sih.SalesInvoiceHeaderId,
    sih.TglFaktur,
    ${cabangOf} AS KodeCc,
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
  JOIN Customers cu ON cu.CustomerId = sih.CustomerId
  JOIN SalesInvoiceItems sii ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
  JOIN InventoryStocks is2 ON is2.InventoryStockId = sii.InventoryStockId
  JOIN Inventories i ON i.InventoryId = is2.InventoryId
  ${vendor ? P.sql`JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId AND is3.IsForSalesInvoice = 1` : P.sql``}
  WHERE sih.TglFaktur >= ${start} AND sih.TglFaktur < ${end}
    AND i.KodeItem NOT LIKE 'BB-%'
    AND sih.NoBukti NOT LIKE '__/DSI/%'
    ${cabang.length > 0 ? P.sql`AND ${cabangOf} IN (${P.join(cabang)})` : P.sql``}
    ${vendor ? P.sql`AND is3.KodeLgn = ${vendor}` : P.sql``}
`;
};

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

// Cash collected in the month, same definition as the Pelunasan Piutang report (incl. SSP).
// Payments on discount claim invoices (DSI) come from the principal, not customers, so
// they don't count toward collection.
const collectionTotal = async (monthStart, cabang) => {
  const { client, P } = dbForYear(monthStart.year());
  const rows = await client.$queryRaw`
    SELECT
      SUM(CASE WHEN i.TypeTrn IN ('K', 'M') THEN -i.JumlahTrn ELSE 0 END)
        - SUM(CASE WHEN i.TypeTrn = 'D' THEN i.JumlahTrn ELSE 0 END)
        + SUM(CASE WHEN i.TypeTrn = 'O' AND i.IsArSsp = 1 THEN -i.JumlahTrn ELSE 0 END) AS Collection
    FROM ArTransactionItems i
    LEFT JOIN Customers cu ON cu.CustomerId = i.CustomerId
    WHERE i.TglTrn >= ${fmt(monthStart)} AND i.TglTrn < ${fmt(monthStart.clone().add(1, "month"))}
      AND (i.TypeTrn IN ('K', 'M', 'D') OR (i.TypeTrn = 'O' AND i.IsArSsp = 1))
      AND i.ParentTransaction <> i.NoBukti
      AND i.ParentTransaction NOT LIKE '__/DSI/%'
      ${cabang.length > 0 ? P.sql`AND ${effectiveCabang(P, "i.KodeCc", "cu.KodeLgn")} IN (${P.join(cabang)})` : P.sql``}
  `;
  return toNumber(rows[0]?.Collection);
};

// Sum the cabang targets in scope; null when none of them has a target set
const sumTargets = (monthTargets, cabang) => {
  const codes = cabang.length > 0 ? cabang : Object.keys(monthTargets);
  const total = { sales: null, collection: null };
  for (const code of codes) {
    for (const key of ["sales", "collection"]) {
      const v = monthTargets[code]?.[key];
      if (typeof v === "number") total[key] = (total[key] || 0) + v;
    }
  }
  return total;
};

const parseMonth = (raw) => moment.tz(raw || "", "YYYY-MM", true, TZ);

router.get("/targets", async (req, res) => {
  if (!TARGET_EDIT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Tidak punya akses mengatur target" });
  }
  const month = parseMonth(req.query.month);
  if (!month.isValid()) {
    return res.status(400).json({ error: "month must use the YYYY-MM format" });
  }
  try {
    const key = month.format("YYYY-MM");
    const [departments, monthTargets] = await Promise.all([
      prisma2026.$queryRaw`SELECT KodeDept, NamaDept FROM Departments ORDER BY KodeDept`,
      targets.getMonth(key),
    ]);
    res.json({
      month: key,
      cabang: departments.map((d) => ({
        kode: d.KodeDept,
        nama: d.NamaDept,
        sales: monthTargets[d.KodeDept]?.sales ?? null,
        collection: monthTargets[d.KodeDept]?.collection ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to read dashboard targets:", error);
    res.status(500).json({ error: "Failed to read dashboard targets" });
  }
});

router.put("/targets", async (req, res) => {
  if (!TARGET_EDIT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Tidak punya akses mengatur target" });
  }
  const month = parseMonth(req.body?.month);
  if (!month.isValid()) {
    return res.status(400).json({ error: "month must use the YYYY-MM format" });
  }
  const rows = req.body?.targets;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "targets must be an array" });
  }
  const valid = (v) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
  try {
    const departments = await prisma2026.$queryRaw`SELECT KodeDept FROM Departments`;
    const known = new Set(departments.map((d) => d.KodeDept));
    const perCabang = {};
    for (const r of rows) {
      const sales = r?.sales ?? null;
      const collection = r?.collection ?? null;
      if (!known.has(r?.kode) || !valid(sales) || !valid(collection)) {
        return res.status(400).json({ error: `Target cabang ${r?.kode ?? "?"} tidak valid` });
      }
      if (sales !== null || collection !== null) perCabang[r.kode] = { sales, collection };
    }
    await targets.saveMonth(month.format("YYYY-MM"), perCabang);
    console.log("dashboard targets saved =>", month.format("YYYY-MM"), "by", req.user.username);
    res.json({ month: month.format("YYYY-MM"), saved: Object.keys(perCabang).length });
  } catch (error) {
    console.error("Failed to save dashboard targets:", error);
    res.status(500).json({ error: "Failed to save dashboard targets" });
  }
});

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

    const canChooseCabang = ALL_CABANG_ROLES.includes(req.user.role);
    const [trend, kpi, byCabang, byGroup, topProducts, topCustomers, prevMonthPenjualan, collection, monthTargets, cabangList] = await Promise.all([
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
        SELECT TOP 10 c.KodeLgn, c.NamaLgn, l.KodeCc, SUM(l.Penjualan) AS Penjualan
        FROM (${monthLines}) l
        JOIN Customers c ON c.CustomerId = l.CustomerId
        GROUP BY c.KodeLgn, c.NamaLgn, l.KodeCc
        ORDER BY Penjualan DESC
      `,
      monthTotal(monthStart.clone().subtract(1, "month"), cabang, vendor),
      // Targets are distributor-wide, so vendor (principal) users don't see them
      vendor ? null : collectionTotal(monthStart, cabang),
      vendor ? null : targets.getMonth(monthStart.format("YYYY-MM")),
      // Cabang names come from SDLdb002, the current master (SDLdb001 lacks newer cabang like Sidoarjo)
      prisma2026.$queryRaw`SELECT KodeDept, NamaDept FROM Departments ORDER BY KodeDept`,
    ]);

    // Receivables are customer-level, so vendor (principal) users don't see them.
    let piutang = null;
    if (!vendor) {
      const { sql, join } = Prisma2026;
      const cabangOf = effectiveCabang(Prisma2026, "c.KodeDept", "c.KodeLgn");
      const cabangFilter = cabang.length > 0 ? sql`AND ${cabangOf} IN (${join(cabang)})` : sql``;
      const outstanding = sql`
        SELECT x.KodeDept, SUM(x.JumlahTrn) AS Outstanding,
          DATEDIFF(DAY, MIN(CAST(x.TglJtpFaktur AS date)), CAST(GETDATE() AS date)) AS HariLewat
        FROM (
          SELECT ${cabangOf} AS KodeDept, ati.ParentTransaction, ati.JumlahTrn, ati.TglJtpFaktur
          FROM ArTransactionItems ati
          JOIN Customers c ON c.CustomerId = ati.CustomerId
          WHERE 1 = 1 ${cabangFilter}
        ) x
        GROUP BY x.KodeDept, x.ParentTransaction
        HAVING SUM(x.JumlahTrn) > 0
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

    const cabangName = new Map(cabangList.map((d) => [d.KodeDept, d.NamaDept]));
    const k = kpi[0] || {};
    const trendByMonth = new Map(trend.map((r) => [Number(r.Bulan), r]));
    const ytd = trend.reduce((sum, r) => sum + toNumber(r.EKatalog) + toNumber(r.Reguler), 0);

    res.json({
      period: {
        month: monthStart.format("YYYY-MM"),
        isCurrentMonth: monthStart.isSame(now, "month"),
        asOfDate: now.format("YYYY-MM-DD"),
      },
      scope: {
        cabang,
        vendor: Boolean(vendor),
        canChooseCabang,
        cabangList: canChooseCabang ? cabangList.map((d) => ({ kode: d.KodeDept, nama: d.NamaDept })) : [],
      },
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
          nama: cabangName.get(r.KodeCc) || r.NamaDept || r.KodeCc,
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
          cabang: cabangName.get(r.KodeCc) || r.KodeCc,
          penjualan: toNumber(r.Penjualan),
        })),
      },
      piutang,
      target: vendor
        ? null
        : (() => {
            const t = sumTargets(monthTargets, cabang);
            return {
              // Net of returns, the same total as the Laporan Penjualan (ValueHNA)
              sales: { target: t.sales, pencapaian: toNumber(k.Penjualan) - toNumber(k.Retur) },
              collection: { target: t.collection, pencapaian: collection },
              canEdit: TARGET_EDIT_ROLES.includes(req.user.role),
            };
          })(),
    });
  } catch (error) {
    console.error("Failed to build dashboard summary:", error);
    res.status(500).json({ error: "Failed to build dashboard summary" });
  }
});

module.exports = router;
