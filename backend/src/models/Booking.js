import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

export const BOOKING_STATUSES = ['new', 'confirmed', 'declined', 'cancelled'];

/**
 * A request to join a program or class. Bookings are confirmed by a human,
 * so this is a conversation starter, not a seat reservation.
 */
const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    programId: { type: DataTypes.UUID, allowNull: true, field: 'program_id' },
    // Snapshot so the booking still reads well if the program is renamed or removed.
    programName: { type: DataTypes.STRING(120), allowNull: false, field: 'program_name' },
    userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
        len: { args: [2, 80], msg: 'Name must be between 2 and 80 characters' },
      },
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { isEmail: { msg: 'Enter a valid email address' } },
      set(value) {
        this.setDataValue('email', String(value ?? '').trim().toLowerCase());
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { is: { args: PHONE_PATTERN, msg: 'Enter a valid Rwandan phone number' } },
      set(value) {
        this.setDataValue('phone', normalizePhone(value));
      },
    },
    preferredDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'preferred_date' },
    message: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    status: {
      type: DataTypes.ENUM(...BOOKING_STATUSES),
      allowNull: false,
      defaultValue: 'new',
    },
    adminNote: { type: DataTypes.TEXT, allowNull: true, field: 'admin_note' },
    respondedAt: { type: DataTypes.DATE, allowNull: true, field: 'responded_at' },
    respondedById: { type: DataTypes.UUID, allowNull: true, field: 'responded_by_id' },
  },
  {
    tableName: 'bookings',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['email'] }, { fields: ['program_id'] }],
  }
);

export default Booking;
