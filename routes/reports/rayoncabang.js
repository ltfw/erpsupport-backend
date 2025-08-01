const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query','warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const searchDate = req.query.date?.trim() || '';

    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [data, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT *
        FROM CabangRayonHistory
        WHERE 
        ${searchDate} >= ValidFrom AND (${searchDate} <= ValidTo OR ValidTo IS NULL)
        ORDER BY KodeDept
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT *
        FROM CabangRayonHistory
        WHERE 
        ${searchDate} >= ValidFrom AND (${searchDate} <= ValidTo OR ValidTo IS NULL)
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

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

// GET a single department by ID (KodeDept)
router.get("/:id", async (req, res) => {
  try {
    const department = await prisma.data.findUnique({
      where: {
        KodeDept: req.params.id,
      },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch department" });
  }
});

module.exports = router;