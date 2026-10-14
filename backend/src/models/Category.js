import { DataTypes } from 'sequelize'
import { sequelize } from '../db.js'

export const Category = sequelize.define('categories', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: { msg: 'That category already exists' },
    validate: { notEmpty: { msg: 'Category name is required' } }
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
}, {
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['name'], unique: true }
  ]
})
