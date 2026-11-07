const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('DsaSubmission', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
  sheetKey: { type: DataTypes.UUID, allowNull: false },
  problemId: { type: DataTypes.STRING(100), allowNull: false },
  language: { type: DataTypes.STRING(20), allowNull: false },
  kind: { type: DataTypes.STRING(10), allowNull: false },
  code: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
  tokens: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  tests: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  result: { type: DataTypes.JSONB, allowNull: true },
}, { timestamps: true, indexes: [{ fields: ['userId', 'sheetKey', 'problemId', 'createdAt'] }] });
