const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { loadConfig } = require('../config');
const { connectDb, disconnectDb } = require('../config/db');
const { seedAdministrator } = require('../services/seedService');

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

const seedSchema = z.object({
  ADMIN_USER_ID: z.string().trim().min(1).max(64),
  ADMIN_NAME: z.string().trim().min(1).max(100),
  ADMIN_PASSWORD: z
    .string()
    .min(MIN_PASSWORD_LENGTH)
    .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES),
});

// Messages name variables only; values and stack traces are never printed.
async function main() {
  const parsed = seedSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => i.path[0]))];
    console.error(`Invalid seed configuration: ${names.join(', ')}`);
    return 1;
  }
  const values = parsed.data;
  try {
    const config = loadConfig();
    await connectDb(config.mongodbUri);
    const { created } = await seedAdministrator({
      userId: values.ADMIN_USER_ID,
      name: values.ADMIN_NAME,
      password: values.ADMIN_PASSWORD,
    });
    console.log(
      created
        ? 'Administrator created.'
        : 'An administrator already exists; nothing changed.',
    );
    return 0;
  } catch {
    console.error('Seeding failed. Check the database settings and retry.');
    return 1;
  } finally {
    await disconnectDb().catch(() => {});
  }
}

main().then((code) => process.exit(code));
