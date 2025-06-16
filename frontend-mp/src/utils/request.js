/**
 * 网络请求工具类
 */

// 获取应用实例
const app = getApp();

/**
 * 封装请求方法
 * @param {Object} options - 请求参数
 * @param {String} options.url - 请求地址
 * @param {String} options.method - 请求方法
 * @param {Object} options.data - 请求数据
 * @param {Boolean} options.auth - 是否需要授权
 * @param {Function} options.success - 成功回调
 * @param {Function} options.fail - 失败回调
 * @param {Function} options.complete - 完成回调
 */
const request = (options) => {
  // 默认参数
  const defaults = {
    method: 'GET',
    auth: true,
    loading: true
  };

  // 合并参数
  options = Object.assign({}, defaults, options);

  // 构建请求URL
  let url = options.url;
  if (!url.startsWith('http')) {
    url = `${app.globalData.baseUrl}${url}`;
  }

  // 构建请求头
  const header = {
    'Content-Type': 'application/json'
  };

  // 添加授权令牌
  if (options.auth && app.globalData.token) {
    header.Authorization = `Bearer ${app.globalData.token}`;
  }

  // 显示加载提示
  if (options.loading) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
  }

  // 发送请求
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method,
      data: options.data,
      header,
      success: (res) => {
        // 请求成功，处理响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 成功响应
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // 未授权，跳转到登录页
          wx.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          });
          // 清除登录状态
          setTimeout(() => {
            app.logout();
          }, 1500);
          reject(res);
        } else {
          // 其他错误响应
          const errMsg = (res.data && res.data.message) || '请求失败';
          wx.showToast({
            title: errMsg,
            icon: 'none',
            duration: 2000
          });
          reject(res);
        }
      },
      fail: (err) => {
        // 请求失败
        wx.showToast({
          title: '网络异常，请稍后再试',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      },
      complete: () => {
        // 隐藏加载提示
        if (options.loading) {
          wx.hideLoading();
        }
      }
    });
  });
};

// 导出请求方法
module.exports = {
  // 基础请求方法
  request,

  // GET请求
  get: (url, data, options = {}) => {
    return request({
      url,
      data,
      method: 'GET',
      ...options
    });
  },

  // POST请求
  post: (url, data, options = {}) => {
    return request({
      url,
      data,
      method: 'POST',
      ...options
    });
  },

  // PUT请求
  put: (url, data, options = {}) => {
    return request({
      url,
      data,
      method: 'PUT',
      ...options
    });
  },

  // PATCH请求
  patch: (url, data, options = {}) => {
    return request({
      url,
      data,
      method: 'PATCH',
      ...options
    });
  },

  // DELETE请求
  delete: (url, data, options = {}) => {
    return request({
      url,
      data,
      method: 'DELETE',
      ...options
    });
  }
};