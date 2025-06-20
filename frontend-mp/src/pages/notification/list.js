// 通知列表页面
const app = getApp();

Page({
  // 页面的初始数据
  data: {
    // 社区ID
    communityId: '',
    // 搜索文本
    searchText: '',
    // 当前分类
    currentCategory: 'all',
    // 通知列表
    notifications: [],
    // 是否有未读通知
    hasUnread: false,
    // 是否正在加载
    loading: false,
    // 是否正在刷新
    refreshing: false,
    // 是否还有更多数据
    hasMore: true,
    // 当前页码
    page: 1,
    // 每页数量
    pageSize: 10
  },

  // 生命周期函数--监听页面加载
  onLoad: function(options) {
    // 获取当前社区ID
    const communityId = app.globalData.currentCommunity ? app.globalData.currentCommunity.id : '';
    this.setData({ communityId });
    
    // 加载通知列表
    this.loadNotifications();
  },

  // 生命周期函数--监听页面显示
  onShow: function() {
    // 检查社区是否变更，如果变更则重新加载数据
    const currentCommunityId = app.globalData.currentCommunity ? app.globalData.currentCommunity.id : '';
    if (currentCommunityId !== this.data.communityId) {
      this.setData({
        communityId: currentCommunityId,
        notifications: [],
        page: 1,
        hasMore: true
      });
      this.loadNotifications();
    }
    
    // 更新未读通知数量
    this.updateUnreadBadge();
  },

  // 加载通知列表
  loadNotifications: function() {
    if (!this.data.communityId || this.data.loading || !this.data.hasMore) {
      return;
    }

    this.setData({ loading: true });

    // 构建请求参数
    const params = {
      community_id: this.data.communityId,
      page: this.data.page,
      page_size: this.data.pageSize,
      search: this.data.searchText
    };

    // 添加分类过滤
    if (this.data.currentCategory !== 'all') {
      params.category = this.data.currentCategory;
    }

    // 调用API获取通知列表
    wx.request({
      url: `${app.globalData.apiBaseUrl}/notifications`,
      method: 'GET',
      data: params,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const newNotifications = res.data.data.notifications;
          
          // 更新数据
          this.setData({
            notifications: this.data.page === 1 ? newNotifications : [...this.data.notifications, ...newNotifications],
            hasMore: newNotifications.length === this.data.pageSize,
            page: this.data.page + 1,
            hasUnread: this.checkHasUnread([...this.data.notifications, ...newNotifications])
          });
        } else {
          wx.showToast({
            title: res.data.message || '获取通知失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取通知失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          loading: false,
          refreshing: false
        });
      }
    });
  },

  // 检查是否有未读通知
  checkHasUnread: function(notifications) {
    return notifications.some(notification => !notification.read);
  },

  // 更新未读通知数量徽标
  updateUnreadBadge: function() {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/notifications/unread-count`,
      method: 'GET',
      data: {
        community_id: this.data.communityId
      },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const unreadCount = res.data.data.count;
          
          // 设置tabBar徽标
          if (unreadCount > 0) {
            wx.setTabBarBadge({
              index: 3, // "我的"页面的索引
              text: unreadCount > 99 ? '99+' : unreadCount.toString()
            });
          } else {
            wx.removeTabBarBadge({
              index: 3
            });
          }
        }
      }
    });
  },

  // 获取分类图标
  getCategoryIcon: function(category) {
    const iconMap = {
      'urgent': '/src/assets/icons/repair.png',
      'community': '/src/assets/icons/community.png',
      'property': '/src/assets/icons/home.png',
      'activity': '/src/assets/icons/topic.png'
    };

    return iconMap[category] || '/src/assets/icons/notification-menu.png';
  },

  // 搜索输入事件
  onSearchInput: function(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  // 搜索确认事件
  onSearch: function() {
    this.setData({
      page: 1,
      notifications: [],
      hasMore: true
    });
    this.loadNotifications();
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchText: '',
      page: 1,
      notifications: [],
      hasMore: true
    });
    this.loadNotifications();
  },

  // 切换分类
  switchCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    if (category !== this.data.currentCategory) {
      this.setData({
        currentCategory: category,
        page: 1,
        notifications: [],
        hasMore: true
      });
      this.loadNotifications();
    }
  },

  // 下拉刷新
  onRefresh: function() {
    this.setData({
      refreshing: true,
      page: 1,
      notifications: [],
      hasMore: true
    });
    this.loadNotifications();
  },

  // 加载更多
  onLoadMore: function() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadNotifications();
    }
  },

  // 跳转到通知详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    
    // 更新通知为已读状态
    const notifications = this.data.notifications.map(notification => {
      if (notification.id === id && !notification.read) {
        return { ...notification, read: true };
      }
      return notification;
    });
    
    this.setData({ 
      notifications,
      hasUnread: this.checkHasUnread(notifications)
    });
    
    // 调用API更新已读状态
    wx.request({
      url: `${app.globalData.apiBaseUrl}/notifications/${id}/read`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      }
    });
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/src/pages/notification/detail?id=${id}`
    });
  },

  // 全部标记为已读
  markAllAsRead: function() {
    wx.showLoading({
      title: '处理中...',
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/notifications/read-all`,
      method: 'POST',
      data: {
        community_id: this.data.communityId
      },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          // 更新本地通知状态
          const notifications = this.data.notifications.map(notification => {
            return { ...notification, read: true };
          });
          
          this.setData({
            notifications,
            hasUnread: false
          });
          
          // 更新未读通知数量徽标
          this.updateUnreadBadge();
          
          wx.showToast({
            title: '已全部标记为已读',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('标记已读失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});
