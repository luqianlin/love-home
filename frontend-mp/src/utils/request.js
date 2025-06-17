/**
 * 网络请求工具类
 */

// 不在文件顶部直接获取应用实例，而是在函数内部获取
// const app = getApp();

/**
 * 检查服务器连接状态
 * @param {Function} successCallback - 连接成功回调
 * @param {Function} failCallback - 连接失败回调
 */
const checkServerStatus = (successCallback, failCallback) => {
  // 获取app实例前增加小延迟，确保小程序已完全初始化
  setTimeout(() => {
    const app = getApp(); // 在函数内部获取应用实例
    
    // 检查app是否已经初始化
    if (!app || !app.globalData || !app.globalData.baseUrl) {
      console.error('应用实例未初始化或baseUrl未定义');
      typeof failCallback === 'function' && failCallback({
        errMsg: '应用实例未初始化'
      });
      return;
    }
    
    // 定义多个健康检查端点进行尝试
    const healthEndpoints = [
      '/health',
      '/api/health'
    ];
    
    let currentEndpointIndex = 0;
    const maxRetries = 3; // 每个端点最大重试次数
    let retryCount = 0;
    
    const tryNextEndpoint = () => {
      if (currentEndpointIndex >= healthEndpoints.length) {
        // 所有端点都尝试失败
        console.error('所有健康检查端点连接失败');
        typeof failCallback === 'function' && failCallback({
          errMsg: '服务器连接失败，请稍后再试'
        });
        return;
      }
      
      const endpoint = healthEndpoints[currentEndpointIndex];
      const fullUrl = `${app.globalData.baseUrl}${endpoint}`;
      console.log(`尝试连接健康检查端点 (${retryCount+1}/${maxRetries}): ${fullUrl}`);
      
      // 使用健康检查端点
      wx.request({
        url: fullUrl,
        method: 'GET',
        timeout: 15000, // 增加超时时间，避免网络波动影响
        enableHttp2: true,
        enableCache: false,
        sslVerify: false, // 禁用SSL验证，解决自签名证书问题
        enableChunked: false, // 禁用分块传输，解决某些服务器兼容性问题
        enableQuic: false, // 禁用QUIC，使用标准HTTPS
        forceCellularNetwork: false, // 避免强制使用蜂窝网络
        disableCache: true, // 禁用缓存
        enableHttpDNS: false, // 禁用HTTP DNS
        header: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('健康检查成功:', res.data);
            // 记录成功的端点以便将来使用
            app.globalData.healthEndpoint = endpoint;
            typeof successCallback === 'function' && successCallback(res);
          } else {
            console.error('健康检查返回非成功状态码:', res.statusCode, res.data);
            retryOrNext();
          }
        },
        fail: (err) => {
          // 提供更详细的错误诊断信息
          console.error(`健康检查请求失败 (${endpoint}):`, {
            errMsg: err.errMsg,
            errCode: err.errCode || 'N/A',
            endpoint: endpoint,
            fullUrl: fullUrl,
            retryCount: retryCount
          });
          
          // 对特定错误类型提供更详细的日志
          if (err.errMsg && err.errMsg.includes('CONNECTION_CLOSED')) {
            console.warn('检测到连接意外关闭，可能是服务器中断请求或网络问题');
            
            // CONNECTION_CLOSED 专用策略
            if (retryCount === 0) {
              // 第一次遇到此错误，直接切换端点而不是重试同一端点
              console.log("首次CONNECTION_CLOSED错误，直接切换到下一个端点");
              retryCount = maxRetries; // 强制切换到下一个端点
              retryOrNext();
            } else {
              // 增加延迟时间，给服务器更多恢复时间
              setTimeout(() => {
                retryOrNext();
              }, 3000); // 延长重试间隔到3秒
            }
          } else {
            retryOrNext();
          }
        },
        complete: (res) => {
          // 添加完成后的详细信息记录
          console.log(`健康检查请求完成 (${endpoint}):`, {
            statusCode: res.statusCode || 'N/A',
            duration: Date.now() - new Date().getTime()
          });
        }
      });
    };
    
    const retryOrNext = () => {
      retryCount++;
      if (retryCount < maxRetries) {
        // 重试当前端点
        console.log(`将在1秒后重试端点 ${healthEndpoints[currentEndpointIndex]}`);
        setTimeout(tryNextEndpoint, 1000);
      } else {
        // 尝试下一个端点
        retryCount = 0;
        currentEndpointIndex++;
        console.log(`切换到下一个健康检查端点: ${currentEndpointIndex < healthEndpoints.length ? healthEndpoints[currentEndpointIndex] : '无更多端点'}`);
        setTimeout(tryNextEndpoint, 1000);
      }
    };
    
    // 开始尝试连接
    tryNextEndpoint();
  }, 1000); // 增加延迟，确保应用初始化完成
};

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
  const app = getApp(); // 在函数内部获取应用实例
  
  // 检查app是否已经初始化
  if (!app || !app.globalData || !app.globalData.baseUrl) {
    console.error('应用实例未初始化或baseUrl未定义');
    return Promise.reject({
      errMsg: '应用实例未初始化'
    });
  }
  
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
      timeout: options.timeout || 30000, // 设置30秒超时
      sslVerify: false, // 禁用证书验证，解决自签名证书问题
      enableHttp2: true, // 启用HTTP/2
      enableCache: options.enableCache !== false, // 默认启用缓存
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
        // 请求失败，提供更详细的错误信息
        console.error('请求失败:', err);
        let errorMsg = '网络异常，请稍后再试';
        
        // 检查具体错误类型
        if (err.errMsg) {
          if (err.errMsg.includes('request:fail socket')) {
            errorMsg = '服务器连接失败，请检查网络';
          } else if (err.errMsg.includes('ssl')) {
            errorMsg = 'SSL证书验证失败';
          } else if (err.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请稍后再试';
          } else if (err.errMsg.includes('CONNECTION_CLOSED')) {
            errorMsg = '服务器连接中断，请稍后再试';
          }
        }
        
        wx.showToast({
          title: errorMsg,
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
  // 检查服务器状态
  checkServerStatus,
  
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