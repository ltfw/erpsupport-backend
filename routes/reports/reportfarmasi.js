const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../../generated/dbtrans2026");
const { getCurrentDateFormatted, getDatetimeOfPreviousMonth } = require("../../utils/Date");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const prisma2026 = new PrismaClient2026({ log: ['warn', 'error'], });

router.get("/report", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 30;
    const skip = (page - 1) * pageSize;
    const startDate = req.query.start_date?.trim();
    const endDate = req.query.end_date?.trim();
    const cabang = req.query.cabang?.trim();

    const prismaBase = new Date(startDate).getFullYear() === 2026 ? prisma2026 : prisma;
    const PrismaWhere = new Date(startDate).getFullYear() === 2026 ? Prisma2026 : Prisma;
    const { sql } = new Date(startDate).getFullYear() === 2026 ? Prisma2026 : Prisma;

    let baseQuery = null;

    if(!cabang) {
      return res.status(400).json({ error: "Parameter 'cabang' is required." });
    }else if (cabang == "00") {
      const lastDateTime = getDatetimeOfPreviousMonth(startDate);
      
      baseQuery = PrismaWhere.sql`
          EXEC sp_InventoryReportPharma_Pusat
          @ParentCategory = 'CLSPHA',
          @KodeDept = '00',
          @EndPreviousDate = ${lastDateTime},
          @StartDate = ${startDate},
          @EndDate = ${endDate},
          @ExcludedGudangs = '00-GUU-03,00-GUU-02,03-GUU-03'        
        `;
    } else {
      const lastDateTime = getDatetimeOfPreviousMonth(startDate);
      const gdgTarget = `${cabang}-GUU`;
      baseQuery = PrismaWhere.sql`
        exec sp_InventoryReportPharma_Cabang 
          @ParentCategory = 'CLSPHA',
          @EndInitialDate = ${lastDateTime},
          @StartPeriod = ${startDate},
          @EndPeriod = ${endDate},
          @KodeDept = ${cabang},
          @GdgTarget = ${gdgTarget},
          @ExcludedGudangs = '00-GUU-03,00-GUU-02,03-GUU-03',
          @QtyThreshold = 0
        `;
    }

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
