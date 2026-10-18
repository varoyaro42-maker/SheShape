import { DataTypes } from 'sequelize';
import { mediaUrl } from '../utils/safeUrl.js';
import bcrypt from 'bcryptjs';
import sequelize from '../db.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notNull: { msg: 'Name is required' },
        notEmpty: { msg: 'Name is required' },
        len: { args: [2, 80], msg: 'Name must be between 2 and 80 characters' },
      },
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: { msg: 'That email is already registered' },
      validate: {
        notNull: { msg: 'Email is required' },
        isEmail: { msg: 'Enter a valid email address' },
      },
      set(value) {
        this.setDataValue('email', String(value ?? '').trim().toLowerCase());
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notNull: { msg: 'Phone number is required' },
        is: { args: PHONE_PATTERN, msg: 'Enter a valid Rwandan phone number' },
      },
      set(value) {
        this.setDataValue('phone', normalizePhone(value));
      },
    },
    password: {
      type: DataTypes.VIRTUAL,
      validate: {
        len: { args: [8, 72], msg: 'Password must be at least 8 characters' },
      },
    },
    passwordHash: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'password_hash',
      validate: {
        notNull: { msg: 'Password is required' },
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    // Medical access: may read the health answers on event registrations.
    isClinical: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_clinical',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'avatar_url',
      validate: { mediaUrl },
    },
  },
  {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },
    hooks: {
      beforeValidate: async (user) => {
        if (!user.changed('password') || !user.password) return;
        user.passwordHash = await bcrypt.hash(user.password, 12);
      },
    },
  }
);

User.prototype.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

User.prototype.toJSON = function () {
  const { passwordHash, password, ...safe } = this.get({ plain: true });
  return safe;
};

export default User;
