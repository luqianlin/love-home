/**
 * 社区议事厅路由
 */
const express = require('express');
const router = express.Router();
const topicsController = require('../controllers/topicsController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateTopic } = require('../middleware/validationMiddleware');

// 获取议题列表
router.get('/', topicsController.getTopics);

// 获取单个议题详情
router.get('/:id', topicsController.getTopicById);

// 创建新议题 (需要认证)
router.post('/', authMiddleware, validateTopic, topicsController.createTopic);

// 投票 (需要认证)
router.post('/:id/vote', authMiddleware, topicsController.voteTopic);

// 获取议题投票统计
router.get('/:id/votes', topicsController.getVoteStats);

// 评论议题 (需要认证)
router.post('/:id/comments', authMiddleware, topicsController.addComment);

// 获取议题评论
router.get('/:id/comments', topicsController.getComments);

module.exports = router; 