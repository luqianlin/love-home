/**
 * 财务透明中心控制器
 */
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { FinanceReport, User, UserCommunity } = require('../models');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorMiddleware');

/**
 * 上传财务报表
 */
const uploadFinanceReport = catchAsync(async (req, res) => {
  const { 
    period, 
    report_type, 
    note 
  } = req.body;
  
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证权限
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限上传财务报表');
  }
  
  // 验证必填字段
  if (!period || !report_type || !req.file) {
    throw ApiError.badRequest('缺少必填字段');
  }
  
  // 验证文件类型
  if (req.file.mimetype !== 'text/csv') {
    throw ApiError.badRequest('只支持CSV格式文件');
  }
  
  // 构建存储路径
  const uploadDir = path.join(__dirname, '../../../public/uploads/finance', communityId.toString());
  
  // 确保目录存在
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // 构建文件名
  const fileName = `${period.replace('-', '')}_${report_type}_${Date.now()}.csv`;
  const filePath = path.join(uploadDir, fileName);
  
  // 移动文件
  fs.writeFileSync(filePath, req.file.buffer);
  
  // 相对路径
  const relativePath = `/uploads/finance/${communityId}/${fileName}`;
  
  // 创建财务报表记录
  const report = await FinanceReport.create({
    period: new Date(`${period}-01`),
    report_type,
    csv_path: relativePath,
    note,
    community_id: communityId,
    uploaded_by: userId
  });
  
  res.status(201).json({
    code: 201,
    message: '财务报表上传成功',
    data: report
  });
});

/**
 * 获取财务报表列表
 */
const getFinanceReports = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    report_type,
    year,
    month
  } = req.query;
  
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 构建查询条件
  const where = {
    community_id: communityId
  };
  
  // 筛选条件
  if (report_type) {
    where.report_type = report_type;
  }
  
  // 按年月筛选
  if (year && month) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    where.period = {
      [Op.gte]: startDate,
      [Op.lt]: endDate
    };
  } else if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);
    
    where.period = {
      [Op.gte]: startDate,
      [Op.lt]: endDate
    };
  }
  
  // 执行查询
  const { count, rows: reports } = await FinanceReport.findAndCountAll({
    where,
    include: [{
      model: User,
      as: 'uploader',
      attributes: ['id', 'username', 'name']
    }],
    order: [['period', 'DESC']],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
  });
  
  res.json({
    code: 200,
    message: '获取财务报表列表成功',
    data: {
      reports,
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
 * 获取财务报表详情
 */
const getFinanceReportDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  const report = await FinanceReport.findOne({
    where: {
      id,
      community_id: communityId
    },
    include: [{
      model: User,
      as: 'uploader',
      attributes: ['id', 'username', 'name']
    }]
  });
  
  if (!report) {
    throw ApiError.notFound('财务报表不存在');
  }
  
  res.json({
    code: 200,
    message: '获取财务报表详情成功',
    data: report
  });
});

/**
 * 添加财务报表评论
 */
const addFinanceReportComment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证必填字段
  if (!content) {
    throw ApiError.badRequest('评论内容不能为空');
  }
  
  const report = await FinanceReport.findOne({
    where: {
      id,
      community_id: communityId
    }
  });
  
  if (!report) {
    throw ApiError.notFound('财务报表不存在');
  }
  
  // 获取现有评论
  let comments = [];
  if (report.comments) {
    try {
      comments = JSON.parse(report.comments);
    } catch (error) {
      comments = [];
    }
  }
  
  // 添加新评论
  comments.push({
    id: Date.now(),
    user_id: userId,
    username: req.user.username,
    name: req.user.name,
    content,
    created_at: new Date().toISOString()
  });
  
  // 更新报表评论
  await report.update({
    comments: JSON.stringify(comments)
  });
  
  res.json({
    code: 200,
    message: '评论添加成功',
    data: {
      comments
    }
  });
});

/**
 * 删除财务报表评论
 */
const deleteFinanceReportComment = catchAsync(async (req, res) => {
  const { id, commentId } = req.params;
  const userId = req.user.id;
  const communityId = req.user.current_community_id;
  const isAdmin = ['property_admin', 'system_admin'].includes(req.user.role);
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  const report = await FinanceReport.findOne({
    where: {
      id,
      community_id: communityId
    }
  });
  
  if (!report) {
    throw ApiError.notFound('财务报表不存在');
  }
  
  // 获取现有评论
  let comments = [];
  if (report.comments) {
    try {
      comments = JSON.parse(report.comments);
    } catch (error) {
      comments = [];
    }
  }
  
  // 找到评论
  const commentIndex = comments.findIndex(c => c.id === parseInt(commentId, 10));
  
  if (commentIndex === -1) {
    throw ApiError.notFound('评论不存在');
  }
  
  // 验证权限（只有评论作者或管理员可以删除）
  if (comments[commentIndex].user_id !== userId && !isAdmin) {
    throw ApiError.forbidden('您没有权限删除此评论');
  }
  
  // 删除评论
  comments.splice(commentIndex, 1);
  
  // 更新报表评论
  await report.update({
    comments: JSON.stringify(comments)
  });
  
  res.json({
    code: 200,
    message: '评论删除成功',
    data: {
      comments
    }
  });
});

/**
 * 删除财务报表
 */
const deleteFinanceReport = catchAsync(async (req, res) => {
  const { id } = req.params;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 验证权限
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限删除财务报表');
  }
  
  const report = await FinanceReport.findOne({
    where: {
      id,
      community_id: communityId
    }
  });
  
  if (!report) {
    throw ApiError.notFound('财务报表不存在');
  }
  
  // 删除文件
  try {
    const filePath = path.join(__dirname, '../../../public', report.csv_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('删除文件失败:', error);
  }
  
  // 删除记录
  await report.destroy();
  
  res.json({
    code: 200,
    message: '财务报表删除成功'
  });
});

/**
 * 获取财务统计数据
 */
const getFinanceStats = catchAsync(async (req, res) => {
  const { year } = req.query;
  const communityId = req.user.current_community_id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('请先选择社区');
  }
  
  // 默认使用当前年份
  const targetYear = year || new Date().getFullYear().toString();
  
  // 构建查询条件
  const startDate = new Date(`${targetYear}-01-01`);
  const endDate = new Date(`${parseInt(targetYear) + 1}-01-01`);
  
  const where = {
    community_id: communityId,
    period: {
      [Op.gte]: startDate,
      [Op.lt]: endDate
    }
  };
  
  // 按月份统计报表数量
  const reports = await FinanceReport.findAll({
    where,
    attributes: [
      [sequelize.fn('MONTH', sequelize.col('period')), 'month'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      'report_type'
    ],
    group: ['month', 'report_type'],
    order: [[sequelize.literal('month'), 'ASC']]
  });
  
  // 格式化结果
  const monthlyStats = Array(12).fill(0).map((_, index) => ({
    month: index + 1,
    物业收支: 0,
    公共收益: 0,
    维修基金: 0
  }));
  
  reports.forEach(report => {
    const month = report.getDataValue('month');
    const count = report.getDataValue('count');
    const type = report.report_type;
    
    if (month >= 1 && month <= 12) {
      monthlyStats[month - 1][type] = count;
    }
  });
  
  res.json({
    code: 200,
    message: '获取财务统计数据成功',
    data: {
      year: targetYear,
      monthlyStats
    }
  });
});

module.exports = {
  uploadFinanceReport,
  getFinanceReports,
  getFinanceReportDetail,
  addFinanceReportComment,
  deleteFinanceReportComment,
  deleteFinanceReport,
  getFinanceStats
}; 