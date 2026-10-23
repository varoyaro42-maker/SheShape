import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const PROGRAM_STATUSES = ['coming_soon', 'open'];

// MariaDB returns JSON columns as strings; parse on read.
const jsonGetter = (field, fallback) =>
  function get() {
    const raw = this.getDataValue(field);
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

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
      validate: { notEmpty: { msg: 'Name is required' } },
    },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    tagline: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    label: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    highlights: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get: jsonGetter('highlights', []),
    },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
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
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },

    // Practical details a customer needs before asking to join.
    price: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
    priceNote: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '', field: 'price_note' },
    duration: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    location: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    coach: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    capacity: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    // [{ day: 'Monday', time: '06:30 – 07:30', note: 'Fitnesspoint Kimihurura' }]
    schedule: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get: jsonGetter('schedule', []),
    },
    // Whether customers can send a booking request from the site.
    bookable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
