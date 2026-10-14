import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const XENTRIPAY_ENVIRONMENTS = ['sandbox', 'live'];

/**
 * Single-row table (id = 1) holding how the shop gets paid. Secrets are
 * encrypted with ENCRYPTION_KEY before they are stored.
 */
const PaymentSettings = sequelize.define(
  'PaymentSettings',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: false },

    // Manual mobile money: shown to customers who choose "Pay by MoMo".
    momoNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'momo_number' },
    momoName: { type: DataTypes.STRING(80), allowNull: true, field: 'momo_name' },

    // XentriPay online collections.
    xentripayApiKeyEnc: { type: DataTypes.TEXT, allowNull: true, field: 'xentripay_api_key_enc' },
    xentripayWebhookSecretEnc: { type: DataTypes.TEXT, allowNull: true, field: 'xentripay_webhook_secret_enc' },
    xentripayEnvironment: {
      type: DataTypes.ENUM(...XENTRIPAY_ENVIRONMENTS),
      allowNull: false,
      defaultValue: 'sandbox',
      field: 'xentripay_environment',
    },
    xentripayEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'xentripay_enabled' },

    payoutNote: { type: DataTypes.TEXT, allowNull: true, field: 'payout_note' },
  },
  {
    tableName: 'payment_settings',
    underscored: true,
    timestamps: true,
  }
);

export default PaymentSettings;
