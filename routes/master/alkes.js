const express = require("express");
const { PrismaClient } = require("../../generated/erpsupport"); // Changed to erpsupport
const { PrismaClient:PrismaClientdb } = require("../../generated/dbtrans");
const router = express.Router();
const prisma = new PrismaClient();
const prismaDb = new PrismaClientdb();

// GET /api/alkes - Get all MappingProdukMasKemenkes with pagination and search
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;

    // Get paginated MappingProdukMasKemenkes records
    const [alkesData, total] = await Promise.all([
      prisma.MappingProdukMasKemenkes.findMany({
        where: {
          OR: [
            { KodeMas: { contains: search } },
            { NamaProdukKemenkes: { contains: search } },
            { KodeCabang: { contains: search } },
            { NamaCabang: { contains: search } },
            { IdProdukKemenkes: { contains: search } },
          ],
        },
        skip,
        take: pageSize,
        orderBy: {
          NamaProdukKemenkes: 'asc',
        },
      }),
      prisma.MappingProdukMasKemenkes.count({
        where: {
          OR: [
            { KodeMas: { contains: search } },
            { NamaProdukKemenkes: { contains: search } },
            { KodeCabang: { contains: search } },
            { NamaCabang: { contains: search } },
            { IdProdukKemenkes: { contains: search } },
          ],
        },
      }),
    ]);

    // Extract unique KodeMas values from the paginated results for joining with Inventories
    const kodeMasValues = [...new Set(alkesData.map(item => item.KodeMas).filter(Boolean))];

    // Fetch Inventories data where KodeItem matches KodeMas
    const inventories = kodeMasValues.length > 0
      ? await prismaDb.Inventories.findMany({
          where: {
            KodeItem: {
              in: kodeMasValues,
            },
          },
          // Select all fields from Inventories, or specify only the ones you need
          // select: {
          //   KodeItem: true,
          //   NamaBarang: true,
          //   NamaAlias: true,
          //   // Add other fields from Inventories that you need
          // },
        })
      : [];

    // Create a map for quick lookup: KodeItem -> Inventory
    const inventoryMap = new Map(
      inventories.map(inv => [inv.KodeItem, inv])
    );

    // Join the data: add Inventory to each alkes record
    const alkes = alkesData.map(alke => ({
      ...alke,
      Inventory: inventoryMap.get(alke.KodeMas) || null,
    }));

    res.json({
      data: alkes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch alkes", errors: error });
  }
});

// GET /api/alkes/:id - Get a single MappingProdukMasKemenkes by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const alkes = await prisma.MappingProdukMasKemenkes.findUnique({
      where: { id },
    });
    if (!alkes) {
      return res.status(404).json({ error: "Alkes not found" });
    }
    res.json(alkes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch alkes", errors: error });
  }
});

// POST /api/alkes - Create a new MappingProdukMasKemenkes
router.post("/", async (req, res) => {
  try {
    const newAlkes = await prisma.MappingProdukMasKemenkes.create({
      data: req.body,
    });
    res.status(201).json(newAlkes); // 201 Created
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create alkes", errors: error });
  }
});

// PUT /api/alkes/:id - Update an existing MappingProdukMasKemenkes
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updatedAlkes = await prisma.MappingProdukMasKemenkes.update({
      where: { id },
      data: req.body,
    });
    res.json(updatedAlkes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update alkes", errors: error });
  }
});

// DELETE /api/alkes/:id - Delete a MappingProdukMasKemenkes
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.MappingProdukMasKemenkes.delete({
      where: { id },
    });
    res.status(204).send(); // 204 No Content (successful deletion)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete alkes", errors: error });
  }
});

module.exports = router;