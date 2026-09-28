const moment = require("moment-timezone");
const { PrismaClient } = require("../generated/dbtrans2026");

const prisma = new PrismaClient({ log: ['warn', 'error'], });

const TZ = "Asia/Jakarta";
const DEFAULT_STOCK_API_URL = "https://stock.satoriagroup.co.id/api/v1/stock";

let running = null;

// Stok per batch (logika sama dengan GET /stocks/perbatch), dikelompokkan per cabang PBF
async function fetchStockPerBatch(stockDate) {
  return prisma.$queryRaw`
    SELECT
      cr.StockNamaCabang,
      i.NamaBarang,
      i.KodeSatuan,
      sumBatchNumber.BatchNumber,
      FORMAT(sumBatchNumber.TglExpired, 'yyyy-MM-dd') AS TglExpired,
      CAST(SUM(sumBatchNumber.Qty) AS DECIMAL(18,2)) AS Qty
    FROM
      inventories i
    JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
    JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
    JOIN InventorySuppliers t ON i.InventoryId = t.InventoryId
    JOIN ERPSupport.dbo.CabangReportPBF cr
      ON cr.KodeDept COLLATE DATABASE_DEFAULT = w.KodeDept COLLATE DATABASE_DEFAULT
    JOIN (
      SELECT
        bnt.InventoryStockId,
        bnt.BatchNumber,
        bnt.TglExpired,
        SUM(bnt.Qty) AS Qty
      FROM
        BatchNumberTransactions bnt
      WHERE
        CAST(bnt.tanggaltransaksi AS DATE) <= ${stockDate}
      GROUP BY
        bnt.InventoryStockId,
        bnt.BatchNumber,
        bnt.TglExpired
      HAVING
        SUM(bnt.Qty) > 0
    ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
    WHERE
      is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
      AND cr.StockNamaCabang IS NOT NULL
      AND t.KodeLgn = '1001'
    GROUP BY
      cr.StockNamaCabang,
      i.NamaBarang,
      i.KodeSatuan,
      sumBatchNumber.BatchNumber,
      sumBatchNumber.TglExpired
    ORDER BY
      cr.StockNamaCabang,
      i.NamaBarang,
      sumBatchNumber.BatchNumber
  `;
}

function buildPayload(rows, stockDate, now) {
  const branchMap = new Map();
  for (const row of rows) {
    if (!branchMap.has(row.StockNamaCabang)) {
      branchMap.set(row.StockNamaCabang, { distributor_code: row.StockNamaCabang, items: [] });
    }
    branchMap.get(row.StockNamaCabang).items.push({
      item_name: row.NamaBarang,
      qty: Number(row.Qty),
      unit: row.KodeSatuan,
      batch_no: row.BatchNumber,
      expired_date: row.TglExpired,
    });
  }

  return {
    request_id: `SDL-${now.format("YYYYMMDD")}-${now.format("HHmmss")}`,
    stock_date: stockDate,
    branches: [...branchMap.values()],
  };
}

async function doPush(stockDate, trigger) {
  const token = process.env.STOCK_API_TOKEN;
  if (!token) throw new Error("STOCK_API_TOKEN belum di-set di environment");

  const now = moment().tz(TZ);
  const rows = await fetchStockPerBatch(stockDate);
  const payload = buildPayload(rows, stockDate, now);
  const itemCount = payload.branches.reduce((n, b) => n + b.items.length, 0);

  console.log(`[stockPush] (${trigger}) push ${payload.request_id}: stock_date=${stockDate}, branches=${payload.branches.length}, items=${itemCount}`);

  const response = await fetch(process.env.STOCK_API_URL || DEFAULT_STOCK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!response.ok) {
    const error = new Error(`Stock API merespon ${response.status}`);
    error.status = response.status;
    error.response = body;
    throw error;
  }

  console.log(`[stockPush] (${trigger}) sukses ${payload.request_id}: ${response.status}`);
  return {
    request_id: payload.request_id,
    stock_date: stockDate,
    branches: payload.branches.map(b => ({ distributor_code: b.distributor_code, items: b.items.length })),
    total_items: itemCount,
    response: body,
  };
}

// Mencegah dua push berjalan bersamaan (cron + manual)
// Tanggal stok default: H-1, kecuali hari Senin ambil data hari Sabtu
function getDefaultStockDate(now = moment().tz(TZ)) {
  const daysBack = now.isoWeekday() === 1 ? 2 : 1;
  return now.clone().subtract(daysBack, "day").format("YYYY-MM-DD");
}

async function pushStockPerBatch(stockDate = getDefaultStockDate(), trigger = "manual") {
  if (running) {
    const error = new Error("Push stok sedang berjalan, coba lagi nanti");
    error.status = 409;
    throw error;
  }
  running = doPush(stockDate, trigger);
  try {
    return await running;
  } finally {
    running = null;
  }
}

module.exports = { pushStockPerBatch, getDefaultStockDate, TZ };
