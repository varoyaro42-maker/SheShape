import { createHash, randomBytes } from 'node:crypto';
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const INVITE_DAYS = 7;

/** The raw token only ever lives in the email link; the database keeps its hash. */
export const hashInviteToken = (token) => createHash('sha256').update(String(token)).digest('hex');
export const newInviteToken = () => randomBytes(32).toString('hex');

const AdminInvite = sequelize.define(
  'AdminInvite',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { isEmail: { msg: 'Enter a valid email address' } },
      set(value) {
        this.setDataValue('email', String(value ?? '').trim().toLowerCase());
      },
    },
    name: { type: DataTypes.STRING(80), allowNull: true },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    acceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'accepted_at' },
    invitedById: { type: DataTypes.UUID, allowNull: true, field: 'invited_by_id' },
  },
  { tableName: 'admin_invites', underscored: true, timestamps: true, indexes: [{ fields: ['email'] }] }
);

export default AdminInvite;
