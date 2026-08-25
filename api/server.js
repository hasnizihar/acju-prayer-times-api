require('dotenv').config();
const app = require('./app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 ACJU Prayer Times API is running on http://localhost:${port}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`- GET /api/v1/locations`);
  console.log(`- GET /api/v1/locations/:location`);
  console.log(`- GET /api/v1/prayer-times/today?location=:location`);
  console.log(`- GET /api/v1/prayer-times/:location/:date`);
  console.log(`- GET /api/v1/prayer-times/:location/:year/:month`);
  console.log(`- GET /api/v1/prayer-times/:location?from=YYYY-MM-DD&to=YYYY-MM-DD`);
});
