const app = getApp();
const { request, get } = require('../../utils/request');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false,
    userInfo: {},
    currentCommunity: {},
    unreadCount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.checkLoginStatus();
    if (this.data.isLogin) {
      this.fetchUserInfo();
      this.fetchCurrentCommunity();
      this.fetchUnreadNotifications();
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    const token = wx.getStorageSync('token');
    const isLogin = !!token;
    this.setData({ isLogin });
  },

  /**
   * 获取用户信息
   */
  fetchUserInfo: function () {
    get('/api/users/profile')
      .then(res => {
        this.setData({
          userInfo: res.data
        });
      })
      .catch(err => {
        console.error('获取用户信息失败', err);
      });
  },

  /**
   * 获取当前社区信息
   */
  fetchCurrentCommunity: function () {
    const currentCommunityId = wx.getStorageSync('currentCommunityId');
    if (currentCommunityId) {
      get(`/api/communities/${currentCommunityId}`)
        .then(res => {
          this.setData({
            currentCommunity: res.data
          });
        })
        .catch(err => {
          console.error('获取社区信息失败', err);
        });
    }
  },

  /**
   * 获取未读通知数量
   */
  fetchUnreadNotifications: function () {
    get('/api/notifications/unread/count')
      .then(res => {
        this.setData({
          unreadCount: res.data.count
        });
      })
      .catch(err => {
        console.error('获取未读通知数量失败', err);
      });
  },

  /**
   * 跳转到登录页面
   */
  goToLogin: function () {
    wx.navigateTo({
      url: '/src/pages/login/index'
    });
  },

  /**
   * 编辑个人资料
   */
  editProfile: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 切换社区
   */
  switchCommunity: function () {
    wx.navigateTo({
      url: '/src/pages/community/select'
    });
  },

  /**
   * 跳转到我的议题页面
   */
  goToMyTopics: function () {
    wx.navigateTo({
      url: '/src/pages/topic/list?type=my'
    });
  },

  /**
   * 跳转到我的工单页面
   */
  goToMyWorkOrders: function () {
    wx.navigateTo({
      url: '/src/pages/workorder/list?type=my'
    });
  },

  /**
   * 跳转到我的通知页面
   */
  goToMyNotifications: function () {
    wx.navigateTo({
      url: '/src/pages/notification/list'
    });
  },

  /**
   * 跳转到设置页面
   */
  goToSettings: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 联系我们
   */
  contactUs: function () {
    wx.showModal({
      title: '联系我们',
      content: '客服电话：400-123-4567\n客服邮箱：support@love-home.com',
      showCancel: false
    });
  },

  /**
   * 关于我们
   */
  aboutUs: function () {
    wx.showModal({
      title: '关于我们',
      content: '智慧社区平台致力于为社区居民提供便捷、透明的社区服务，打造和谐美好的社区生活。',
      showCancel: false
    });
  },

  /**
   * 退出登录
   */
  logout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          // 更新页面状态
          this.setData({
            isLogin: false,
            userInfo: {},
            unreadCount: 0
          });
          
          // 显示退出成功提示
          wx.showToast({
            title: '退出成功',
            icon: 'success'
          });
        }
      }
    });
  }
});