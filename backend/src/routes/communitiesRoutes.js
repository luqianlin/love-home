/**
 * 社区管理路由
 */
const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authMiddleware = require('../middleware/authMiddleware');

// 公开路由
router.get('/nearby', communityController.findNearbyCommunities);

// 需要登录的路由
router.use(authMiddleware.authenticate);

// 获取社区列表
router.get('/', communityController.getCommunities);

// 获取社区详情
router.get('/:id', communityController.getCommunityDetail);

// 创建社区
router.post('/', communityController.createCommunity);

// 更新社区信息
router.put('/:id', communityController.updateCommunity);

// 用户加入社区
router.post('/join', communityController.joinCommunity);

// 切换当前使用的社区
router.post('/switch', communityController.switchCommunity);

// 获取用户加入的社区列表
router.get('/user/list', communityController.getUserCommunities);

// 设置默认社区
router.post('/user/default', communityController.setDefaultCommunity);

module.exports = router; 