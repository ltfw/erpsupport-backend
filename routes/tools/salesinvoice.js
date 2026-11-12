const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const prisma2026 = new PrismaClient2026({ log: ['warn', 'error'] });

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userCabang = req.user.cabang;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    if (startYear !== endYear) {
      return res.status(400).json({ error: "Start date and end date must be in the same year" });
    }

    const prismaBase = startYear >= 2026 ? prisma2026 : prisma;
    const PrismaWhere = startYear >= 2026 ? Prisma2026 : Prisma;

    // Non-admin users only see their own branch unless they picked one
    if (userRole != 'ADM' && cabangArray.length === 0 && userCabang) {
      cabangArray.push(userCabang);
    }

    const fromWhere = PrismaWhere.sql`
      FROM SalesInvoiceHeaders sih
      LEFT JOIN Departments d ON d.KodeDept = sih.KodeCc
      LEFT JOIN Customers c ON c.CustomerId = sih.CustomerId
      LEFT JOIN Salesmen s ON s.KodeSales = sih.KodeSales
      WHERE SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 3) = 'SI/'
        AND sih.TglFaktur >= ${startDate + ' 00:00:00'}
        AND sih.TglFaktur <= ${endDate + ' 23:59:59'}
        ${cabangArray.length > 0
          ? PrismaWhere.sql`AND sih.KodeCc IN (${PrismaWhere.join(cabangArray)})`
          : PrismaWhere.sql``}
        AND (
          sih.NoBukti LIKE ${searchQuery}
          OR c.KodeLgn LIKE ${searchQuery}
          OR c.NamaLgn LIKE ${searchQuery}
          OR sih.NoFakturP LIKE ${searchQuery}
          OR sih.PoLanggan LIKE ${searchQuery}
        )
    `;

    const pageSetup = pageSize > 0
      ? PrismaWhere.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY`
      : PrismaWhere.sql``;

    const [invoices, totalResult] = await Promise.all([
      prismaBase.$queryRaw`
        SELECT
          sih.SalesInvoiceHeaderId,
          sih.NoBukti,
          FORMAT(sih.TglFaktur, 'yyyy-MM-dd') AS TglFaktur,
          FORMAT(sih.TglJthtmp, 'yyyy-MM-dd') AS TglJthtmp,
          sih.KodeCc,
          d.NamaDept,
          c.KodeLgn,
          c.NamaLgn,
          s.NamaSales,
          sih.PoLanggan,
          sih.NoFakturP,
          FORMAT(sih.TglFakturP, 'yyyy-MM-dd') AS TglFakturP,
          sih.TypeTrn,
          sih.NoFjDulu,
          sih.Dpp,
          sih.PPN,
          sih.GrandTotal,
          sih.Keterangan
        ${fromWhere}
        ORDER BY sih.TglFaktur DESC, sih.NoBukti DESC
        ${pageSetup}
      `,
      prismaBase.$queryRaw`
        SELECT COUNT(*) AS total
        ${fromWhere}
      `,
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sales invoices", details: error.message });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Detail for printing one invoice. ?year= picks the yearly database.
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const year = parseInt(req.query.year) || new Date().getFullYear();
    const db = year >= 2026 ? prisma2026 : prisma;
    const P = year >= 2026 ? Prisma2026 : Prisma;

    const headers = await db.$queryRaw`
      SELECT
        sih.SalesInvoiceHeaderId,
        sih.NoBukti,
        FORMAT(sih.TglFaktur, 'yyyy-MM-dd') AS TglFaktur,
        FORMAT(sih.TglJthtmp, 'yyyy-MM-dd') AS TglJthtmp,
        FORMAT(sih.TglPo, 'yyyy-MM-dd') AS TglPo,
        sih.PoLanggan,
        sih.AllNoSo,
        sih.KodeCc,
        sih.TypePpn,
        sih.Dpp,
        sih.PPN,
        sih.PpnPersen,
        sih.OngkosAngkut,
        sih.GrandTotal,
        d.NamaDept,
        d.Alamat AS AlamatCabang,
        d.NPWP AS NpwpCabang,
        d.IzinPBF,
        d.IzinPAK,
        c.KodeLgn,
        c.Npwp AS NpwpLgn,
        COALESCE(NULLIF(c.NoVaLama, ''), d.RekeningBank) AS NoVa,
        CONCAT('PT. SDL ', IIF(sih.KodeCc = '00', 'KRIAN', UPPER(d.NamaDept))) AS PembayaranKe,
        COALESCE(NULLIF(c.CustomerIndukNama, ''), NULLIF(c.NpwpOwner, ''), c.NamaLgn) AS NamaTagih,
        COALESCE(NULLIF(c.CustomerIndukAlamat, ''), NULLIF(sih.AlamatPenagihan, ''), NULLIF(c.AlamatPajak, ''), c.Alamat1) AS AlamatTagih,
        COALESCE(NULLIF(sih.NamaKirim, ''), LTRIM(RTRIM(CONCAT(c.NamaLgn, ' ', be.BusinessEntityName)))) AS NamaKirim,
        COALESCE(NULLIF(sih.AlamatKirim1, ''), c.Alamat1) AS AlamatKirim,
        s.NamaSales,
        pt.KetSyaratBayar
      FROM SalesInvoiceHeaders sih
      LEFT JOIN Departments d ON d.KodeDept = sih.KodeCc
      LEFT JOIN Customers c ON c.CustomerId = sih.CustomerId
      LEFT JOIN BusinessEntities be ON be.BusinessEntityId = c.BusinessEntityId
      LEFT JOIN Salesmen s ON s.KodeSales = sih.KodeSales
      LEFT JOIN PaymentTerms pt ON pt.KodeSyarat = sih.KodeSyarat
      WHERE sih.SalesInvoiceHeaderId = ${id}
    `;

    const header = headers[0];
    if (!header) {
      return res.status(404).json({ error: "Sales invoice not found" });
    }

    if (req.user.role != 'ADM' && req.user.cabang && header.KodeCc !== req.user.cabang) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // One row per batch shipped (batches live on the delivery permit item);
    // items without batch data fall back to the invoice line itself.
    const items = await db.$queryRaw`
      SELECT
        sii.SalesInvoiceItemId,
        inv.KodeItem,
        inv.KodeKategory,
        sii.NamaBarang,
        bnt.BatchNumber,
        FORMAT(bnt.TglExpired, 'yyyy/MM') AS TglExpired,
        COALESCE(ABS(bnt.Qty) / NULLIF(sii.Konversi, 0), sii.Qty) AS Qty,
        sii.SatuanNs AS Satuan,
        sii.HargaJual,
        sii.ItemDisPsn,
        sii.ItemDisPsn2,
        sii.ItemDisPsn3,
        sii.Konversi,
        bp.Weight AS BeratKemasan,
        bp.Konversi AS IsiKemasan,
        bp.Length * bp.Width * bp.Height / 1000000.0 AS VolumeKemasan
      FROM SalesInvoiceItems sii
      LEFT JOIN InventoryStocks ist ON ist.InventoryStockId = sii.InventoryStockId
      LEFT JOIN Inventories inv ON inv.InventoryId = ist.InventoryId
      LEFT JOIN BeratProduks bp ON bp.InventoryId = ist.InventoryId
      LEFT JOIN SalesOrderItems soi ON soi.SalesOrderItemId = sii.SalesOrderItemId
      LEFT JOIN BatchNumberTransactions bnt
        ON bnt.ParentTransactionItemId = sii.DeliveryPermitItemId
        AND sii.DeliveryPermitItemId IS NOT NULL
      WHERE sii.SalesInvoiceHeaderId = ${id}
      ORDER BY soi.NoSo, soi.Nomor, sii.Nomor, inv.KodeItem, bnt.TglExpired, bnt.BatchNumber
    `;

    const categories = [...new Set(items.map((i) => i.KodeKategory).filter(Boolean))];
    let apoteker = null;
    if (categories.length > 0) {
      const pj = await db.$queryRaw`
        SELECT TOP 1 NamaPenanggungJawab, NoPenanggungJawab
        FROM DepartmentPenanggungJawabs
        WHERE KodeDept = ${header.KodeCc}
          AND KategoriBarang IN (${P.join(categories)})
          AND TglEfektif <= ${header.TglFaktur + ' 23:59:59'}
        ORDER BY TglEfektif DESC
      `;
      apoteker = pj[0] || null;
    }

    res.json({ header, items, apoteker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sales invoice detail", details: error.message });
  }
});

module.exports = router;
