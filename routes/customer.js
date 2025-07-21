const express = require("express");
const { PrismaClient, Prisma } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'], });

// Get all customers using pagination
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

// Create new customer
router.post("/", async (req, res) => {
  try {
    const validatedData = CustomerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: validatedData,
    });
    return res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create customer" });
  }
});

// Update customer
router.put("/:id", async (req, res) => {
  try {
    const validatedData = CustomerSchema.parse(req.body);
    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: validatedData,
    });
    return res.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer
router.delete("/:id", async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: parseInt(req.params.id) },
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete customer" });
  }
});


module.exports = router;
