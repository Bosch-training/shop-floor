const bcrypt = require('bcryptjs');

const DEFAULT_ROUNDS = 12;

function hashPassword(plain, rounds = DEFAULT_ROUNDS) {
  return bcrypt.hash(plain, rounds);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
