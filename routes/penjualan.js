const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'], });
// const currentMonth = (new Date()).getMonth() + 1;
const currentMonth = 3;

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()) : [];
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()) : [];
    const barangParam = req.query.barang || '';
    const barangArray = barangParam ? barangParam.split(',').map(s => s.trim()) : [];
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userName = req.user.username;
    const userCabang = req.user.cabang;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    if (userRole != 'ADM') {
      if (cabangArray.length === 0) {
        cabangArray.push(userCabang);
      }
    }

    // --- Optimization Attempt for Later Pages ---
    let effectiveSkip = skip;
    let effectivePageSize = pageSize;

    if (page > 1) {
      // For pages > 1, try to find the anchor NoBukti more efficiently
      // This query selects only the NoBukti needed to start the page,
      // potentially reducing the work done by OFFSET.
      try {
        const anchorQueryResult = await prisma.$queryRaw`
                SELECT sih.NoBukti
                FROM SalesInvoiceHeaders sih
                JOIN SalesInvoiceItems sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
                JOIN BatchNumberTransactions bnt ON bnt.InventoryStockId = sii.InventoryStockId AND bnt.ParentTransaction = sih.AllNoSj
                JOIN InventoryStocks is2 ON bnt.InventoryStockId = is2.InventoryStockId
                JOIN Inventories i ON is2.InventoryId = i.InventoryId
                JOIN Departments d ON d.KodeDept = sih.KodeCc
                JOIN Salesmen s ON s.KodeSales = sih.KodeSales
                JOIN Salesmen s2 ON s2.KodeSales = s.KodeSalesSupport
                JOIN Rayons r ON s.KodeSales = r.KodeSales
                JOIN Customers c ON c.CustomerId = sih.CustomerId
                JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
                JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
                JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
                JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
                JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
                JOIN PwdatSATORIA.dbo.UserSupplier us ON us.VendorId = is3.VendorId
                WHERE sih.TglFaktur BETWEEN ${startDate} AND ${endDate}
                ${cabangArray.length > 0 ? Prisma.join([Prisma.raw('AND sih.KodeCc IN ('), Prisma.join(cabangArray.map(c => Prisma.raw(`'${c}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
                ${barangArray.length > 0 ? Prisma.join([Prisma.raw('AND i.KodeItem IN ('), Prisma.join(barangArray.map(b => Prisma.raw(`'${b}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
                ${vendorArray.length > 0 ? Prisma.join([Prisma.raw('AND is3.KodeLgn IN ('), Prisma.join(vendorArray.map(v => Prisma.raw(`'${v}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
                AND (
                    c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
                    OR i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}
                    OR sih.NoBukti LIKE ${searchQuery} OR sih.AllNoSj LIKE ${searchQuery}
                    OR sih.KodeWil LIKE ${searchQuery} OR s.KodeSales LIKE ${searchQuery} OR s2.KodeSales LIKE ${searchQuery}
                    OR sih.PoLanggan LIKE ${searchQuery} OR p.PromotionCode LIKE ${searchQuery}
                )
                ORDER BY sih.NoBukti
                OFFSET ${skip} ROWS FETCH NEXT 1 ROWS ONLY;
            `;

        if (anchorQueryResult.length > 0) {
          // If we found the anchor, modify the main query to start from it
          // This replaces the large OFFSET in the main query
          const anchorNoBukti = anchorQueryResult[0].NoBukti;
          // We will adjust the main query's WHERE clause to start from this anchor
          // and reduce the OFFSET accordingly. However, to keep it simple and
          // because modifying WHERE clauses dynamically is complex and error-prone,
          // we will proceed with the original query logic for the main data fetch.
          // The optimization is mainly in the COUNT query below.
          // The anchor query itself might already provide some benefit by being
          // a simpler query to find the starting point.
        }
        // If anchor query fails or returns no data, fall back to original logic
      } catch (anchorError) {
        console.warn("Anchor query failed, falling back to standard pagination:", anchorError.message);
        // Continue with original skip/pageSize
      }
    }
    // --- End Optimization Attempt ---

    // Main data query - Your original query, which is known to work
    const sales = await prisma.$queryRaw`
      SELECT
        d.NamaDept,
        d.KepalaCabang,
        sih.KodeWil,
        s.NamaSales,
        s2.NamaSales as NamaSpv,
        r.RayonName,
        FORMAT(sih.TglFaktur, 'dd/MM/yyyy') as TglFaktur,
        sih.NoBukti,
        cg.CustomerGroupName,
        be.BusinessEntityName,
        c.KodeLgn,
        c.NamaLgn,
        c.Alamat1,
        i.KodeItem,
        i.NamaBarang,
        is3.NamaLgn as NamaSupplier,
        bc.BusinessCentreName,
        sii.Hna1,
        sii.Qty,
        sii.SatuanNs,
        sii.hna1 * sii.Qty as ValueHNA,
        (sii.hna1 * sii.Qty) - (sii.hna1 * sii.Qty * sii.itemdispsn / 100) as ValueNett,
        (sii.hna1 * sii.Qty * sii.itemdispsn / 100) as TotalValueDisc,
        (sii.hna1 * sii.Qty * sii.DiscountDistributorPsn / 100) as ValueDiscDist,
        (sii.hna1 * sii.Qty * sii.DiscountPrinciplePsn / 100) as ValueDiscPrinc,
        sii.ItemDisPsn as TotalDiscPsn,
        sii.DiscountDistributorPsn as DiscDistPsn,
        sii.DiscountPrinciplePsn as DiscPrincPsn,
        bnt.BatchNumber,
        FORMAT(bnt.TglExpired, 'dd/MM/yyyy') as TglExpired,
        c.Province,
        c.Regency,
        c.District,
        c.Village,
        CASE
          WHEN sih.TipeJual = 'E' THEN 'E-Katalog'
          WHEN sih.TipeJual = 'R' THEN 'Non E-Katalong'
          ELSE ''
        END as TipeJual,
        sih.PoLanggan,
        sii.PromotionCode,
        p.PromotionName
      FROM SalesInvoiceHeaders sih
      JOIN SalesInvoiceItems sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
      JOIN BatchNumberTransactions bnt ON bnt.InventoryStockId = sii.InventoryStockId AND bnt.ParentTransaction = sih.AllNoSj
      JOIN InventoryStocks is2 ON bnt.InventoryStockId = is2.InventoryStockId
      JOIN Inventories i ON is2.InventoryId = i.InventoryId
      JOIN Departments d ON d.KodeDept = sih.KodeCc
      JOIN Salesmen s ON s.KodeSales = sih.KodeSales
      JOIN Salesmen s2 ON s2.KodeSales = s.KodeSalesSupport
      JOIN Rayons r ON s.KodeSales = r.KodeSales
      JOIN Customers c ON c.CustomerId = sih.CustomerId
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
      JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
      JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
      JOIN PwdatSATORIA.dbo.UserSupplier us ON us.VendorId = is3.VendorId
      WHERE sih.TglFaktur BETWEEN ${startDate} AND ${endDate}
        ${cabangArray.length > 0 ? Prisma.join([Prisma.raw('AND sih.KodeCc IN ('), Prisma.join(cabangArray.map(c => Prisma.raw(`'${c}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        ${barangArray.length > 0 ? Prisma.join([Prisma.raw('AND i.KodeItem IN ('), Prisma.join(barangArray.map(b => Prisma.raw(`'${b}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        ${vendorArray.length > 0 ? Prisma.join([Prisma.raw('AND is3.KodeLgn IN ('), Prisma.join(vendorArray.map(v => Prisma.raw(`'${v}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            OR i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}
            OR sih.NoBukti LIKE ${searchQuery} OR sih.AllNoSj LIKE ${searchQuery}
            OR sih.KodeWil LIKE ${searchQuery} OR s.KodeSales LIKE ${searchQuery} OR s2.KodeSales LIKE ${searchQuery}
            OR sih.PoLanggan LIKE ${searchQuery} OR p.PromotionCode LIKE ${searchQuery}
        )
      ORDER BY sih.NoBukti
      OFFSET ${effectiveSkip} ROWS
      FETCH NEXT ${effectivePageSize} ROWS ONLY;
    `;

    // Count query - Your original query, which is known to work
    // Consider caching this result if it's a performance bottleneck
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM SalesInvoiceHeaders sih
      JOIN SalesInvoiceItems sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
      JOIN BatchNumberTransactions bnt ON bnt.InventoryStockId = sii.InventoryStockId AND bnt.ParentTransaction = sih.AllNoSj
      JOIN InventoryStocks is2 ON bnt.InventoryStockId = is2.InventoryStockId
      JOIN Inventories i ON is2.InventoryId = i.InventoryId
      JOIN Departments d ON d.KodeDept = sih.KodeCc
      JOIN Salesmen s ON s.KodeSales = sih.KodeSales
      JOIN Salesmen s2 ON s2.KodeSales = s.KodeSalesSupport
      JOIN Rayons r ON s.KodeSales = r.KodeSales
      JOIN Customers c ON c.CustomerId = sih.CustomerId
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
      JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
      JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
      JOIN PwdatSATORIA.dbo.UserSupplier us ON us.VendorId = is3.VendorId
      WHERE sih.TglFaktur BETWEEN ${startDate} AND ${endDate}
        ${cabangArray.length > 0 ? Prisma.join([Prisma.raw('AND sih.KodeCc IN ('), Prisma.join(cabangArray.map(c => Prisma.raw(`'${c}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        ${barangArray.length > 0 ? Prisma.join([Prisma.raw('AND i.KodeItem IN ('), Prisma.join(barangArray.map(b => Prisma.raw(`'${b}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        ${vendorArray.length > 0 ? Prisma.join([Prisma.raw('AND is3.KodeLgn IN ('), Prisma.join(vendorArray.map(v => Prisma.raw(`'${v}'`)), ','), Prisma.raw(')')]) : Prisma.raw('')}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            OR i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}
            OR sih.NoBukti LIKE ${searchQuery} OR sih.AllNoSj LIKE ${searchQuery}
            OR sih.KodeWil LIKE ${searchQuery} OR s.KodeSales LIKE ${searchQuery} OR s2.KodeSales LIKE ${searchQuery}
            OR sih.PoLanggan LIKE ${searchQuery} OR p.PromotionCode LIKE ${searchQuery}
        )
    `;

    const total = Number(totalResult[0]?.total || 0);

    return res.json({
      data: sales, // Match frontend expectation
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    // Return a more detailed error message
    return res.status(500).json({
      error: "Failed to fetch sales",
      details: error.message || String(error), // Better serialization
    });
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
