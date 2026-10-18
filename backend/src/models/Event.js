import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const EVENT_STATUSES = ['draft', 'open', 'closed'];
export const FEE_PAYERS = ['customer', 'organiser'];

/**
 * Everything about an event is set by an admin: the page copy, the price,
 * the places, the activities and the registration questions. Nothing about a
 * specific event lives in the code.
 */
const Event = sequelize.define(
  'Event',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(160), allowNull: false, validate: { notEmpty: { msg: 'Title is required' } } },
    // Short code printed on tickets, e.g. HWE -> HWE-0012.
    ticketPrefix: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'EVT', field: 'ticket_prefix' },
    tagline: { type: DataTypes.STRING(200), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    poweredBy: { type: DataTypes.STRING(120), allowNull: true, field: 'powered_by' },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.STRING(20), allowNull: true, field: 'start_time' },
    endTime: { type: DataTypes.STRING(20), allowNull: true, field: 'end_time' },
    venue: { type: DataTypes.STRING(200), allowNull: true },
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    priceNote: { type: DataTypes.STRING(120), allowNull: true, field: 'price_note' },
    totalPlaces: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50, field: 'total_places', validate: { min: 0 } },
    // How many activities each person picks (fewer when fewer are still open).
    picks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2, validate: { min: 0, max: 20 } },
    picksLabel: { type: DataTypes.STRING(120), allowNull: true, field: 'picks_label' },
    opensAt: { type: DataTypes.DATE, allowNull: true, field: 'opens_at' },
    closesAt: { type: DataTypes.DATE, allowNull: true, field: 'closes_at' },
    status: { type: DataTypes.ENUM(...EVENT_STATUSES), allowNull: false, defaultValue: 'draft' },
    holdMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15, field: 'hold_minutes', validate: { min: 5, max: 120 } },
    feePaidBy: { type: DataTypes.ENUM(...FEE_PAYERS), allowNull: false, defaultValue: 'organiser', field: 'fee_paid_by' },
    healthRetentionDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, field: 'health_retention_days' },
    fullMessage: { type: DataTypes.TEXT, allowNull: true, field: 'full_message' },
    closedMessage: { type: DataTypes.TEXT, allowNull: true, field: 'closed_message' },
    heroImage: { type: DataTypes.TEXT, allowNull: true, field: 'hero_image' },
    // [{ imageUrl, caption }], [string], [{ name, imageUrl, href }]
    gallery: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    included: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    partners: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    dressCode: { type: DataTypes.TEXT, allowNull: true, field: 'dress_code' },
    // Extra lines for the ticket email: programme, what to bring.
    ticketNote: { type: DataTypes.TEXT, allowNull: true, field: 'ticket_note' },
    contactWhatsapp: { type: DataTypes.STRING(40), allowNull: true, field: 'contact_whatsapp' },
    contactInstagram: { type: DataTypes.STRING(60), allowNull: true, field: 'contact_instagram' },
    ticketCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'ticket_counter' },
  },
  { tableName: 'events', underscored: true, timestamps: true }
);

// MariaDB returns JSON columns as strings; always hand back arrays.
Event.addHook('afterFind', (result) => {
  const rows = Array.isArray(result) ? result : result ? [result] : [];
  for (const row of rows) {
    for (const key of ['gallery', 'included', 'partners']) {
      const raw = row.getDataValue(key);
      if (typeof raw === 'string') {
        try {
          row.setDataValue(key, JSON.parse(raw));
        } catch {
          row.setDataValue(key, []);
        }
      }
    }
  }
});

export default Event;
