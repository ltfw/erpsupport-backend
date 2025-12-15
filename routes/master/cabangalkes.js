const express = require("express");
const { PrismaClient } = require("../../generated/erpsupport"); // Changed to erpsupport
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/cabangalkes - Get all CabangMapping with pagination and search
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;

    // Get paginated CabangMapping records
    const [cabangalkesData, total] = await Promise.all([
      prisma.CabangMapping.findMany({
        where: {
          OR: [
            { CabangSumber: { contains: search } },
            { NamaCabangSumber: { contains: search } },
            { CabangTarget: { contains: search } },
            { NamaCabangTarget: { contains: search } },
            { KodeUpline: { contains: search } },
            { NamaUpline: { contains: search } },
          ],
        },
        skip,
        take: pageSize,
        orderBy: {
          NamaCabangSumber: 'asc',
        },
      }),
      prisma.CabangMapping.count({
        where: {
          OR: [
            { CabangSumber: { contains: search } },
            { NamaCabangSumber: { contains: search } },
            { CabangTarget: { contains: search } },
            { NamaCabangTarget: { contains: search } },
            { KodeUpline: { contains: search } },
            { NamaUpline: { contains: search } },
          ],
        },
      }),
    ]);

    res.json({
      data: cabangalkesData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch cabangalkes", errors: error });
  }
});

// GET /api/cabangalkes/:id - Get a single CabangMapping by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const cabangalkes = await prisma.CabangMapping.findUnique({
      where: { id },
    });
    if (!cabangalkes) {
      return res.status(404).json({ error: "CabangAlkes not found" });
    }
    res.json(cabangalkes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch cabangalkes", errors: error });
  }
});

// POST /api/cabangalkes - Create a new CabangMapping
router.post("/", async (req, res) => {
  try {
    const newCabangalkes = await prisma.CabangMapping.create({
      data: req.body,
    });
    res.status(201).json(newCabangalkes); // 201 Created
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create cabangalkes", errors: error });
  }
});

// PUT /api/cabangalkes/:id - Update an existing CabangMapping
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updatedCabangalkes = await prisma.CabangMapping.update({
      where: { id },
      data: req.body,
    });
    res.json(updatedCabangalkes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update cabangalkes", errors: error });
  }
});

// DELETE /api/cabangalkes/:id - Delete a CabangMapping
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.CabangMapping.delete({
      where: { id },
    });
    res.status(204).send(); // 204 No Content (successful deletion)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete cabangalkes", errors: error });
  }
});

module.exports = router;
