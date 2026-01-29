/**
 * Generic helper to execute multi-year queries with different Prisma clients
 * @param {Object} options - Query options
 * @param {Function} options.queryBuilder - Function that builds the query (receives prismaClient, startDate, endDate)
 * @param {Function} options.countBuilder - Function that builds the count query (receives prismaClient, startDate, endDate)
 * @param {Function} options.getPrismaClient - Function that returns the Prisma client for a given year
 * @param {string} options.startDate - Start date in format 'YYYY-MM-DD'
 * @param {string} options.endDate - End date in format 'YYYY-MM-DD'
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Page size (-1 for all)
 * @returns {Object} - { data, pagination }
 */
async function executeMultiYearQuery({
  queryBuilder,
  countBuilder,
  getPrismaClient,
  startDate,
  endDate,
  page = 1,
  pageSize = -1
}) {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const startYear = startDateObj.getFullYear();
  const endYear = endDateObj.getFullYear();

  const skip = (page - 1) * pageSize;

  // Collect results from all relevant years
  let allResults = [];
  let totalCount = 0;

  for (let year = startYear; year <= endYear; year++) {
    // Determine date range for this year
    let queryStartDate, queryEndDate;

    if (startYear === endYear || year === startYear) {
      queryStartDate = startDate;
    } else {
      queryStartDate = `${year}-01-01`;
    }

    if (startYear === endYear || year === endYear) {
      queryEndDate = endDate;
    } else {
      queryEndDate = `${year}-12-31`;
    }

    const prismaClient = getPrismaClient(year);

    // Execute main query
    const yearData = await queryBuilder(prismaClient, queryStartDate, queryEndDate);

    // Execute count query
    const countResult = await countBuilder(prismaClient, queryStartDate, queryEndDate);

    allResults.push(...yearData);
    totalCount += Number(countResult[0]?.total || 0);
  }

  // Apply pagination to combined results
  let paginatedResults = allResults;
  if (pageSize > 0) {
    paginatedResults = allResults.slice(skip, skip + pageSize);
  }

  return {
    data: paginatedResults,
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1
    }
  };
}

module.exports = {
  executeMultiYearQuery
};
