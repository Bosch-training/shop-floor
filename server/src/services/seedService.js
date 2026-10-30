const { User, ROLES } = require('../models/User');
const { hashPassword } = require('./passwordService');

const DUPLICATE_KEY = 11000;

async function seedAdministrator({ userId, name, password }) {
  const exists = await User.exists({ role: ROLES.administrator });
  if (exists) return { created: false };
  const passwordHash = await hashPassword(password);
  try {
    await User.create({
      userId,
      name,
      passwordHash,
      role: ROLES.administrator,
    });
    return { created: true };
  } catch (err) {
    // The unique userId index makes parallel seed runs safe.
    if (err.code === DUPLICATE_KEY) return { created: false };
    throw err;
  }
}

module.exports = { seedAdministrator };
