const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
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
    question: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    answer: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    difficulty: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'medium',
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'pending',
    },
    explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // MCQ fields — null for descriptive questions
    options: {
        type: DataTypes.TEXT, // stored as JSON string: ["opt A","opt B","opt C","opt D"]
        allowNull: true,
    },
    correctOption: {
        type: DataTypes.INTEGER, // 0-3 index into options array
        allowNull: true,
    },
    // Core subjects field — null for non-core sessions
    subject: {
        type: DataTypes.STRING, // 'OS' | 'DBMS' | 'CN' | 'OOPs' | <domain>
        allowNull: true,
    },
}, {
    timestamps: true,
});

// Define associations
Question.associate = (models) => {
    Question.belongsTo(models.Session, {
        foreignKey: 'sessionId',
        as: 'session',
    });
};

module.exports = Question;