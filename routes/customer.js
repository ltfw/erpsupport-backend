const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['info', 'warn', 'error'], });

// Get all customers using pagination

router.get("/export", async (req, res) => {
  try {
    const customers = await prisma.$queryRaw`
      select
        d.namaDept as "Nama Cabang",
        c.kodelgn as "Kode Customer",
        c.NamaLgn as "Nama Customer",
        c.BatasKredit as "Kredit Limit",
        c.KodeSyarat as "TOP",
        isnull(c.NomorLgnBpom,'') as "Kode Customer BPOM",
        isnull(c.NamaLgnBpom,'')  as "Nama Customer BPOM",
        isnull(c.NomorLgnKemenkes,'') as "Kode Customer KEMENKES",
        isnull(c.NamaLgnKemenkes,'') as "Nama Customer KEMENKES",
        be.BusinessEntityName as "Badan Usaha",
        cg.CustomerGroupName as "Customer Group",
        format(c.tglregistrasi,'dd/MM/yyyy') as "Tgl Registrasi",
        format(c.tglentry,'dd/MM/yyyy') as "Tgl Update",
        isnull(c.NamaPemilik,'') as "Nama Pemilik",
        isnull(c.HubungDengan,'') as "CP",
        isnull(c.TypeIdentitas,'') as "Tipe Identitas",
        isnull(c.NoIdentitas,'') as "No Identitas",
        isnull(c.TkuId,'') as TKUId,
        isnull(c.TaxTransactionCode,'') as "Kode Pajak",
        case when c.nonAktif=0 then 'Aktif' else 'Non Aktif' end as "Status Customer",
        c.Alamat1 as "Alamat",
        r.RayonName as Rayon,
        c.Province as "Provinsi",
        c.Regency as "Kota/Kabupaten",
        c.District as "Kecamatan",
        c.Village as "Desa/Kelurahan",
        c.KodePos as "Kode Pos",
        s.NamaSales as "Salesman",
        c.Latitude,
        c.Longitude,
        CONCAT('https://www.google.com/maps/search/?api=1&query=',c.Latitude,',',c.Longitude) as 'Lokasi Customer',
        c.Npwp,
        c.NpwpOwner,
        case when c.Pkp = 1 then 'PKP' else 'NON-PKP' end,
        c.AlamatPajak,
        case when c.TypePpn = 'E' then 'PPN Eksklusif'
          when c.TypePpn = 'I' then 'PPN Inklusif'
          when c.TypePpn = 'K' then 'PPN Tidak Dipungut Pajak'
          when c.TypePpn = 'T' then 'Tidak Ada PPN' end
        as "Tipe PPn",
        concat('https://erp.sdlindonesia.com/#/customer/edit/',c.customerid) as "URL"
      from Customers c
      join BusinessEntities be on c.BusinessEntityId = be.BusinessEntityId
      join Areas a on c.KodeWil = a.KodeWil
      join Departments d on a.KodeDept = d.KodeDept
      join customergroups cg on c.customergroupid = cg.customergroupid
      join Salesmen s on c.KodeSales = s.KodeSales
      join rayondistricts rd on c.DistrictId = rd.DistrictId
      join Rayons r on rd.RayonCode = r.RayonCode
      order by c.kodelgn`;

    return res.json({
      data: customers
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch customers", details: error });
  }
});


router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || ''
    const skip = (page - 1) * pageSize;

    const searchQuery = `%${search}%`

    const [customers, totalResult] = await Promise.all([
      prisma.$queryRaw`
      select c.CustomerId, c.KodeLgn, c.NamaLgn, cg.CustomerGroupName, be.BusinessEntityName, d.NamaDept, s.NamaSales, c.Alamat1 
      from customers c
      join CustomerGroups cg on c.CustomerGroupId = cg.CustomerGroupId
      join BusinessEntities be on c.BusinessEntityId = be.BusinessEntityId
      join salesmen s on c.KodeSales = s.KodeSales
      join Departments d on c.KodeDept = d.KodeDept
      where c.KodeLgn like ${searchQuery} or c.NamaLgn like ${searchQuery}
      order by c.KodeLgn
      offset ${skip} rows
      fetch next ${pageSize} rows only;
    `,
      prisma.$queryRawUnsafe(`
        select count(*) as total 
        from customers c
        where c.KodeLgn like '${searchQuery}' or c.NamaLgn like '${searchQuery}'
      `),
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
    return res.status(500).json({ error: "Failed to fetch customers" });
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
