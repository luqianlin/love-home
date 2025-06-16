/**
 * 错误处理中间件
 */
const ApiError = require('../utils/ApiError');

// 开发环境标志
const isDev = process.env.NODE_ENV === 'development';

/**
 * 捕获404错误
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(`未找到 - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * 统一错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 状态码，默认500
  const statusCode = err.statusCode || 500;
  
  // 错误消息
  const message = err.message || '服务器内部错误';
  
  // 错误响应
  const response = {
    code: statusCode,
    message,
    errors: err.errors || null,
    stack: isDev ? err.stack : undefined  // 只在开发环境返回错误堆栈
  };
  
  // 记录错误日志
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}: ${err.message}`);
  if (isDev && err.stack) {
    console.error(err.stack);
  }
  
  // 发送响应
  res.status(statusCode).json(response);
};

/**
 * 异常捕获装饰器
 * 用于包装async控制器方法，自动捕获异常并传递给errorHandler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  catchAsync
};