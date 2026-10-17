import { DataTypes } from 'sequelize';
import { mediaUrl } from '../utils/safeUrl.js';
import sequelize from '../db.js';

const ProgramVideo = sequelize.define(
  'ProgramVideo',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'program_id',
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { notEmpty: { msg: 'Title is required' } },
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { mediaUrl },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
  },
  {
    tableName: 'program_videos',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['program_id', 'sort_order'] }],
  }
);

export default ProgramVideo;
