const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    profileImageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
}, {
    timestamps: true,
});

module.exports = User;
