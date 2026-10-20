const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'], });

// Get all products using pagination
async function listProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 200;
    const skip = (page - 1) * pageSize;
    const search = req.query.search?.trim() || ''
    const vendorParam = req.query.vendor || req.user.vendor || '';
    console.log("User Vendor:", req.user.vendor, "Vendor Param:", vendorParam);

    const searchQuery = `%${search}%`
    const isKonsinyasiSearch = search.toLowerCase().includes('kon')
    const isRegulerSearch = search.toLowerCase().includes('reg')
    const isBonusSearch = search.toLowerCase().includes('bon')

    let whereClause = Prisma.sql``;

    const searchConditions = [];
    searchConditions.push(Prisma.sql`i.KodeItem like ${searchQuery}`);
    searchConditions.push(Prisma.sql`i.NamaBarang like ${searchQuery}`);

    if (isKonsinyasiSearch) searchConditions.push(Prisma.sql`i.IsConsignmentIn = 1`);
    if (isRegulerSearch) searchConditions.push(Prisma.sql`(i.IsConsignmentIn = 0 and i.isbonus = 0)`);
    if (isBonusSearch) searchConditions.push(Prisma.sql`(i.isbonus = 1)`);

    // Build search conditions
    let searchSection = searchConditions[0];
    for (let i = 1; i < searchConditions.length; i++) {
      searchSection = Prisma.sql`${searchSection} OR ${searchConditions[i]}`;
    }

    // Add vendor filter if provided
    if (vendorParam) {
      whereClause = Prisma.sql`WHERE (${searchSection}) AND is3.KodeLgn = ${vendorParam}`;
    } else {
      whereClause = Prisma.sql`WHERE (${searchSection})`;
    }

    const [products, totalResult] = await Promise.all([
      prisma.$queryRaw`
      select
        i.KodeItem,
        i.NamaBarang,
        case when i.IsConsignmentIn = 1 then 'Konsinyasi'
        when i.isbonus = 1 then 'Bonus'
        else 'Reguler' end as Keterangan
      from
        Inventories i
      join inventorysuppliers is3 on is3.InventoryId = i.InventoryId
      ${whereClause}
      order by i.kodeitem,i.NamaBarang
      offset ${skip} rows
      fetch next ${pageSize} rows only;
    `,
      prisma.$queryRaw`
        select count(*) as total
        from Inventories i
        join inventorysuppliers is3 on is3.InventoryId = i.InventoryId
        ${whereClause}
      `,
    ]);

    const total = Number(totalResult[0]?.total || 0)

    return res.json({
      data: products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return res.status(500).json({ error});
  }
}

router.get("/", listProducts);

module.exports = router;
module.exports.listProducts = listProducts;
