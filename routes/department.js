const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const isAdmin = req.user.role === '';
  // console.log("Cabang: ", req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const searchQuery = `%${search}%`;
    const cabang = req.query.cabang?.trim() || '';

    let cabangArray = [];
    if(isAdmin && !cabang) {
      cabangArray = cabang ? cabang.split(',').map(s => s.trim()) : [];
    }else {
      cabangArray = [req.user.cabang];
    }
    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [departments, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT KodeDept, NamaDept 
        FROM Departments
        WHERE (NamaDept LIKE ${searchQuery} OR KodeDept LIKE ${searchQuery})
        ${cabangArray.length > 0 ? sql`AND KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
        ORDER BY KodeDept
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM Departments
        WHERE (NamaDept LIKE ${searchQuery} OR KodeDept LIKE ${searchQuery})
        ${cabangArray.length > 0 ? sql`AND KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: departments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch departments", errors: error });
  }
});

// GET a single department by ID (KodeDept)
router.get("/:id", async (req, res) => {
  try {
    const department = await prisma.departments.findUnique({
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
