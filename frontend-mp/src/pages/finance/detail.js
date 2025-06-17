// 财务报告详情页面
const app = getApp();

Page({
  // 页面的初始数据
  data: {
    // 财务报告ID
    id: null,
    // 财务报告详情
    report: null,
    // 评论列表
    comments: [],
    // 是否正在加载
    loading: true,
    // 错误信息
    error: '',
    // 评论文本
    commentText: '',
    // 回复对象
    replyTo: '',
    // 回复评论ID
    replyCommentId: null,
    // 评论输入框是否聚焦
    commentFocus: false,
    // 类型文本映射
    typeText: {
      'income': '收入',
      'expense': '支出',
      'summary': '汇总'
    }
  },

  // 生命周期函数--监听页面加载
  onLoad: function(options) {
    if (options.id) {
      this.setData({
        id: options.id
      });
      this.loadReportDetail();
      this.loadComments();
    } else {
      this.setData({
        loading: false,
        error: '缺少财务报告ID参数'
      });
    }
  },

  // 加载财务报告详情
  loadReportDetail: function() {
    if (!this.data.id) {
      return;
    }

    this.setData({ loading: true, error: '' });

    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/reports/${this.data.id}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            report: res.data.data,
            loading: false
          });
        } else {
          this.setData({
            error: res.data.message || '获取财务报告详情失败',
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取财务报告详情失败:', err);
        this.setData({
          error: '网络错误，请稍后重试',
          loading: false
        });
      }
    });
  },

  // 加载评论列表
  loadComments: function() {
    if (!this.data.id) {
      return;
    }

    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/reports/${this.data.id}/comments`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            comments: res.data.data.comments || []
          });
        } else {
          console.error('获取评论列表失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('获取评论列表失败:', err);
      }
    });
  },

  // 获取附件图标
  getAttachmentIcon: function(type) {
    const iconMap = {
      'pdf': '/src/assets/icons/pdf.png',
      'doc': '/src/assets/icons/doc.png',
      'docx': '/src/assets/icons/doc.png',
      'xls': '/src/assets/icons/xls.png',
      'xlsx': '/src/assets/icons/xls.png',
      'ppt': '/src/assets/icons/ppt.png',
      'pptx': '/src/assets/icons/ppt.png',
      'jpg': '/src/assets/icons/image.png',
      'jpeg': '/src/assets/icons/image.png',
      'png': '/src/assets/icons/image.png',
      'gif': '/src/assets/icons/image.png',
      'zip': '/src/assets/icons/zip.png',
      'rar': '/src/assets/icons/zip.png',
      'txt': '/src/assets/icons/txt.png',
      'csv': '/src/assets/icons/csv.png'
    };

    return iconMap[type.toLowerCase()] || '/src/assets/icons/file.png';
  },

  // 格式化文件大小
  formatFileSize: function(size) {
    if (size < 1024) {
      return size + 'B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(1) + 'KB';
    } else if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(1) + 'MB';
    } else {
      return (size / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
    }
  },

  // 预览附件
  previewAttachment: function(e) {
    const { url, type } = e.currentTarget.dataset;
    
    // 图片类型直接预览
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif'];
    if (imageTypes.includes(type.toLowerCase())) {
      wx.previewImage({
        urls: [url],
        current: url
      });
      return;
    }
    
    // 其他类型下载后打开
    wx.showLoading({
      title: '正在下载...',
    });
    
    wx.downloadFile({
      url: url,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {
              console.log('打开文档成功');
            },
            fail: (err) => {
              console.error('打开文档失败', err);
              wx.showToast({
                title: '无法打开此类型文件',
                icon: 'none'
              });
            }
          });
        }
      },
      fail: (err) => {
        console.error('下载文件失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '下载文件失败',
          icon: 'none'
        });
      }
    });
  },

  // 评论输入事件
  onCommentInput: function(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 回复评论
  replyComment: function(e) {
    const { id, username } = e.currentTarget.dataset;
    this.setData({
      replyTo: username,
      replyCommentId: id,
      commentFocus: true
    });
  },

  // 点赞评论
  likeComment: function(e) {
    const commentId = e.currentTarget.dataset.id;
    const comments = this.data.comments.map(comment => {
      if (comment.id === commentId) {
        const liked = !comment.liked;
        const likes_count = liked ? (comment.likes_count || 0) + 1 : (comment.likes_count || 1) - 1;
        return { ...comment, liked, likes_count };
      }
      return comment;
    });
    
    this.setData({ comments });
    
    // 调用API更新点赞状态
    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/comments/${commentId}/like`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      fail: (err) => {
        console.error('点赞失败:', err);
        // 恢复原状态
        this.loadComments();
      }
    });
  },

  // 提交评论
  submitComment: function() {
    if (!this.data.commentText.trim()) {
      return;
    }
    
    const data = {
      content: this.data.commentText,
      report_id: this.data.id
    };
    
    // 如果是回复评论
    if (this.data.replyCommentId) {
      data.parent_id = this.data.replyCommentId;
    }
    
    wx.showLoading({
      title: '提交中...',
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/finance/comments`,
      method: 'POST',
      data: data,
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 201 && res.data.success) {
          wx.showToast({
            title: '评论成功',
            icon: 'success'
          });
          
          // 清空输入框
          this.setData({
            commentText: '',
            replyTo: '',
            replyCommentId: null
          });
          
          // 重新加载评论列表
          this.loadComments();
        } else {
          wx.showToast({
            title: res.data.message || '评论失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('评论失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 分享
  onShareAppMessage: function() {
    const title = this.data.report ? this.data.report.title : '财务报告详情';
    return {
      title: title,
      path: `/src/pages/finance/detail?id=${this.data.id}`
    };
  }
});