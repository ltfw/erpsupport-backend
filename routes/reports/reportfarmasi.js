const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");
const { getCurrentDateFormatted, getDatetimeOfPreviousMonth } = require("../../utils/Date");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'warn', 'error'] });
const { sql } = Prisma;

router.get("/report", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 30;
    const skip = (page - 1) * pageSize;
    const startDate = req.query.start_date?.trim() || getCurrentDateFormatted();
    const endDate = req.query.end_date?.trim() || getCurrentDateFormatted();
    const cabang = req.query.cabang?.trim();

    let baseQuery = null;

    if(!cabang) {
      return res.status(400).json({ error: "Parameter 'cabang' is required." });
    }else if (cabang == "00") {
      const lastDateTime = getDatetimeOfPreviousMonth(startDate);
      
      baseQuery = Prisma.sql`
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
      baseQuery = Prisma.sql`
        exec sp_InventoryReportPharma_Cabang 
          @ParentCategory = 'CLSPHA',
          @EndInitialDate = ${lastDateTime},
          @StartPeriod = ${startDate},
          @EndPeriod = ${endDate},
          @KodeDept = ${cabang},
          @GdgTarget = ${gdgTarget},
          @ExcludedGudangs = '00-GUU-03,00-GUU-02,03-GUU-03',
          @QtyThreshold = 0,
          @KemasanNullFilter = 1
        `;
    }

    const data = await prisma.$queryRaw`${baseQuery}`;
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
