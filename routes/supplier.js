const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ["warn", "error"] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const isAdmin = req.user.role;
    const username = req.user.username;

    const searchQuery = `%${search}%`;
    const usernameQuery = isAdmin=='ADM' || isAdmin=='MKT-SANI' ? sql`` : sql` and us.UserName = ${username}`
    // console.log("User Role:", isAdmin, "Username:", username, "usernameQuery:", usernameQuery);

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 100;
    const skip = (page - 1) * pageSize;

    let vendors = [];
    let totalResult = 0;
    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    if (isAdmin=='ADM' || isAdmin=='MKT-SANI') {
      [vendors, totalResult] = await Promise.all([
        prisma.$queryRaw`
        SELECT distinct v.VendorId, v.KodeLgn, v.NamaLgn
        FROM Vendors v 
        join Inventorysuppliers is2 on is2.VendorId = v.VendorId 
        WHERE v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}
        order by v.kodelgn
        ${offsetClause}
      `,
        prisma.$queryRaw`
        SELECT count(distinct v.kodelgn) as total
        FROM Vendors v
        join Inventorysuppliers is2 on is2.VendorId = v.VendorId 
        WHERE v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}
      `,
      ]);
    } else {
      [vendors, totalResult] = await Promise.all([
        prisma.$queryRaw`
        SELECT distinct v.VendorId, v.KodeLgn, v.NamaLgn
        FROM PwdatBackup.dbo.UserSupplier us
        JOIN SDUdb001.dbo.Vendors v ON us.VendorId = v.VendorId
        WHERE (v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}) AND us.UserName = ${username}
        ORDER BY v.KodeLgn
        ${offsetClause}
      `,
        prisma.$queryRaw`
        SELECT COUNT(*) AS total
        FROM PwdatBackup.dbo.UserSupplier us
        JOIN SDUdb001.dbo.Vendors v ON us.VendorId = v.VendorId
        WHERE (v.KodeLgn LIKE ${searchQuery} OR v.NamaLgn LIKE ${searchQuery}) AND us.UserName = ${username}
      `,
      ]);
    }

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
