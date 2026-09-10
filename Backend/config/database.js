const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'prepai',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully');
    
    // Import models after connection
    const User = require('../models/User');
    const Session = require('../models/Session');
    const Question = require('../models/Question');
    const TestAttempt = require('../models/TestAttempt');
    const TestAnswer = require('../models/TestAnswer');

    // Setup model associations
    User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
    Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Session.hasMany(Question, { foreignKey: 'sessionId', as: 'questions' });
    Question.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

    // Test mode associations
    Session.hasMany(TestAttempt, { foreignKey: 'sessionId', as: 'testAttempts' });
    TestAttempt.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });
    User.hasMany(TestAttempt, { foreignKey: 'userId', as: 'testAttempts' });
    TestAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    TestAttempt.hasMany(TestAnswer, { foreignKey: 'attemptId', as: 'answers' });
    TestAnswer.belongsTo(TestAttempt, { foreignKey: 'attemptId', as: 'attempt' });
    Question.hasMany(TestAnswer, { foreignKey: 'questionId', as: 'testAnswers' });
    TestAnswer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
    
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
