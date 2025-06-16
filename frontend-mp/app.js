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
    baseUrl: 'http://localhost:3000/api',
    // 线上环境请使用HTTPS地址
    // baseUrl: 'https://api.community.yourdomain.com/api',
  },

  /**
   * 当小程序初始化完成时触发
   */
  onLaunch() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 检查登录状态
    this.checkLoginStatus();
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