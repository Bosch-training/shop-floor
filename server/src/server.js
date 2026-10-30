const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { loadConfig } = require('./config');
const { connectDb, disconnectDb } = require('./config/db');
const { createApp } = require('./app');

async function start() {
  const config = loadConfig();
  await connectDb(config.mongodbUri);
  const server = createApp().listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
  const stop = async () => {
    server.close();
    await disconnectDb();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
