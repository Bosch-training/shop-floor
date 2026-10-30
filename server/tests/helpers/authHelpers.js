const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TEST_SECRET } = require('./testConfig');

// Placeholder test passwords only.
const PASSWORD = 'Correct-Horse-42';
const WRONG_PASSWORD = 'Wrong-Horse-42';

const USERS = {
  sup01: {
    userId: 'sup01',
    name: 'Asha Rao',
    role: 'supervisor',
    status: 'active',
  },
  op01: {
    userId: 'op01',
    name: 'Ravi Kumar',
    role: 'operator',
    status: 'active',
  },
  adm01: {
    userId: 'adm01',
    name: 'Meera Nair',
    role: 'administrator',
    status: 'active',
  },
  ina01: {
    userId: 'ina01',
    name: 'Ira Nolan',
    role: 'supervisor',
    status: 'inactive',
  },
};

const hashes = new Map();

// Bcrypt cost 4 keeps tests fast.
function hashFor(plain) {
  if (!hashes.has(plain)) hashes.set(plain, bcrypt.hashSync(plain, 4));
  return hashes.get(plain);
}

function addUser(User, base, overrides = {}, password = PASSWORD) {
  const profile = typeof base === 'string' ? USERS[base] : base;
  return User.__add({
    ...profile,
    ...overrides,
    passwordHash: hashFor(password),
  });
}

function addStandardUsers(User) {
  Object.keys(USERS).forEach((key) => addUser(User, key));
}

function signTestToken(sub, options = {}, secret = TEST_SECRET) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: sub,
    expiresIn: '1h',
    ...options,
  });
}

// Payload is passed as-is, so sub can be an object or a number.
function signRawToken(payload, options = {}, secret = TEST_SECRET) {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '1h',
    ...options,
  });
}

function unsignedToken(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
}

function tamperSignature(token) {
  const parts = token.split('.');
  const fill = parts[2].endsWith('AAAA') ? 'BBBB' : 'AAAA';
  parts[2] = `${parts[2].slice(0, -4)}${fill}`;
  return parts.join('.');
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
  PASSWORD,
  WRONG_PASSWORD,
  USERS,
  addUser,
  addStandardUsers,
  signTestToken,
  signRawToken,
  unsignedToken,
  tamperSignature,
  bearer,
};
