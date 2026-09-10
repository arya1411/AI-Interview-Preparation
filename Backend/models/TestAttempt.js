const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestAttempt = sequelize.define('TestAttempt', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Sessions',
            key: 'id',
        },
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    status: {
        // 'in_progress' | 'completed'
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'in_progress',
    },
    overallScore: {
        // 0-100 percentage, set after evaluation
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = TestAttempt;
