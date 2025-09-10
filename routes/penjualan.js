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
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : []; // Filter empty strings
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const barangParam = req.query.barang || '';
    const barangArray = barangParam ? barangParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userName = req.user.username;
    const userCabang = req.user.cabang;
    const userVendor = req.user.vendor;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    // Apply user role logic for default filters
    if (userRole != 'ADM') {
      if (cabangArray.length === 0 && userCabang) { // Ensure userCabang is valid
        cabangArray.push(userCabang);
      }
    }

    if(userVendor){
      if (vendorArray.length === 0 && userVendor) { // Ensure userVendor is valid
        vendorArray.push(userVendor);
      }
    }

    // --- Main Data Query ---
    // Using the Prisma.sql`` and Prisma.join approach from your original working file
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
        sii.Hna,
        case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end as Qty,
        sii.SatuanNs,
        sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end as ValueHNA,
        (sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end) - (sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end * sii.itemdispsn / 100) as ValueNett,
        (sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end * sii.itemdispsn / 100) as TotalValueDisc,
        (sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end * sii.DiscountDistributorPsn / 100) as ValueDiscDist,
        (sii.Hna * case when bnt.qtyrefund > 0 then bnt.Qty else abs(bnt.Qty) end * sii.DiscountPrinciplePsn / 100) as ValueDiscPrinc,
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
      JOIN Customers c ON c.CustomerId = sih.CustomerId
      JOIN RayonDistricts rd on c.DistrictId = rd.DistrictId
      JOIN Rayons r ON rd.RayonCode = r.RayonCode
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
      JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
      LEFT JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
      WHERE cast(sih.TglFaktur as date) BETWEEN ${startDate} AND ${endDate}
        ${cabangArray.length > 0
          ? Prisma.sql`AND sih.KodeCc IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        ${barangArray.length > 0
          ? Prisma.sql`AND i.KodeItem IN (${Prisma.join(barangArray)})`
          : Prisma.sql``}
        ${vendorArray.length > 0
          ? Prisma.sql`AND is3.KodeLgn IN (${Prisma.join(vendorArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            OR i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}
            OR sih.NoBukti LIKE ${searchQuery} OR sih.AllNoSj LIKE ${searchQuery}
            OR sih.KodeWil LIKE ${searchQuery} OR s.KodeSales LIKE ${searchQuery} OR s2.KodeSales LIKE ${searchQuery}
            OR sih.PoLanggan LIKE ${searchQuery} OR p.PromotionCode LIKE ${searchQuery}
        )
      ORDER BY sih.NoBukti
      OFFSET ${skip} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `;
    // --- End Main Data Query ---

    // --- Count Query ---
    // Also using the reliable Prisma.sql`` and Prisma.join approach
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
      JOIN Customers c ON c.CustomerId = sih.CustomerId
      JOIN RayonDistricts rd on c.DistrictId = rd.DistrictId
      JOIN Rayons r ON rd.RayonCode = r.RayonCode
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
      JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
      LEFT JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
      WHERE sih.TglFaktur BETWEEN ${startDate} AND ${endDate}
        ${cabangArray.length > 0
          ? Prisma.sql`AND sih.KodeCc IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        ${barangArray.length > 0
          ? Prisma.sql`AND i.KodeItem IN (${Prisma.join(barangArray)})`
          : Prisma.sql``}
        ${vendorArray.length > 0
          ? Prisma.sql`AND is3.KodeLgn IN (${Prisma.join(vendorArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            OR i.KodeItem LIKE ${searchQuery} OR i.NamaBarang LIKE ${searchQuery}
            OR sih.NoBukti LIKE ${searchQuery} OR sih.AllNoSj LIKE ${searchQuery}
            OR sih.KodeWil LIKE ${searchQuery} OR s.KodeSales LIKE ${searchQuery} OR s2.KodeSales LIKE ${searchQuery}
            OR sih.PoLanggan LIKE ${searchQuery} OR p.PromotionCode LIKE ${searchQuery}
        )
    `;
    // --- End Count Query ---

    const total = Number(totalResult[0]?.total || 0);

    return res.json({
      data:sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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
      details: process.env.NODE_ENV === 'development' ? error.message || String(error) : 'An internal server error occurred'
    });
  }
});

router.get("/outstandingsj", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || -1;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : []; // Filter empty strings
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userName = req.user.username;
    const userCabang = req.user.cabang;
    const userVendor = req.user.vendor;

    if (!endDate) {
      return res.status(400).json({ error: "end date are required" });
    }

    // Apply user role logic for default filters
    if (userRole != 'ADM') {
      if (cabangArray.length === 0 && userCabang) { // Ensure userCabang is valid
        cabangArray.push(userCabang);
      }
    }

    if(userVendor){
      if (vendorArray.length === 0 && userVendor) { // Ensure userVendor is valid
        vendorArray.push(userVendor);
      }
    }
    const pageSetup = pageSize > 0 ? Prisma.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY` : Prisma.sql``;

    // --- Main Data Query ---
    // Using the Prisma.sql`` and Prisma.join approach from your original working file
    const sales = await prisma.$queryRaw`
      select
        is3.kodelgn as KodeSupplier,
        format(dp.TglSj,'yyyy-MM-dd') as TglSj,
        dp.NoSJ,
        dp.NoSo,
        dp.PoLanggan,
        CONCAT(c.NamaLgn, ' ', be.BusinessEntityCode) as NamaLgn,
        dpi.NamaBarang,
        dpi.SatuanNs,
        dpi.Qty,
        dpi.Hna,
        (dpi.qty * dpi.hna) as Total,
        s.NamaSales
      from
        DeliveryPermits dp
      left join SalesInvoiceHeaders sih on
        dp.DeliveryPermitId = sih.DeliveryPermitId
      join DeliveryPermitItems dpi on
        dp.DeliveryPermitId = dpi.DeliveryPermitId
      join customers c on
        dp.CustomerId = c.CustomerId
      join BusinessEntities be on
        c.BusinessEntityId = be.BusinessEntityId
      join inventorystocks is2 on
        dpi.Inventorystockid = is2.inventorystockid
      join InventorySuppliers is3 on
        is2.inventoryid = is3.inventoryid
      join salesmen s on
        dp.KodeSales = s.kodesales
      where
        sih.SalesInvoiceHeaderId is null and 
        dp.TglSj <= ${endDate + ' 23:59:59' } 
        ${cabangArray.length > 0
          ? Prisma.sql`AND dp.KodeCc IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        ${vendorArray.length > 0
          ? Prisma.sql`AND is3.KodeLgn IN (${Prisma.join(vendorArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            or dpi.NamaBarang LIKE ${searchQuery}
            OR dp.NoSJ LIKE ${searchQuery} 
        )
      order by dp.TglSj desc
      ${pageSetup};
    `;
    // --- End Main Data Query ---

    // --- Count Query ---
    // Also using the reliable Prisma.sql`` and Prisma.join approach
    const totalResult = await prisma.$queryRaw`
      select
        count(*) as total
      from
        DeliveryPermits dp
      left join SalesInvoiceHeaders sih on
        dp.DeliveryPermitId = sih.DeliveryPermitId
      join DeliveryPermitItems dpi on
        dp.DeliveryPermitId = dpi.DeliveryPermitId
      join customers c on
        dp.CustomerId = c.CustomerId
      join BusinessEntities be on
        c.BusinessEntityId = be.BusinessEntityId
      join inventorystocks is2 on
        dpi.Inventorystockid = is2.inventorystockid
      join InventorySuppliers is3 on
        is2.inventoryid = is3.inventoryid
      join salesmen s on
        dp.KodeSales = s.kodesales
      where
        sih.SalesInvoiceHeaderId is null and 
        cast(dp.TglSj as date) <= ${endDate}
        ${cabangArray.length > 0
          ? Prisma.sql`AND dp.KodeCc IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        ${vendorArray.length > 0
          ? Prisma.sql`AND is3.KodeLgn IN (${Prisma.join(vendorArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
            or dpi.NamaBarang LIKE ${searchQuery}
            OR dp.NoSJ LIKE ${searchQuery} 
        )
    `;
    // --- End Count Query ---

    const total = Number(totalResult[0]?.total || 0);

    return res.json({
      data:sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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
      details: error
    });
  }
});

router.get("/outstandingdt", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || -1;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : []; // Filter empty strings
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userName = req.user.username;
    const userCabang = req.user.cabang;
    const userVendor = req.user.vendor;

    if (!endDate) {
      return res.status(400).json({ error: "end date are required" });
    }

    // Apply user role logic for default filters
    if (userRole != 'ADM') {
      if (cabangArray.length === 0 && userCabang) { // Ensure userCabang is valid
        cabangArray.push(userCabang);
      }
    }

    if(userVendor){
      if (vendorArray.length === 0 && userVendor) { // Ensure userVendor is valid
        vendorArray.push(userVendor);
      }
    }
    const pageSetup = pageSize > 0 ? Prisma.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY` : Prisma.sql``;

    // --- Main Data Query ---
    // Using the Prisma.sql`` and Prisma.join approach from your original working file
    const sales = await prisma.$queryRaw`
      select 
        d.namadept as 'NamaCabang',
        dc.nobukti as 'NoTagih',
        format(dc.tgltagih, 'dd/MM/yyyy') as 'TglTagih',
        FORMAT(dc.tgltagih, 'MMMM', 'id-ID') as 'Bulan',
        dc.namapenagih as 'NamaPenagih',
        dc.grandtotal as 'NominalTotal'
      from DebtCollections dc 
      join Customers c on c.CustomerId = dc.customerid
      join departments d on c.KodeDept = d.kodedept
      where isclosed <> 1 and isclosedmanually <> 1 and
        dc.TglTagih <= ${endDate + ' 23:59:59' } 
        ${cabangArray.length > 0
          ? Prisma.sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
        )
      order by dc.tgltagih,dc.nobukti
      ${pageSetup};
    `;
    // --- End Main Data Query ---

    // --- Count Query ---
    // Also using the reliable Prisma.sql`` and Prisma.join approach
    const totalResult = await prisma.$queryRaw`
      select
        count(*) as total
      from DebtCollections dc 
      join Customers c on c.CustomerId = dc.customerid
      join departments d on c.KodeDept = d.kodedept
      where isclosed <> 1 and isclosedmanually <> 1 and
        dc.TglTagih <= ${endDate + ' 23:59:59' } 
        ${cabangArray.length > 0
          ? Prisma.sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
        )
    `;
    // --- End Count Query ---

    const total = Number(totalResult[0]?.total || 0);

    return res.json({
      data:sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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
      details: error
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
