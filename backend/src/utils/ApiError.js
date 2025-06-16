/**
 * API错误类
 * 用于统一处理API错误响应
 */
class ApiError extends Error {
  /**
   * 创建API错误实例
   * @param {String} message 错误消息
   * @param {Number} statusCode HTTP状态码
   * @param {Array|Object} errors 错误详情
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    
    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * 创建400错误(Bad Request)
   * @param {String} message 错误消息
   * @param {Array|Object} errors 错误详情
   * @returns {ApiError} API错误实例
   */
  static badRequest(message = '请求参数错误', errors = null) {
    return new ApiError(message, 400, errors);
  }
  
  /**
   * 创建401错误(Unauthorized)
   * @param {String} message 错误消息
   * @returns {ApiError} API错误实例
   */
  static unauthorized(message = '未授权访问') {
    return new ApiError(message, 401);
  }
  
  /**
   * 创建403错误(Forbidden)
   * @param {String} message 错误消息
   * @returns {ApiError} API错误实例
   */
  static forbidden(message = '禁止访问') {
    return new ApiError(message, 403);
  }
  
  /**
   * 创建404错误(Not Found)
   * @param {String} message 错误消息
   * @returns {ApiError} API错误实例
   */
  static notFound(message = '资源不存在') {
    return new ApiError(message, 404);
  }
  
  /**
   * 创建409错误(Conflict)
   * @param {String} message 错误消息
   * @returns {ApiError} API错误实例
   */
  static conflict(message = '资源冲突') {
    return new ApiError(message, 409);
  }
  
  /**
   * 创建422错误(Unprocessable Entity)
   * @param {String} message 错误消息
   * @param {Array|Object} errors 验证错误详情
   * @returns {ApiError} API错误实例
   */
  static validationError(message = '数据验证失败', errors = null) {
    return new ApiError(message, 422, errors);
  }
  
  /**
   * 创建500错误(Internal Server Error)
   * @param {String} message 错误消息
   * @returns {ApiError} API错误实例
   */
  static internal(message = '服务器内部错误') {
    return new ApiError(message, 500);
  }
}

module.exports = ApiError;