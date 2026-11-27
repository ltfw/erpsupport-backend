const fs = require("fs/promises");
const path = require("path");

// Monthly sales/collection targets per cabang, kept in a JSON file instead of the ERP database:
//   { "2026-11": { "02": { "sales": 5000000000, "collection": 4500000000 }, ... }, ... }
// In Docker, mount the file's directory as a volume or targets are lost on every redeploy.
const TARGET_FILE =
  process.env.DASHBOARD_TARGET_FILE || path.join(__dirname, "..", "data", "dashboard-targets.json");

const readAll = async () => {
  try {
    return JSON.parse(await fs.readFile(TARGET_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

// Serialise writes so two saves in flight can't interleave read-modify-write
let writeQueue = Promise.resolve();

const saveMonth = (month, perCabang) => {
  const run = writeQueue.then(async () => {
    const all = await readAll();
    all[month] = perCabang;
    await fs.mkdir(path.dirname(TARGET_FILE), { recursive: true });
    // Write then rename, so a crash mid-write never leaves a truncated file
    const tmp = `${TARGET_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(all, null, 2));
    await fs.rename(tmp, TARGET_FILE);
  });
  writeQueue = run.catch(() => {});
  return run;
};

const getMonth = async (month) => (await readAll())[month] || {};

module.exports = { getMonth, saveMonth };
