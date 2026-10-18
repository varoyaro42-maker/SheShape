import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/** One row per activity a registration holds; capacity is counted from these. */
const EventRegistrationActivity = sequelize.define(
  'EventRegistrationActivity',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    registrationId: { type: DataTypes.UUID, allowNull: false, field: 'registration_id' },
    activityId: { type: DataTypes.UUID, allowNull: false, field: 'activity_id' },
    eventId: { type: DataTypes.UUID, allowNull: false, field: 'event_id' },
  },
  {
    tableName: 'event_registration_activities',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['registration_id', 'activity_id'] }, { fields: ['activity_id'] }],
  }
);

export default EventRegistrationActivity;
