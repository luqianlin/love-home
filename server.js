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
app.use(helmet({
  contentSecurityPolicy: false, // 禁用CSP以避免微信小程序请求问题
  crossOriginEmbedderPolicy: false, // 禁用COEP以解决跨域问题
})); // 安全HTTP头
app.use(cors({
  origin: '*', // 允许所有来源访问
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // 跨域支持
app.use(compression()); // 响应压缩
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 日志中间件
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// CORS预检请求处理 - 处理OPTIONS请求
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24小时
  res.sendStatus(204);
});

/**
 * 检测请求是否来自微信小程序
 * @param {Object} req - 请求对象
 * @returns {Boolean} 是否是微信小程序请求
 */
const isWechatMiniProgramRequest = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  return (
    userAgent.includes('MicroMessenger') || 
    userAgent.includes('miniProgram') || 
    userAgent.includes('lovehome') ||  // 检查我们自定义的UA标识
    (req.headers['referer'] && req.headers['referer'].includes('servicewechat.com')) ||
    req.query.client === 'wechat_mp'  // 允许通过查询参数明确标识
  );
};

// 微信小程序专用健康检查端点 - 优先匹配
app.get('/health', (req, res) => {
  // 判断是否来自微信小程序的请求
  const isMiniProgram = isWechatMiniProgramRequest(req);
  
  // 设置特殊头信息
  if (isMiniProgram) {
    console.log('接收到微信小程序健康检查请求', {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      time: new Date().toISOString()
    });
    
    // 设置微信小程序特殊需求的头信息
    res.header('Connection', 'keep-alive');
    res.header('Keep-Alive', 'timeout=300'); // 延长keep-alive超时
  }
  
  // 设置不缓存的头信息
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');
  
  // CORS头信息
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  
  // 设置content-length以避免传输问题
  const responseData = { 
    status: 'ok', 
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    clientInfo: isMiniProgram ? 'wechat_mini_program' : 'web_client'
  };
  
  const jsonResponse = JSON.stringify(responseData);
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.header('Content-Length', Buffer.byteLength(jsonResponse));
  
  // 返回健康状态
  res.status(200).send(jsonResponse);
});

// 健康检查端点 - 直接在根级别添加，确保优先匹配
app.get('/api/health', (req, res) => {
  // 判断是否来自微信小程序的请求
  const isMiniProgram = isWechatMiniProgramRequest(req);
  
  // 设置特殊头信息
  if (isMiniProgram) {
    console.log('接收到微信小程序API健康检查请求', {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      time: new Date().toISOString()
    });
    
    // 设置微信小程序特殊需求的头信息
    res.header('Connection', 'keep-alive');
    res.header('Keep-Alive', 'timeout=300');
  }
  
  // 设置不缓存的头信息
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');
  
  // 允许跨域请求
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 返回健康状态
  res.status(200).json({ 
    status: 'ok', 
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    clientInfo: isMiniProgram ? 'wechat_mini_program' : 'web_client'
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