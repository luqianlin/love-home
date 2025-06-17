/**
 * 通知系统控制器
 */
const { Op } = require('sequelize');
const { Notification, User, UserCommunity } = require('../models');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const { sendNotification } = require('../utils/notificationHelper');

/**
 * 创建通知
 */
const createNotification = catchAsync(async (req, res) => {
  const { 
    title, 
    content, 
    level = 'normal', 
    target_scope = [], 
    expire_time 
  } = req.body;
  
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证权限
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限发布通知');
  }
  
  // 验证必填字段
  if (!title || !content) {
    throw ApiError.badRequest('标题和内容不能为空');
  }
  
  // 验证紧急通知必须设置过期时间
  if (level === 'urgent' && !expire_time) {
    throw ApiError.badRequest('紧急通知必须设置过期时间');
  }
  
  // 创建通知
  const notification = await Notification.create({
    title,
    content,
    level,
    target_scope: target_scope.length > 0 ? JSON.stringify(target_scope) : null,
    expire_time: expire_time ? new Date(expire_time) : null,
    community_id: communityId,
    created_by: userId,
    status: 'active'
  });
  
  // 发送通知
  try {
    // 确定接收者
    let recipients = [];
    
    if (target_scope.length > 0) {
      // 按楼栋筛选用户
      recipients = await User.findAll({
        include: [{
          model: UserCommunity,
          where: {
            community_id: communityId,
            status: 'approved',
            building: { [Op.in]: target_scope }
          }
        }]
      });
    } else {
      // 发送给社区所有用户
      recipients = await User.findAll({
        include: [{
          model: UserCommunity,
          where: {
            community_id: communityId,
            status: 'approved'
          }
        }]
      });
    }
    
    // 发送通知
    await sendNotification({
      title,
      content,
      level,
      recipients: recipients.map(user => ({
        id: user.id,
        mobile: user.mobile,
        email: user.email
      })),
      community_id: communityId,
      related_id: notification.id,
      related_type: 'notification'
    });
  } catch (error) {
    console.error('发送通知失败:', error);
    // 通知创建成功但发送失败，不影响API返回
  }
  
  res.status(201).json({
    code: 201,
    message: '通知创建成功',
    data: notification
  });
});

/**
 * 获取通知列表
 */
const getNotifications = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    level,
    status = 'active',
    start_date,
    end_date
  } = req.query;
  
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  const isAdmin = ['property_admin', 'system_admin'].includes(req.user.role);
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 构建查询条件
  const where = {
    community_id: communityId
  };
  
  // 筛选条件
  if (level) {
    where.level = level;
  }
  
  if (status) {
    where.status = status;
  }
  
  // 日期筛选
  if (start_date && end_date) {
    where.createdAt = {
      [Op.between]: [new Date(start_date), new Date(end_date)]
    };
  } else if (start_date) {
    where.createdAt = {
      [Op.gte]: new Date(start_date)
    };
  } else if (end_date) {
    where.createdAt = {
      [Op.lte]: new Date(end_date)
    };
  }
  
  // 非管理员需要筛选目标范围
  if (!isAdmin) {
    // 查询用户所在楼栋
    const userCommunity = await UserCommunity.findOne({
      where: {
        user_id: userId,
        community_id: communityId
      }
    });
    
    const userBuilding = userCommunity ? userCommunity.building : null;
    
    // 复杂条件：通知没有指定目标范围 或 用户楼栋在目标范围内
    where[Op.or] = [
      { target_scope: null },
      { target_scope: '' },
      sequelize.literal(`JSON_CONTAINS(target_scope, '"${userBuilding}"')`)
    ];
  }
  
  // 执行查询
  const { count, rows: notifications } = await Notification.findAndCountAll({
    where,
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'username', 'name']
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
  });
  
  res.json({
    code: 200,
    message: '获取通知列表成功',
    data: {
      notifications,
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
 * 获取通知详情
 */
const getNotificationDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  const notification = await Notification.findOne({
    where: {
      id,
      community_id: communityId
    },
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'username', 'name']
    }]
  });
  
  if (!notification) {
    throw ApiError.notFound('通知不存在');
  }
  
  res.json({
    code: 200,
    message: '获取通知详情成功',
    data: notification
  });
});

/**
 * 更新通知状态
 */
const updateNotificationStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证权限
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限执行此操作');
  }
  
  // 验证状态
  if (!['active', 'inactive', 'archived'].includes(status)) {
    throw ApiError.badRequest('无效的状态');
  }
  
  const notification = await Notification.findOne({
    where: {
      id,
      community_id: communityId
    }
  });
  
  if (!notification) {
    throw ApiError.notFound('通知不存在');
  }
  
  // 更新状态
  await notification.update({ status });
  
  res.json({
    code: 200,
    message: '通知状态更新成功',
    data: notification
  });
});

/**
 * 获取用户未读通知数量
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 查询用户所在楼栋
  const userCommunity = await UserCommunity.findOne({
    where: {
      user_id: userId,
      community_id: communityId
    }
  });
  
  const userBuilding = userCommunity ? userCommunity.building : null;
  
  // 查询未读通知数量
  const count = await Notification.count({
    where: {
      community_id: communityId,
      status: 'active',
      [Op.or]: [
        { target_scope: null },
        { target_scope: '' },
        sequelize.literal(`JSON_CONTAINS(target_scope, '"${userBuilding}"')`)
      ],
      createdAt: {
        [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
      }
    }
  });
  
  res.json({
    code: 200,
    message: '获取未读通知数量成功',
    data: { count }
  });
});

module.exports = {
  createNotification,
  getNotifications,
  getNotificationDetail,
  updateNotificationStatus,
  getUnreadCount
}; 