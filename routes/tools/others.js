const express = require("express");
const { PrismaClient } = require("../../generated/dbtrans");

const router = express.Router();
const prisma = new PrismaClient({ log: ['warn', 'error'] });

router.post("/importcoretax", async (req, res) => {
  try {
    const { tipe, data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array." });
    }

    let updatedCount = 0

    if (tipe === "penjualan") {
      const updatePromises = data.map(item =>
        prisma.$executeRaw`
        UPDATE SalesInvoiceHeaders
        SET NoFakturP = ${item.TaxInvoiceNumber}
        WHERE Nobukti = ${item.TaxReference}
      `
      )
      const results = await Promise.all(updatePromises);
      updatedCount = results.reduce((sum, r) => sum + r, 0);
    } else if (tipe === "retur") {
      const updatePromises = data.map(item =>
        prisma.$executeRaw`
          UPDATE sih
          SET sih.NoFakturP = ${item.TaxReturNumber}
          FROM SalesInvoiceHeaders sih
          JOIN SalesInvoiceHeaders sih2 ON sih.NoFjDulu = sih2.NoBukti
          WHERE sih2.NoFakturP = ${item.TaxInvoiceNumber};
      `
      )
      const results = await Promise.all(updatePromises);
      updatedCount = results.reduce((sum, r) => sum + r, 0);
    }

    res.json({
      message: "Update successful",
      updatedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update tax data", details: error.message });
  }
});

router.post("/importva", async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array." });
    }

    let updatedCount = 0

    const updatePromises = data.map(item =>
      prisma.$executeRaw`
          UPDATE customers
          SET NoVaLama = ${item.noVA}
          WHERE KodeLgn = ${item.kodelgn};
      `
    )
    const results = await Promise.all(updatePromises);
    updatedCount = results.reduce((sum, r) => sum + r, 0);

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
