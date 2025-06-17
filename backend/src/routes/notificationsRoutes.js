/**
 * 通知系统路由
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// 需要登录的路由
router.use(authMiddleware.authenticate);

// 获取通知列表
router.get('/', notificationController.getNotifications);

// 获取通知详情
router.get('/:id', notificationController.getNotificationDetail);

// 获取未读通知数量
router.get('/user/unread', notificationController.getUnreadCount);

// 需要管理员权限的路由
router.use(authMiddleware.checkRole(['property_admin', 'system_admin']));

// 创建通知
router.post('/', notificationController.createNotification);

// 更新通知状态
router.patch('/:id/status', notificationController.updateNotificationStatus);

module.exports = router; 