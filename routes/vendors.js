const express = require("express");
const { PrismaClient } = require("../generated/pwdat");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

// GET all vendors with optional pagination and search
router.get("/", async (req, res) => {
  const isAdmin = req.user.UserRoleCode === 'ADM';

  const userFilter = isAdmin ? '' : `where us.UserName = ${req.user.UserName}`;

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const searchQuery = `%${search}%`;

    const [vendors, totalResult] = await Promise.all([
      prisma.$queryRaw`
        select v.VendorId,v.KodeLgn,v.NamaLgn from PwdatBackup.dbo.UserSupplier us 
        join SDUdb001.dbo.Vendors v on us.VendorId = v.VendorId
        ${userFilter}
        ORDER BY KodeLgn
        OFFSET ${skip} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY;
      `,
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total 
        FROM Vendors 
        WHERE NamaLgn LIKE '${searchQuery}' OR KodeLgn LIKE '${searchQuery}';
      `),
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: vendors,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// GET vendor by ID (VendorId)
router.get("/:id", async (req, res) => {
  try {
    const vendor = await prisma.vendors.findUnique({
      where: {
        VendorId: req.params.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

module.exports = router;
