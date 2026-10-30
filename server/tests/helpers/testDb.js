const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { connectDb, disconnectDb } = require('../../src/config/db');

let replSet;

async function startTestDb() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: process.env.MONGOMS_VERSION || '7.0.14' },
  });
  await connectDb(replSet.getUri());
}

async function stopTestDb() {
  await disconnectDb();
  if (replSet) await replSet.stop();
}

module.exports = { startTestDb, stopTestDb };
