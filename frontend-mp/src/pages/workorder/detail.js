// 社区工单详情页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    workorder: null,
    records: [],
    loading: true,
    ratingValue: 0,
    ratingComment: '',
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

  onLoad: function(options) {
    // 获取工单ID
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.workorderId = id;
    this.fetchWorkOrderDetail();
  },

  // 获取工单详情
  fetchWorkOrderDetail: function() {
    const that = this;
    
    api.request({
      url: `/api/workorders/${this.workorderId}`,
      method: 'GET',
      success: function(res) {
        if (res.code === 200) {
          const workorder = res.data;
          
          // 格式化日期
          workorder.created_at_formatted = that.formatDate(workorder.created_at);
          
          if (workorder.processing_time) {
            workorder.processing_time_formatted = that.formatDate(workorder.processing_time);
          }
          
          if (workorder.completed_time) {
            workorder.completed_time_formatted = that.formatDate(workorder.completed_time);
          }
          
          if (workorder.closed_time) {
            workorder.closed_time_formatted = that.formatDate(workorder.closed_time);
          }
          
          if (workorder.rating_time) {
            workorder.rating_time_formatted = that.formatDate(workorder.rating_time);
          }
          
          that.setData({
            workorder,
            loading: false
          });
          
          // 获取处理记录
          that.fetchWorkOrderRecords();
        }
      },
      fail: function(err) {
        console.error('获取工单详情失败', err);
        that.setData({
          loading: false
        });
        wx.showToast({
          title: '获取工单详情失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取工单处理记录
  fetchWorkOrderRecords: function() {
    const that = this;
    
    api.request({
      url: `/api/workorders/${this.workorderId}/records`,
      method: 'GET',
      success: function(res) {
        if (res.code === 200) {
          // 格式化日期
          const records = res.data.map(item => {
            return {
              ...item,
              created_at_formatted: that.formatDate(item.created_at)
            };
          });
          
          that.setData({
            records
          });
        }
      },
      fail: function(err) {
        console.error('获取工单处理记录失败', err);
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },

  // 刷新工单
  refreshWorkOrder: function() {
    this.setData({
      loading: true
    });
    this.fetchWorkOrderDetail();
  },

  // 预览图片
  previewImage: function(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.workorder;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 预览处理记录图片
  previewRecordImage: function(e) {
    const { recordIndex, imageIndex } = e.currentTarget.dataset;
    const record = this.data.records[recordIndex];
    
    wx.previewImage({
      current: record.images[imageIndex],
      urls: record.images
    });
  },

  // 设置评分
  setRating: function(e) {
    const { value } = e.currentTarget.dataset;
    
    this.setData({
      ratingValue: value
    });
  },

  // 评价内容输入
  onCommentInput: function(e) {
    this.setData({
      ratingComment: e.detail.value
    });
  },

  // 提交评价
  submitRating: function() {
    const { ratingValue, ratingComment } = this.data;
    
    if (ratingValue === 0) {
      wx.showToast({
        title: '请选择评分',
        icon: 'none'
      });
      return;
    }
    
    const that = this;
    
    wx.showLoading({
      title: '提交中...',
    });
    
    api.request({
      url: `/api/workorders/${this.workorderId}/rating`,
      method: 'POST',
      data: {
        rating: ratingValue,
        comment: ratingComment
      },
      success: function(res) {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '评价成功',
            icon: 'success'
          });
          
          // 刷新工单详情
          that.refreshWorkOrder();
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('评价失败', err);
        wx.showToast({
          title: '评价失败',
          icon: 'none'
        });
      }
    });
  },

  // 取消工单
  cancelWorkOrder: function() {
    const that = this;
    
    wx.showModal({
      title: '提示',
      content: '确定要取消该工单吗？',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中...',
          });
          
          api.request({
            url: `/api/workorders/${that.workorderId}/cancel`,
            method: 'POST',
            success: function(res) {
              wx.hideLoading();
              if (res.code === 200) {
                wx.showToast({
                  title: '工单已取消',
                  icon: 'success'
                });
                
                // 刷新工单详情
                that.refreshWorkOrder();
              }
            },
            fail: function(err) {
              wx.hideLoading();
              console.error('取消工单失败', err);
              wx.showToast({
                title: '取消工单失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 关闭工单
  closeWorkOrder: function() {
    const that = this;
    
    wx.showModal({
      title: '提示',
      content: '确定要关闭该工单吗？',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '关闭中...',
          });
          
          api.request({
            url: `/api/workorders/${that.workorderId}/close`,
            method: 'POST',
            success: function(res) {
              wx.hideLoading();
              if (res.code === 200) {
                wx.showToast({
                  title: '工单已关闭',
                  icon: 'success'
                });
                
                // 刷新工单详情
                that.refreshWorkOrder();
              }
            },
            fail: function(err) {
              wx.hideLoading();
              console.error('关闭工单失败', err);
              wx.showToast({
                title: '关闭工单失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 联系客服
  contactService: function() {
    wx.makePhoneCall({
      phoneNumber: app.globalData.servicePhone || '400-123-4567',
      fail: function() {
        wx.showToast({
          title: '拨打电话失败',
          icon: 'none'
        });
      }
    });
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  // 分享
  onShareAppMessage: function() {
    const { workorder } = this.data;
    return {
      title: workorder ? `工单：${workorder.title}` : '工单详情',
      path: `/src/pages/workorder/detail?id=${this.workorderId}`
    };
  }
}); 