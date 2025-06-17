// 社区选择页面
const app = getApp();
const api = require('../../utils/request.js');

Page({
  data: {
    loading: true,
    locationStatus: '', // loading, success, error
    locationAddress: '',
    currentLocation: null,
    currentCommunity: null,
    matchedCommunity: null,
    nearbyCommunities: [],
    userCommunities: [],
    roleMap: {
      resident: '住户',
      property_admin: '物业管理员',
      visitor: '访客'
    }
  },

  onLoad: function() {
    this.fetchUserCommunities();
    this.getUserLocation();
  },

  // 获取用户位置
  getUserLocation: function() {
    const that = this;
    that.setData({
      locationStatus: 'loading'
    });

    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        const { latitude, longitude } = res;
        that.setData({
          currentLocation: { lat: latitude, lng: longitude },
          locationAddress: `位置坐标: (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
        });
        
        // 查找附近社区
        that.findNearbyCommunities(latitude, longitude);
      },
      fail: function(err) {
        console.error('获取位置失败', err);
        that.setData({
          locationStatus: 'error'
        });
        wx.showToast({
          title: '定位失败，请授权位置权限',
          icon: 'none'
        });
      }
    });
  },

  // 刷新位置
  refreshLocation: function() {
    this.getUserLocation();
  },

  // 使用微信地图选择位置
  chooseLocation: function() {
    const that = this;
    wx.chooseLocation({
      success: function(res) {
        console.log('用户选择的位置', res);
        // 获取选择的位置信息
        const { latitude, longitude, name, address } = res;
        
        // 设置位置信息
        let locationText = '';
        if (address && address.trim()) {
          locationText = address;
        } else if (name && name.trim()) {
          locationText = name;
        } else {
          locationText = `位置坐标: (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        }
        
        that.setData({
          currentLocation: { lat: latitude, lng: longitude },
          locationAddress: locationText
        });
        
        // 查找附近社区
        that.findNearbyCommunities(latitude, longitude);
        
        wx.showToast({
          title: '位置已更新',
          icon: 'success'
        });
      },
      fail: function(err) {
        console.error('选择位置失败', err);
        if (err.errMsg !== 'chooseLocation:fail cancel') {
          wx.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 查找附近社区
  findNearbyCommunities: function(latitude, longitude) {
    const that = this;
    api.request({
      url: '/api/communities/nearby',
      method: 'GET',
      data: { lat: latitude, lng: longitude, distance: 3 },
      success: function(res) {
        if (res.code === 200) {
          // 处理距离显示
          let matched = res.data.matched;
          if (matched) {
            // 添加hasDistance标志和格式化的距离文本
            if (matched.distance_km) {
              matched.hasDistance = true;
              matched.distanceText = that.formatDistance(matched.distance_km);
            } else {
              matched.hasDistance = false;
              matched.distanceText = '';
            }
          }
          
          let nearbyCommunities = res.data.communities.filter(c => {
            return !res.data.matched || c.id !== res.data.matched.id;
          }).map(c => {
            // 为每个社区添加hasDistance标志和格式化的距离文本
            if (c.distance_km) {
              c.hasDistance = true;
              c.distanceText = that.formatDistance(c.distance_km);
            } else {
              c.hasDistance = false;
              c.distanceText = '';
            }
            return c;
          });
          
          that.setData({
            matchedCommunity: matched,
            nearbyCommunities: nearbyCommunities,
            locationStatus: 'success',
            loading: false
          });
        } else {
          that.setData({
            locationStatus: 'error',
            loading: false
          });
        }
      },
      fail: function(err) {
        console.error('获取附近社区失败', err);
        that.setData({
          locationStatus: 'error',
          loading: false
        });
      }
    });
  },

  // 获取用户的社区列表
  fetchUserCommunities: function() {
    const that = this;
    api.request({
      url: '/api/communities/user/list',
      method: 'GET',
      success: function(res) {
        if (res.code === 200) {
          that.setData({
            userCommunities: res.data,
            loading: false
          });
          
          // 获取当前社区
          const currentId = app.globalData.currentCommunityId;
          if (currentId) {
            const found = res.data.find(item => item.community_id === currentId);
            if (found) {
              that.setData({
                currentCommunity: {
                  id: found.community_id,
                  name: found.Community.name,
                  address: found.Community.address
                }
              });
            }
          }
        }
      },
      fail: function(err) {
        console.error('获取用户社区列表失败', err);
        that.setData({
          loading: false
        });
      }
    });
  },

  // 切换社区
  handleSwitch: function(e) {
    const communityId = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showLoading({
      title: '切换中...',
    });
    
    api.request({
      url: '/api/communities/switch',
      method: 'POST',
      data: {
        community_id: communityId
      },
      success: function(res) {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '切换社区成功',
            icon: 'success'
          });
          
          // 更新全局社区ID
          app.globalData.currentCommunityId = communityId;
          
          // 更新当前社区
          let targetCommunity = null;
          
          // 在用户社区中查找
          const userCommunity = that.data.userCommunities.find(item => item.community_id === communityId);
          if (userCommunity) {
            targetCommunity = {
              id: userCommunity.community_id,
              name: userCommunity.Community.name,
              address: userCommunity.Community.address
            };
          } 
          // 在匹配社区中查找
          else if (that.data.matchedCommunity && that.data.matchedCommunity.id === communityId) {
            targetCommunity = that.data.matchedCommunity;
          } 
          // 在附近社区中查找
          else {
            const found = that.data.nearbyCommunities.find(c => c.id === communityId);
            if (found) {
              targetCommunity = found;
            }
          }
          
          if (targetCommunity) {
            that.setData({
              currentCommunity: targetCommunity
            });
          }
          
          // 返回首页
          setTimeout(() => {
            wx.switchTab({
              url: '/src/pages/index/index'
            });
          }, 1500);
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('切换社区失败', err);
        wx.showToast({
          title: '切换社区失败',
          icon: 'none'
        });
      }
    });
  },

  // 设置默认社区
  handleSetDefault: function(e) {
    const communityId = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showLoading({
      title: '设置中...',
    });
    
    api.request({
      url: '/api/communities/user/default',
      method: 'POST',
      data: {
        community_id: communityId
      },
      success: function(res) {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '设置默认社区成功',
            icon: 'success'
          });
          // 刷新社区列表
          that.fetchUserCommunities();
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('设置默认社区失败', err);
        wx.showToast({
          title: '设置默认社区失败',
          icon: 'none'
        });
      }
    });
  },

  // 格式化距离显示
  formatDistance: function(distanceKm) {
    if (!distanceKm) return '';
    
    if (distanceKm < 1) {
      // 小于1公里，显示为米
      return Math.round(distanceKm * 1000) + ' 米';
    } else {
      // 大于等于1公里，显示为公里，保留一位小数
      return distanceKm.toFixed(1) + ' 公里';
    }
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '智慧社区 - 选择您所在的社区',
      path: '/src/pages/community/select'
    };
  }
});