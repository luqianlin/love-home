/**
 * 社区管理相关API
 */
import request from '../utils/request';

/**
 * 获取社区列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCommunities(params) {
  return request({
    url: '/api/communities',
    method: 'get',
    params
  });
}

/**
 * 获取社区详情
 * @param {number} id - 社区ID
 * @returns {Promise}
 */
export function getCommunityDetail(id) {
  return request({
    url: `/api/communities/${id}`,
    method: 'get'
  });
}

/**
 * 创建社区
 * @param {Object} data - 社区信息
 * @returns {Promise}
 */
export function createCommunity(data) {
  return request({
    url: '/api/communities',
    method: 'post',
    data
  });
}

/**
 * 更新社区信息
 * @param {number} id - 社区ID
 * @param {Object} data - 社区更新信息
 * @returns {Promise}
 */
export function updateCommunity(id, data) {
  return request({
    url: `/api/communities/${id}`,
    method: 'put',
    data
  });
}

/**
 * 获取用户加入的社区列表
 * @returns {Promise}
 */
export function getUserCommunities() {
  return request({
    url: '/api/communities/user/list',
    method: 'get'
  });
}

/**
 * 切换当前使用的社区
 * @param {number} communityId - 社区ID
 * @returns {Promise}
 */
export function switchCommunity(communityId) {
  return request({
    url: '/api/communities/switch',
    method: 'post',
    data: {
      community_id: communityId
    }
  });
}

/**
 * 设置默认社区
 * @param {number} communityId - 社区ID
 * @returns {Promise}
 */
export function setDefaultCommunity(communityId) {
  return request({
    url: '/api/communities/user/default',
    method: 'post',
    data: {
      community_id: communityId
    }
  });
}

/**
 * 根据地理位置查找附近社区
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {number} distance - 距离(km)
 * @returns {Promise}
 */
export function findNearbyCommunities(lat, lng, distance = 1) {
  return request({
    url: '/api/communities/nearby',
    method: 'get',
    params: { lat, lng, distance }
  });
}