const express = require("express");
const { PrismaClient } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({log: ['query', 'info', 'warn', 'error'],});

// Get all customers using pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [customers, total] = await Promise.all([
      prisma.$queryRaw`
      select c.CustomerId, c.KodeLgn, c.NamaLgn, cg.CustomerGroupName, be.BusinessEntityName, d.NamaDept, s.NamaSales, c.Alamat1 
      from customers c
      join CustomerGroups cg on c.CustomerGroupId = cg.CustomerGroupId
      join BusinessEntities be on c.BusinessEntityId = be.BusinessEntityId
      join salesmen s on c.KodeSales = s.KodeSales
      join Departments d on c.KodeDept = d.KodeDept
      order by c.KodeLgn
      offset ${skip} rows
      fetch next ${pageSize} rows only;
    `,
      prisma.customers.count(),
    ]);

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

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await prisma.$queryRaw`
      select c.*,rd.RayonCode,cg.CustomerGroupName from customers c 
      join CustomerGroups cg on c.CustomerGroupId = cg.CustomerGroupId
      join RayonDistricts rd on c.DistrictId = rd.DistrictId
      where CustomerId=${req.params.id};
    `

    const rayonCustomer = await prisma.$queryRaw`
      select rd.* from rayondistricts rd
      join customers c on rd.DistrictId = c.DistrictId
      where c.CustomerId=${req.params.id};
    `

    const customerGroup = await prisma.$queryRaw`
      select cg.* from customergroups cg
      join customers c on cg.CustomerGroupId = c.CustomerGroupId
      where c.CustomerId=${req.params.id};
    `

    const legalitasOutlet = await prisma.$queryRaw`
      select cgmp.*,cgvp.*,format(cgvp.ExpiredDate,'yyyy-MM-dd') as tglExpired from CustomerGroupValuePermissions cgvp 
      join CustomerGroupMasterPermissions cgmp on cgvp.CustomerGroupMasterPermissionCode = cgmp.CustomerGroupMasterPermissionCode
      join customers c on cgvp.CustomerId = c.CustomerId
      where c.CustomerId=${req.params.id}
      order by cgvp.PermissionTitleCode, cgvp.Nomor;
    `;

    // const legalitasOutlet = await prisma.$queryRaw`
    //   select cgmp.*,cgvp.* from CustomerGroupValuePermissions cgvp 
    //   join CustomerGroupMasterPermissions cgmp on cgvp.CustomerGroupMasterPermissionCode = cgmp.CustomerGroupMasterPermissionCode
    //   join customers c on cgvp.CustomerId = c.CustomerId
    //   where c.CustomerId=${req.params.id}
    //   order by cgvp.PermissionTitleCode,cgvp.Nomor;
    // `
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json({ 
      id: req.params.id,
      customer: customer[0], 
      rayonCustomer: rayonCustomer[0],
      customerGroup: customerGroup[0],
      legalitasOutlet: legalitasOutlet,
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
