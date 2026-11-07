const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('DsaWorkspace', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'Users', key: 'id' } },
  sheetKey: { type: DataTypes.UUID, allowNull: false },
  sheet: { type: DataTypes.JSONB, allowNull: false },
  content: { type: DataTypes.JSONB, allowNull: false, defaultValue: { drafts: {}, bookmarks: {}, notes: {} } },
  solved: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { timestamps: true });
