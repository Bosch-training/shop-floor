jest.mock('../models/User', () =>
  require('../../tests/helpers/fakeUserModel').createFakeUserModule(),
);

const { User } = require('../models/User');
const { seedAdministrator } = require('./seedService');
const { verifyPassword } = require('./passwordService');
const { login } = require('./authService');
const { buildTestConfig } = require('../../tests/helpers/testConfig');
const { addUser } = require('../../tests/helpers/authHelpers');

const seed = {
  userId: 'admin01',
  name: 'Meera Nair',
  password: 'Seed-Password-42',
};

async function readHash(userId) {
  const stored = await User.findOne({ userId }).select('+passwordHash');
  return stored.passwordHash;
}

beforeEach(() => {
  User.__reset();
  jest.clearAllMocks();
});

describe('seedAdministrator (LLD-FR-14, ST-5)', () => {
  it('WIPC-10-TC-224 creates the first administrator with a hash', async () => {
    const result = await seedAdministrator(seed);

    expect(result).toEqual({ created: true });
    expect(User.__users).toHaveLength(1);
    expect(User.__users[0]).toMatchObject({
      userId: 'admin01',
      name: 'Meera Nair',
      role: 'administrator',
      status: 'active',
    });
    const hash = await readHash('admin01');
    expect(hash).toMatch(/^\$2[ab]\$/);
    await expect(verifyPassword(seed.password, hash)).resolves.toBe(true);
  });

  it('WIPC-10-TC-225 lets the seeded administrator log in', async () => {
    await seedAdministrator(seed);

    const result = await login(
      { userId: 'admin01', password: seed.password },
      buildTestConfig(),
    );

    expect(result.user.role).toBe('administrator');
  });

  it('WIPC-10-TC-231 changes nothing if an admin exists', async () => {
    addUser(User, 'adm01');
    const before = await readHash('adm01');

    const result = await seedAdministrator({
      userId: 'admin02',
      name: 'Second Admin',
      password: seed.password,
    });

    expect(result).toEqual({ created: false });
    expect(User.__users).toHaveLength(1);
    expect(await readHash('adm01')).toBe(before);
  });

  it('WIPC-10-TC-232 keeps an existing user with the same userId', async () => {
    addUser(User, 'sup01');
    const before = await readHash('sup01');

    const result = await seedAdministrator({ ...seed, userId: 'sup01' });

    expect(result).toEqual({ created: false });
    expect(User.__users).toHaveLength(1);
    expect(User.__users[0]).toMatchObject({
      role: 'supervisor',
      name: 'Asha Rao',
    });
    expect(await readHash('sup01')).toBe(before);
  });

  it('WIPC-10-TC-226 stores the normalized seeded userId', async () => {
    await seedAdministrator({ ...seed, userId: ' ADMIN01 ' });

    expect(User.__users[0].userId).toBe('admin01');
  });

  it('WIPC-10-TC-237 is idempotent on a repeated call', async () => {
    const first = await seedAdministrator(seed);
    const hash = await readHash('admin01');

    const second = await seedAdministrator(seed);

    expect(first).toEqual({ created: true });
    expect(second).toEqual({ created: false });
    expect(User.__users).toHaveLength(1);
    expect(await readHash('admin01')).toBe(hash);
  });

  it('WIPC-10-TC-238 creates one admin for parallel calls', async () => {
    const results = await Promise.all([
      seedAdministrator(seed),
      seedAdministrator(seed),
    ]);

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results.filter((r) => !r.created)).toHaveLength(1);
    expect(User.__users).toHaveLength(1);
  });
});
