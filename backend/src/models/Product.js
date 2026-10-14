import { DataTypes } from 'sequelize'
import { sequelize } from '../db.js'

export const Product = sequelize.define('products', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(160),
    allowNull: false,
    validate: { notEmpty: true }
  },
  slug: {
    type: DataTypes.STRING(180),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, isInt: true }
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, isInt: true }
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['category_id'] },
    { fields: ['is_published'] }
  ]
})
