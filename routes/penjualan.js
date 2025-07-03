const express = require("express");
const { PrismaClient } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: [ 'info', 'warn', 'error'], });
// const currentMonth = (new Date()).getMonth() + 1;
const currentMonth = 3;

// Get all customers using pagination
router.get("/", async (req, res) => {
  
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || ''
    const skip = (page - 1) * pageSize;

    const searchQuery = `%${search}%`

    const [sales, totalResult] = await Promise.all([
      prisma.$queryRaw`
      select
        d.NamaDept,
        d.KepalaCabang,
        sih.KodeWil,
        s.NamaSales,
        s2.NamaSales as NamaSpv,
        r.RayonName,
        format(sih.TglFaktur, 'dd/MM/yyyy') as TglFaktur,
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
        format(bnt.TglExpired, 'dd/MM/yyyy') as TglExpired,
        c.Province,
        c.Regency,
        c.District,
        c.Village,
        case
          when sih.TipeJual = 'E' then 'E-Katalog'
          when sih.TipeJual = 'R' then 'Non E-Katalong'
          else ''
        end as TipeJual,
        sih.PoLanggan,
        sii.PromotionCode,
        p.PromotionName 
      from
        SalesInvoiceHeaders sih
      join salesinvoiceitems sii on
        sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
      join BatchNumberTransactions bnt on
        bnt.InventoryStockId = sii.InventoryStockId
        and bnt.ParentTransaction = sih.AllNoSj
      join inventorystocks is2 on
        bnt.InventoryStockId = is2.InventoryStockId
      join Inventories i on
        is2.InventoryId = i.InventoryId
      join Departments d on
        d.KodeDept = sih.KodeCc
      join Salesmen s on
        s.KodeSales = sih.KodeSales
      join Salesmen s2 on
        s2.KodeSales = s.KodeSalesSupport
      join Rayons r on
        s.KodeSales = r.KodeSales
      join Customers c on
        c.CustomerId = sih.CustomerId
      join CustomerGroups cg on
        c.CustomerGroupId = cg.CustomerGroupId
      join BusinessEntities be on
        c.BusinessEntityId = be.BusinessEntityId
      join InventorySuppliers is3 on
        is3.InventoryId = i.InventoryId
      join BusinessCentres bc on
        bc.BusinessCentreCode = is3.BusinessCentreCode
      join promotions p on
      	p.PromotionCode = sii.PromotionCode
      where
        month(sih.tglfaktur) = ${currentMonth}
      order by 
        sih.NoBukti
      offset ${skip} rows
      fetch next ${pageSize} rows only;
    `,
      prisma.$queryRawUnsafe(`
        select count(*) as total 
        from
          SalesInvoiceHeaders sih
        join salesinvoiceitems sii on
          sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
        join BatchNumberTransactions bnt on
          bnt.InventoryStockId = sii.InventoryStockId
          and bnt.ParentTransaction = sih.AllNoSj
        join inventorystocks is2 on
          bnt.InventoryStockId = is2.InventoryStockId
        join Inventories i on
          is2.InventoryId = i.InventoryId
        join Departments d on
          d.KodeDept = sih.KodeCc
        join Salesmen s on
          s.KodeSales = sih.KodeSales
        join Salesmen s2 on
          s2.KodeSales = s.KodeSalesSupport
        join Rayons r on
          s.KodeSales = r.KodeSales
        join Customers c on
          c.CustomerId = sih.CustomerId
        join CustomerGroups cg on
          c.CustomerGroupId = cg.CustomerGroupId
        join BusinessEntities be on
          c.BusinessEntityId = be.BusinessEntityId
        join InventorySuppliers is3 on
          is3.InventoryId = i.InventoryId
        join BusinessCentres bc on
          bc.BusinessCentreCode = is3.BusinessCentreCode
        join promotions p on
          p.PromotionCode = sii.PromotionCode
        where
          month(sih.tglfaktur) = ${currentMonth}
      `),
    ]);

    const total = Number(totalResult[0]?.total || 0)

    return res.json({
      data: sales,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch sales" });
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
