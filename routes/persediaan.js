const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans2026");
const { getCurrentDateFormatted } = require("../utils/Date");
const { pushStockPerBatch, previewStockPerBatch, getDefaultStockDate } = require("../services/stockPush");
const { listPushLogs } = require("../services/stockPushLog");
const { listProducts } = require("./products");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'], });

router.get("/perbatch", async (req, res) => {
  const endDate = req.query.date;
  // check if date is valid
  if (!endDate) {
    return res.status(400).json({ error: "Date is required" });
  }
  if (endDate > getCurrentDateFormatted()) {
    return res.status(400).json({ error: "Date is not valid" });
  }
  
  try {
    console.log("Fetching per batch stocks...");
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 200;
    const skip = (page - 1) * pageSize;
    const search = req.query.search?.trim() || '';
    const endDate = req.query.date;
    const cabangParam = req.query.cabang || '';
    const vendorParam = req.query.vendor || '';
    const barangParam = req.query.barang || '';
    const userRole = req.user.role;
    const userCabang = req.user.cabang || '';
    const userVendor = req.user.vendor || '';
    console.log("User Role:", userRole, "Cabang:", userCabang, "Vendor:", userVendor);

    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()) : [];
    const vendorArray = vendorParam ? vendorParam.split(',').map(v => v.trim()) : (userVendor ? [userVendor] : []);
    const barangArray = barangParam ? barangParam.split(',').map(b => b.trim()) : [];
    console.log("Cabang Array:", cabangArray, "Vendor Array:", vendorArray, "Barang Array:", barangArray);

    const searchQuery = `%${search}%`;

    const whereFragments = [];

    // Search
    if (search) {
      whereFragments.push(Prisma.sql`is2.KodeGudang LIKE ${searchQuery} OR w.NamaGudang LIKE ${searchQuery}`);
    }

    // Cabang filter
    if (userRole !== 'ADM' || cabangArray.length > 0) {
      const cabangList = cabangArray.length > 0 ? cabangArray : [userCabang].filter(Boolean);
      if (cabangList.length > 0) {
        // 2. Gunakan Prisma.join untuk menggabungkan elemen array dengan koma
        whereFragments.push(
          Prisma.sql`w.KodeDept IN (${Prisma.join(cabangList)})`
        );
      }
    }

    // Vendor filter
    if (userRole !== 'ADM') {
      const vendorList = vendorArray.length > 0 ? vendorArray : [userVendor];
      whereFragments.push(Prisma.sql`is3.KodeLgn IN (${Prisma.join(vendorList)})`);
    }else if(vendorArray.length > 0) {
      console.log("Vendor Array:", vendorArray);
      whereFragments.push(Prisma.sql`is3.KodeLgn IN (${Prisma.join(vendorArray)})`);
    }

    // Barang filter
    if (barangArray.length > 0) {
      whereFragments.push(Prisma.sql`i.KodeItem IN (${Prisma.join(barangArray)})`);
    }

    // Build WHERE clause safely
    let whereClause;

    if (whereFragments.length === 0) {
      whereClause = Prisma.empty;
    } else if (whereFragments.length === 1) {
      // Single condition: no AND needed
      whereClause = Prisma.sql`WHERE ${whereFragments[0]}`;
    } else {
      // Multiple conditions: join with AND
      let combined = whereFragments.reduce((acc, curr) => {
        return Prisma.sql`${acc} AND ${curr}`;
      });
      whereClause = Prisma.sql`WHERE ${combined}`;
    }
    console.log("Constructed WHERE clause:", whereClause);

    // const query = Prisma.sql`
    //   SELECT
    //     bc.BusinessCentreName,
    //     is2.KodeGudang,
    //     w.NamaGudang,
    //     i.KodeItem,
    //     i.NamaBarang,
    //     sumBatchNumber.BatchNumber,
    //     FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
    //     sumBatchNumber.Qty
    //   FROM
    //     inventories i
    //   JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
    //   JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
    //   JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
    //   JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
    //   JOIN (
    //     SELECT
    //       bnt.InventoryStockId,
    //       bnt.BatchNumber,
    //       bnt.TglExpired,
    //       SUM(bnt.Qty) AS Qty
    //     FROM BatchNumberTransactions bnt
    //     WHERE CAST(bnt.tanggaltransaksi AS DATE) <= ${endDate}
    //     GROUP BY bnt.InventoryStockId, bnt.BatchNumber, bnt.TglExpired
    //     HAVING SUM(bnt.Qty) > 0
    //   ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
    //   ${whereClause}
    //   and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
    //   ORDER BY is2.KodeGudang, sumBatchNumber.BatchNumber
    //   OFFSET ${skip} ROWS
    //   FETCH NEXT ${pageSize} ROWS ONLY;
    // `;

    // 🔥 DEBUG: Log the query
    // console.log("Final SQL Query:", query);

    const customers = await prisma.$queryRaw`
      SELECT
        bc.BusinessCentreName,
        is2.KodeGudang,
        w.NamaGudang,
        i.KodeItem,
        i.NamaBarang,
        sumBatchNumber.BatchNumber,
        FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
        sumBatchNumber.Qty,
        i.KonversiSatuanDasar * sumBatchNumber.Qty AS SumQtySecondary
      FROM
        inventories i
      JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
      JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
      JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
      JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
      JOIN (
        SELECT
          bnt.InventoryStockId,
          bnt.BatchNumber,
          bnt.TglExpired,
          SUM(bnt.Qty) AS Qty
        FROM
          BatchNumberTransactions bnt
        WHERE
          CAST(bnt.tanggaltransaksi AS DATE) <= ${endDate}
        GROUP BY
          bnt.InventoryStockId,
          bnt.BatchNumber,
          bnt.TglExpired
        HAVING
          SUM(bnt.Qty) > 0
      ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
      ${whereClause}
      and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
      ORDER BY
        is2.KodeGudang,
        sumBatchNumber.BatchNumber
      OFFSET ${skip} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `;

    // Count query
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM inventories i
      JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
      JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
      JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
      JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
      JOIN (
        SELECT DISTINCT InventoryStockId
        FROM BatchNumberTransactions
        WHERE CAST(tanggaltransaksi AS DATE) <= ${endDate}
      ) AS bnt ON is2.InventoryStockId = bnt.InventoryStockId
      ${whereClause}
      and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
    `;

    const total = Number(countResult[0]?.total || 0);

    return res.json({
      data: customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in /perbatch:", error); // Log full error
    return res.status(500).json({
      message: "Failed to fetch per batch",
      details: error.message || error,
    });
  }
});

// Push stok per batch ke Stock API (manual trigger, jadwal otomatis ada di index.js)
// Riwayat push stok ke Stock API
router.get("/perbatch/push-logs", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.per_page) || 10;
  try {
    return res.json(await listPushLogs(page, pageSize));
  } catch (error) {
    console.error("Error in /perbatch/push-logs:", error.message);
    return res.status(500).json({ message: "Gagal mengambil log push stok", details: error.message });
  }
});

// Tanggal stok default untuk push (H-1, Senin ambil Sabtu)
router.get("/perbatch/push-date", (req, res) => {
  return res.json({ date: getDefaultStockDate() });
});

// Data stok dengan skema payload push (untuk export Excel), tidak dikirim ke Stock API
router.get("/perbatch/push-preview", async (req, res) => {
  const allowedRoles = ['ADM', 'DAT'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Tidak memiliki akses untuk data push stok" });
  }

  const stockDate = req.query.date || getDefaultStockDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stockDate) || stockDate > getCurrentDateFormatted()) {
    return res.status(400).json({ message: "Date is not valid" });
  }

  try {
    return res.json(await previewStockPerBatch(stockDate));
  } catch (error) {
    console.error("Error in /perbatch/push-preview:", error.message);
    return res.status(500).json({ message: "Gagal mengambil data push stok", details: error.message });
  }
});

router.post("/perbatch/push", async (req, res) => {
  const allowedRoles = ['ADM', 'DAT'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Tidak memiliki akses untuk push stok" });
  }

  const stockDate = req.body?.date || getDefaultStockDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stockDate) || stockDate > getCurrentDateFormatted()) {
    return res.status(400).json({ message: "Date is not valid" });
  }

  try {
    const result = await pushStockPerBatch(stockDate, `manual:${req.user.username}`);
    return res.json({ message: "Push stok berhasil", ...result });
  } catch (error) {
    console.error("Error in /perbatch/push:", error.message, error.response || "");
    return res.status(error.status === 409 ? 409 : error.response ? 502 : 500).json({
      message: error.message || "Gagal push stok",
      details: error.response,
    });
  }
});

// Daftar barang sudah pindah ke GET /products (routes/products.js).
// GET /stocks dipertahankan sebagai alias agar client lama tetap jalan.
router.get("/", listProducts);

module.exports = router;
