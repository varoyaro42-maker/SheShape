import { randomBytes } from 'node:crypto';
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const SUBSCRIBER_STATUSES = ['pending', 'subscribed', 'unsubscribed'];

export const newSubscriberToken = () => randomBytes(24).toString('hex');

const Subscriber = sequelize.define(
  'Subscriber',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: { msg: 'Enter a valid email address' } },
      set(value) {
        this.setDataValue('email', String(value ?? '').trim().toLowerCase());
      },
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...SUBSCRIBER_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    // Used in the confirm and unsubscribe links. Rotated on every new request.
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      defaultValue: newSubscriberToken,
    },
    source: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'website',
    },
    confirmedAt: { type: DataTypes.DATE, allowNull: true, field: 'confirmed_at' },
    unsubscribedAt: { type: DataTypes.DATE, allowNull: true, field: 'unsubscribed_at' },
    brevoSyncedAt: { type: DataTypes.DATE, allowNull: true, field: 'brevo_synced_at' },
  },
  {
    tableName: 'subscribers',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['status'] }],
  }
);

export default Subscriber;
