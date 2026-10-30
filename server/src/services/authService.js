const jwt = require('jsonwebtoken');
const { User, USER_STATUSES } = require('../models/User');
const { hashPassword, verifyPassword } = require('./passwordService');
const { signToken, verifyToken } = require('./tokenService');
const {
  unauthenticated,
  invalidCredentials,
  accountInactive,
} = require('../errors/authErrors');

const DUMMY_ROUNDS = 12;
let dummyHash;

// Lazily hashed once so unknown users cost the same as known ones.
function getDummyHash() {
  if (!dummyHash) {
    dummyHash = hashPassword('dummy-password-for-timing', DUMMY_ROUNDS);
  }
  return dummyHash;
}

function toPublicUser(user) {
  const { userId, name, role, status } = user;
  return { userId, name, role, status };
}

async function login({ userId, password }, config) {
  const user = await User.findOne({ userId }).select('+passwordHash').lean();
  const hash = user ? user.passwordHash : await getDummyHash();
  const matches = await verifyPassword(password, hash);
  if (!user || !matches) throw invalidCredentials();
  if (user.status !== USER_STATUSES.active) throw accountInactive();
  const token = signToken(user.userId, config);
  const { exp } = jwt.decode(token);
  return {
    token,
    tokenType: 'Bearer',
    expiresAt: new Date(exp * 1000).toISOString(),
    user: toPublicUser(user),
  };
}

async function getUserForToken(token, config) {
  const { sub } = verifyToken(token, config);
  const user = await User.findOne({ userId: sub }).lean();
  if (!user || user.status !== USER_STATUSES.active) {
    throw unauthenticated();
  }
  return { id: String(user._id), ...toPublicUser(user) };
}

module.exports = { login, getUserForToken, toPublicUser };
