// 社区议题创建页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    formData: {
      title: '',
      content: '',
      attachments: [],
      needVote: false,
      voteDeadline: '',
      voteOptions: ['', '']  // 默认两个空选项
    },
    typeOptions: [
      { value: 'suggestion', label: '建议' },
      { value: 'complaint', label: '投诉' },
      { value: 'question', label: '咨询' },
      { value: 'proposal', label: '提案' },
      { value: 'other', label: '其他' }
    ],
    typeIndex: 0,
    minDate: '',
    maxDate: '',
    submitting: false
  },

  onLoad: function() {
    // 设置日期选择器的最小和最大日期
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1);
    
    this.setData({
      minDate,
      maxDate: maxDate.toISOString().split('T')[0]
    });
  },

  // 返回上一页
  goBack: function() {
    // 如果有未保存的数据，提示用户
    if (this.hasUnsavedChanges()) {
      wx.showModal({
        title: '提示',
        content: '您有未保存的内容，确定要放弃吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  // 检查是否有未保存的更改
  hasUnsavedChanges: function() {
    const { formData } = this.data;
    return formData.title || 
           formData.content || 
           formData.attachments.length > 0 || 
           formData.needVote || 
           (formData.needVote && formData.voteOptions.some(opt => opt.trim() !== ''));
  },

  // 标题输入
  onTitleInput: function(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  // 类型选择
  onTypeChange: function(e) {
    this.setData({
      typeIndex: e.detail.value
    });
  },

  // 内容输入
  onContentInput: function(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  // 添加附件
  addAttachment: function() {
    const that = this;
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择', '选择文件'],
      success: function(res) {
        if (res.tapIndex === 0) {
          // 拍照
          that.chooseImage('camera');
        } else if (res.tapIndex === 1) {
          // 从相册选择
          that.chooseImage('album');
        } else if (res.tapIndex === 2) {
          // 选择文件
          that.chooseMessageFile();
        }
      }
    });
  },

  // 选择图片
  chooseImage: function(sourceType) {
    const that = this;
    wx.chooseImage({
      count: 1,
      sourceType: [sourceType],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        const fileSize = res.tempFiles[0].size;
        
        // 检查文件大小
        if (fileSize > 10 * 1024 * 1024) {
          wx.showToast({
            title: '文件大小不能超过10MB',
            icon: 'none'
          });
          return;
        }
        
        // 获取文件名
        const fileName = tempFilePath.substring(tempFilePath.lastIndexOf('/') + 1);
        
        // 添加到附件列表
        const attachments = that.data.formData.attachments.concat({
          name: fileName,
          tempFilePath: tempFilePath,
          size: fileSize,
          type: 'image/jpeg'
        });
        
        that.setData({
          'formData.attachments': attachments
        });
      }
    });
  },

  // 选择文件
  chooseMessageFile: function() {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function(res) {
        const tempFile = res.tempFiles[0];
        
        // 检查文件大小
        if (tempFile.size > 10 * 1024 * 1024) {
          wx.showToast({
            title: '文件大小不能超过10MB',
            icon: 'none'
          });
          return;
        }
        
        // 添加到附件列表
        const attachments = that.data.formData.attachments.concat({
          name: tempFile.name,
          tempFilePath: tempFile.path,
          size: tempFile.size,
          type: that.getFileType(tempFile.name)
        });
        
        that.setData({
          'formData.attachments': attachments
        });
      }
    });
  },

  // 删除附件
  deleteAttachment: function(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.formData.attachments.filter((_, i) => i !== index);
    
    this.setData({
      'formData.attachments': attachments
    });
  },

  // 获取文件类型
  getFileType: function(fileName) {
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
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

  // 切换投票
  onVoteToggle: function(e) {
    this.setData({
      'formData.needVote': e.detail.value
    });
  },

  // 日期选择
  onDateChange: function(e) {
    this.setData({
      'formData.voteDeadline': e.detail.value
    });
  },

  // 投票选项输入
  onVoteOptionInput: function(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    const voteOptions = [...this.data.formData.voteOptions];
    voteOptions[index] = value;
    
    this.setData({
      'formData.voteOptions': voteOptions
    });
  },

  // 添加投票选项
  addVoteOption: function() {
    const voteOptions = [...this.data.formData.voteOptions, ''];
    
    this.setData({
      'formData.voteOptions': voteOptions
    });
  },

  // 删除投票选项
  deleteVoteOption: function(e) {
    const index = e.currentTarget.dataset.index;
    const voteOptions = this.data.formData.voteOptions.filter((_, i) => i !== index);
    
    this.setData({
      'formData.voteOptions': voteOptions
    });
  },

  // 提交表单
  submitForm: function(e) {
    // 检查是否已登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '您需要先登录才能发布议题',
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
    
    // 表单验证
    if (!this.validateForm()) {
      return;
    }
    
    this.setData({
      submitting: true
    });
    
    // 先上传附件
    this.uploadAttachments()
      .then(attachmentIds => {
        // 提交议题
        return this.submitTopic(attachmentIds);
      })
      .then(topicId => {
        this.setData({
          submitting: false
        });
        
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 延迟跳转到详情页
        setTimeout(() => {
          wx.redirectTo({
            url: `/src/pages/topic/detail?id=${topicId}`
          });
        }, 1500);
      })
      .catch(error => {
        console.error('提交失败', error);
        this.setData({
          submitting: false
        });
        
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      });
  },

  // 表单验证
  validateForm: function() {
    const { formData, typeOptions, typeIndex } = this.data;
    
    // 验证标题
    if (!formData.title.trim() || formData.title.length < 5) {
      wx.showToast({
        title: '标题不能少于5个字',
        icon: 'none'
      });
      return false;
    }
    
    // 验证内容
    if (!formData.content.trim() || formData.content.length < 50) {
      wx.showToast({
        title: '内容不能少于50个字',
        icon: 'none'
      });
      return false;
    }
    
    // 如果需要投票，验证投票选项
    if (formData.needVote) {
      // 验证截止日期
      if (!formData.voteDeadline) {
        wx.showToast({
          title: '请选择投票截止时间',
          icon: 'none'
        });
        return false;
      }
      
      // 验证投票选项
      const validOptions = formData.voteOptions.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        wx.showToast({
          title: '至少需要2个有效的投票选项',
          icon: 'none'
        });
        return false;
      }
      
      // 检查是否有重复选项
      const uniqueOptions = new Set(validOptions);
      if (uniqueOptions.size !== validOptions.length) {
        wx.showToast({
          title: '投票选项不能重复',
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },

  // 上传附件
  uploadAttachments: function() {
    const { attachments } = this.data.formData;
    
    if (attachments.length === 0) {
      return Promise.resolve([]);
    }
    
    const uploadPromises = attachments.map(attachment => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${api.baseUrl}/api/upload`,
          filePath: attachment.tempFilePath,
          name: 'file',
          header: api.getHeaders(),
          formData: {
            type: 'topic_attachment'
          },
          success: function(res) {
            const data = JSON.parse(res.data);
            if (data.code === 200) {
              resolve(data.data.id);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          },
          fail: function(err) {
            reject(err);
          }
        });
      });
    });
    
    return Promise.all(uploadPromises);
  },

  // 提交议题
  submitTopic: function(attachmentIds) {
    const { formData, typeOptions, typeIndex } = this.data;
    
    // 构建请求数据
    const requestData = {
      title: formData.title,
      content: formData.content,
      type: typeOptions[typeIndex].value,
      attachment_ids: attachmentIds
    };
    
    // 如果需要投票，添加投票选项
    if (formData.needVote) {
      requestData.vote_options = formData.voteOptions.filter(opt => opt.trim() !== '');
      requestData.vote_deadline = formData.voteDeadline;
    }
    
    return new Promise((resolve, reject) => {
      api.request({
        url: '/api/topics',
        method: 'POST',
        data: requestData,
        success: function(res) {
          if (res.code === 200) {
            resolve(res.data.id);
          } else {
            reject(new Error(res.message || '提交失败'));
          }
        },
        fail: function(err) {
          reject(err);
        }
      });
    });
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '发起社区议题',
      path: '/src/pages/topic/create'
    };
  }
}); 