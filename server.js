/**
 * 智慧社区平台服务器入口文件
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入数据库配置
const sequelize = require('./backend/src/config/database');

// 导入定时任务服务
const { initScheduledTasks } = require('./backend/src/services/scheduledTasks');

// 创建Express应用
const app = express();

// 中间件配置
app.use(helmet()); // 安全HTTP头
app.use(cors()); // 跨域支持
app.use(compression()); // 响应压缩
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 日志中间件
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// 健康检查端点 - 直接在根级别添加，确保优先匹配
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.use('/api', require('./backend/src/routes'));

// 前端SPA支持
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend-admin/dist/index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 服务器端口
const PORT = process.env.PORT || 8080;

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.testConnection();
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API地址: http://localhost:${PORT}/api`);
      
      // 初始化定时任务
      if (process.env.ENABLE_SCHEDULED_TASKS !== 'false') {
        initScheduledTasks();
      }
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动服务
startServer();