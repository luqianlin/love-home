 // 社区议题详情页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    loading: true,
    topic: null,
    comments: [],
    commentText: '',
    userVote: null,
    countdown: '',
    countdownTimer: null,
    statusText: {
      pending: '待审核',
      voting: '投票中',
      approved: '已通过',
      rejected: '已驳回',
      closed: '已结束'
    }
  },

  onLoad: function(options) {
    // 获取议题ID
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
    
    this.topicId = id;
    this.fetchTopicDetail();
    this.fetchComments();
  },

  onUnload: function() {
    // 清除倒计时定时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  // 获取议题详情
  fetchTopicDetail: function() {
    const that = this;
    
    api.request({
      url: `/api/topics/${this.topicId}`,
      method: 'GET',
      success: function(res) {
        if (res.code === 200) {
          const topic = res.data;
          
          // 格式化日期
          topic.created_at_formatted = that.formatDate(topic.created_at);
          
          // 处理内容，转为HTML
          topic.content_html = that.formatContent(topic.content);
          
          that.setData({
            topic,
            loading: false
          });
          
          // 获取用户投票
          that.fetchUserVote();
          
          // 如果是投票中状态，设置倒计时
          if (topic.status === 'voting' && topic.vote_deadline) {
            that.startCountdown(topic.vote_deadline);
          }
          
          // 增加浏览量
          that.increaseViewCount();
        }
      },
      fail: function(err) {
        console.error('获取议题详情失败', err);
        that.setData({
          loading: false
        });
        wx.showToast({
          title: '获取议题详情失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取评论列表
  fetchComments: function() {
    const that = this;
    
    api.request({
      url: `/api/topics/${this.topicId}/comments`,
      method: 'GET',
      success: function(res) {
        if (res.code === 200) {
          // 格式化日期
          const comments = res.data.map(item => {
            return {
              ...item,
              created_at_formatted: that.formatDate(item.created_at)
            };
          });
          
          that.setData({
            comments
          });
        }
      },
      fail: function(err) {
        console.error('获取评论失败', err);
      }
    });
  },

  // 获取用户投票
  fetchUserVote: function() {
    // 检查是否已登录
    if (!app || !app.globalData || !app.globalData.token) return;
    
    const that = this;
    
    api.request({
      url: `/api/topics/${this.topicId}/vote`,
      method: 'GET',
      success: function(res) {
        if (res.code === 200 && res.data) {
          that.setData({
            userVote: res.data.vote_option_id
          });
        }
      }
    });
  },

  // 增加浏览量
  increaseViewCount: function() {
    api.request({
      url: `/api/topics/${this.topicId}/view`,
      method: 'POST'
    });
  },

  // 处理投票
  handleVote: function(e) {
    const optionId = e.currentTarget.dataset.id;
    
    // 检查是否已投票
    if (this.data.userVote) {
      wx.showToast({
        title: '您已经投过票了',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否已登录
    if (!app || !app.globalData || !app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '您需要先登录才能投票',
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
    
    const that = this;
    
    wx.showLoading({
      title: '投票中...',
    });
    
    api.request({
      url: `/api/topics/${this.topicId}/vote`,
      method: 'POST',
      data: {
        vote_option_id: optionId
      },
      success: function(res) {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '投票成功',
            icon: 'success'
          });
          
          // 更新投票状态
          that.setData({
            userVote: optionId
          });
          
          // 刷新议题详情
          that.fetchTopicDetail();
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('投票失败', err);
        wx.showToast({
          title: '投票失败',
          icon: 'none'
        });
      }
    });
  },

  // 评论输入
  onCommentInput: function(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 提交评论
  submitComment: function() {
    const { commentText } = this.data;
    if (!commentText.trim()) {
      return;
    }
    
    // 检查是否已登录
    if (!app || !app.globalData || !app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '您需要先登录才能评论',
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
    
    const that = this;
    
    wx.showLoading({
      title: '发送中...',
    });
    
    api.request({
      url: `/api/topics/${this.topicId}/comments`,
      method: 'POST',
      data: {
        content: commentText
      },
      success: function(res) {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '评论成功',
            icon: 'success'
          });
          
          // 清空评论框
          that.setData({
            commentText: ''
          });
          
          // 刷新评论列表
          that.fetchComments();
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('评论失败', err);
        wx.showToast({
          title: '评论失败',
          icon: 'none'
        });
      }
    });
  },

  // 预览文件
  previewFile: function(e) {
    const { url, type } = e.currentTarget.dataset;
    
    // 图片类型直接预览
    if (type.startsWith('image/')) {
      wx.previewImage({
        urls: [url]
      });
      return;
    }
    
    // 其他类型打开网页
    wx.showLoading({
      title: '打开中...',
    });
    
    wx.downloadFile({
      url: url,
      success: function(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fail: function() {
              wx.showToast({
                title: '无法打开此类型文件',
                icon: 'none'
              });
            }
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({
          title: '文件下载失败',
          icon: 'none'
        });
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },

  // 刷新议题
  refreshTopic: function() {
    this.setData({
      loading: true
    });
    this.fetchTopicDetail();
    this.fetchComments();
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

  // 格式化内容
  formatContent: function(content) {
    if (!content) return '';
    
    // 简单处理换行符
    return content.replace(/\n/g, '<br>');
  },

  // 获取文件图标
  getFileIcon: function(fileType) {
    if (fileType.startsWith('image/')) {
      return '/src/assets/icons/image.png';
    } else if (fileType.includes('pdf')) {
      return '/src/assets/icons/pdf.png';
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return '/src/assets/icons/word.png';
    } else if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls')) {
      return '/src/assets/icons/excel.png';
    } else {
      return '/src/assets/icons/file.png';
    }
  },

  // 格式化文件大小
  formatFileSize: function(size) {
    if (!size) return '未知大小';
    
    const kb = size / 1024;
    if (kb < 1024) {
      return kb.toFixed(1) + ' KB';
    } else {
      return (kb / 1024).toFixed(1) + ' MB';
    }
  },

  // 获取投票百分比
  getVotePercentage: function(count) {
    const total = this.getTotalVotes();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  },

  // 获取总投票数
  getTotalVotes: function() {
    const { topic } = this.data;
    if (!topic || !topic.vote_options) return 0;
    
    return topic.vote_options.reduce((sum, option) => sum + (option.count || 0), 0);
  },

  // 获取用户投票选项
  getUserVoteOption: function() {
    const { topic, userVote } = this.data;
    if (!topic || !topic.vote_options || !userVote) return '';
    
    const option = topic.vote_options.find(opt => opt.id === userVote);
    return option ? option.content : '';
  },

  // 开始倒计时
  startCountdown: function(deadline) {
    const that = this;
    const deadlineDate = new Date(deadline);
    
    // 清除之前的定时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    
    // 更新倒计时
    const updateCountdown = function() {
      const now = new Date();
      const diff = deadlineDate - now;
      
      if (diff <= 0) {
        // 倒计时结束
        clearInterval(that.data.countdownTimer);
        that.setData({
          countdown: '已结束'
        });
        // 刷新议题详情
        that.fetchTopicDetail();
        return;
      }
      
      // 计算剩余时间
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let countdownText = '';
      if (days > 0) {
        countdownText = `剩余 ${days} 天 ${hours} 小时`;
      } else if (hours > 0) {
        countdownText = `剩余 ${hours} 小时 ${minutes} 分钟`;
      } else if (minutes > 0) {
        countdownText = `剩余 ${minutes} 分钟 ${seconds} 秒`;
      } else {
        countdownText = `剩余 ${seconds} 秒`;
      }
      
      that.setData({
        countdown: countdownText
      });
    };
    
    // 立即执行一次
    updateCountdown();
    
    // 设置定时器
    const timer = setInterval(updateCountdown, 1000);
    this.setData({
      countdownTimer: timer
    });
  },

  // 分享
  onShareAppMessage: function() {
    const { topic } = this.data;
    return {
      title: topic ? topic.title : '社区议事厅',
      path: `/src/pages/topic/detail?id=${this.topicId}`
    };
  }
}); 