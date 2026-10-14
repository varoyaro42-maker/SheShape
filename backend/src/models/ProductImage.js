import { DataTypes } from 'sequelize'
import { sequelize } from '../db.js'

export const ProductImage = sequelize.define('product_images', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { isUrl: true }
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  color: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  colorHex: {
    type: DataTypes.STRING(7),
    allowNull: true,
    field: 'color_hex',
    validate: { is: { args: /^#[0-9a-f]{6}$/i, msg: 'colorHex must look like #112233' } }
  }
}, {
  indexes: [{ fields: ['product_id', 'sort_order'] }]
})
