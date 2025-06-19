const express = require("express");
const { PrismaClient } = require("../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient();

// Get all customers using pagination
router.get("/", async (req, res) => {
  // try {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const [customers, total] = await Promise.all([
    prisma.$queryRaw`
      select c.KodeLgn, c.NamaLgn, cg.CustomerGroupName, be.BusinessEntityName, d.NamaDept, s.NamaSales, c.Alamat1
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
  // } catch (error) {
  //   return res.status(500).json({ error: "Failed to fetch customers" });
  // }
});

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch customer" });
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
