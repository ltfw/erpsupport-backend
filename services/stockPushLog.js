const { PrismaClient } = require("../generated/erpsupport");

const prisma = new PrismaClient({ log: ['warn', 'error'], });

const truncate = (value, max = 4000) => {
  if (value === undefined || value === null) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

// Simpan satu baris log; gagal simpan log tidak boleh menggagalkan push
async function insertPushLog(log) {
  try {
    await prisma.$executeRaw`
      INSERT INTO dbo.StockPushLog
        (RequestId, TriggerBy, StockDate, Status, TotalItems, Branches, HttpStatus, Message, ResponseBody, StartedAt, FinishedAt)
      VALUES (
        ${log.requestId ?? null},
        ${log.trigger},
        CAST(CAST(${log.stockDate ?? null} AS VARCHAR(10)) AS DATE), -- null terkirim sebagai int
        ${log.status},
        ${log.totalItems ?? null},
        ${log.branches ? JSON.stringify(log.branches) : null},
        ${log.httpStatus ?? null},
        ${truncate(log.message)},
        ${truncate(log.response)},
        ${log.startedAt},
        ${log.finishedAt}
      )
    `;
  } catch (error) {
    console.error("[stockPush] gagal menyimpan log:", error.message);
  }
}

async function listPushLogs(page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;
  const [rows, countResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        Id,
        RequestId,
        TriggerBy,
        FORMAT(StockDate, 'yyyy-MM-dd') AS StockDate,
        Status,
        TotalItems,
        Branches,
        HttpStatus,
        Message,
        ResponseBody,
        FORMAT(StartedAt, 'yyyy-MM-dd HH:mm:ss') AS StartedAt,
        FORMAT(FinishedAt, 'yyyy-MM-dd HH:mm:ss') AS FinishedAt
      FROM dbo.StockPushLog
      ORDER BY StartedAt DESC, Id DESC
      OFFSET ${skip} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM dbo.StockPushLog`,
  ]);

  const total = Number(countResult[0]?.total || 0);
  return {
    data: rows.map(row => ({ ...row, Branches: row.Branches ? JSON.parse(row.Branches) : [] })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

module.exports = { insertPushLog, listPushLogs };
