/**
 * 社区议事厅控制器
 */
const { Op } = require('sequelize');
const { Topic, TopicVote, User, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const { redis } = require('../config/database');

/**
 * 创建议题
 */
const createTopic = catchAsync(async (req, res) => {
  const { title, content, category, building, vote_type, vote_options } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证投票选项
  if (vote_type === '选项投票' && (!vote_options || vote_options.length < 2)) {
    throw ApiError.badRequest('选项投票至少需要2个选项');
  }
  
  // 敏感词过滤 (简单实现，实际项目中可以使用更复杂的敏感词库)
  const sensitiveWords = ['敏感词1', '敏感词2', '敏感词3'];
  const hasSensitiveWord = sensitiveWords.some(word => 
    title.includes(word) || content.includes(word)
  );
  
  if (hasSensitiveWord) {
    throw ApiError.badRequest('内容包含敏感词，请修改后重新提交');
  }
  
  // 创建议题
  const topic = await Topic.create({
    title,
    content,
    category,
    building,
    vote_type,
    vote_options: vote_type === '选项投票' ? vote_options : null,
    user_id: userId,
    community_id: communityId,
    status: 'active'
  });
  
  res.status(201).json({
    code: 201,
    message: '议题创建成功',
    data: topic
  });
});

/**
 * 获取议题列表
 */
const getTopics = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    category, 
    status = 'active', 
    sort = 'createdAt',
    order = 'DESC'
  } = req.query;
  
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 构建查询条件
  const where = {
    community_id: communityId,
    status
  };
  
  if (category) {
    where.category = category;
  }
  
  // 执行查询
  const { count, rows: topics } = await Topic.findAndCountAll({
    where,
    include: [
      {
        model: User,
        attributes: ['id', 'username', 'name', 'avatar']
      }
    ],
    order: [[sort, order]],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
  });
  
  res.json({
    code: 200,
    message: '获取议题列表成功',
    data: {
      topics,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10))
      }
    }
  });
});

/**
 * 获取议题详情
 */
const getTopicDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 查询议题
  const topic = await Topic.findOne({
    where: {
      id,
      community_id: communityId
    },
    include: [
      {
        model: User,
        attributes: ['id', 'username', 'name', 'avatar']
      }
    ]
  });
  
  if (!topic) {
    throw ApiError.notFound('议题不存在');
  }
  
  // 增加浏览次数
  await topic.increment('view_count');
  
  // 获取用户的投票情况
  let userVote = null;
  if (topic.vote_type !== '无需投票') {
    userVote = await TopicVote.findOne({
      where: {
        topic_id: id,
        user_id: userId
      },
      attributes: ['option', 'vote_method', 'createdAt']
    });
  }
  
  // 获取投票统计
  let voteStats = null;
  if (topic.vote_type !== '无需投票') {
    // 从Redis获取实时投票数据
    const redisKey = `topic:${id}:votes`;
    let cachedStats = await redis.get(redisKey);
    
    if (cachedStats) {
      voteStats = JSON.parse(cachedStats);
    } else {
      // 从数据库查询
      const votes = await TopicVote.findAll({
        where: { topic_id: id },
        attributes: ['option', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['option']
      });
      
      if (topic.vote_type === '支持/反对') {
        voteStats = {
          support: 0,
          oppose: 0,
          total: 0
        };
        
        votes.forEach(vote => {
          voteStats[vote.option] = parseInt(vote.getDataValue('count'), 10);
          voteStats.total += parseInt(vote.getDataValue('count'), 10);
        });
      } else if (topic.vote_type === '选项投票') {
        voteStats = {
          options: {},
          total: 0
        };
        
        // 初始化所有选项
        if (topic.vote_options) {
          topic.vote_options.forEach(option => {
            voteStats.options[option] = 0;
          });
        }
        
        votes.forEach(vote => {
          voteStats.options[vote.option] = parseInt(vote.getDataValue('count'), 10);
          voteStats.total += parseInt(vote.getDataValue('count'), 10);
        });
      }
      
      // 缓存到Redis (10分钟)
      await redis.set(redisKey, JSON.stringify(voteStats), 'EX', 600);
    }
  }
  
  res.json({
    code: 200,
    message: '获取议题详情成功',
    data: {
      topic,
      userVote,
      voteStats
    }
  });
});

/**
 * 投票
 */
const voteTopic = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { option, vote_method = '实名' } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  const userIp = req.ip;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 查询议题
  const topic = await Topic.findOne({
    where: {
      id,
      community_id: communityId,
      status: 'active'
    }
  });
  
  if (!topic) {
    throw ApiError.notFound('议题不存在或已关闭');
  }
  
  // 验证投票类型
  if (topic.vote_type === '无需投票') {
    throw ApiError.badRequest('该议题不支持投票');
  }
  
  // 验证投票选项
  if (topic.vote_type === '支持/反对' && !['support', 'oppose'].includes(option)) {
    throw ApiError.badRequest('无效的投票选项');
  }
  
  if (topic.vote_type === '选项投票' && (!topic.vote_options || !topic.vote_options.includes(option))) {
    throw ApiError.badRequest('无效的投票选项');
  }
  
  // 检查是否已投票
  const existingVote = await TopicVote.findOne({
    where: {
      topic_id: id,
      user_id: userId
    }
  });
  
  if (existingVote) {
    throw ApiError.conflict('您已经投过票了');
  }
  
  // 创建投票记录
  const vote = await TopicVote.create({
    topic_id: id,
    user_id: userId,
    option,
    vote_method,
    ip_address: userIp,
    community_id: communityId
  });
  
  // 清除Redis缓存
  await redis.del(`topic:${id}:votes`);
  
  res.status(201).json({
    code: 201,
    message: '投票成功',
    data: vote
  });
});

/**
 * 更新议题状态
 */
const updateTopicStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证状态
  if (!['active', 'closed'].includes(status)) {
    throw ApiError.badRequest('无效的状态');
  }
  
  // 查询议题
  const topic = await Topic.findOne({
    where: {
      id,
      community_id: communityId
    }
  });
  
  if (!topic) {
    throw ApiError.notFound('议题不存在');
  }
  
  // 验证权限 (只有创建者或管理员可以更新状态)
  if (topic.user_id !== userId && !['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限执行此操作');
  }
  
  // 更新状态
  await topic.update({ status });
  
  res.json({
    code: 200,
    message: '议题状态更新成功',
    data: { status }
  });
});

module.exports = {
  createTopic,
  getTopics,
  getTopicDetail,
  voteTopic,
  updateTopicStatus
}; 