const express = require("express");
const { PrismaClient, Prisma } = require("../generated/pwdat");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;
const mode = process.env.EXPRESS_MODE || 'development';

router.get("/", async (req, res) => {
  const userRole = req.user.role;

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 100;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const searchQuery = `%${search}%`;
    
    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [navigations, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
            MenuKey,
            MenuName,
            IconClass,
            MenuSortOrder,
            ItemKey,
            ItemName,
            ItemRoute,
            ItemSortOrder
        FROM ERPSupportNavigation
        WHERE RoleCode = ${userRole}
          AND (Environment = 'All' OR Environment = ${mode})
        ORDER BY MenuSortOrder, ItemSortOrder
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM ERPSupportNavigation
        WHERE RoleCode = ${userRole}
          AND (Environment = 'All' OR Environment = ${mode})
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    const nav = [];
    const menuMap = new Map();
    console.log("fetched navigations:", navigations);
    

    navigations.forEach(row => {
      if (!menuMap.has(row.MenuKey)) {
        const menu = {
          menuKey: row.MenuKey,
          menuName: row.MenuName,
          iconClass: row.IconClass, // e.g. cil-people
          items: []
        };
        menuMap.set(row.MenuKey, menu);
        nav.push(menu);
      }
      // console.log("row item key:", row.MenuKey);

      if (row.ItemKey) {
        menuMap.get(row.MenuKey).items.push({
          itemKey: row.ItemKey,
          name: row.ItemName,
          to: row.ItemRoute
        });
      }
    });
    nav.sort((a, b) => a.MenuSortOrder - b.MenuSortOrder);

    res.json({
      data: nav,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch navigations", errors: error });
  }
});

module.exports = router;