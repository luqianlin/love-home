/**
 * 认证相关API
 */
import request from '../utils/request';

/**
 * 管理员登录
 * @param {Object} data - 登录信息
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @returns {Promise}
 */
export function login(data) {
  return request({
    url: '/admin/auth/login',
    method: 'post',
    data
  });
}

/**
 * 退出登录
 * @returns {Promise}
 */
export function logout() {
  return request({
    url: '/admin/auth/logout',
    method: 'post'
  });
}

/**
 * 获取当前用户信息
 * @returns {Promise}
 */
export function getUserInfo() {
  return request({
    url: '/admin/auth/me',
    method: 'get'
  });
}

/**
 * 修改密码
 * @param {Object} data - 密码信息
 * @param {string} data.oldPassword - 旧密码
 * @param {string} data.newPassword - 新密码
 * @param {string} data.confirmPassword - 确认新密码
 * @returns {Promise}
 */
export function changePassword(data) {
  return request({
    url: '/admin/auth/change-password',
    method: 'post',
    data
  });
}