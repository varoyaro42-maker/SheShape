import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

// cod: pay the courier. momo: customer sends mobile money to the shop's number
// and an admin confirms. xentripay: online collection through XentriPay.
export const PAYMENT_METHODS = ['cod', 'momo', 'xentripay'];

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'order_number',
    },
    userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
    customerName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'customer_name',
      validate: {
        notNull: { msg: 'Name is required' },
        notEmpty: { msg: 'Name is required' },
        len: { args: [2, 80], msg: 'Name must be between 2 and 80 characters' },
      },
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'customer_phone',
      validate: {
        notNull: { msg: 'Phone number is required' },
        is: { args: PHONE_PATTERN, msg: 'Enter a valid Rwandan phone number' },
      },
      set(value) {
        this.setDataValue('customerPhone', normalizePhone(value));
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Delivery address is required' },
        len: { args: [5, 300], msg: 'Give a bit more detail on the address' },
      },
    },
    total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: { args: [0], msg: 'Total cannot be negative' } },
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentMethod: {
      type: DataTypes.ENUM(...PAYMENT_METHODS),
      allowNull: false,
      defaultValue: 'cod',
      field: 'payment_method',
    },
    // Provider-side id for online payments (XentriPay transaction id).
    paymentReference: { type: DataTypes.STRING(120), allowNull: true, field: 'payment_reference' },
    // Hosted checkout link, kept so a customer can resume an unfinished payment.
    paymentCheckoutUrl: { type: DataTypes.TEXT, allowNull: true, field: 'payment_checkout_url' },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
  },
  {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['payment_reference'] }],
  }
);

export default Order;
