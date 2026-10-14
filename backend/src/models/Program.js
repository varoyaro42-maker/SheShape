import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const PROGRAM_STATUSES = ['coming_soon', 'open'];

const Program = sequelize.define(
  'Program',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
      },
    },
    slug: {
      type: DataTypes.STRING(140),
      allowNull: false,
      unique: true,
    },
    tagline: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: '',
    },
    label: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: '',
    },
    highlights: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('highlights');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    coverImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cover_image',
      validate: { isUrl: { msg: 'Cover image must be a URL' } },
    },
    status: {
      type: DataTypes.ENUM(...PROGRAM_STATUSES),
      allowNull: false,
      defaultValue: 'coming_soon',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
  },
  {
    tableName: 'programs',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['sort_order'] },
    ],
  }
);

export default Program;
