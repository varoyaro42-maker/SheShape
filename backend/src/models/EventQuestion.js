import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const QUESTION_TYPES = ['text', 'longtext', 'choice', 'yesno', 'consent'];

/** Admin-built registration questions. Name, phone and email are always asked. */
const EventQuestion = sequelize.define(
  'EventQuestion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    eventId: { type: DataTypes.UUID, allowNull: false, field: 'event_id' },
    label: { type: DataTypes.STRING(300), allowNull: false, validate: { notEmpty: { msg: 'Question text is required' } } },
    help: { type: DataTypes.STRING(400), allowNull: true },
    type: { type: DataTypes.ENUM(...QUESTION_TYPES), allowNull: false, defaultValue: 'text' },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('options');
        if (typeof raw !== 'string') return raw ?? [];
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      },
    },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Health information: stored encrypted, shown only to medical accounts, deleted after the event.
    sensitive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Removed questions stay so earlier answers keep their wording.
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  },
  { tableName: 'event_questions', underscored: true, timestamps: true, indexes: [{ fields: ['event_id'] }] }
);

export default EventQuestion;
