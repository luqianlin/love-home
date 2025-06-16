/**
 * 数据库配置文件
 */
const mysql = require('mysql2/promise');
const Redis = require('ioredis');

// MySQL连接池配置
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'smart_community',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Redis客户端配置
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS || '',
  db: process.env.REDIS_DB || 0
});

// 数据库初始化测试
const testDatabaseConnection = async () => {
  try {
    // 测试MySQL连接
    const connection = await mysqlPool.getConnection();
    console.log('MySQL数据库连接成功');
    connection.release();

    // 测试Redis连接
    await redisClient.ping();
    console.log('Redis数据库连接成功');

    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
};

module.exports = {
  mysqlPool,
  redisClient,
  testDatabaseConnection
}; 