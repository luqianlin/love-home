/**
 * 智慧社区平台 - 服务器入口文件
 */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorMiddleware } = require('./backend/src/middleware/errorMiddleware');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(morgan('dev')); // 请求日志
app.use(helmet()); // 安全HTTP头
app.use(cors()); // 跨域资源共享
app.use(compression()); // 响应压缩
app.use(express.json()); // JSON请求体解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 请求限流 - 防止DOS攻击
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP限制请求数
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 路由配置
const apiRoutes = require('./backend/src/routes');
app.use('/api', apiRoutes);

// 全局错误处理中间件
app.use(errorMiddleware);

// 未找到路由处理
app.use((req, res) => {
  res.status(404).json({ 
    code: 404, 
    message: '请求的资源不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api-docs`);
});

// 优雅退出处理
process.on('SIGTERM', () => {
  console.log('SIGTERM 信号接收到，关闭服务器');
  process.exit(0);
});

module.exports = app;