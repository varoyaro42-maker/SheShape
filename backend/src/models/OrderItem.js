import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: { args: [0], msg: 'Price cannot be negative' } },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: { args: [1], msg: 'Quantity must be at least 1' } },
    },
  },
  {
    tableName: 'order_items',
    underscored: true,
    timestamps: false,
  }
);

export default OrderItem;
