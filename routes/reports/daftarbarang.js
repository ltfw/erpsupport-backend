const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang, req.user);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const searchDate = req.query.date?.trim() || '';
    const cabang = req.query.cabang?.trim() || '';
    const vendor = req.query.vendor?.trim() || '';
    const barang = req.query.barang?.trim() || '';

    let cabangArray = [];
    let vendorArray = [];
    let barangArray = [];
    const allowedRoles = ['ADM', 'FAS', 'MKT-SANI'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang ? cabang.replaceAll(';', ',').split(',').map(s => s.trim()) : [];
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }

    if (allowedRoles.includes(userRole) && vendor) {
      vendorArray = vendor ? vendor.replaceAll(';', ',').split(',').map(s => s.trim()) : [];
    } else if (allowedRoles.includes(userRole) && !vendor) {
      if (userRole == 'MKT-SANI') {
        vendorArray = [req.user.vendor];
      } else {
        vendorArray = [];
      }
    } else {
      vendorArray = [req.user.vendor];
    }

    if (allowedRoles.includes(userRole) && barang) {
      barangArray = barang ? barang.replaceAll(';', ',').split(',').map(s => s.trim()) : [];
    } else if (allowedRoles.includes(userRole) && !barang) {
      barangArray = [];
    } else {
      barangArray = [];

    }

    // barangArray = ['01-00001', '01-00002'];

    console.log("user roles:", userRole, "barang Array: ", barangArray, "barang: ", barang);


    const [data, totalResult] = await Promise.all([
      prisma.$queryRaw`
        select
          is2.KodeGudang,
          w.NamaGudang,
          i.KodeItem,
          i.NamaBarang,
          sum(bnt.Qty) as 'SumQtyPhysical',
          sum(bnt.QtyPickingList) as 'SumQtyPickingList',
          sum(bnt.QtyBooking) as 'SumQtyBooking',
          boso.boso as 'SumQtyBoSO',
          sum(bnt.Qty) - abs(boso.boso) as 'SumQtyAvailable',
          case when CONVERT(DATE, GETDATE()) = ${searchDate} then sum(bnt.Qty) - abs(boso.boso)
          else sum(bnt.Qty) end as QtyShow,
          case when i.IsConsignmentIn = 1 then 'Konsinyasi'
          when i.isbonus = 1 then 'Bonus'
          else 'Reguler' end as Keterangan
        from inventories i
        join inventorystocks is2 on
          i.InventoryId = is2.InventoryId
        join batchnumbertransactions bnt on
          bnt.InventoryStockId = is2.InventoryStockId
        join Warehouses w on
          w.kodegudang = is2.KodeGudang
        join InventorySuppliers is3 on
          is3.InventoryId = i.InventoryId 
        join (
          select is2.InventoryId, is2.KodeGudang,sum(is2.QtyBoSo) as boso from InventoryStocks is2 
          join inventories i on is2.InventoryId = i.InventoryId
          group BY is2.InventoryId, is2.KodeGudang
        ) as boso on is2.KodeGudang = boso.kodegudang and is2.inventoryid = boso.inventoryid
        where
          (is2.KodeGudang <> '00-GUU-03' and is2.KodeGudang <> '00-GUU-02' and is2.KodeGudang <> '03-GUU-03')
          and cast(bnt.tanggaltransaksi as date) <= ${searchDate}
          ${cabangArray.length > 0 ? sql`and w.KodeDept in (${Prisma.join(cabangArray)})` : sql``}
          ${vendorArray.length > 0 ? sql`and is3.KodeLgn in (${Prisma.join(vendorArray)})` : sql``}
          ${barangArray.length > 0 ? sql`and i.KodeItem in (${Prisma.join(barangArray)})` : sql``}
        group by
          is2.KodeGudang,
          w.NamaGudang,
          i.kodeitem,
          i.NamaBarang,
          boso.boso,
          i.IsConsignmentIn,
          i.isbonus
        having
          sum(bnt.qty) > 0
        order by
          is2.KodeGudang,i.KodeItem
        OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY
      `,
      prisma.$queryRaw`
        select
          count(*) as total
        from
          (
            select
              is2.KodeGudang,
              w.NamaGudang,
              i.KodeItem,
              i.NamaBarang,
              sum(bnt.Qty) as 'SumQtyPhysical',
              sum(bnt.QtyPickingList) as 'SumQtyPickingList',
              sum(bnt.QtyBooking) as 'SumQtyBooking',
              boso.boso as 'SumQtyBoSO',
              sum(bnt.Qty) - abs(boso.boso) as 'SumQtyAvailable',
              case when CONVERT(DATE, GETDATE()) = ${searchDate} then sum(bnt.Qty) - abs(boso.boso)
              else sum(bnt.Qty) end as QtyShow,
              case when i.IsConsignmentIn = 1 then 'Konsinyasi'
              when i.isbonus = 1 then 'Bonus'
              else 'Reguler' end as Keterangan
            from inventories i
            join inventorystocks is2 on
              i.InventoryId = is2.InventoryId
            join batchnumbertransactions bnt on
              bnt.InventoryStockId = is2.InventoryStockId
            join Warehouses w on
              w.kodegudang = is2.KodeGudang
            join InventorySuppliers is3 on
              is3.InventoryId = i.InventoryId 
            join (
              select is2.InventoryId, is2.KodeGudang,sum(is2.QtyBoSo) as boso from InventoryStocks is2 
              join inventories i on is2.InventoryId = i.InventoryId
              group BY is2.InventoryId, is2.KodeGudang
            ) as boso on is2.KodeGudang = boso.kodegudang and is2.inventoryid = boso.inventoryid
            where
              (is2.KodeGudang <> '00-GUU-03' and is2.KodeGudang <> '00-GUU-02' and is2.KodeGudang <> '03-GUU-03')
              and cast(bnt.tanggaltransaksi as date) <= ${searchDate}
              ${cabangArray.length > 0 ? sql`and w.KodeDept in (${Prisma.join(cabangArray)})` : sql``}
              ${vendorArray.length > 0 ? sql`and is3.KodeLgn in (${Prisma.join(vendorArray)})` : sql``}
              ${barangArray.length > 0 ? sql`and i.KodeItem in (${Prisma.join(barangArray)})` : sql``}
            group by
              is2.KodeGudang,
              w.NamaGudang,
              i.kodeitem,
              i.NamaBarang,
              boso.boso,
              i.IsConsignmentIn,
              i.isbonus
            having
              sum(bnt.qty) > 0
          ) as t
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


module.exports = router;