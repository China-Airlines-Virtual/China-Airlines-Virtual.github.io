const flights = require("./flights.json");

const sorted = [...flights].sort((a, b) => b.date.localeCompare(a.date));

module.exports = {
  all: sorted,
  listed: sorted.filter((flight) => flight.listed !== false),
  latest: sorted[0] || null,
};
