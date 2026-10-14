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

    // Manual mobile money, used when XentriPay is off.
    momoNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'momo_number' },
    momoName: { type: DataTypes.STRING(80), allowNull: true, field: 'momo_name' },

    // XentriPay collections (MoMo push + card).
    xentripayApiKeyEnc: { type: DataTypes.TEXT, allowNull: true, field: 'xentripay_api_key_enc' },
    // The secretHash XentriPay returns when the webhook is registered.
    xentripayWebhookSecretEnc: { type: DataTypes.TEXT, allowNull: true, field: 'xentripay_webhook_secret_enc' },
    xentripayEnvironment: {
      type: DataTypes.ENUM(...XENTRIPAY_ENVIRONMENTS),
      allowNull: false,
      defaultValue: 'sandbox',
      field: 'xentripay_environment',
    },
    xentripayEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'xentripay_enabled' },
    // true: the fee comes out of the order total (shop absorbs it).
    // false: XentriPay adds the fee on top for the customer.
    xentripayChargesIncluded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'xentripay_charges_included',
    },

    payoutNote: { type: DataTypes.TEXT, allowNull: true, field: 'payout_note' },
  },
  {
    tableName: 'payment_settings',
    underscored: true,
    timestamps: true,
  }
);

export default PaymentSettings;
