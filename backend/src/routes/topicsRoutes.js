/**
 * 社区议事厅路由
 */
const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const { authenticate, requireCommunity, authorize } = require('../middleware/authMiddleware');

// 所有路由都需要认证
router.use(authenticate);
router.use(requireCommunity);

// 获取议题列表
router.get('/', topicController.getTopics);

// 获取单个议题详情
router.get('/:id', topicController.getTopicDetail);

// 创建新议题
router.post('/', topicController.createTopic);

// 投票
router.post('/:id/vote', topicController.voteTopic);

// 更新议题状态 (需要创建者或管理员权限)
router.patch('/:id/status', topicController.updateTopicStatus);

module.exports = router; 