const moment = require("moment-timezone");
const { PrismaClient, Prisma } = require("../generated/dbtrans2026");
const { insertPushLog } = require("./stockPushLog");

const prisma = new PrismaClient({ log: ['warn', 'error'], });

const TZ = "Asia/Jakarta";
const DEFAULT_STOCK_API_URL = "https://stock.satoriagroup.co.id/api/v1/stock";

let running = null;

// Saldo stok per cabang + item + batch (gudang utama)
async function fetchStockBalances(stockDate) {
  return prisma.$queryRaw`
    SELECT
      cr.StockNamaCabang,
      w.KodeDept,
      i.InventoryId,
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
      -- Saldo dihitung per batch (bukan per batch + TglExpired), karena TglExpired
      -- di transaksi keluar kadang berbeda dengan transaksi masuk untuk batch yang sama.
      -- TglExpired diambil dari transaksi masuk.
      SELECT
        bnt.InventoryStockId,
        bnt.BatchNumber,
        COALESCE(MAX(CASE WHEN bnt.Qty > 0 THEN bnt.TglExpired END), MAX(bnt.TglExpired)) AS TglExpired,
        SUM(bnt.Qty) AS Qty
      FROM
        BatchNumberTransactions bnt
      WHERE
        -- sampai akhir hari stock_date (s.d. 23:59:59)
        bnt.tanggaltransaksi < DATEADD(day, 1, CAST(${stockDate} AS DATE))
      GROUP BY
        bnt.InventoryStockId,
        bnt.BatchNumber
      HAVING
        SUM(bnt.Qty) > 0
    ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
    WHERE
      is2.KodeGudang in ('00-GUU','02-GUU','03-GUU','04-GUU')
      -- exclude barang bonus
      AND i.IsBonus = 0
      AND cr.StockNamaCabang IS NOT NULL
      AND t.KodeLgn = '1001'
      and sumBatchNumber.TglExpired > CAST(GETDATE() AS DATE)
    GROUP BY
      cr.StockNamaCabang,
      w.KodeDept,
      i.InventoryId,
      i.NamaBarang,
      i.KodeSatuan,
      sumBatchNumber.BatchNumber,
      sumBatchNumber.TglExpired
  `;
}

// Penerimaan per cabang + item + batch + tanggal (semua gudang cabang, s.d. stock_date):
// HO dari BPB, cabang dari transfer in (IN-xxx)
async function fetchReceipts(stockDate, inventoryIds) {
  if (inventoryIds.length === 0) return [];
  return prisma.$queryRaw`
    SELECT
      w.KodeDept,
      is2.InventoryId,
      b.BatchNumber,
      FORMAT(CAST(b.TanggalTransaksi AS DATE), 'yyyy-MM-dd') AS TglTerima,
      SUM(b.Qty) AS Qty
    FROM
      BatchNumberTransactions b
    JOIN InventoryStocks is2 ON is2.InventoryStockId = b.InventoryStockId
    JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
    WHERE
      b.Qty > 0
      AND b.TanggalTransaksi < DATEADD(day, 1, CAST(${stockDate} AS DATE))
      AND is2.InventoryId IN (${Prisma.join(inventoryIds)})
      AND (
        (w.KodeDept = '00' AND b.KodeSumber = 'BPB')
        OR (w.KodeDept <> '00' AND b.KodeSumber = 'IN' AND b.InventoryTransactionType = 'X')
      )
    GROUP BY
      w.KodeDept,
      is2.InventoryId,
      b.BatchNumber,
      CAST(b.TanggalTransaksi AS DATE)
  `;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Pecah saldo batch per tanggal penerimaan secara FIFO: barang keluar dianggap
// mengambil dari penerimaan terlama, jadi sisa stok dialokasikan ke penerimaan terbaru dulu.
// Sisa yang tidak tertutup penerimaan (mis. dari saldo awal) dikirim dengan TglTerima null.
function splitByReceipt(balances, receipts) {
  const receiptMap = new Map();
  for (const r of receipts) {
    const key = `${r.KodeDept}|${r.InventoryId}|${r.BatchNumber}`;
    if (!receiptMap.has(key)) receiptMap.set(key, []);
    receiptMap.get(key).push(r);
  }

  // Digabung per cabang + nama barang + satuan + batch + expired + tgl terima,
  // karena payload hanya mengenali barang dari namanya
  const merged = new Map();
  const add = (row, tglTerima, qty) => {
    const key = [row.StockNamaCabang, row.NamaBarang, row.KodeSatuan, row.BatchNumber, row.TglExpired, tglTerima].join("|");
    if (merged.has(key)) {
      merged.get(key).Qty += qty;
    } else {
      merged.set(key, {
        StockNamaCabang: row.StockNamaCabang,
        NamaBarang: row.NamaBarang,
        KodeSatuan: row.KodeSatuan,
        BatchNumber: row.BatchNumber,
        TglExpired: row.TglExpired,
        TglTerima: tglTerima,
        Qty: qty,
      });
    }
  };

  for (const row of balances) {
    const list = (receiptMap.get(`${row.KodeDept}|${row.InventoryId}|${row.BatchNumber}`) || [])
      .sort((a, b) => b.TglTerima.localeCompare(a.TglTerima));
    let remaining = Number(row.Qty);
    for (const r of list) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, Number(r.Qty));
      add(row, r.TglTerima, qty);
      remaining = round2(remaining - qty);
    }
    if (remaining > 0) add(row, null, remaining);
  }

  return [...merged.values()]
    .map(row => ({ ...row, Qty: round2(row.Qty) }))
    .sort((a, b) =>
      a.StockNamaCabang.localeCompare(b.StockNamaCabang) ||
      a.NamaBarang.localeCompare(b.NamaBarang) ||
      a.BatchNumber.localeCompare(b.BatchNumber) ||
      (b.TglTerima || "").localeCompare(a.TglTerima || ""));
}

// Stok per batch per tanggal penerimaan, dikelompokkan per cabang PBF
async function fetchStockPerBatch(stockDate) {
  const balances = await fetchStockBalances(stockDate);
  const inventoryIds = [...new Set(balances.map(row => row.InventoryId))];
  const receipts = await fetchReceipts(stockDate, inventoryIds);
  return splitByReceipt(balances, receipts);
}

function buildPayload(rows, stockDate, requestId) {
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
      received_date: row.TglTerima,
    });
  }

  return {
    request_id: requestId,
    stock_date: stockDate,
    branches: [...branchMap.values()],
  };
}

const formatTimestamp = (m) => m.format("YYYY-MM-DD HH:mm:ss");

async function doPush(stockDate, trigger) {
  const startedAt = moment().tz(TZ);
  const requestId = `SDL-${startedAt.format("YYYYMMDD")}-${startedAt.format("HHmmss")}`;
  const log = { requestId, trigger, stockDate, startedAt: formatTimestamp(startedAt) };
  let branches;
  let itemCount;

  try {
    const token = process.env.STOCK_API_TOKEN;
    if (!token) throw new Error("STOCK_API_TOKEN belum di-set di environment");

    const rows = await fetchStockPerBatch(stockDate);
    const payload = buildPayload(rows, stockDate, requestId);
    branches = payload.branches.map(b => ({ distributor_code: b.distributor_code, items: b.items.length }));
    itemCount = payload.branches.reduce((n, b) => n + b.items.length, 0);

    console.log(`[stockPush] (${trigger}) push ${requestId}: stock_date=${stockDate}, branches=${branches.length}, items=${itemCount}`);

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

    console.log(`[stockPush] (${trigger}) sukses ${requestId}: ${response.status}`);
    await insertPushLog({
      ...log,
      status: "SUCCESS",
      totalItems: itemCount,
      branches,
      httpStatus: response.status,
      response: body,
      finishedAt: formatTimestamp(moment().tz(TZ)),
    });

    return {
      request_id: requestId,
      stock_date: stockDate,
      branches,
      total_items: itemCount,
      response: body,
    };
  } catch (error) {
    await insertPushLog({
      ...log,
      status: "FAILED",
      totalItems: itemCount,
      branches,
      httpStatus: error.response !== undefined ? error.status : null,
      message: error.message,
      response: error.response,
      finishedAt: formatTimestamp(moment().tz(TZ)),
    });
    throw error;
  }
}

// Data yang akan di-push (skema payload Stock API) tanpa mengirimnya
async function previewStockPerBatch(stockDate = getDefaultStockDate()) {
  const rows = await fetchStockPerBatch(stockDate);
  return buildPayload(rows, stockDate, null);
}

// Catat push yang sengaja tidak dijalankan (mis. hari Minggu)
async function logSkippedPush(trigger, message) {
  const now = formatTimestamp(moment().tz(TZ));
  console.log(`[stockPush] (${trigger}) ${message}`);
  await insertPushLog({ trigger, status: "SKIPPED", message, startedAt: now, finishedAt: now });
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

module.exports = { pushStockPerBatch, previewStockPerBatch, getDefaultStockDate, logSkippedPush, TZ };
