// 财务报告列表页面
const app = getApp();

Page({
  // 页面的初始数据
  data: {
    // 社区ID
    communityId: '',
    // 搜索文本
    searchText: '',
    // 是否显示筛选面板
    showFilter: false,
    // 当前筛选条件
    currentFilter: {
      year: 'all',
      type: 'all',
      quarter: 'all'
    },
    // 应用的筛选条件
    appliedFilter: {
      year: 'all',
      type: 'all',
      quarter: 'all'
    },
    // 财务报告列表
    reports: [],
    // 财务统计数据
    summary: null,
    // 是否正在加载
    loading: false,
    // 是否正在刷新
    refreshing: false,
    // 是否还有更多数据
    hasMore: true,
    // 当前页码
    page: 1,
    // 每页数量
    pageSize: 10,
    // 类型文本映射
    typeText: {
      'income': '收入',
      'expense': '支出',
      'summary': '汇总'
    }
  },

  // 生命周期函数--监听页面加载
  onLoad: function(options) {
    // 获取当前社区ID
    const communityId = app.globalData.currentCommunity ? app.globalData.currentCommunity.id : '';
    this.setData({ communityId });
    
    // 加载财务报告列表
    this.loadFinanceReports();
    
    // 加载财务统计数据
    this.loadFinanceSummary();
  },

  // 生命周期函数--监听页面显示
  onShow: function() {
    // 检查社区是否变更，如果变更则重新加载数据
    const currentCommunityId = app.globalData.currentCommunity ? app.globalData.currentCommunity.id : '';
    if (currentCommunityId !== this.data.communityId) {
      this.setData({
        communityId: currentCommunityId,
        reports: [],
        page: 1,
        hasMore: true
      });
      this.loadFinanceReports();
      this.loadFinanceSummary();
    }
  },

  // 加载财务报告列表
  loadFinanceReports: function() {
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

    // 添加筛选条件
    if (this.data.appliedFilter.year !== 'all') {
      params.year = this.data.appliedFilter.year;
    }
    if (this.data.appliedFilter.type !== 'all') {
      params.type = this.data.appliedFilter.type;
    }
    if (this.data.appliedFilter.quarter !== 'all') {
      params.quarter = this.data.appliedFilter.quarter;
    }

    // 调用API获取财务报告列表
    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/reports`,
      method: 'GET',
      data: params,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const newReports = res.data.data.reports;
          
          // 更新数据
          this.setData({
            reports: this.data.page === 1 ? newReports : [...this.data.reports, ...newReports],
            hasMore: newReports.length === this.data.pageSize,
            page: this.data.page + 1
          });
        } else {
          wx.showToast({
            title: res.data.message || '获取财务报告失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取财务报告失败:', err);
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

  // 加载财务统计数据
  loadFinanceSummary: function() {
    if (!this.data.communityId) {
      return;
    }

    // 构建请求参数
    const params = {
      community_id: this.data.communityId
    };

    // 添加筛选条件
    if (this.data.appliedFilter.year !== 'all') {
      params.year = this.data.appliedFilter.year;
    }
    if (this.data.appliedFilter.quarter !== 'all') {
      params.quarter = this.data.appliedFilter.quarter;
    }

    // 调用API获取财务统计数据
    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/summary`,
      method: 'GET',
      data: params,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            summary: res.data.data
          });
        } else {
          console.error('获取财务统计数据失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('获取财务统计数据失败:', err);
      }
    });
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
      reports: [],
      hasMore: true
    });
    this.loadFinanceReports();
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchText: '',
      page: 1,
      reports: [],
      hasMore: true
    });
    this.loadFinanceReports();
  },

  // 切换筛选面板
  toggleFilter: function() {
    this.setData({
      showFilter: !this.data.showFilter
    });
  },

  // 筛选条件变更
  onFilterChange: function(e) {
    const { type, value } = e.currentTarget.dataset;
    const currentFilter = { ...this.data.currentFilter };
    currentFilter[type] = value;
    this.setData({ currentFilter });
  },

  // 重置筛选条件
  resetFilter: function() {
    this.setData({
      currentFilter: {
        year: 'all',
        type: 'all',
        quarter: 'all'
      }
    });
  },

  // 应用筛选条件
  applyFilter: function() {
    this.setData({
      appliedFilter: { ...this.data.currentFilter },
      showFilter: false,
      page: 1,
      reports: [],
      hasMore: true
    });
    this.loadFinanceReports();
    this.loadFinanceSummary();
  },

  // 下拉刷新
  onRefresh: function() {
    this.setData({
      refreshing: true,
      page: 1,
      reports: [],
      hasMore: true
    });
    this.loadFinanceReports();
    this.loadFinanceSummary();
  },

  // 加载更多
  onLoadMore: function() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadFinanceReports();
    }
  },

  // 跳转到财务报告详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/src/pages/finance/detail?id=${id}`
    });
  },

  // 下载财务报告
  downloadReports: function() {
    wx.showLoading({
      title: '准备下载...',
    });

    // 构建请求参数
    const params = {
      community_id: this.data.communityId,
      format: 'csv'
    };

    // 添加筛选条件
    if (this.data.appliedFilter.year !== 'all') {
      params.year = this.data.appliedFilter.year;
    }
    if (this.data.appliedFilter.type !== 'all') {
      params.type = this.data.appliedFilter.type;
    }
    if (this.data.appliedFilter.quarter !== 'all') {
      params.quarter = this.data.appliedFilter.quarter;
    }
    if (this.data.searchText) {
      params.search = this.data.searchText;
    }

    // 调用API下载财务报告
    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/reports/download`,
      method: 'GET',
      data: params,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          const fs = wx.getFileSystemManager();
          const fileName = `finance_reports_${new Date().getTime()}.csv`;
          const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
          
          fs.writeFile({
            filePath: filePath,
            data: res.data,
            encoding: 'binary',
            success: () => {
              wx.hideLoading();
              wx.showModal({
                title: '下载成功',
                content: '财务报告已下载，是否打开文件？',
                success: (result) => {
                  if (result.confirm) {
                    wx.openDocument({
                      filePath: filePath,
                      showMenu: true,
                      success: () => {
                        console.log('打开文档成功');
                      },
                      fail: (err) => {
                        console.error('打开文档失败', err);
                        wx.showToast({
                          title: '打开文件失败',
                          icon: 'none'
                        });
                      }
                    });
                  }
                }
              });
            },
            fail: (err) => {
              console.error('保存文件失败', err);
              wx.hideLoading();
              wx.showToast({
                title: '保存文件失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('下载财务报告失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
}); 