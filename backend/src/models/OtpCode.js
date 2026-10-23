import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

export const OTP_PURPOSES = ['verify_email', 'reset_password'];

const OtpCode = sequelize.define(
  'OtpCode',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    purpose: {
      type: DataTypes.ENUM(...OTP_PURPOSES),
      allowNull: false,
    },
    codeHash: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'code_hash',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consumed_at',
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'otp_codes',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['user_id', 'purpose'] }],
  }
);

export default OtpCode;
