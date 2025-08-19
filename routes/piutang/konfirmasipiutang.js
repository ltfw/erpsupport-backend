const express = require("express");
const { PrismaClient, Prisma } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const { sql } = Prisma;

router.get("/", async (req, res) => {
  const userRole = req.user.role;
  console.log("data user", req.user.role, req.user.username, req.user.cabang);

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    const searchQuery = `%${search}%`;
    const cabang = req.query.cabang?.trim() || '';

    let cabangArray = [];
    const allowedRoles = ['ADM', 'FAS'];
    if (allowedRoles.includes(userRole) && cabang) {
      cabangArray = cabang ? cabang.split(',').map(s => s.trim()) : [];
    } else if (allowedRoles.includes(userRole) && !cabang) {
      cabangArray = [];
    } else {
      cabangArray = [req.user.cabang];
    }
    console.log("user role:", userRole, "Cabang Array: ", cabangArray);
    const offsetClause = sql`OFFSET ${sql([skip])} ROWS FETCH NEXT ${sql([pageSize])} ROWS ONLY`;

    const [piutang, totalResult] = await Promise.all([
      prisma.$queryRaw`
        select
          d.NamaDept,
          c.KodeLgn,
          c.NamaLgn,
          be.BusinessEntityName,
          ati.CustomerId,
          s.NamaSales,
          sum(ati.JumlahTrn) as nominal
        from
          artransactionitems ati
        join customers c on
          ati.customerid = c.customerid
        join departments d ON 
          d.KodeDept = c.KodeDept
        join BusinessEntities be on
          be.BusinessEntityId = c.BusinessEntityId
        join salesmen s on
          c.KodeSales = s.KodeSales
        where
          (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})
          ${cabangArray.length > 0 ? sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
        group by
          d.NamaDept,
          c.KodeLgn,
          c.NamaLgn,
          be.BusinessEntityName,
          ati.CustomerId,
          s.NamaSales
        having
          sum(ati.JumlahTrn) > 0
        order by
          c.kodelgn
        ${offsetClause}
      `,
      prisma.$queryRaw`
        SELECT
          COUNT(*) as total
        FROM
          (
          SELECT
            d.NamaDept,
            c.KodeLgn,
            c.NamaLgn,
            be.BusinessEntityName,
            ati.CustomerId,
            sum(ati.JumlahTrn) as nominal
          FROM
            artransactionitems ati
          JOIN customers c ON
            ati.customerid = c.customerid
          JOIN departments d ON
            d.KodeDept = c.KodeDept
          JOIN BusinessEntities be ON
            be.BusinessEntityId = c.BusinessEntityId
          JOIN salesmen s ON
            c.KodeSales = s.KodeSales
          WHERE
            (c.NamaLgn LIKE ${searchQuery} OR c.KodeLgn LIKE ${searchQuery})
                  ${cabangArray.length > 0 ? sql`AND c.KodeDept IN (${Prisma.join(cabangArray)})` : sql``}
          GROUP BY
            d.NamaDept,
            c.KodeLgn,
            c.NamaLgn,
            be.BusinessEntityName,
            ati.CustomerId,
            s.NamaSales
          HAVING
            SUM(ati.JumlahTrn) > 0
        ) AS grouped_results;
      `
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: piutang,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch piutang", errors: error });
  }
});

router.get("/header/:id", async (req, res) => {
  try {
    // KodeDept: req.params.id
    const data = await prisma.$queryRaw`
        select 
          FORMAT(getdate(), 'dd MMMM yyyy', 'id-ID') as tanggalSurat,
          case when c.KodeDept = '00' then 'Surabaya' else d.namadept end as Kota,
          c.NamaLgn as namaPenerima,
          be.BusinessEntityName,
          sum(ati.JumlahTrn) as saldoHutang 
        from artransactionitems ati
        join customers c on ati.customerid = c.customerid
        join departments d on c.KodeDept = d.KodeDept
        join BusinessEntities be on c.BusinessEntityId = be.BusinessEntityId
        where c.CustomerId = ${req.params.id}
        group by
          c.KodeDept,
          d.NamaDept,
          c.NamaLgn,
          be.BusinessEntityName
        ;
      `

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Header" });
  }
});

router.get("/detail/:id", async (req, res) => {
  try {
    // KodeDept: req.params.id
    const data = await prisma.$queryRaw`
      select
        distinct 
        ati.ParentTransaction,
        ati.TglTrnFaktur,
        format(ati.TglTrnFaktur, 'dd/MM/yyyy', 'ID-id') as TglTrnFaktur,
        format(ati.TglJthTmp, 'dd/MM/yyyy', 'ID-id') as TglJthTmp,
        datediff(day, ati.tgljthtmp, getdate()) as aging,
        ardetail.nominal
      from
        artransactionitems ati
      join (
        select
          ati.ParentTransaction,
          sum(ati.JumlahTrn) as nominal
        from
          artransactionitems ati
        where
          ati.CustomerId = ${req.params.id}
        group by
          ati.ParentTransaction
        having
          sum(ati.JumlahTrn) > 0
            ) as ardetail on
        ardetail.ParentTransaction = ati.ParentTransaction
      where
        ati.CustomerId = ${req.params.id}
      order by
        ati.TglTrnFaktur;
      `      

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Detail" });
  }
});

module.exports = router;
