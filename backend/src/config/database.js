/**
 * 数据库配置文件
 */
const { Sequelize } = require('sequelize');
const Redis = require('ioredis');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// MySQL 配置
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+08:00', // 东八区
    dialectOptions: {
      dateStrings: true,
      typeCast: true
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Redis 客户端
const redis = new Redis({
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    // 重试策略
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Redis 连接事件
redis.on('connect', () => {
  console.log('Redis连接成功');
});

redis.on('error', (err) => {
  console.error('Redis连接错误:', err);
});

// 数据库连接测试
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 只在开发环境自动同步表结构
    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
      console.log('正在同步数据库表结构...');
      await sequelize.sync({ alter: true });
      console.log('数据库表结构同步完成');
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
};

// 导出
module.exports = sequelize;
module.exports.redis = redis;
module.exports.testConnection = testConnection; 