const { PrismaClient, Prisma } = require("../generated/dbtrans");
const moment = require('moment-timezone');

const prisma = new PrismaClient();

// Utility function to generate running number
async function generateRunningNumber(branchCode) {
  try {
    // Get current year (YY) and month (MM) in WIB timezone
    console.log('run generate running number');
    
    const now = moment().tz('Asia/Jakarta');
    const year = now.format('YY'); // e.g., '25' for 2025
    const month = now.format('MM'); // e.g., '08' for August
    const moduleName = 'REP';

    // Map branch code to branch name
    const branchMap = {
      '00': 'HO',
      '02': 'SMG',
      '03': 'TGR',
    };
    const branchName = branchMap[branchCode];
    if (!branchName) {
      throw new Error(`Invalid branch code: ${branchCode}`);
    }

    // Query to find the maximum running number for the given year, month, and branch
    const pattern = `${year}/${moduleName}/${branchName}/${month}/%`;
    const rows = await prisma.$queryRaw`
      SELECT NoTransaksi
      FROM rekualifikasiheader
      WHERE NoTransaksi LIKE ${pattern}
    `;

    // Extract the running number from NoTransaksi (last 3 digits)
    let maxRunningNumber = 0;
    if (rows.length > 0) {
      const runningNumbers = rows.map((row) => {
        const parts = row.NoTransaksi.split('/');
        return parseInt(parts[4], 10); // Get the running number (e.g., '001' -> 1)
      });
      maxRunningNumber = Math.max(...runningNumbers);
    }

    // Increment the running number
    const newRunningNumber = maxRunningNumber + 1;

    // Check if running number exceeds 999
    if (newRunningNumber > 999) {
      throw new Error(
        'Running number has reached the maximum limit of 999 for this year, month, and branch.'
      );
    }

    // Format the running number as 3 digits
    const formattedRunningNumber = String(newRunningNumber).padStart(3, '0');

    // Construct the full transaction number
    const newTransaksi = `${year}/${moduleName}/${branchName}/${month}/${formattedRunningNumber}`;

    return newTransaksi;
  } catch (error) {
    console.error('Error generating running number:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { generateRunningNumber };