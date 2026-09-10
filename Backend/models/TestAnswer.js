const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestAnswer = sequelize.define('TestAnswer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    attemptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'TestAttempts',
            key: 'id',
        },
    },
    questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Questions',
            key: 'id',
        },
    },
    questionText: {
        // snapshot of the question at time of test
        type: DataTypes.TEXT,
        allowNull: false,
    },
    idealAnswer: {
        // snapshot of the ideal answer at time of test
        type: DataTypes.TEXT,
        allowNull: true,
    },
    userAnswer: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '',
    },
    score: {
        // 0-10 per question
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    strengths: {
        // JSON array stored as TEXT
        type: DataTypes.TEXT,
        allowNull: true,
    },
    improvements: {
        // JSON array stored as TEXT
        type: DataTypes.TEXT,
        allowNull: true,
    },
    difficulty: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'medium',
    },
    orderIndex: {
        // position of the question in the test (0-based)
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    // MCQ snapshots — null for descriptive
    options: {
        type: DataTypes.TEXT, // JSON array of 4 option strings
        allowNull: true,
    },
    correctOption: {
        type: DataTypes.INTEGER, // 0-3
        allowNull: true,
    },
    selectedOption: {
        type: DataTypes.INTEGER, // user's chosen option index, null for descriptive
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = TestAnswer;
