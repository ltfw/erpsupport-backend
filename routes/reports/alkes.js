const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");
const { getCurrentDateFormatted } = require("../../utils/Date");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'warn', 'error'] });
const { sql } = Prisma;

router.get("/salurankeluar", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const startDate = req.query.start_date?.trim() || getCurrentDateFormatted();
    const endDate = req.query.end_date?.trim() || getCurrentDateFormatted();
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    const offsetClause = pageSize > 0 ? Prisma.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY` : Prisma.sql``;
    const whereClause = Prisma.sql`bnt.TanggalTransaksi between ${startDate} and ${endDate}`;

    const [data, totalResult] = await Promise.all([
      prisma.$queryRaw`
        select
          w.KodeDept as KodeCabang,
          d.NamaDept,
          i.KodeAlias as IdProduk,
          i.NamaBarang as NamaProduk,
          i.Nie as NomorIzinEdar,
          i.TipeUkuran,
          bnt.BatchNumber,
          i.TipeUkuran as [Katalog],
          abs(bnt.Qty) as JumlahPenyaluran,
          format(bnt.TanggalTransaksi,'dd/MM/yyyy', 'id-ID') as TanggalKeluar,
          format(bnt.TglExpired,'dd/MM/yyyy', 'id-ID') as TanggalKadaluarsa,
          bnt.parenttransaction,
          bnt.KodeSumber,
          case when it.gdgtarget <> '' then it.gdgtarget else c.namalgn end as namalgn,
          case when it.gdgtarget <> '' then it.gdgtarget else c.NomorLgnKemenkes end as IdPartner,
          case when it.gdgtarget <> '' then it.gdgtarget else c.NamaLgnKemenkes end as NamaPartner
        from
          BatchNumberTransactions bnt 
        join InventoryStocks is2 on
          bnt.InventoryStockId = is2.InventoryStockId
        join Inventories i on
          is2.InventoryId = i.InventoryId
        join InventoryCategories ic on
          ic.KodeKategory = i.KodeKategory 
        join Warehouses w on
          is2.KodeGudang = w.KodeGudang 
        join InventoryTransactions it on
          bnt.ParentTransaction = it.parenttransaction
        left join customers c on
          c.customerid = it.kodelgnguid
        join Departments d on
          w.KodeDept = d.KodeDept
        join InventorySuppliers is3 on
          i.InventoryId = is3.InventoryId
        where 
          ${whereClause}
          ${cabangArray.length > 0
          ? Prisma.sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
          ${vendorArray.length > 0
          ? Prisma.sql`AND is.KodeLgn IN (${Prisma.join(vendorArray)}) OR it.gdgtarget IN (${Prisma.join(vendorArray)}))`
          : Prisma.sql``}
          and ic.ParentCategory in ('CLSPKR','CLSALK') 
          and bnt.TypeTrn = 'Out'
          and bnt.KodeSumber <> 'PKL'
          and bnt.InventoryTransactionType in ('K','M','S')
        order by
          bnt.ParentTransaction,bnt.TanggalTransaksi
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT count(*) as total
        from
          BatchNumberTransactions bnt 
        join InventoryStocks is2 on
          bnt.InventoryStockId = is2.InventoryStockId
        join Inventories i on
          is2.InventoryId = i.InventoryId
        join InventoryCategories ic on
          ic.KodeKategory = i.KodeKategory 
        join Warehouses w on
          is2.KodeGudang = w.KodeGudang 
        join InventoryTransactions it on
          bnt.ParentTransaction = it.parenttransaction
        left join customers c on
          c.customerid = it.kodelgnguid
        join Departments d on
          w.KodeDept = d.KodeDept
        where 
          ${whereClause}
          and ic.ParentCategory in ('CLSPKR','CLSALK') 
          and bnt.TypeTrn = 'Out'
          and bnt.KodeSumber <> 'PKL'
          and bnt.InventoryTransactionType in ('K','M','S')
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data", errors: error });
  }
});

router.get("/saluranmasuk", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const startDate = req.query.start_date?.trim() || getCurrentDateFormatted();
    const endDate = req.query.end_date?.trim() || getCurrentDateFormatted();
    const cabangParam = req.query.cabang || '';
    const cabangArray = cabangParam ? cabangParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const vendorParam = req.query.vendor || '';
    const vendorArray = vendorParam ? vendorParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    const offsetClause = pageSize > 0 ? Prisma.sql`OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY` : Prisma.sql``;
    const whereClause = Prisma.sql`bnt.TanggalTransaksi between ${startDate + ' 00:00:00'} and ${endDate + ' 23:59:59'}`;

    let [data, totalResult] = [[], 0];

    [data, totalResult] = await Promise.all([
      prisma.$queryRaw`
        select
        w.KodeDept as KodeCabang,
        d.NamaDept as NamaCabang,
        i.KodeAlias as IdProduk,
        i.NamaBarang as NamaProduk,
        i.Nie as NomorIzinEdar,
        i.TipeUkuran,
        bnt.BatchNumber,
        i.TipeUkuran as [Katalog],
        abs(bnt.Qty) as JumlahPenyaluran,
        format(bnt.TanggalTransaksi,'yyyy-MM-dd', 'id-ID') as TanggalMasuk,
        format(bnt.TglExpired,'yyyy-MM-dd', 'id-ID') as TanggalKadaluarsa,
        bnt.parenttransaction,
        it.KodeSumber,
        it.GdgTarget,
        v.NamaLgn,
        case when d.isHeadOffice = 1 then v.NomorLgnKemenkes 
        when it.KodeSumber = 'IN' then cm.KodeUpline
        else '' end as IdPartner,
        case when d.isHeadOffice = 1 then v.NamaLgnKemenkes 
        when it.KodeSumber = 'IN' then cm.NamaUpline 
        else '' end as NamaPartner
        from
          BatchNumberTransactions bnt 
        join InventoryStocks is2 on
          bnt.InventoryStockId = is2.InventoryStockId
        join Inventories i on
          is2.InventoryId = i.InventoryId
        join InventoryCategories ic on
          ic.KodeKategory = i.KodeKategory 
        join Warehouses w on
          is2.KodeGudang = w.KodeGudang 
        join Departments d on
          w.KodeDept = d.KodeDept
        join InventoryTransactions it on
          bnt.ParentTransaction = it.parenttransaction
        left join vendors v on
          it.kodelgnguid = v.vendorid
        left join ERPSupport.dbo.CabangMapping cm on
	        cm.CabangTarget  = w.KodeDept
        where 
          ${whereClause}
          ${cabangArray.length > 0
          ? Prisma.sql`AND w.KodeDept IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
          and ic.ParentCategory in ('CLSPKR','CLSALK') 
          and bnt.TypeTrn = 'In'
          and bnt.KodeSumber <> 'PKL'
          and bnt.InventoryTransactionType in ('B','G','X')
        order by
          bnt.ParentTransaction,bnt.TanggalTransaksi
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT count(1) as total
        from
          BatchNumberTransactions bnt 
        join InventoryStocks is2 on
          bnt.InventoryStockId = is2.InventoryStockId
        join Inventories i on
          is2.InventoryId = i.InventoryId
        join InventoryCategories ic on
          ic.KodeKategory = i.KodeKategory 
        join Warehouses w on
          is2.KodeGudang = w.KodeGudang 
        join Departments d on
          w.KodeDept = d.KodeDept
        join InventoryTransactions it on
          bnt.ParentTransaction = it.parenttransaction
        left join vendors v on
          it.kodelgnguid = v.vendorid 
        where 
          ${whereClause}
          ${cabangArray.length > 0
          ? Prisma.sql`AND w.KodeDept IN (${Prisma.join(cabangArray)})`
          : Prisma.sql``}
          and ic.ParentCategory in ('CLSPKR','CLSALK') 
          and bnt.TypeTrn = 'In'
          and bnt.KodeSumber <> 'PKL'
          and bnt.InventoryTransactionType in ('B','G','X')
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);
    // res.json({data, total});

    res.json({
      data: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data", errors: error });
  }
});

// GET a single department by ID (KodeDept)
router.get("/:id", async (req, res) => {
  try {
    const department = await prisma.data.findUnique({
      where: {
        KodeDept: req.params.id,
      },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch department" });
  }
});

module.exports = router;