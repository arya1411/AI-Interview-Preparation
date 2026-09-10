const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    experience: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    topicsToFocus: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'preparation', // 'preparation' | 'test'
    },
    questionFormat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'descriptive', // 'descriptive' | 'mcq'
    },
    // Set when session is completed via completeSession endpoint
    status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'active', // 'active' | 'completed'
    },
    totalDuration: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    questionCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    completionDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
});

// Define associations
Session.associate = (models) => {
    Session.hasMany(models.Question, {
        foreignKey: 'sessionId',
        as: 'questions',
    });
    Session.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
    });
};

module.exports = Session;
