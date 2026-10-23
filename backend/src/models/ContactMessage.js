import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const MESSAGE_STATUSES = ['new', 'read', 'replied'];

const ContactMessage = sequelize.define(
  'ContactMessage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...MESSAGE_STATUSES),
      allowNull: false,
      defaultValue: 'new',
    },
    replyMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'reply_message',
    },
    repliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'replied_at',
    },
    repliedById: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'replied_by_id',
    },
  },
  {
    tableName: 'contact_messages',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['created_at'] }],
  }
);

export default ContactMessage;
