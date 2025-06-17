const app = getApp();
const { request, post } = require('../../utils/request');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    phone: '',
    code: '',
    codeBtnText: '获取验证码',
    codeBtnDisabled: false,
    loginBtnDisabled: true,
    countdown: 60,
    timer: null,
    agreeProtocol: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 如果已经登录，直接返回上一页
    const token = wx.getStorageSync('token');
    if (token) {
      wx.navigateBack();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  /**
   * 手机号输入事件
   */
  onPhoneInput: function (e) {
    const phone = e.detail.value;
    this.setData({ phone });
    this.checkLoginButton();
  },

  /**
   * 验证码输入事件
   */
  onCodeInput: function (e) {
    const code = e.detail.value;
    this.setData({ code });
    this.checkLoginButton();
  },

  /**
   * 检查登录按钮是否可用
   */
  checkLoginButton: function () {
    const { phone, code, agreeProtocol } = this.data;
    const phoneValid = /^1[3-9]\d{9}$/.test(phone);
    const codeValid = /^\d{6}$/.test(code);
    const loginBtnDisabled = !(phoneValid && codeValid && agreeProtocol);
    this.setData({ loginBtnDisabled });
  },

  /**
   * 获取验证码
   */
  getVerificationCode: function () {
    const { phone } = this.data;
    
    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 发送验证码请求
    post('/api/auth/send-code', { phone })
      .then(res => {
        // 开始倒计时
        this.startCountdown();
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
      })
      .catch(err => {
        wx.showToast({
          title: err.data?.message || '验证码发送失败',
          icon: 'none'
        });
      });
  },

  /**
   * 开始倒计时
   */
  startCountdown: function () {
    this.setData({
      codeBtnDisabled: true,
      countdown: 60,
      codeBtnText: '60秒后重新获取'
    });
    
    // 清除可能存在的定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    // 创建新的定时器
    const timer = setInterval(() => {
      let countdown = this.data.countdown - 1;
      
      if (countdown <= 0) {
        // 倒计时结束
        clearInterval(timer);
        this.setData({
          codeBtnDisabled: false,
          codeBtnText: '获取验证码',
          timer: null
        });
      } else {
        // 更新倒计时
        this.setData({
          countdown,
          codeBtnText: `${countdown}秒后重新获取`
        });
      }
    }, 1000);
    
    // 保存定时器引用
    this.setData({ timer });
  },

  /**
   * 切换协议同意状态
   */
  toggleAgreement: function () {
    const agreeProtocol = !this.data.agreeProtocol;
    this.setData({ agreeProtocol });
    this.checkLoginButton();
  },

  /**
   * 显示用户协议
   */
  showUserAgreement: function () {
    wx.showModal({
      title: '用户协议',
      content: '这是用户协议内容...',
      showCancel: false
    });
  },

  /**
   * 显示隐私政策
   */
  showPrivacyPolicy: function () {
    wx.showModal({
      title: '隐私政策',
      content: '这是隐私政策内容...',
      showCancel: false
    });
  },

  /**
   * 登录
   */
  login: function () {
    const { phone, code, agreeProtocol } = this.data;
    
    // 验证是否同意协议
    if (!agreeProtocol) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    
    // 验证手机号和验证码
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({
        title: '请输入正确的验证码',
        icon: 'none'
      });
      return;
    }
    
    // 检查app是否初始化
    if (!app || !app.globalData) {
      wx.showToast({
        title: '应用初始化失败，请重启小程序',
        icon: 'none'
      });
      return;
    }
    
    // 发送登录请求
    post('/api/auth/login', { phone, code }, { auth: false })
      .then(res => {
        // 保存登录信息
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.user);
        
        // 更新全局数据
        app.globalData.token = res.data.token;
        app.globalData.userInfo = res.data.user;
        
        // 登录成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 返回上一页或首页
        setTimeout(() => {
          wx.navigateBack({
            fail: () => {
              wx.switchTab({
                url: '/src/pages/index/index'
              });
            }
          });
        }, 1500);
      })
      .catch(err => {
        wx.showToast({
          title: err.data?.message || '登录失败',
          icon: 'none'
        });
      });
  },

  /**
   * 微信登录
   */
  wechatLogin: function () {
    wx.showLoading({
      title: '登录中...',
    });
    
    // 获取微信登录凭证
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到后台换取 token
          post('/api/auth/wechat-login', { code: res.code }, { auth: false })
            .then(res => {
              // 保存登录信息
              wx.setStorageSync('token', res.data.token);
              wx.setStorageSync('userInfo', res.data.user);
              
              // 更新全局数据
              app.globalData.token = res.data.token;
              app.globalData.userInfo = res.data.user;
              
              wx.hideLoading();
              
              // 登录成功提示
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
              
              // 返回上一页或首页
              setTimeout(() => {
                wx.navigateBack({
                  fail: () => {
                    wx.switchTab({
                      url: '/src/pages/index/index'
                    });
                  }
                });
              }, 1500);
            })
            .catch(err => {
              wx.hideLoading();
              
              if (err.data?.code === 'USER_NOT_FOUND') {
                // 用户未注册，需要绑定手机号
                wx.showModal({
                  title: '提示',
                  content: '您还未绑定手机号，请先绑定手机号',
                  showCancel: false,
                  success: () => {
                    // 这里可以跳转到手机号绑定页面
                  }
                });
              } else {
                wx.showToast({
                  title: err.data?.message || '登录失败',
                  icon: 'none'
                });
              }
            });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '微信登录失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 联系客服
   */
  contactCustomerService: function () {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n客服邮箱：support@love-home.com',
      showCancel: false
    });
  }
}); 