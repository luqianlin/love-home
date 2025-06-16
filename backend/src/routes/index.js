/**
 * API路由入口文件
 */
const express = require('express');
const router = express.Router();
const { notFoundHandler, errorHandler } = require('../middleware/errorMiddleware');

// 导入各模块路由
const authRoutes = require('./authRoutes');
const adminAuthRoutes = require('./adminAuthRoutes');
const topicsRoutes = require('./topicsRoutes');
const workOrdersRoutes = require('./workOrdersRoutes');
const financeRoutes = require('./financeRoutes');
const notificationsRoutes = require('./notificationsRoutes');
const usersRoutes = require('./usersRoutes');
const communitiesRoutes = require('./communitiesRoutes');

// API健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API版本信息端点
router.get('/', (req, res) => {
  res.status(200).json({ 
    name: '智慧社区平台API',
    version: '1.0.0',
    documentation: '/api/docs',
    lastUpdate: new Date().toISOString()
  });
});

// 注册认证路由
router.use('/auth', authRoutes);
router.use('/admin/auth', adminAuthRoutes);

// 注册业务模块路由
router.use('/topics', topicsRoutes);
router.use('/work-orders', workOrdersRoutes);
router.use('/finance', financeRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/communities', communitiesRoutes);

// 404处理
router.use(notFoundHandler);

// 错误处理
router.use(errorHandler);

module.exports = router;