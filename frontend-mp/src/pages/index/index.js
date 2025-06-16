/**
 * 首页逻辑
 */
const api = require('../../utils/request.js');

// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    currentCommunity: null,
    notifications: [],
    topics: [],
    workOrders: [],
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 检查用户是否登录
    if (app.globalData.token) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    }
    
    // 检查当前社区
    if (app.globalData.currentCommunity) {
      this.setData({
        currentCommunity: app.globalData.currentCommunity
      });
      this.loadHomeData();
    } else {
      this.checkLocation();
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
    if (app.globalData.currentCommunity) {
      this.setData({
        currentCommunity: app.globalData.currentCommunity
      });
      this.loadHomeData();
    }
  },

  /**
   * 检查位置并匹配小区
   */
  checkLocation() {
    // 请求获取用户位置权限
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        // 调用后端API匹配小区
        api.get('/communities/nearby', { lat: latitude, lng: longitude })
          .then(response => {
            if (response.matched) {
              // 找到匹配的小区
              app.switchCommunity(response.matched);
              this.setData({
                currentCommunity: response.matched,
                loading: false
              });
              this.loadHomeData();
            } else {
              // 未找到匹配小区，跳转到小区选择页
              this.setData({ loading: false });
              wx.navigateTo({
                url: '/src/pages/community/select'
              });
            }
          })
          .catch(() => {
            this.setData({ loading: false });
          });
      },
      fail: () => {
        this.setData({ loading: false });
        // 用户拒绝位置权限，跳转到小区选择页
        wx.showToast({
          title: '获取位置失败，请手动选择小区',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/src/pages/community/select'
          });
        }, 2000);
      }
    });
  },

  /**
   * 加载首页数据
   */
  loadHomeData() {
    this.setData({ loading: true });
    
    // 并行请求多个接口数据
    Promise.all([
      this.fetchNotifications(),
      this.fetchTopics(),
      this.fetchWorkOrders()
    ])
      .finally(() => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      });
  },

  /**
   * 获取通知列表
   */
  fetchNotifications() {
    return api.get('/notifications', { limit: 3 })
      .then(res => {
        this.setData({ notifications: res.data || [] });
      })
      .catch(() => {
        this.setData({ notifications: [] });
      });
  },

  /**
   * 获取议题列表
   */
  fetchTopics() {
    return api.get('/topics', { limit: 3 })
      .then(res => {
        this.setData({ topics: res.data || [] });
      })
      .catch(() => {
        this.setData({ topics: [] });
      });
  },

  /**
   * 获取工单列表
   */
  fetchWorkOrders() {
    return api.get('/work-orders', { limit: 3 })
      .then(res => {
        this.setData({ workOrders: res.data || [] });
      })
      .catch(() => {
        this.setData({ workOrders: [] });
      });
  },

  /**
   * 切换小区
   */
  switchCommunity() {
    wx.navigateTo({
      url: '/src/pages/community/select'
    });
  },

  /**
   * 查看通知详情
   */
  viewNotification(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/src/pages/notification/detail?id=${id}`
    });
  },

  /**
   * 查看议题详情
   */
  viewTopic(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/src/pages/topic/detail?id=${id}`
    });
  },

  /**
   * 查看工单详情
   */
  viewWorkOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/src/pages/workorder/detail?id=${id}`
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '智慧社区平台',
      path: '/src/pages/index/index'
    };
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadHomeData();
  }
}); 