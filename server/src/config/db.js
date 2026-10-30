const mongoose = require('mongoose');

async function connectDb(uri) {
  // Defense in depth against operator objects in filters (NFR-06).
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri);
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
