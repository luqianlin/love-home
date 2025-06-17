 // 社区议事厅列表页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    initialLoading: true,
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10,
    topics: [],
    activeFilter: 'all',
    statusText: {
      pending: '待审核',
      voting: '投票中',
      approved: '已通过',
      rejected: '已驳回',
      closed: '已结束'
    },
    mapCenter: {
      latitude: 39.908823,
      longitude: 116.397470
    },
    mapScale: 14,
    markers: []
  },

  onLoad: function() {
    this.fetchTopics();
  },

  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      topics: [],
      hasMore: true
    });
    this.fetchTopics();
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 切换筛选条件
  switchFilter: function(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.activeFilter) return;
    
    this.setData({
      activeFilter: type,
      page: 1,
      topics: [],
      hasMore: true,
      initialLoading: true
    });
    
    this.fetchTopics();
  },

  // 获取议题列表
  fetchTopics: function() {
    const that = this;
    const { page, limit, activeFilter } = this.data;
    
    this.setData({ loading: true });
    
    let params = { page, limit };
    
    // 根据筛选条件添加参数
    if (activeFilter === 'hot') {
      params.sort = 'vote_count';
      params.order = 'desc';
    } else if (activeFilter !== 'all') {
      params.status = activeFilter;
    }
    
    // 添加社区ID
    if (app.globalData.currentCommunityId) {
      params.community_id = app.globalData.currentCommunityId;
    }
    
    api.request({
      url: '/api/topics',
      method: 'GET',
      data: params,
      success: function(res) {
        if (res.code === 200) {
          // 格式化日期
          const topics = res.data.topics.map(item => {
            return {
              ...item,
              created_at_formatted: that.formatDate(item.created_at)
            };
          });
          
          that.setData({
            topics: page === 1 ? topics : that.data.topics.concat(topics),
            hasMore: topics.length === limit,
            initialLoading: false,
            loading: false
          });
          
          wx.stopPullDownRefresh();
        }
      },
      fail: function(err) {
        console.error('获取议题列表失败', err);
        that.setData({
          initialLoading: false,
          loading: false
        });
        wx.stopPullDownRefresh();
        wx.showToast({
          title: '获取议题列表失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载更多
  loadMore: function() {
    if (this.data.loading) return;
    
    this.setData({
      page: this.data.page + 1,
      loading: true
    });
    
    this.fetchTopics();
  },

  // 查看议题详情
  viewTopic: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/src/pages/topic/detail?id=${id}`
    });
  },

  // 创建议题
  createTopic: function() {
    // 检查是否已登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '您需要先登录才能发起议题',
        confirmText: '去登录',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/src/pages/login/index'
            });
          }
        }
      });
      return;
    }
    
    // 检查是否已选择社区
    if (!app.globalData.currentCommunityId) {
      wx.showModal({
        title: '提示',
        content: '您需要先选择社区才能发起议题',
        confirmText: '去选择',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/src/pages/community/select'
            });
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: '/src/pages/topic/create'
    });
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // 一小时内
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    
    // 一天内
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
    
    // 一周内
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
    
    // 超过一周
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '社区议事厅 - 共建和谐美好社区',
      path: '/src/pages/topic/list'
    };
  }
}); 