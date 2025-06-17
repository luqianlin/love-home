/**
 * 定时任务运行器
 * 作为独立进程运行定时任务，避免影响主服务
 */
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// 导入数据库配置
const sequelize = require('../config/database');

// 导入定时任务服务
const { initScheduledTasks } = require('./scheduledTasks');

// 启动任务
const startTasks = async () => {
  try {
    console.log('正在启动定时任务服务...');
    
    // 测试数据库连接
    await sequelize.testConnection();
    
    // 初始化定时任务
    initScheduledTasks();
    
    console.log('定时任务服务已启动');
    
    // 防止进程退出
    process.on('SIGINT', () => {
      console.log('收到SIGINT信号，正在关闭定时任务服务...');
      process.exit(0);
    });
  } catch (error) {
    console.error('定时任务服务启动失败:', error);
    process.exit(1);
  }
};

// 启动任务
startTasks(); 