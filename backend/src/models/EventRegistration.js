import { randomBytes } from 'node:crypto';
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * holding    places reserved while she pays
 * confirmed  paid (or added by an admin): she has her place
 * expired    the hold ran out before payment; places back in the pool
 * cancelled  cancelled by an admin; places back in the pool
 * attention  paid after her hold expired and her places had gone: needs an admin
 */
export const REGISTRATION_STATUSES = ['holding', 'confirmed', 'expired', 'cancelled', 'attention'];
export const newTicketToken = () => randomBytes(24).toString('hex');

const json = (key) => ({
  type: DataTypes.JSON,
  allowNull: false,
  defaultValue: [],
  get() {
    const raw = this.getDataValue(key);
    if (typeof raw !== 'string') return raw ?? [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },
});

const EventRegistration = sequelize.define(
  'EventRegistration',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false, field: 'event_id' },
    // Unguessable: used in the ticket link and the QR code.
    token: { type: DataTypes.STRING(64), allowNull: false, unique: true, defaultValue: newTicketToken },
    ticketNumber: { type: DataTypes.STRING(24), allowNull: true, unique: true, field: 'ticket_number' },
    status: { type: DataTypes.ENUM(...REGISTRATION_STATUSES), allowNull: false, defaultValue: 'holding' },
    name: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false },
    // [{ questionId, label, value }] for ordinary questions, with the date they were answered.
    answers: json('answers'),
    hasHealthNote: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_health_note' },
    // Encrypted JSON of the sensitive answers; null once purged.
    healthAnswersEnc: { type: DataTypes.TEXT, allowNull: true, field: 'health_answers_enc' },
    healthPurgedAt: { type: DataTypes.DATE, allowNull: true, field: 'health_purged_at' },
    amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    source: { type: DataTypes.ENUM('online', 'admin'), allowNull: false, defaultValue: 'online' },
    paymentMethod: { type: DataTypes.STRING(20), allowNull: true, field: 'payment_method' },
    paymentReference: { type: DataTypes.STRING(120), allowNull: true, field: 'payment_reference' },
    paymentTransactionId: { type: DataTypes.STRING(120), allowNull: true, field: 'payment_transaction_id' },
    paymentCheckoutUrl: { type: DataTypes.TEXT, allowNull: true, field: 'payment_checkout_url' },
    paymentFailedAt: { type: DataTypes.DATE, allowNull: true, field: 'payment_failed_at' },
    holdExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'hold_expires_at' },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
    confirmedAt: { type: DataTypes.DATE, allowNull: true, field: 'confirmed_at' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    checkedInAt: { type: DataTypes.DATE, allowNull: true, field: 'checked_in_at' },
    ticketEmailedAt: { type: DataTypes.DATE, allowNull: true, field: 'ticket_emailed_at' },
    adminNote: { type: DataTypes.STRING(300), allowNull: true, field: 'admin_note' },
  },
  {
    tableName: 'event_registrations',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['event_id', 'status'] }, { fields: ['payment_reference'] }, { fields: ['email'] }, { fields: ['phone'] }],
  }
);

export default EventRegistration;
