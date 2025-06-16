/**
 * API路由入口文件
 */
const express = require('express');
const router = express.Router();

// 导入各模块路由
const topicsRoutes = require('./topicsRoutes');
const workOrdersRoutes = require('./workOrdersRoutes');
const financeRoutes = require('./financeRoutes');
const notificationsRoutes = require('./notificationsRoutes');
const usersRoutes = require('./usersRoutes');
const communitiesRoutes = require('./communitiesRoutes');

// API健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: '服务正常运行' });
});

// 注册各模块路由
router.use('/topics', topicsRoutes);
router.use('/work-orders', workOrdersRoutes);
router.use('/finance', financeRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/communities', communitiesRoutes);

// API版本信息端点
router.get('/version', (req, res) => {
  res.status(200).json({ 
    version: '1.0.0',
    name: '智慧社区平台',
    lastUpdate: new Date().toISOString()
  });
});

module.exports = router; 