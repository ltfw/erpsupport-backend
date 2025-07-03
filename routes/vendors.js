const express = require("express");
const { PrismaClient } = require("../generated/pwdat");

const router = express.Router();
const prisma = new PrismaClient({ log: ["query", "warn", "error"] });

router.get("/", async (req, res) => {
  const search = req.query.search?.trim() || "";
  console.log('req.user ',req.user)
  const isAdmin = req.user.role === "ADM";
  const username = req.user.username;

  const searchQuery = `'%${search}%'`;
  const usernameQuery = isAdmin ? `` : ` and us.UserName = ${username}`

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;

    const [vendors, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT v.VendorId, v.KodeLgn, v.NamaLgn
        FROM PwdatBackup.dbo.UserSupplier us
        JOIN SDUdb001.dbo.Vendors v ON us.VendorId = v.VendorId
        where v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}
        ${usernameQuery}
        ORDER BY v.KodeLgn
        OFFSET ${skip} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY
      `),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) AS total
        FROM PwdatBackup.dbo.UserSupplier us
        JOIN SDUdb001.dbo.Vendors v ON us.VendorId = v.VendorId
        where v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}
        ${usernameQuery}
      `),
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: vendors ?? [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      error: "Failed to fetch vendors",
      details: error,
    });
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
