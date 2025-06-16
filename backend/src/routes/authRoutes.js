/**
 * 认证路由
 */
const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// 需要认证的路由
router.use(authenticate);
router.get('/me', authController.getCurrentUser);
router.post('/switch-community', authController.switchCommunity);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

module.exports = router; 