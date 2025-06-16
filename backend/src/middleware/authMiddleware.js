/**
 * 认证中间件
 */
const { verifyToken } = require('../config/jwt');
const { User, Community } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * 验证JWT令牌
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next Express中间件下一步函数
 */
const authenticate = async (req, res, next) => {
  try {
    // 获取Authorization头
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError('未提供认证令牌', 401));
    }
    
    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return next(new ApiError('无效的认证令牌或已过期', 401));
    }
    
    // 查询用户信息
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return next(new ApiError('用户不存在', 401));
    }
    
    if (user.status !== 'active') {
      return next(new ApiError('账户已被禁用', 403));
    }
    
    // 将用户信息添加到req对象
    req.user = user;
    
    // 添加社区过滤条件（如果用户有当前社区）
    if (user.current_community_id) {
      req.communityFilter = { community_id: user.current_community_id };
      
      // 附加社区信息
      const community = await Community.findByPk(user.current_community_id);
      if (community) {
        req.community = community;
      }
    }
    
    next();
  } catch (error) {
    return next(new ApiError('认证过程发生错误', 500));
  }
};

/**
 * 角色验证中间件
 * @param  {...String} roles 允许的角色列表
 * @returns {Function} Express中间件
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('需要认证才能访问', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ApiError('无权限执行此操作', 403));
    }
    
    next();
  };
};

/**
 * 当前社区检查中间件
 * 确保用户选择了当前社区
 */
const requireCommunity = (req, res, next) => {
  if (!req.user?.current_community_id) {
    return next(new ApiError('请先选择社区', 400));
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireCommunity
}; 