const mongoose = require('mongoose');
const { startTestDb, stopTestDb } = require('./helpers/testDb');

describe('in-memory replica set (WIPC9-AC3, NFR-03)', () => {
  let Probe;

  beforeAll(async () => {
    await startTestDb();
    Probe = mongoose.model('Probe', new mongoose.Schema({ name: String }));
    await Probe.createCollection();
  });

  afterAll(stopTestDb);

  beforeEach(async () => {
    await Probe.deleteMany({});
  });

  it('runs as a replica set (T-15)', async () => {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });

    expect(hello.setName).toBeDefined();
  });

  it('commits a transaction (T-16)', async () => {
    const session = await mongoose.connection.startSession();
    await session.withTransaction(async () => {
      await Probe.create([{ name: 'kept' }], { session });
    });
    await session.endSession();

    expect(await Probe.countDocuments({ name: 'kept' })).toBe(1);
  });

  it('aborts a transaction on error (T-17)', async () => {
    const session = await mongoose.connection.startSession();
    await expect(
      session.withTransaction(async () => {
        await Probe.create([{ name: 'lost' }], { session });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');
    await session.endSession();

    expect(await Probe.countDocuments({ name: 'lost' })).toBe(0);
  });
});
