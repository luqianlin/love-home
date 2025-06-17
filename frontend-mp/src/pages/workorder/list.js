 // 社区工单列表页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    workorders: [],
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 10,
    hasMore: true,
    searchText: '',
    showFilter: false,
    currentFilter: {
      status: 'all',
      type: 'all',
      time: 'all'
    },
    tempFilter: {
      status: 'all',
      type: 'all',
      time: 'all'
    },
    statusText: {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      closed: '已关闭'
    },
    typeText: {
      repair: '报修',
      complaint: '投诉',
      suggestion: '建议',
      consultation: '咨询',
      other: '其他'
    }
  },

  onLoad: function() {
    this.fetchWorkOrders();
  },

  onShow: function() {
    // 如果需要刷新数据（例如从创建页面返回）
    if (app.globalData.refreshWorkOrders) {
      this.refreshList();
      app.globalData.refreshWorkOrders = false;
    }
  },

  // 下拉刷新
  onRefresh: function() {
    this.setData({
      refreshing: true
    });
    this.refreshList();
  },

  // 刷新列表
  refreshList: function() {
    this.setData({
      page: 1,
      hasMore: true,
      workorders: []
    });
    this.fetchWorkOrders().then(() => {
      this.setData({
        refreshing: false
      });
    });
  },

  // 加载更多
  onLoadMore: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      });
      this.fetchWorkOrders(true);
    }
  },

  // 获取工单列表
  fetchWorkOrders: function(isLoadMore = false) {
    if (!isLoadMore) {
      this.setData({
        loading: true
      });
    }

    const { page, pageSize, searchText, currentFilter } = this.data;

    // 构建请求参数
    const params = {
      page,
      limit: pageSize,
      search: searchText
    };

    // 添加筛选条件
    if (currentFilter.status !== 'all') {
      params.status = currentFilter.status;
    }
    if (currentFilter.type !== 'all') {
      params.type = currentFilter.type;
    }
    if (currentFilter.time !== 'all') {
      params.time = currentFilter.time;
    }

    return new Promise((resolve, reject) => {
      api.request({
        url: '/api/workorders',
        method: 'GET',
        data: params,
        success: (res) => {
          if (res.code === 200) {
            const newWorkOrders = res.data.items.map(item => {
              return {
                ...item,
                created_at_formatted: this.formatDate(item.created_at)
              };
            });

            // 更新列表数据
            this.setData({
              workorders: isLoadMore ? [...this.data.workorders, ...newWorkOrders] : newWorkOrders,
              hasMore: newWorkOrders.length === pageSize,
              loading: false
            });
            resolve();
          } else {
            this.setData({
              loading: false
            });
            wx.showToast({
              title: '获取工单列表失败',
              icon: 'none'
            });
            reject();
          }
        },
        fail: (err) => {
          console.error('获取工单列表失败', err);
          this.setData({
            loading: false
          });
          wx.showToast({
            title: '获取工单列表失败',
            icon: 'none'
          });
          reject();
        }
      });
    });
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  // 执行搜索
  onSearch: function() {
    this.refreshList();
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchText: ''
    });
    this.refreshList();
  },

  // 切换筛选面板
  toggleFilter: function() {
    // 打开筛选面板时，将当前筛选条件复制到临时筛选条件
    if (!this.data.showFilter) {
      this.setData({
        tempFilter: { ...this.data.currentFilter }
      });
    }
    
    this.setData({
      showFilter: !this.data.showFilter
    });
  },

  // 筛选条件变更
  onFilterChange: function(e) {
    const { type, value } = e.currentTarget.dataset;
    
    this.setData({
      [`tempFilter.${type}`]: value
    });
  },

  // 重置筛选条件
  resetFilter: function() {
    this.setData({
      tempFilter: {
        status: 'all',
        type: 'all',
        time: 'all'
      }
    });
  },

  // 应用筛选条件
  applyFilter: function() {
    this.setData({
      currentFilter: { ...this.data.tempFilter },
      showFilter: false
    });
    this.refreshList();
  },

  // 跳转到工单详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/src/pages/workorder/detail?id=${id}`
    });
  },

  // 跳转到创建工单
  goToCreate: function() {
    wx.navigateTo({
      url: '/src/pages/workorder/create'
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
      title: '社区工单',
      path: '/src/pages/workorder/list'
    };
  }
}); 