require('dotenv').config();
const path = require('path');
const next = require('next');
const app = require('./app');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({
  dev,
  dir: path.join(__dirname, '../acju-prayer-times-docs')
});
const handle = nextApp.getRequestHandler();

const port = process.env.PORT || 3000;

nextApp.prepare().then(() => {
  // Pass all non-API requests to Next.js
  app.use((req, res) => {
    return handle(req, res);
  });

  app.listen(port, () => {
    console.log(`🚀 ACJU Prayer Times API and Docs are running on http://localhost:${port}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`- GET / (API Metadata)`);
    console.log(`- GET /guide (Landing Page)`);
    console.log(`- GET /api/v1/locations`);
    console.log(`- GET /api/v1/locations/:location`);
    console.log(`- GET /api/v1/prayer-times/today?location=:location`);
    console.log(`- GET /api/v1/prayer-times/:location/:date`);
    console.log(`- GET /api/v1/prayer-times/:location/:year/:month`);
  });
}).catch(err => {
  console.error('Error starting Next.js:', err);
  process.exit(1);
});
