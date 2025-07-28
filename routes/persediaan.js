const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'warn', 'error'], });

router.get("/perbatch", async (req, res) => {
  try {
    console.log("Fetching per batch stocks...");
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 200;
    const skip = (page - 1) * pageSize;
    const search = req.query.search?.trim() || '';
    const endDate = req.query.date || getCurrentDateFormatted();
    const cabangParam = req.query.cabang || '';
    const vendorParam = req.query.vendor || '';
    const barangParam = req.query.barang || '';
    const userRole = req.user.role;
    const userCabang = req.user.cabang || '';
    const userVendor = req.user.vendor || '';
    console.log("User Role:", userRole, "Cabang:", userCabang, "Vendor:", userVendor);

    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()) : [];
    const vendorArray = vendorParam ? vendorParam.split(',').map(v => v.trim()) : [];
    const barangArray = barangParam ? barangParam.split(',').map(b => b.trim()) : [];

    const searchQuery = `%${search}%`;

    const whereFragments = [];

    // Search
    if (search) {
      whereFragments.push(Prisma.sql`i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}`);
    }

    // Cabang filter
    if (userRole !== 'ADM') {
      const cabangList = cabangArray.length > 0 ? cabangArray : [userCabang];
      whereFragments.push(Prisma.sql`w.KodeDept IN (${Prisma.join(cabangList)})`);
    }

    // Vendor filter
    if (userRole !== 'ADM') {
      const vendorList = vendorArray.length > 0 ? vendorArray : [userVendor];
      whereFragments.push(Prisma.sql`is3.VendorId IN (${Prisma.join(vendorList)})`);
    }

    // Barang filter
    if (barangArray.length > 0) {
      whereFragments.push(Prisma.sql`i.KodeItem IN (${Prisma.join(barangArray)})`);
    }

    // Build WHERE clause safely
    let whereClause;

    if (whereFragments.length === 0) {
      whereClause = Prisma.empty;
    } else if (whereFragments.length === 1) {
      // Single condition: no AND needed
      whereClause = Prisma.sql`WHERE ${whereFragments[0]}`;
    } else {
      // Multiple conditions: join with AND
      let combined = whereFragments.reduce((acc, curr) => {
        return Prisma.sql`${acc} AND ${curr}`;
      });
      whereClause = Prisma.sql`WHERE ${combined}`;
    }

    const query = Prisma.sql`
      SELECT
        bc.BusinessCentreName,
        is2.KodeGudang,
        w.NamaGudang,
        i.KodeItem,
        i.NamaBarang,
        sumBatchNumber.BatchNumber,
        FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
        sumBatchNumber.Qty
      FROM
        inventories i
      JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
      JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
      JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
      JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
      JOIN (
        SELECT
          bnt.InventoryStockId,
          bnt.BatchNumber,
          bnt.TglExpired,
          SUM(bnt.Qty) AS Qty
        FROM BatchNumberTransactions bnt
        WHERE CAST(bnt.tanggaltransaksi AS DATE) <= ${endDate}
        GROUP BY bnt.InventoryStockId, bnt.BatchNumber, bnt.TglExpired
        HAVING SUM(bnt.Qty) > 0
      ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
      ${whereClause}
      ORDER BY is2.KodeGudang, sumBatchNumber.BatchNumber
      OFFSET ${skip} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `;

    // 🔥 DEBUG: Log the query
    console.log("Final SQL Query:", query);

    const customers = await prisma.$queryRaw`
      SELECT
        bc.BusinessCentreName,
        is2.KodeGudang,
        w.NamaGudang,
        i.KodeItem,
        i.NamaBarang,
        sumBatchNumber.BatchNumber,
        FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
        sumBatchNumber.Qty
      FROM
        inventories i
      JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
      JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
      JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
      JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
      JOIN (
        SELECT
          bnt.InventoryStockId,
          bnt.BatchNumber,
          bnt.TglExpired,
          SUM(bnt.Qty) AS Qty
        FROM
          BatchNumberTransactions bnt
        WHERE
          CAST(bnt.tanggaltransaksi AS DATE) <= ${endDate}
        GROUP BY
          bnt.InventoryStockId,
          bnt.BatchNumber,
          bnt.TglExpired
        HAVING
          SUM(bnt.Qty) > 0
      ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
      ${whereClause}
      ORDER BY
        is2.KodeGudang,
        sumBatchNumber.BatchNumber
      OFFSET ${skip} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `;

    // Count query
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM inventories i
      JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
      JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
      JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
      JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
      JOIN (
        SELECT DISTINCT InventoryStockId
        FROM BatchNumberTransactions
        WHERE CAST(tanggaltransaksi AS DATE) <= ${endDate}
      ) AS bnt ON is2.InventoryStockId = bnt.InventoryStockId
      ${whereClause}
    `;

    const total = Number(countResult[0]?.total || 0);

    return res.json({
      data: customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in /perbatch:", error); // Log full error
    return res.status(500).json({
      message: "Failed to fetch per batch",
      details: error.message || error,
    });
  }
});


// Get all customers using pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 200;
    const skip = (page - 1) * pageSize;
    const search = req.query.search?.trim() || ''

    const searchQuery = `%${search}%`

    const [customers, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
      select
        i.KodeItem,
        i.NamaBarang,
        case when i.IsConsignmentIn = 1 then 'Konsinyasi'
        when i.isbonus = 1 then 'Bonus'
        else 'Reguler' end as Keterangan
      from
        Inventories i
      where
        i.VendorId = '75BC91F1-6D7B-487A-B659-8CA0A200ACB1'
        and (i.KodeItem like '${searchQuery}' or i.NamaBarang like '${searchQuery}')
      order by i.kodeitem,i.NamaBarang
      offset ${skip} rows
      fetch next ${pageSize} rows only;
    `),
      prisma.$queryRawUnsafe(`
        select count(*) as total 
        from Inventories i
        where i.VendorId = '75BC91F1-6D7B-487A-B659-8CA0A200ACB1'
        and (i.KodeItem like '${searchQuery}' or i.NamaBarang like '${searchQuery}')
      `),
    ]);

    const total = Number(totalResult[0]?.total || 0)

    return res.json({
      data: customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await prisma.$queryRaw`
      select c.*,rd.RayonCode,cg.CustomerGroupName,be.BusinessEntityName,d.NamaDept from customers c 
      join CustomerGroups cg on c.CustomerGroupId = cg.CustomerGroupId
      join BusinessEntities be on c.BusinessEntityId = be.BusinessEntityId
      join RayonDistricts rd on c.DistrictId = rd.DistrictId
      join Departments d on c.KodeDept = d.KodeDept
      where c.CustomerId=${req.params.id};
    `

    const rayonCustomer = await prisma.$queryRaw`
      select rd.* from rayondistricts rd
      join customers c on rd.DistrictId = c.DistrictId
      where c.CustomerId=${req.params.id};
    `
    const BusinessEntity = await prisma.$queryRaw`
      select be.* from BusinessEntities be
      join customers c on be.BusinessEntityId = c.BusinessEntityId
      where c.CustomerId=${req.params.id};
    `

    const customerGroup = await prisma.$queryRaw`
      select cg.* from customergroups cg
      join customers c on cg.CustomerGroupId = c.CustomerGroupId
      where c.CustomerId=${req.params.id};
    `

    const legalitasOutlet = await prisma.$queryRaw`
      select 
      cgmp.CustomerGroupMasterPermissionName,
      cgp.PermissionTitleCode,
      cgvp.PermissionValue,
      cgvp.FilePath,
      cgvp.Nomor,
      isnull(format(cgvp.ExpiredDate,'yyyy-MM-dd'),'') as tglExpired 
      from customers c
      join customergrouppermissions cgp on c.CustomerGroupId = cgp.customergroupid
      join CustomerGroupMasterPermissions cgmp on cgmp.customergroupmasterpermissioncode = cgp.customergroupmasterpermissioncode
      left join CustomerGroupValuePermissions cgvp on cgp.customergroupmasterpermissioncode = cgvp.customergroupmasterpermissioncode and c.customerid = cgvp.customerid
      where c.CustomerId=${req.params.id}
      order by cgvp.PermissionTitleCode, cgvp.Nomor;
    `;

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json({
      id: req.params.id,
      customer: customer[0],
      rayonCustomer: rayonCustomer[0],
      customerGroup: customerGroup[0],
      legalitasOutlet: legalitasOutlet,
      businessEntity: BusinessEntity[0],
    });
  } catch (error) {
    return res.status(500).json({ error });
  }
});


module.exports = router;
