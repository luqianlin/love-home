/**
 * 全局错误处理中间件
 */
const winston = require('winston');

// 配置日志记录器
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/**
 * 自定义API错误类
 */
class ApiError extends Error {
  constructor(code, message, errors = []) {
    super(message);
    this.code = code;
    this.errors = errors;
  }
}

/**
 * 错误处理中间件
 */
const errorMiddleware = (err, req, res, next) => {
  // 默认错误代码和消息
  let code = err.code || 500;
  let message = err.message || '服务器内部错误';
  let errors = err.errors || [];

  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user ? req.user.id : 'anonymous',
    ip: req.ip
  });

  // 处理常见错误类型
  if (err.name === 'ValidationError') {
    code = 4001; // 表单验证失败
    message = '表单验证失败';
    errors = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message
    }));
  } else if (err.name === 'UnauthorizedError') {
    code = 4003; // 权限不足
    message = '权限不足或登录已过期';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    code = 5002; // 文件上传错误
    message = '文件大小超出限制';
  }

  // 返回标准化错误响应
  res.status(code < 1000 ? code : 500).json({
    code,
    message,
    errors: errors.length > 0 ? errors : undefined
  });
};

// 导出
module.exports = {
  errorMiddleware,
  ApiError
}; 