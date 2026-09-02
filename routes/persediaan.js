const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans2026");
const { getCurrentDateFormatted } = require("../utils/Date");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'], });

router.get("/perbatch", async (req, res) => {
  const endDate = req.query.date;
  // check if date is valid
  if (!endDate) {
    return res.status(400).json({ error: "Date is required" });
  }
  if (endDate > getCurrentDateFormatted()) {
    return res.status(400).json({ error: "Date is not valid" });
  }
  
  try {
    console.log("Fetching per batch stocks...");
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 200;
    const skip = (page - 1) * pageSize;
    const search = req.query.search?.trim() || '';
    const endDate = req.query.date;
    const cabangParam = req.query.cabang || '';
    const vendorParam = req.query.vendor || '';
    const barangParam = req.query.barang || '';
    const userRole = req.user.role;
    const userCabang = req.user.cabang || '';
    const userVendor = req.user.vendor || '';
    console.log("User Role:", userRole, "Cabang:", userCabang, "Vendor:", userVendor);

    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()) : [];
    const vendorArray = vendorParam ? vendorParam.split(',').map(v => v.trim()) : (userVendor ? [userVendor] : []);
    const barangArray = barangParam ? barangParam.split(',').map(b => b.trim()) : [];
    console.log("Cabang Array:", cabangArray, "Vendor Array:", vendorArray, "Barang Array:", barangArray);

    const searchQuery = `%${search}%`;

    const whereFragments = [];

    // Search
    if (search) {
      whereFragments.push(Prisma.sql`is2.KodeGudang LIKE ${searchQuery} OR w.NamaGudang LIKE ${searchQuery}`);
    }

    // Cabang filter
    if (userRole !== 'ADM' || cabangArray.length > 0) {
      const cabangList = cabangArray.length > 0 ? cabangArray : [userCabang].filter(Boolean);
      if (cabangList.length > 0) {
        // 2. Gunakan Prisma.join untuk menggabungkan elemen array dengan koma
        whereFragments.push(
          Prisma.sql`w.KodeDept IN (${Prisma.join(cabangList)})`
        );
      }
    }

    // Vendor filter
    if (userRole !== 'ADM') {
      const vendorList = vendorArray.length > 0 ? vendorArray : [userVendor];
      whereFragments.push(Prisma.sql`is3.KodeLgn IN (${Prisma.join(vendorList)})`);
    }else if(vendorArray.length > 0) {
      console.log("Vendor Array:", vendorArray);
      whereFragments.push(Prisma.sql`is3.KodeLgn IN (${Prisma.join(vendorArray)})`);
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
    console.log("Constructed WHERE clause:", whereClause);

    // const query = Prisma.sql`
    //   SELECT
    //     bc.BusinessCentreName,
    //     is2.KodeGudang,
    //     w.NamaGudang,
    //     i.KodeItem,
    //     i.NamaBarang,
    //     sumBatchNumber.BatchNumber,
    //     FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
    //     sumBatchNumber.Qty
    //   FROM
    //     inventories i
    //   JOIN InventoryStocks is2 ON i.InventoryId = is2.InventoryId
    //   JOIN inventorysuppliers is3 ON is3.InventoryId = is2.InventoryId
    //   JOIN businesscentres bc ON bc.businessCentreCode = is3.businessCentreCode
    //   JOIN Warehouses w ON w.KodeGudang = is2.KodeGudang
    //   JOIN (
    //     SELECT
    //       bnt.InventoryStockId,
    //       bnt.BatchNumber,
    //       bnt.TglExpired,
    //       SUM(bnt.Qty) AS Qty
    //     FROM BatchNumberTransactions bnt
    //     WHERE CAST(bnt.tanggaltransaksi AS DATE) <= ${endDate}
    //     GROUP BY bnt.InventoryStockId, bnt.BatchNumber, bnt.TglExpired
    //     HAVING SUM(bnt.Qty) > 0
    //   ) AS sumBatchNumber ON is2.InventoryStockId = sumBatchNumber.InventoryStockId
    //   ${whereClause}
    //   and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
    //   ORDER BY is2.KodeGudang, sumBatchNumber.BatchNumber
    //   OFFSET ${skip} ROWS
    //   FETCH NEXT ${pageSize} ROWS ONLY;
    // `;

    // 🔥 DEBUG: Log the query
    // console.log("Final SQL Query:", query);

    const customers = await prisma.$queryRaw`
      SELECT
        bc.BusinessCentreName,
        is2.KodeGudang,
        w.NamaGudang,
        i.KodeItem,
        i.NamaBarang,
        sumBatchNumber.BatchNumber,
        FORMAT(sumBatchNumber.TglExpired, 'dd/MM/yyyy') AS TglExpired,
        sumBatchNumber.Qty,
        i.KonversiSatuanDasar * sumBatchNumber.Qty AS SumQtySecondary
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
      and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
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
      and is2.KodeGudang not in ('00-GUU-03','00-GUU-02','03-GUU-03')
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

    const [customers, totalResult] = await Promise.all([
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
      data: customers,
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
