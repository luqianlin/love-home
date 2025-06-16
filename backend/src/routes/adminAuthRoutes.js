/**
 * 管理员认证路由
 */
const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 管理员登录
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// 需要认证的路由
router.use(authenticate);
router.post('/logout', authController.logout);

// 需要管理员权限的路由
router.use(authorize('property_admin', 'system_admin'));
router.get('/me', authController.getCurrentUser);
router.post('/change-password', authController.changePassword);

module.exports = router;