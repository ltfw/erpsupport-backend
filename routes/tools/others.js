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

router.get("/test-importcoretax", async (req, res) => {
  try {
    // Test single update
    const item = {
      TaxInvoiceNumber: "04002500192756685",
      TaxReference: "25/SI/TGR/07/00006"
    }

    const result = await prisma.$executeRaw`
      UPDATE SalesInvoiceHeaders
      SET NoFakturP = ${item.TaxInvoiceNumber}
      WHERE Nobukti = ${item.TaxReference}
    `;

    if (result > 0) {
      res.json({ message: "Test OK: data updated", rowsAffected: result });
    } else {
      res.json({ message: "Test OK: but no rows matched (nothing updated)", rowsAffected: result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Test failed", details: error.message });
  }
});


module.exports = router;
