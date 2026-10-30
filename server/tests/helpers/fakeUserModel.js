// In-memory stand-in for the User model; no MongoDB involved.
// Use inside jest.mock('<path>/models/User', () => require(...)).
const ROLES = {
  supervisor: 'supervisor',
  operator: 'operator',
  administrator: 'administrator',
};
const USER_STATUSES = { active: 'active', inactive: 'inactive' };

function matches(user, filter) {
  return Object.entries(filter).every(
    ([key, value]) => typeof value !== 'object' && user[key] === value,
  );
}

// Thenable that mimics findOne(...).select(...).lean().
function createQuery(find) {
  const state = { withHash: false };
  const run = () => {
    const found = find();
    if (!found) return null;
    const copy = { ...found };
    if (!state.withHash) delete copy.passwordHash;
    return copy;
  };
  const query = {
    select(fields) {
      state.withHash = String(fields).includes('+passwordHash');
      return query;
    },
    lean: () => query,
    exec: () => Promise.resolve().then(run),
    then: (resolve, reject) => query.exec().then(resolve, reject),
  };
  return query;
}

function rejectingQuery(error) {
  const query = {
    select: () => query,
    lean: () => query,
    exec: () => Promise.reject(error),
    then: (resolve, reject) => Promise.reject(error).then(resolve, reject),
  };
  return query;
}

function createFakeUserModule() {
  const users = [];
  let counter = 0;

  const User = {
    findOne: jest.fn((filter) =>
      createQuery(() => users.find((u) => matches(u, filter))),
    ),
    exists: jest.fn(async (filter) => {
      const found = users.find((u) => matches(u, filter));
      return found ? { _id: found._id } : null;
    }),
    create: jest.fn(async (doc) => {
      const userId = String(doc.userId).trim().toLowerCase();
      if (users.some((u) => u.userId === userId)) {
        throw Object.assign(new Error('E11000 duplicate key'), {
          code: 11000,
        });
      }
      return User.__add({ status: 'active', ...doc, userId });
    }),
    __users: users,
    __add(user) {
      counter += 1;
      const stored = {
        _id: `${'a'.repeat(20)}${String(counter).padStart(4, '0')}`,
        ...user,
      };
      users.push(stored);
      return { ...stored };
    },
    __reset() {
      users.length = 0;
      counter = 0;
    },
  };

  return { User, ROLES, USER_STATUSES };
}

module.exports = { createFakeUserModule, rejectingQuery, ROLES };
