import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * pending     sent to XentriPay; waits for the OTP confirmation and the provider
 * successful  the money reached the recipient
 * failed      declined by XentriPay or the provider; nothing left the wallet
 * reversed    paid, then reversed by the provider
 */
export const PAYOUT_STATUSES = ['pending', 'successful', 'failed', 'reversed'];

/** Money sent out of the XentriPay wallet from the admin. */
const Payout = sequelize.define(
  'Payout',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // Our customerReference, unique per payout.
    reference: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    providerId: { type: DataTypes.STRING(10), allowNull: false, field: 'provider_id' },
    providerName: { type: DataTypes.STRING(60), allowNull: false, field: 'provider_name' },
    // Phone in local format (07...) for mobile money, account number for banks.
    account: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    // XentriPay's fee for this payout, once it tells us.
    charge: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM(...PAYOUT_STATUSES), allowNull: false, defaultValue: 'pending' },
    statusMessage: { type: DataTypes.STRING(300), allowNull: true, field: 'status_message' },
    xentripayId: { type: DataTypes.STRING(40), allowNull: true, field: 'xentripay_id' },
    internalRef: { type: DataTypes.STRING(60), allowNull: true, field: 'internal_ref' },
    // The account holder's name as the provider knows it.
    validatedName: { type: DataTypes.STRING(120), allowNull: true, field: 'validated_name' },
    note: { type: DataTypes.STRING(300), allowNull: true },
    createdById: { type: DataTypes.UUID, allowNull: true, field: 'created_by_id' },
    checkedAt: { type: DataTypes.DATE, allowNull: true, field: 'checked_at' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  },
  {
    tableName: 'payouts',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['status'] }],
  }
);

export default Payout;
