import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const EventActivity = sequelize.define(
  'EventActivity',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false, field: 'event_id' },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: { msg: 'Activity name is required' } } },
    ledBy: { type: DataTypes.STRING(120), allowNull: true, field: 'led_by' },
    description: { type: DataTypes.STRING(300), allowNull: true },
    places: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, validate: { min: 0 } },
    // Hidden activities keep their registrations but cannot be picked or seen.
    visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  },
  { tableName: 'event_activities', underscored: true, timestamps: true, indexes: [{ fields: ['event_id'] }] }
);

export default EventActivity;
