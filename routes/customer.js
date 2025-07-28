const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['info', 'warn', 'error'], });

// Get all customers using pagination
router.get("/export", async (req, res) => {
  try {
    const userCabang = req.user.cabang;
    const userRole = req.user.role;

    // Build WHERE clause and params
    let whereClause = '';
    const params = [];

    if (userRole !== 'ADM') {
      whereClause = 'WHERE c.KodeDept = @P1';
      params.push(userCabang);
    }

    const customers = await prisma.$queryRawUnsafe(`
      SELECT
        d.NamaDept AS "Nama Cabang",
        c.KodeLgn AS "Kode Customer",
        c.NamaLgn AS "Nama Customer",
        c.BatasKredit AS "Kredit Limit",
        c.KodeSyarat AS "TOP",
        ISNULL(c.NomorLgnBpom, '') AS "Kode Customer BPOM",
        ISNULL(c.NamaLgnBpom, '') AS "Nama Customer BPOM",
        ISNULL(c.NomorLgnKemenkes, '') AS "Kode Customer KEMENKES",
        ISNULL(c.NamaLgnKemenkes, '') AS "Nama Customer KEMENKES",
        be.BusinessEntityName AS "Badan Usaha",
        cg.CustomerGroupName AS "Customer Group",
        FORMAT(c.TglRegistrasi, 'dd/MM/yyyy') AS "Tgl Registrasi",
        FORMAT(c.TglEntry, 'dd/MM/yyyy') AS "Tgl Update",
        ISNULL(c.NamaPemilik, '') AS "Nama Pemilik",
        ISNULL(c.HubungDengan, '') AS "CP",
        ISNULL(c.TypeIdentitas, '') AS "Tipe Identitas",
        ISNULL(c.NoIdentitas, '') AS "No Identitas",
        ISNULL(c.TkuId, '') AS "TKUId",
        ISNULL(c.TaxTransactionCode, '') AS "Kode Pajak",
        CASE WHEN c.NonAktif = 0 THEN 'Aktif' ELSE 'Non Aktif' END AS "Status Customer",
        c.Alamat1 AS "Alamat",
        r.RayonName AS "Rayon",
        c.Province AS "Provinsi",
        c.Regency AS "Kota/Kabupaten",
        c.District AS "Kecamatan",
        c.Village AS "Desa/Kelurahan",
        c.KodePos AS "Kode Pos",
        s.NamaSales AS "Salesman",
        c.Latitude,
        c.Longitude,
        CONCAT('https://www.google.com/maps/search/?api=1&query=', c.Latitude, ',', c.Longitude) AS "Lokasi Customer",
        c.Npwp,
        c.NpwpOwner,
        CASE WHEN c.Pkp = 1 THEN 'PKP' ELSE 'NON-PKP' END AS "Status Pajak",
        c.AlamatPajak AS "Alamat Pajak",
        CASE 
          WHEN c.TypePpn = 'E' THEN 'PPN Eksklusif'
          WHEN c.TypePpn = 'I' THEN 'PPN Inklusif'
          WHEN c.TypePpn = 'K' THEN 'PPN Tidak Dipungut Pajak'
          WHEN c.TypePpn = 'T' THEN 'Tidak Ada PPN'
        END AS "Tipe PPn",
        CONCAT('https://erp.sdlindonesia.com/#/customer/edit/', c.CustomerId) AS "URL"
      FROM Customers c
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN Areas a ON c.KodeWil = a.KodeWil
      JOIN Departments d ON a.KodeDept = d.KodeDept
      JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
      JOIN Salesmen s ON c.KodeSales = s.KodeSales
      JOIN RayonDistricts rd ON c.DistrictId = rd.DistrictId
      JOIN Rayons r ON rd.RayonCode = r.RayonCode
      ${whereClause}
      ORDER BY c.KodeLgn
    `, ...params);

    return res.json({
      data: customers,
    });
  } catch (error) {
    console.error("Export customer error:", error);
    return res.status(500).json({
      error: "Failed to fetch customers",
      details: error.message,
    });
  }
});


router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.per_page) || 10, 1), 100);
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;

    const userCabang = req.user.cabang;
    const userRole = req.user.role;

    // Build WHERE clause with @P1, @P2, etc.
    let whereClause = `(c.KodeLgn LIKE @P1 OR c.NamaLgn LIKE @P2)`;
    const params = [`%${search}%`, `%${search}%`]; // P1 and P2

    if (userRole !== 'ADM') {
      whereClause += ` AND c.KodeDept = @P3`;
      params.push(userCabang); // P3
    }

    const [customers, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT 
          c.CustomerId,
          c.KodeLgn,
          c.NamaLgn,
          cg.CustomerGroupName,
          be.BusinessEntityName,
          d.NamaDept,
          s.NamaSales,
          c.Alamat1
        FROM customers c
        JOIN CustomerGroups cg ON c.CustomerGroupId = cg.CustomerGroupId
        JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
        JOIN salesmen s ON c.KodeSales = s.KodeSales
        JOIN Departments d ON c.KodeDept = d.KodeDept
        WHERE ${whereClause}
        ORDER BY c.KodeLgn
        OFFSET ${skip} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY;
      `, ...params),

      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) AS total
        FROM customers c
        WHERE ${whereClause}
      `, ...params),
    ]);

    const total = Number(totalResult[0]?.total || 0);

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
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      message: "Failed to fetch customers",
      details: error.message,
    });
  }
});

router.get("/rayoncustomer", async (req, res) => {
  try {
    const rayon = req.query.rayon?.trim()
    const group = req.query.group?.trim()

    if (!rayon) {
      return res.status(400).json({ error: "Rayon is required." })
    }

    // Prepare conditions separately
    const conditions = []
    if (rayon) {
      conditions.push(`rd.RayonCode = '${rayon}'`)
    }
    if (group) {
      conditions.push(`c.CustomerGroupId = '${group}'`)
    }

    // Build WHERE clause manually
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    // Final raw SQL string (safe only if you control the input)
    const rawQuery = `
      SELECT d.NamaDept, r.RayonName, s.NamaSales, c.KodeLgn, c.NamaLgn, 
             be.BusinessEntityName, cg.CustomerGroupName
      FROM customers c
      JOIN RayonDistricts rd ON c.DistrictId = rd.DistrictId
      JOIN Rayons r ON rd.RayonCode = r.RayonCode
      JOIN Departments d ON c.KodeDept = d.KodeDept
      JOIN Salesmen s ON c.KodeSales = s.KodeSales
      JOIN BusinessEntities be ON c.BusinessEntityId = be.BusinessEntityId
      JOIN CustomerGroups cg ON cg.CustomerGroupId = c.CustomerGroupId
      ${whereClause}
    `

    // Use $queryRawUnsafe since we're building raw SQL manually
    const rayonCustomer = await prisma.$queryRawUnsafe(rawQuery)
    res.json({ data: rayonCustomer })

  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Get Rayon Customer Error",
      details: error.message
    })
  }
})

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
      isnull(format(cgvp.ExpiredDate,'yyyy-MM-dd'),'') as tglExpired,
      cgmp.IsUploadFile,
      cgmp.IsUseExpiredDate
      from customers c
      join customergrouppermissions cgp on c.CustomerGroupId = cgp.customergroupid
      join CustomerGroupMasterPermissions cgmp on cgmp.customergroupmasterpermissioncode = cgp.customergroupmasterpermissioncode
      left join CustomerGroupValuePermissions cgvp on cgp.customergroupmasterpermissioncode = cgvp.customergroupmasterpermissioncode and c.customerid = cgvp.customerid
      and cgp.PermissionTitleCode = cgvp.PermissionTitleCode 
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
