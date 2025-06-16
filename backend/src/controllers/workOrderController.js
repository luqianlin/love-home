/**
 * 工单管理控制器
 */
const { Op } = require('sequelize');
const { WorkOrder, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const { sendNotification } = require('../utils/notificationHelper');

/**
 * 创建工单
 */
const createWorkOrder = catchAsync(async (req, res) => {
  const { 
    type, 
    description, 
    images, 
    contact_info, 
    location, 
    address, 
    urgency = '普通' 
  } = req.body;
  
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证位置信息
  if (!location || !location.coordinates || location.coordinates.length !== 2) {
    throw ApiError.badRequest('位置信息格式不正确');
  }
  
  // 创建工单
  const workOrder = await WorkOrder.create({
    type,
    description,
    images,
    contact_info,
    location: {
      type: 'Point',
      coordinates: [location.coordinates[0], location.coordinates[1]]
    },
    address,
    urgency,
    user_id: userId,
    community_id: communityId,
    status: 'pending'
  });
  
  // 发送通知给物业管理员
  try {
    await sendNotification({
      title: `新工单提醒: ${workOrder.order_no}`,
      content: `类型: ${type}, 紧急程度: ${urgency}`,
      target_role: 'property_admin',
      community_id: communityId,
      related_id: workOrder.id,
      related_type: 'work_order'
    });
  } catch (error) {
    console.error('发送工单通知失败:', error);
  }
  
  res.status(201).json({
    code: 201,
    message: '工单创建成功',
    data: workOrder
  });
});

/**
 * 获取工单列表
 */
const getWorkOrders = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    type, 
    urgency,
    sort = 'createdAt',
    order = 'DESC',
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
  
  // 如果不是管理员，只能查看自己的工单
  if (!isAdmin) {
    where.user_id = userId;
  }
  
  // 筛选条件
  if (status) {
    where.status = status;
  }
  
  if (type) {
    where.type = type;
  }
  
  if (urgency) {
    where.urgency = urgency;
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
  
  // 执行查询
  const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'name', 'mobile']
      },
      {
        model: User,
        as: 'handler',
        attributes: ['id', 'username', 'name']
      }
    ],
    order: [[sort, order]],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
  });
  
  res.json({
    code: 200,
    message: '获取工单列表成功',
    data: {
      workOrders,
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
 * 获取工单详情
 */
const getWorkOrderDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  const isAdmin = ['property_admin', 'system_admin'].includes(req.user.role);
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 构建查询条件
  const where = {
    id,
    community_id: communityId
  };
  
  // 如果不是管理员，只能查看自己的工单
  if (!isAdmin) {
    where.user_id = userId;
  }
  
  // 查询工单
  const workOrder = await WorkOrder.findOne({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'name', 'mobile']
      },
      {
        model: User,
        as: 'handler',
        attributes: ['id', 'username', 'name']
      }
    ]
  });
  
  if (!workOrder) {
    throw ApiError.notFound('工单不存在或您没有权限查看');
  }
  
  res.json({
    code: 200,
    message: '获取工单详情成功',
    data: workOrder
  });
});

/**
 * 更新工单状态
 */
const updateWorkOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, remark } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证状态
  if (!['pending', 'processing', 'completed'].includes(status)) {
    throw ApiError.badRequest('无效的状态');
  }
  
  // 验证权限 (只有管理员可以更新状态)
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限执行此操作');
  }
  
  // 查询工单
  const workOrder = await WorkOrder.findOne({
    where: {
      id,
      community_id: communityId
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'name']
      }
    ]
  });
  
  if (!workOrder) {
    throw ApiError.notFound('工单不存在');
  }
  
  // 更新工单状态
  const updateData = { status, remark };
  
  // 如果状态变更为处理中，记录处理人和处理时间
  if (status === 'processing' && workOrder.status !== 'processing') {
    updateData.handler_id = userId;
    updateData.handled_at = new Date();
  }
  
  // 如果状态变更为已完成，记录完成时间
  if (status === 'completed' && workOrder.status !== 'completed') {
    updateData.completed_at = new Date();
  }
  
  await workOrder.update(updateData);
  
  // 发送通知给工单创建者
  try {
    let message;
    if (status === 'processing') {
      message = '您的工单已受理，正在处理中';
    } else if (status === 'completed') {
      message = '您的工单已处理完成';
    }
    
    if (message) {
      await sendNotification({
        title: `工单状态更新: ${workOrder.order_no}`,
        content: message,
        target_user_id: workOrder.user_id,
        community_id: communityId,
        related_id: workOrder.id,
        related_type: 'work_order'
      });
    }
  } catch (error) {
    console.error('发送工单状态通知失败:', error);
  }
  
  res.json({
    code: 200,
    message: '工单状态更新成功',
    data: {
      id: workOrder.id,
      status,
      remark
    }
  });
});

/**
 * 获取工单统计信息
 */
const getWorkOrderStats = catchAsync(async (req, res) => {
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证权限 (只有管理员可以查看统计)
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限执行此操作');
  }
  
  // 获取各状态工单数量
  const statusStats = await WorkOrder.findAll({
    where: { community_id: communityId },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // 获取各类型工单数量
  const typeStats = await WorkOrder.findAll({
    where: { community_id: communityId },
    attributes: [
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['type']
  });
  
  // 获取紧急工单数量
  const urgentCount = await WorkOrder.count({
    where: { 
      community_id: communityId,
      urgency: '紧急',
      status: { [Op.ne]: 'completed' }
    }
  });
  
  // 获取超时工单数量 (创建时间超过48小时且状态为pending)
  const timeoutDate = new Date();
  timeoutDate.setHours(timeoutDate.getHours() - 48);
  
  const timeoutCount = await WorkOrder.count({
    where: {
      community_id: communityId,
      status: 'pending',
      createdAt: { [Op.lt]: timeoutDate }
    }
  });
  
  // 格式化统计数据
  const formattedStatusStats = {};
  statusStats.forEach(stat => {
    formattedStatusStats[stat.status] = parseInt(stat.getDataValue('count'), 10);
  });
  
  const formattedTypeStats = {};
  typeStats.forEach(stat => {
    formattedTypeStats[stat.type] = parseInt(stat.getDataValue('count'), 10);
  });
  
  res.json({
    code: 200,
    message: '获取工单统计信息成功',
    data: {
      statusStats: formattedStatusStats,
      typeStats: formattedTypeStats,
      urgentCount,
      timeoutCount,
      totalCount: await WorkOrder.count({ where: { community_id: communityId } })
    }
  });
});

module.exports = {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderDetail,
  updateWorkOrderStatus,
  getWorkOrderStats
}; 