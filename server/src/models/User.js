const mongoose = require('mongoose');

const ROLES = Object.freeze({
  supervisor: 'supervisor',
  operator: 'operator',
  administrator: 'administrator',
});

const USER_STATUSES = Object.freeze({
  active: 'active',
  inactive: 'inactive',
});

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 64,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.active,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Defense in depth; responses use toPublicUser (NFR-10).
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES, USER_STATUSES };
