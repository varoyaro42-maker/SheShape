import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const HomeContent = sequelize.define(
  'HomeContent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      get() {
        const raw = this.getDataValue('data');
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      },
    },
  },
  {
    tableName: 'home_content',
    underscored: true,
    timestamps: true,
  }
);

export default HomeContent;
