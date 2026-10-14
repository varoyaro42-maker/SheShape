import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const PaymentSettings = sequelize.define(
  'PaymentSettings',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
    },
    stripeSecretKeyEnc: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'stripe_secret_key_enc',
    },
    stripePublishableKey: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'stripe_publishable_key',
    },
    stripeWebhookSecretEnc: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'stripe_webhook_secret_enc',
    },
    payoutNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'payout_note',
    },
  },
  {
    tableName: 'payment_settings',
    underscored: true,
    timestamps: true,
  }
);

export default PaymentSettings;
