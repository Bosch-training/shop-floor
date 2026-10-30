jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('../config/db', () => ({
  connectDb: jest.fn(),
  disconnectDb: jest.fn(),
}));
jest.mock('../services/seedService', () => ({ seedAdministrator: jest.fn() }));

const PASSWORD = 'Seed-Password-42';
const baseEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/test?replicaSet=rs0',
  JWT_SECRET: 'test-secret-test-secret-test-1234',
  PLANT_TIME_ZONE: 'Asia/Kolkata',
  ADMIN_USER_ID: 'admin01',
  ADMIN_NAME: 'Meera Nair',
  ADMIN_PASSWORD: PASSWORD,
};
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error'];

// Assumes the script ends with process.exit(0 or 1) (LLD section 7.3).
async function runScript(env, arrange = () => {}) {
  const originalEnv = process.env;
  process.env = { ...baseEnv, ...env };
  jest.resetModules();
  const db = require('../config/db');
  const seedService = require('../services/seedService');
  db.connectDb.mockResolvedValue(undefined);
  db.disconnectDb.mockResolvedValue(undefined);
  seedService.seedAdministrator.mockResolvedValue({ created: true });
  arrange({ db, seedService });

  const lines = [];
  const spies = CONSOLE_METHODS.map((method) =>
    jest.spyOn(console, method).mockImplementation((...args) => {
      lines.push(args.map(String).join(' '));
    }),
  );
  let timer;
  const exited = new Promise((resolve) => {
    jest.spyOn(process, 'exit').mockImplementation((code) => resolve(code));
  });
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('no-exit'), 2000);
  });

  require('./seedAdmin');
  const code = await Promise.race([exited, timeout]);

  clearTimeout(timer);
  spies.forEach((spy) => spy.mockRestore());
  process.exit.mockRestore();
  process.env = originalEnv;
  return { code, output: lines.join('\n'), db, seedService };
}

describe('seedAdmin script (LLD-FR-14, ST-5)', () => {
  it('WIPC-10-TC-227 reports creation and closes the connection', async () => {
    const run = await runScript({});

    expect(run.code).toBe(0);
    expect(run.output).toContain('Administrator created.');
    expect(run.db.disconnectDb).toHaveBeenCalled();
    expect(run.seedService.seedAdministrator).toHaveBeenCalledWith({
      userId: 'admin01',
      name: 'Meera Nair',
      password: PASSWORD,
    });
    expect(run.output).not.toContain(PASSWORD);
  });

  it('WIPC-10-TC-228 reports an existing administrator', async () => {
    const run = await runScript({}, ({ seedService }) => {
      seedService.seedAdministrator.mockResolvedValue({ created: false });
    });

    expect(run.code).toBe(0);
    expect(run.output).toContain(
      'An administrator already exists; nothing changed.',
    );
  });

  it('WIPC-10-TC-235 accepts a password of exactly 12 characters', async () => {
    const run = await runScript({ ADMIN_PASSWORD: 'Abcdefg-1234' });

    expect(run.code).toBe(0);
    expect(run.output).toContain('Administrator created.');
  });

  it.each([
    ['ADMIN_USER_ID', ['ADMIN_NAME', 'ADMIN_PASSWORD']],
    ['ADMIN_NAME', ['ADMIN_USER_ID', 'ADMIN_PASSWORD']],
    ['ADMIN_PASSWORD', ['ADMIN_USER_ID', 'ADMIN_NAME']],
  ])('WIPC-10-TC-229 stops when %s is missing', async (missing, others) => {
    const run = await runScript({ [missing]: undefined });

    expect(run.code).toBe(1);
    expect(run.output).toContain(missing);
    others.forEach((name) => expect(run.output).not.toContain(name));
    expect(run.seedService.seedAdministrator).not.toHaveBeenCalled();
  });

  it.each([
    [
      'WIPC-10-TC-230 short password',
      { ADMIN_PASSWORD: 'Short-Pw-1' },
      'ADMIN_PASSWORD',
    ],
    [
      'WIPC-10-TC-234 65-character user ID',
      { ADMIN_USER_ID: 'u'.repeat(65) },
      'ADMIN_USER_ID',
    ],
  ])('%s is rejected without echoing values', async (name, env, variable) => {
    const run = await runScript(env);

    expect(run.code).toBe(1);
    expect(run.output).toContain(variable);
    expect(run.output).not.toContain(env[variable]);
    expect(run.output).not.toContain(PASSWORD);
    expect(run.seedService.seedAdministrator).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-236 rejects empty and whitespace-only variables', async () => {
    const run = await runScript({
      ADMIN_USER_ID: '',
      ADMIN_NAME: '   ',
      ADMIN_PASSWORD: '',
    });

    expect(run.code).toBe(1);
    expect(run.output).toContain('ADMIN_USER_ID');
    expect(run.seedService.seedAdministrator).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-233 exits 1 with a generic db error', async () => {
    const run = await runScript({}, ({ db }) => {
      db.connectDb.mockRejectedValue(new Error('connect ECONNREFUSED'));
    });

    expect(run.code).toBe(1);
    expect(run.output).not.toHaveLength(0);
    expect(run.output).not.toContain(PASSWORD);
    expect(run.output).not.toMatch(/\n\s+at .+:\d+/);
    expect(run.seedService.seedAdministrator).not.toHaveBeenCalled();
  });

  it.each([
    ['success', {}, () => {}],
    [
      'existing administrator',
      {},
      ({ seedService }) => {
        seedService.seedAdministrator.mockResolvedValue({ created: false });
      },
    ],
    ['invalid environment', { ADMIN_NAME: undefined }, () => {}],
    [
      'database error',
      {},
      ({ db }) => {
        db.connectDb.mockRejectedValue(new Error('connect ECONNREFUSED'));
      },
    ],
  ])('WIPC-10-TC-239 never prints the password (%s)', async (n, env, fn) => {
    const run = await runScript(env, fn);

    expect(run.code).not.toBe('no-exit');
    expect(run.output).not.toContain(PASSWORD);
  });
});
