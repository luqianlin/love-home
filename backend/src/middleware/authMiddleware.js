/**
 * 认证与授权中间件
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorMiddleware');

/**
 * 验证JWT令牌的中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const authMiddleware = (req, res, next) => {
  try {
    // 获取请求头中的授权令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(4003, '未提供有效的授权令牌');
    }

    // 提取并验证令牌
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'community_secret_key');

    // 将用户信息添加到请求对象
    req.user = decoded;

    // 添加当前社区过滤条件
    if (req.user.current_community_id) {
      req.communityFilter = `community_id = ${req.user.current_community_id}`;
    }

    next();
  } catch (error) {
    // 令牌验证失败
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new ApiError(4003, '令牌无效或已过期'));
    } else {
      next(error);
    }
  }
};

/**
 * 验证用户是否为物业管理员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const isPropertyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'property_admin') {
    next();
  } else {
    next(new ApiError(4003, '需要物业管理员权限'));
  }
};

/**
 * 验证用户是否为系统管理员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const isSystemAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'system_admin') {
    next();
  } else {
    next(new ApiError(4003, '需要系统管理员权限'));
  }
};

module.exports = {
  authMiddleware,
  isPropertyAdmin,
  isSystemAdmin
}; 