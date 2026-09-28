const moment = require("moment-timezone");

// Menjalankan job setiap hari pada jam:menit tertentu di timezone yang diberikan
function scheduleDaily(name, hour, minute, tz, job) {
  const scheduleNext = () => {
    const now = moment().tz(tz);
    let next = now.clone().hour(hour).minute(minute).second(0).millisecond(0);
    if (!next.isAfter(now)) next = next.add(1, "day");

    console.log(`[scheduler] ${name} dijadwalkan pada ${next.format("YYYY-MM-DD HH:mm:ss")} ${tz}`);
    setTimeout(async () => {
      try {
        await job();
      } catch (error) {
        console.error(`[scheduler] ${name} gagal:`, error.message, error.response || "");
      }
      scheduleNext();
    }, next.diff(now));
  };

  scheduleNext();
}

module.exports = { scheduleDaily };
