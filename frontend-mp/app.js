/**
 * 智慧社区平台小程序入口文件
 */

// 全局应用实例
App({
  // 全局数据
  globalData: {
    userInfo: null,
    token: '',
    currentCommunity: null,
    // 配置API地址（只使用合法域名，符合微信小程序规范）
    apiUrls: [
      'https://lovehome.xin/api',  // 使用正式域名
      'https://lovehome.xin'       // 备用地址，不带/api前缀
    ],
    // 当前使用的API地址索引
    currentApiUrlIndex: 0,
    // 实际使用的地址
    baseUrl: 'https://lovehome.xin',
    // 网络状态
    networkAvailable: true,
    networkType: 'unknown',
    needRefreshAfterNetworkRestore: false,
    // 服务器连接状态
    serverConnected: false,
    // 成功连接的健康检查端点
    healthEndpoint: '/api/health',
    // 系统信息
    systemInfo: null
  },

  /**
   * 当小程序初始化完成时触发
   */
  onLaunch() {
    console.log('App onLaunch - 小程序初始化');
    
    // 初始化全局变量
    this.connectionRetryTimer = null;
    // 获取系统信息（使用新API替代废弃的getSystemInfoSync）
    try {
      // 获取基础信息
      const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
      // 获取设备信息
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
      // 获取窗口信息
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
      
      // 合并系统信息
      this.globalData.systemInfo = {
        ...appBaseInfo,
        ...deviceInfo,
        ...windowInfo
      };
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
    
    // 监听网络状态变化（先设置网络监听）
    this.listenNetworkStatus();
    
    // 先检查登录状态
    this.checkLoginStatus();
    
    // 使用setTimeout延迟检查服务器连接，确保App实例已完全初始化
    setTimeout(() => {
      console.log('正在检查服务器连接...');
      this.checkServerConnection();
      
      // 如果第一次连接失败，设置定时任务尝试重新连接
      if (!this.globalData.serverConnected) {
        this.connectionRetryTimer = setInterval(() => {
          // 如果已连接成功，清除定时器
          if (this.globalData.serverConnected) {
            clearInterval(this.connectionRetryTimer);
            return;
          }
          console.log('尝试重新连接服务器...');
          this.checkServerConnection();
        }, 15000); // 每15秒尝试重连一次
      }
    }, 2000); // 增加延迟时间，确保应用完全初始化
  },
  
  /**
   * 检查服务器连接状态
   */
  checkServerConnection() {
    console.log('正在检查服务器连接...');
    
    // 导入请求工具
    const util = require('./src/utils/request.js');
    
    // 检查服务器状态
    util.checkServerStatus(
      (res) => {
        console.log('服务器连接正常', res);
        this.globalData.serverConnected = true;
      },
      (err) => {
        console.error('服务器连接异常:', err);
        this.globalData.serverConnected = false;
        
        // 显示错误提示
        wx.showModal({
          title: '连接提示',
          content: '连接到服务器失败，请检查网络或稍后再试。',
          showCancel: false
        });
      }
    );
  },
  
  /**
   * 切换API地址 - 已不需要，保留接口兼容性
   */
  switchApiUrl() {
    console.log('服务器连接失败，请检查网络或稍后再试');
    
    // 显示错误提示
    wx.showModal({
      title: '连接提示',
      content: '连接到服务器失败，请检查网络或稍后再试。',
      showCancel: false
    });
  },
  
  /**
   * 监听网络状态变化
   */
  listenNetworkStatus() {
    wx.onNetworkStatusChange(res => {
      this.globalData.networkAvailable = res.isConnected;
      this.globalData.networkType = res.networkType;
      
      // 网络恢复时尝试重新加载数据
      if (res.isConnected && this.globalData.needRefreshAfterNetworkRestore) {
        this.globalData.needRefreshAfterNetworkRestore = false;
        // 发出网络恢复通知
        wx.showToast({
          title: '网络已恢复',
          icon: 'success'
        });
      }
      
      // 网络断开时提醒用户
      if (!res.isConnected) {
        this.globalData.needRefreshAfterNetworkRestore = true;
        wx.showToast({
          title: '网络连接已断开',
          icon: 'none'
        });
      }
    });
    
    // 获取当前网络状态
    wx.getNetworkType({
      success: res => {
        this.globalData.networkAvailable = res.networkType !== 'none';
        this.globalData.networkType = res.networkType;
      }
    });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const currentCommunity = wx.getStorageSync('currentCommunity');
    
    if (token) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.currentCommunity = currentCommunity;
      
      // 验证令牌是否有效
      this.verifyToken();
    }
  },

  /**
   * 验证令牌有效性
   */
  verifyToken() {
    wx.request({
      url: `${this.globalData.baseUrl}/users/verify-token`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${this.globalData.token}`
      },
      success: (res) => {
        if (res.statusCode !== 200) {
          // 令牌无效，清除登录状态
          this.logout();
        }
      },
      fail: () => {
        // 请求失败，可能是网络问题，暂时保留登录状态
      }
    });
  },

  /**
   * 登录方法
   * @param {Object} userInfo - 用户信息
   * @param {String} token - 身份令牌
   * @param {Object} community - 当前社区信息
   */
  login(userInfo, token, community) {
    // 保存到全局数据
    this.globalData.userInfo = userInfo;
    this.globalData.token = token;
    this.globalData.currentCommunity = community;
    
    // 保存到本地存储
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('token', token);
    wx.setStorageSync('currentCommunity', community);
  },

  /**
   * 登出方法
   */
  logout() {
    // 清除全局数据
    this.globalData.userInfo = null;
    this.globalData.token = '';
    this.globalData.currentCommunity = null;
    
    // 清除本地存储
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('currentCommunity');
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/src/pages/login/index'
    });
  },

  /**
   * 当小程序从后台进入前台显示时触发
   */
  onShow() {
    // 添加延迟确保应用实例完全初始化
    setTimeout(() => {
      // 确保globalData已初始化
      if (this.globalData) {
        // 如果网络可用但服务器连接状态为false，尝试重新连接
        if (this.globalData.networkAvailable && !this.globalData.serverConnected) {
          this.checkServerConnection();
        }
      }
    }, 1000); // 增加1秒延迟确保应用实例已初始化
  },
  
  /**
   * 当小程序进入后台时触发
   */
  onHide() {
    // 清除定时器
    if (this.connectionRetryTimer) {
      clearInterval(this.connectionRetryTimer);
      this.connectionRetryTimer = null;
    }
  },
  
  /**
   * 切换当前社区
   * @param {Object} community - 社区信息
   */
  switchCommunity(community) {
    if (!community || !community.id) return;
    
    this.globalData.currentCommunity = community;
    wx.setStorageSync('currentCommunity', community);
    
    // 调用API更新用户当前社区
    if (this.globalData.token) {
      wx.request({
        url: `${this.globalData.baseUrl}/users/switch-community`,
        method: 'POST',
        data: {
          community_id: community.id
        },
        header: {
          'Authorization': `Bearer ${this.globalData.token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            wx.showToast({
              title: '切换小区成功',
              icon: 'success'
            });
          }
        }
      });
    }
  }
}); 