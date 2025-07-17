const express = require("express");
const { PrismaClient } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });

router.post("/importcoretax", async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array." });
    }

    // Prepare promises
    const updatePromises = data.map(item =>
      prisma.$executeRaw`
        UPDATE SalesInvoiceHeaders
        SET NoFakturP = ${item.TaxInvoiceNumber}
        WHERE Nobukti = ${item.TaxReference}
      `
    )

    // Execute all in parallel
    const results = await Promise.all(updatePromises);

    // Calculate total updated rows
    const updatedCount = results.reduce((sum, r) => sum + r, 0);

    res.json({
      message: "Update successful",
      updatedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update tax data", details: error.message });
  }
});

router.get("/rayonsalesman", async (req, res) => {
  try {
    const rayonSalesmen = await prisma.$queryRaw`
      select r.RayonCode,s.NamaSales from Rayons r 
        join Salesmen s on r.KodeSales = s.KodeSales
        order by r.RayonCode,s.NamaSales;
      `;
    res.json({ data: rayonSalesmen });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Test failed", details: error.message });
  }
});

router.get("/customergroups", async (req, res) => {
  try {
    const customerGroups = await prisma.customerGroups.findMany({
      orderBy: { CustomerGroupName: 'asc' }
    })
    res.json({ data: customerGroups });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Test failed", details: error.message });
  }
});


module.exports = router;
