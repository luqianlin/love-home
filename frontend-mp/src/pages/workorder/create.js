 // 社区工单创建页
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    formData: {
      title: '',
      content: '',
      location: '',
      contactName: '',
      contactPhone: '',
      images: []
    },
    typeOptions: [
      { value: 'repair', label: '报修' },
      { value: 'complaint', label: '投诉' },
      { value: 'suggestion', label: '建议' },
      { value: 'consultation', label: '咨询' },
      { value: 'other', label: '其他' }
    ],
    typeIndex: 0,
    submitting: false
  },

  onLoad: function() {
    // 如果用户已登录，自动填充联系人信息
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      this.setData({
        'formData.contactName': app.globalData.userInfo.name || '',
        'formData.contactPhone': app.globalData.userInfo.phone || ''
      });
    }
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
           formData.location || 
           formData.images.length > 0;
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

  // 位置输入
  onLocationInput: function(e) {
    this.setData({
      'formData.location': e.detail.value
    });
  },

  // 选择位置
  chooseLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.location': res.name || res.address
        });
      }
    });
  },

  // 内容输入
  onContentInput: function(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  // 选择图片
  chooseImage: function() {
    const { images } = this.data.formData;
    const remainCount = 9 - images.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 检查图片大小
        const validImages = res.tempFiles.filter(file => {
          if (file.size > 5 * 1024 * 1024) {
            wx.showToast({
              title: '图片大小不能超过5MB',
              icon: 'none'
            });
            return false;
          }
          return true;
        });
        
        // 添加到图片列表
        const newImages = validImages.map(file => ({
          tempFilePath: file.path,
          size: file.size
        }));
        
        this.setData({
          'formData.images': [...images, ...newImages]
        });
      }
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.formData.images];
    images.splice(index, 1);
    
    this.setData({
      'formData.images': images
    });
  },

  // 联系人输入
  onContactNameInput: function(e) {
    this.setData({
      'formData.contactName': e.detail.value
    });
  },

  // 联系电话输入
  onContactPhoneInput: function(e) {
    this.setData({
      'formData.contactPhone': e.detail.value
    });
  },

  // 提交表单
  submitForm: function(e) {
    // 检查是否已登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '您需要先登录才能提交工单',
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
    
    // 先上传图片
    this.uploadImages()
      .then(imageUrls => {
        // 提交工单
        return this.submitWorkOrder(imageUrls);
      })
      .then(workOrderId => {
        this.setData({
          submitting: false
        });
        
        // 设置刷新标志
        app.globalData.refreshWorkOrders = true;
        
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 延迟跳转到详情页
        setTimeout(() => {
          wx.redirectTo({
            url: `/src/pages/workorder/detail?id=${workOrderId}`
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
    if (!formData.content.trim() || formData.content.length < 20) {
      wx.showToast({
        title: '内容不能少于20个字',
        icon: 'none'
      });
      return false;
    }
    
    // 验证联系人
    if (!formData.contactName.trim()) {
      wx.showToast({
        title: '请输入联系人',
        icon: 'none'
      });
      return false;
    }
    
    // 验证联系电话
    if (!formData.contactPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return false;
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 上传图片
  uploadImages: function() {
    const { images } = this.data.formData;
    
    if (images.length === 0) {
      return Promise.resolve([]);
    }
    
    const uploadPromises = images.map(image => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.baseUrl}/upload`,
          filePath: image.tempFilePath,
          name: 'file',
          header: api.getHeaders(),
          formData: {
            type: 'workorder_image'
          },
          success: function(res) {
            const data = JSON.parse(res.data);
            if (data.code === 200) {
              resolve(data.data.url);
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

  // 提交工单
  submitWorkOrder: function(imageUrls) {
    const { formData, typeOptions, typeIndex } = this.data;
    
    // 构建请求数据
    const requestData = {
      title: formData.title,
      content: formData.content,
      type: typeOptions[typeIndex].value,
      location: formData.location,
      contact_name: formData.contactName,
      contact_phone: formData.contactPhone,
      images: imageUrls
    };
    
    return new Promise((resolve, reject) => {
      api.request({
        url: '/api/workorders',
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

  // 分享
  onShareAppMessage: function() {
    return {
      title: '创建社区工单',
      path: '/src/pages/workorder/create'
    };
  }
}); 