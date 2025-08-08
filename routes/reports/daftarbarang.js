const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query','warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * pageSize;
    const searchDate = req.query.date?.trim() || '';

    // The pagination part needs to be directly after ORDER BY.
    // The variables `skip` and `pageSize` should not be wrapped in `sql(...)` here.

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
          else sum(bnt.Qty) end as QtyShow
        from inventories i
        join inventorystocks is2 on
          i.InventoryId = is2.InventoryId
        join batchnumbertransactions bnt on
          bnt.InventoryStockId = is2.InventoryStockId
        join Warehouses w on
          w.kodegudang = is2.KodeGudang
        join (
          select is2.InventoryId, is2.KodeGudang,sum(is2.QtyBoSo) as boso from InventoryStocks is2 
          join inventories i on is2.InventoryId = i.InventoryId
          group BY is2.InventoryId, is2.KodeGudang
        ) as boso on is2.KodeGudang = boso.kodegudang and is2.inventoryid = boso.inventoryid
        where
          cast(bnt.tanggaltransaksi as date) <= ${searchDate}
        group by
          is2.KodeGudang,
          w.NamaGudang,
          i.kodeitem,
          i.NamaBarang,
          boso.boso
        having
          sum(bnt.qty) > 0
        order by
          is2.KodeGudang,i.KodeItem
        OFFSET ${skip} ROWS FETCH NEXT ${pageSize} ROWS ONLY
      `,
      prisma.$queryRaw`
        select
          count(*) as total
        from inventories i
        join inventorystocks is2 on
          i.InventoryId = is2.InventoryId
        join batchnumbertransactions bnt on
          bnt.InventoryStockId = is2.InventoryStockId
        join Warehouses w on
          w.kodegudang = is2.KodeGudang
        join (
          select is2.InventoryId, is2.KodeGudang,sum(is2.QtyBoSo) as boso from InventoryStocks is2 
          join inventories i on is2.InventoryId = i.InventoryId
          group BY is2.InventoryId, is2.KodeGudang
        ) as boso on is2.KodeGudang = boso.kodegudang and is2.inventoryid = boso.inventoryid
        where
          cast(bnt.tanggaltransaksi as date) <= ${searchDate}
        group by
          is2.KodeGudang,
          w.NamaGudang,
          i.kodeitem,
          i.NamaBarang,
          boso.boso
        having
          sum(bnt.qty) > 0
        order by
          is2.KodeGudang,i.KodeItem
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