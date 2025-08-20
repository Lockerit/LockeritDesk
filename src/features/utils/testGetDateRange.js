const dayjs = require("dayjs");
const { getDateRange } = require("./getDateRange.js");

function printRange(label, { startDate, endDate }) {
  console.log(
    `${label}: start=${startDate.format("YYYY-MM-DD HH:mm:ss")}, end=${endDate.format("YYYY-MM-DD HH:mm:ss")}`
  );
}

const ref = dayjs("2025-08-19 12:00:00");

console.log("=== TEST DAILY ===");
printRange("Daily", getDateRange(ref, "daily"));

console.log("\n=== TEST WEEKLY ===");
printRange("Weekly domingo (0)", getDateRange(ref, "weekly", 0));
printRange("Weekly lunes (1)", getDateRange(ref, "weekly", 1));
printRange("Weekly martes (2)", getDateRange(ref, "weekly", 2));
printRange("Weekly miércoles (3)", getDateRange(ref, "weekly", 3));

console.log("\n=== TEST MONTHLY ===");
printRange("Monthly día 5", getDateRange(ref, "monthly", 1, 5));
printRange("Monthly día 15", getDateRange(ref, "monthly", 1, 15));
