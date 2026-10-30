const { z } = require('zod');
const { IANAZone } = require('luxon');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),
  PLANT_TIME_ZONE: z.string().refine((zone) => IANAZone.isValidZone(zone)),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(900000),
});

// Error message lists variable names only, never values (NFR-10).
function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => i.path[0]))];
    throw new Error(`Invalid configuration: ${names.join(', ')}`);
  }
  const value = result.data;
  return Object.freeze({
    nodeEnv: value.NODE_ENV,
    mongodbUri: value.MONGODB_URI,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    plantTimeZone: value.PLANT_TIME_ZONE,
    port: value.PORT,
    loginRateLimitMax: value.LOGIN_RATE_LIMIT_MAX,
    loginRateLimitWindowMs: value.LOGIN_RATE_LIMIT_WINDOW_MS,
  });
}

module.exports = { loadConfig };
