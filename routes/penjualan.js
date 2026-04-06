const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");
const { PrismaClient: PrismaClient2026, Prisma: Prisma2026 } = require("../generated/dbtrans2026");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'], });
const prisma2026 = new PrismaClient2026({ log: ['warn', 'error'], });
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

    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    if (startYear !== endYear) {
      return res.status(400).json({ error: "Start date and end date must be in the same year" });
    }

    const prismaBase = new Date(startDate).getFullYear() === 2026 ? prisma2026 : prisma;
    const PrismaWhere = new Date(startDate).getFullYear() === 2026 ? Prisma2026 : Prisma;

    // Apply user role logic for default filters
    if (userRole != 'ADM') {
      if (cabangArray.length === 0 && userCabang) { // Ensure userCabang is valid
        cabangArray.push(userCabang);
      }
    }

    if (userVendor) {
      if (vendorArray.length === 0 && userVendor) { // Ensure userVendor is valid
        vendorArray.push(userVendor);
      }
    }

    // --- Main Data Query ---
    // Using the Prisma.sql`` and Prisma.join approach from your original working file
    const sales = await prismaBase.$queryRaw`
      SELECT
        DISTINCT
        d.NamaDept,
        d.KepalaCabang,
        sih.KodeWil,
        s.NamaSales,
        s2.NamaSales AS NamaSpv,
        r.RayonName,
        FORMAT(sih.TglFaktur, 'dd/MM/yyyy') AS TglFaktur,
        sih.NoBukti,
        cg.CustomerGroupName,
        be.BusinessEntityName,
        c.KodeLgn,
        c.NamaLgn,
        c.Alamat1,
        i.KodeItem,
        i.NamaBarang,
        is3.NamaLgn AS NamaSupplier,
        bc.BusinessCentreName,
        ISNULL(ispbd.SalesPrice / NULLIF(i.KonversiSatuanDasar, 0), 0) as BasePriceSatuanTerkecil,
        ispbd.SalesPrice as BasePrice,
        -- Prefer Hna if > 0, otherwise HargaJual
        CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
        END AS Hna,
        -- Qty: negative for RS, positive otherwise
        CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END AS Qty,
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) * i.KonversiSatuanDasar AS QtySatuanTerkecil,
        sii.SatuanNs,
        -- ValueHNA
        (CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
        END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) AS ValueHNA,
        ispbd.SalesPrice *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) AS ValueBasePrice,
        -- ValueNett
        ((CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
          END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END))
        -
        ((CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
          END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) * sii.ItemDisPsn / 100) AS ValueNett,
        -- TotalValueDisc
        ((CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
          END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) * sii.ItemDisPsn / 100) AS TotalValueDisc,
        -- Distributor Discount
        ((CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
          END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) * sii.DiscountDistributorPsn / 100) AS ValueDiscDist,
        -- Principle Discount
        ((CASE 
            WHEN sii.Hna = 0 THEN sii.HargaJual
            ELSE sii.Hna
          END) *
        (CASE 
            WHEN SUBSTRING(sih.NoBukti, CHARINDEX('/', sih.NoBukti) + 1, 2) = 'RS' 
                THEN -1 * ABS(COALESCE(bnt.Qty, sii.Qty, 0))
            ELSE ABS(COALESCE(bnt.Qty, sii.Qty, 0))
        END) * sii.DiscountPrinciplePsn / 100) AS ValueDiscPrinc,
        sii.ItemDisPsn AS TotalDiscPsn,
        sii.DiscountDistributorPsn AS DiscDistPsn,
        sii.DiscountPrinciplePsn AS DiscPrincPsn,
        bnt.BatchNumber,
        FORMAT(bnt.TglExpired, 'dd/MM/yyyy') AS TglExpired,
        c.Province,
        c.Regency,
        c.District,
        c.Village,
        CASE
            WHEN sih.TipeJual = 'E' THEN 'E-Katalog'
            WHEN sih.TipeJual = 'R' THEN 'Non E-Katalong'
            ELSE ''
        END AS TipeJual,
        sih.PoLanggan,
        sii.PromotionCode,
        p.PromotionName
    FROM SalesInvoiceHeaders sih
    JOIN SalesInvoiceItems sii 
        ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
    JOIN BatchNumberTransactions bnt 
        ON bnt.InventoryStockId = sii.InventoryStockId
      AND (bnt.ParentTransaction = sih.AllNoSj OR bnt.ParentTransactionId = sih.SalesInvoiceHeaderId)
    JOIN InventoryStocks is2 ON bnt.InventoryStockId = is2.InventoryStockId
    JOIN Inventories i ON is2.InventoryId = i.InventoryId
    JOIN Departments d ON d.KodeDept = sih.KodeCc
    JOIN Salesmen s ON s.KodeSales = sih.KodeSales
    JOIN Salesmen s2 ON s2.KodeSales = s.KodeSalesSupport
    JOIN Customers c ON c.CustomerId = sih.CustomerId
    JOIN RayonDistricts rd ON c.DistrictId = rd.DistrictId
    JOIN Rayons r ON rd.RayonCode = r.RayonCode
    JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
    JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
    JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId
    JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
    LEFT JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
    join InventorySalesPriceByDates ispbd on i.InventoryId = ispbd.InventoryId 
    	and ispbd.StartingDate <= sih.TglFaktur
    	AND (
	        sih.TglFaktur < DATEADD(day, 1, CAST(ispbd.EndDate AS DATE))
	        OR ispbd.EndDate IS NULL
	    )
      WHERE sih.TglFaktur >= ${startDate + ' 00:00:00'} and sih.TglFaktur <= ${endDate + ' 23:59:59'}
        ${cabangArray.length > 0
        ? PrismaWhere.sql`AND sih.KodeCc IN (${PrismaWhere.join(cabangArray)})`
        : PrismaWhere.sql``}
        ${barangArray.length > 0
        ? PrismaWhere.sql`AND i.KodeItem IN (${PrismaWhere.join(barangArray)})`
        : PrismaWhere.sql``}
        ${vendorArray.length > 0
        ? PrismaWhere.sql`AND is3.KodeLgn IN (${PrismaWhere.join(vendorArray)})`
        : PrismaWhere.sql``}
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
    const totalResult = await prismaBase.$queryRaw`
      SELECT COUNT(*) as total
      FROM SalesInvoiceHeaders sih
      JOIN SalesInvoiceItems sii 
          ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
      JOIN BatchNumberTransactions bnt 
          ON bnt.InventoryStockId = sii.InventoryStockId
        AND (bnt.ParentTransaction = sih.AllNoSj OR bnt.ParentTransactionId = sih.SalesInvoiceHeaderId)
      JOIN InventoryStocks is2 ON bnt.InventoryStockId = is2.InventoryStockId
      JOIN Inventories i ON is2.InventoryId = i.InventoryId
      JOIN Departments d ON d.KodeDept = sih.KodeCc
      JOIN Salesmen s ON s.KodeSales = sih.KodeSales
      JOIN Salesmen s2 ON s2.KodeSales = s.KodeSalesSupport
      JOIN Customers c ON c.CustomerId = sih.CustomerId
      JOIN RayonDistricts rd ON c.DistrictId = rd.DistrictId
      JOIN Rayons r ON rd.RayonCode = r.RayonCode
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN InventorySuppliers is3 ON is3.InventoryId = i.InventoryId and is3.IsForSalesInvoice = 1
      JOIN BusinessCentres bc ON bc.BusinessCentreCode = is3.BusinessCentreCode
      LEFT JOIN Promotions p ON p.PromotionCode = sii.PromotionCode
      WHERE sih.TglFaktur BETWEEN ${startDate} AND ${endDate}
        ${cabangArray.length > 0
        ? PrismaWhere.sql`AND sih.KodeCc IN (${PrismaWhere.join(cabangArray)})`
        : PrismaWhere.sql``}
        ${barangArray.length > 0
        ? PrismaWhere.sql`AND i.KodeItem IN (${PrismaWhere.join(barangArray)})`
        : PrismaWhere.sql``}
        ${vendorArray.length > 0
        ? PrismaWhere.sql`AND is3.KodeLgn IN (${PrismaWhere.join(vendorArray)})`
        : PrismaWhere.sql``}
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
      data: sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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

    if (userVendor) {
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
        dp.TglSj <= ${endDate + ' 23:59:59'} 
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
      data: sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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

    if (userVendor) {
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
        dc.TglTagih <= ${endDate + ' 23:59:59'} 
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
        dc.TglTagih <= ${endDate + ' 23:59:59'} 
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
      data: sales, // Match frontend expectation (check your frontend expects 'data' or 'sales')
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

router.get("/dpl", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || -1;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : []; // Filter empty strings
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const searchQuery = `%${search}%`;
    const userRole = req.user.role;
    const userCabang = req.user.cabang;
    const userVendor = req.user.vendor;

    if (!endDate) {
      return res.status(400).json({ error: "end date are required" });
    }

    // Apply user role logic for default filters
    if (userRole != 'ADM' && userRole != 'FAS') {
      if (cabangArray.length === 0 && userCabang) { // Ensure userCabang is valid
        cabangArray.push(userCabang);
      }
    }

    if (userVendor) {
      if (cabangArray.length === 0 && userVendor) { // Ensure userVendor is valid
        cabangArray.push(userVendor);
      }
    }
    const pageSetup = pageSize > 0 ? Prisma2026.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY` : Prisma2026.sql``;

    // --- Main Data Query ---
    // Using the Prisma.sql`` and Prisma.join approach from your original working file
    const sales = await prisma2026.$queryRaw`
      select
        d.NamaDept,
        p.PromotionName,
        FORMAT(p.StartDate, 'dd/MM/yyyy') as StartDate,
        FORMAT(p.EndDate, 'dd/MM/yyyy') as EndDate,
        c.KodeLgn,
        c.NamaLgn,
        pi.KodeItem,
        pi.NamaBarang as NamaItem,
        pi.Hna as hna,
        pi.DiscountPrinciple as discountprincipal,
        pi.DiscountDistributor as discountdistributor,
        pi.SupportDiscount as supportdiscount
      from Promotions p 
      left join PromotionItems pi on p.PromotionId = pi.PromotionId
      join customers c on p.CustomerId  = c.CustomerId
      join Departments d on c.KodeDept = d.KodeDept
      where
        p.StartDate >= ${startDate + ' 00:00:00'} and p.EndDate <= ${endDate + ' 23:59:59'}
        ${cabangArray.length > 0
        ? Prisma2026.sql`AND c.KodeDept IN (${Prisma2026.join(cabangArray)})`
        : Prisma2026.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
        )
        and p.IsActive = 1
      order by d.NamaDept,p.EndDate
      ${pageSetup};
    `;
    // --- End Main Data Query ---


    // --- Count Query ---
    // Also using the reliable Prisma2026.sql`` and Prisma2026.join approach
    const totalResult = await prisma2026.$queryRaw`
      select
        count(*) as total
      from Promotions p 
      left join PromotionItems pi on p.PromotionId = pi.PromotionId
      join customers c on p.CustomerId  = c.CustomerId
      join Departments d on c.KodeDept = d.KodeDept
      where
        p.StartDate >= ${startDate + ' 00:00:00'} and p.EndDate <= ${endDate + ' 23:59:59'}
        ${cabangArray.length > 0
        ? Prisma2026.sql`AND c.KodeDept IN (${Prisma2026.join(cabangArray)})`
        : Prisma2026.sql``}
        AND (
            c.KodeLgn LIKE ${searchQuery} OR c.NamaLgn LIKE ${searchQuery}
        )
        and p.IsActive = 1
    `;
    // --- End Count Query ---

    const total = Number(totalResult[0]?.total || 0);

    const customersMap = new Map();
    const itemsData = [];

    sales.forEach(row => {
      // Create a unique key for the customer row
      const custKey = row.PromotionName + '_' + row.KodeLgn;
      if (!customersMap.has(custKey)) {
        customersMap.set(custKey, {
          NamaDept: row.NamaDept,
          PromotionName: row.PromotionName,
          StartDate: row.StartDate,
          EndDate: row.EndDate,
          KodeLgn: row.KodeLgn,
          NamaLgn: row.NamaLgn
        });
      }
      
      itemsData.push({
        NamaDept: row.NamaDept,
        PromotionName: row.PromotionName,
        StartDate: row.StartDate,
        EndDate: row.EndDate,
        KodeItem: row.KodeItem,
        NamaItem: row.NamaItem,
        hna: row.hna,
        discountprincipal: row.discountprincipal,
        discountdistributor: row.discountdistributor,
        supportdiscount: row.supportdiscount
      });
    });

    return res.json({
      data: itemsData,
      customerData: Array.from(customersMap.values()),
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

module.exports = router;
