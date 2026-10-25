import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * One row per thing worth knowing: a sign-in (or a failed one), a sign-out,
 * or a change an admin made. `changes` lists the records touched, with the
 * fields before and after (secrets and health answers are never stored).
 */
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
    // Kept as text so the log still reads right after an account is renamed or removed.
    userName: { type: DataTypes.STRING(120), allowNull: true, field: 'user_name' },
    userEmail: { type: DataTypes.STRING(160), allowNull: true, field: 'user_email' },
    role: { type: DataTypes.STRING(20), allowNull: true },
    // login, login_failed, logout, password_changed, create, update, delete, action
    action: { type: DataTypes.STRING(30), allowNull: false },
    // products, events, orders, payouts, settings, account...
    area: { type: DataTypes.STRING(40), allowNull: true },
    summary: { type: DataTypes.STRING(300), allowNull: false },
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('changes');
        if (typeof raw !== 'string') return raw ?? null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
    },
    method: { type: DataTypes.STRING(10), allowNull: true },
    path: { type: DataTypes.STRING(300), allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(300), allowNull: true, field: 'user_agent' },
    // Milliseconds, so several entries in the same second stay in order.
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['created_at'] }, { fields: ['user_id'] }, { fields: ['action'] }, { fields: ['area'] }],
  }
);

export default AuditLog;
