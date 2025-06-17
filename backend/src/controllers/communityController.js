/**
 * 社区管理控制器
 */
const { Op } = require('sequelize');
const { Community, User, UserCommunity } = require('../models');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const sequelize = require('../config/database');

/**
 * 创建社区
 */
const createCommunity = catchAsync(async (req, res) => {
  const { 
    name, 
    address, 
    province, 
    city, 
    district, 
    boundary, 
    center_point,
    property_contact, 
    photo_url 
  } = req.body;
  
  const userId = req.user.id;
  
  // 验证必填字段
  if (!name || !address || !province || !city || !district) {
    throw ApiError.badRequest('缺少必填字段');
  }
  
  // 验证边界数据
  if (boundary && (!Array.isArray(boundary) || boundary.length < 3)) {
    throw ApiError.badRequest('边界数据格式不正确，至少需要3个点形成闭合多边形');
  }
  
  // 创建社区
  const community = await Community.create({
    name,
    address,
    province,
    city,
    district,
    boundary: boundary ? {
      type: 'Polygon',
      coordinates: [boundary]
    } : null,
    center_point: center_point ? {
      type: 'Point',
      coordinates: [center_point.lng, center_point.lat]
    } : null,
    property_contact,
    photo_url,
    status: 'pending',
    created_by: userId
  });
  
  // 创建用户与社区的关联
  await UserCommunity.create({
    user_id: userId,
    community_id: community.id,
    is_default: true,
    role: 'property_admin',
    status: 'approved'
  });
  
  // 更新用户当前社区
  await User.update(
    { current_community_id: community.id },
    { where: { id: userId } }
  );
  
  res.status(201).json({
    code: 201,
    message: '社区创建成功',
    data: community
  });
});

/**
 * 获取社区列表
 */
const getCommunities = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status,
    name,
    province,
    city,
    district
  } = req.query;
  
  const where = {};
  
  // 筛选条件
  if (status) {
    where.status = status;
  }
  
  if (name) {
    where.name = { [Op.like]: `%${name}%` };
  }
  
  if (province) {
    where.province = province;
  }
  
  if (city) {
    where.city = city;
  }
  
  if (district) {
    where.district = district;
  }
  
  // 执行查询
  const { count, rows: communities } = await Community.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
  });
  
  res.json({
    code: 200,
    message: '获取社区列表成功',
    data: {
      communities,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10))
      }
    }
  });
});

/**
 * 获取社区详情
 */
const getCommunityDetail = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const community = await Community.findByPk(id);
  
  if (!community) {
    throw ApiError.notFound('社区不存在');
  }
  
  res.json({
    code: 200,
    message: '获取社区详情成功',
    data: community
  });
});

/**
 * 更新社区信息
 */
const updateCommunity = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    address, 
    province, 
    city, 
    district, 
    boundary, 
    center_point,
    property_contact, 
    photo_url,
    status
  } = req.body;
  
  const community = await Community.findByPk(id);
  
  if (!community) {
    throw ApiError.notFound('社区不存在');
  }
  
  // 验证权限
  if (!['property_admin', 'system_admin'].includes(req.user.role)) {
    throw ApiError.forbidden('您没有权限执行此操作');
  }
  
  // 更新社区信息
  await community.update({
    name: name || community.name,
    address: address || community.address,
    province: province || community.province,
    city: city || community.city,
    district: district || community.district,
    boundary: boundary ? {
      type: 'Polygon',
      coordinates: [boundary]
    } : community.boundary,
    center_point: center_point ? {
      type: 'Point',
      coordinates: [center_point.lng, center_point.lat]
    } : community.center_point,
    property_contact: property_contact || community.property_contact,
    photo_url: photo_url || community.photo_url,
    status: status || community.status
  });
  
  res.json({
    code: 200,
    message: '社区信息更新成功',
    data: community
  });
});

/**
 * 根据地理位置查找附近社区
 */
const findNearbyCommunities = catchAsync(async (req, res) => {
  const { lat, lng, distance = 1 } = req.query;
  
  if (!lat || !lng) {
    throw ApiError.badRequest('缺少位置参数');
  }
  
  const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
  
  // 查找包含该点的社区（电子围栏内）
  const exactMatch = await Community.findOne({
    where: sequelize.where(
      sequelize.fn('ST_Contains', 
        sequelize.col('boundary'), 
        sequelize.fn('ST_GeomFromText', `POINT(${lng} ${lat})`, 4326)
      ),
      true
    ),
    where: { status: 'active' }
  });
  
  if (exactMatch) {
    return res.json({
      code: 200,
      message: '找到匹配的社区',
      data: {
        matched: exactMatch,
        communities: [exactMatch]
      }
    });
  }
  
  // 查找附近的社区
  const nearbyQuery = `
    SELECT id, name, address, province, city, district, property_contact,
           ST_Distance(
             center_point,
             ST_GeomFromText('POINT(${lng} ${lat})', 4326)
           ) * 111.195 AS distance_km
    FROM communities
    WHERE status = 'active'
    AND ST_Distance(
      center_point,
      ST_GeomFromText('POINT(${lng} ${lat})', 4326)
    ) * 111.195 < ${distance}
    ORDER BY distance_km
    LIMIT 5
  `;
  
  const [nearby] = await sequelize.query(nearbyQuery);
  
  res.json({
    code: 200,
    message: '获取附近社区成功',
    data: {
      matched: null,
      communities: nearby
    }
  });
});

/**
 * 用户加入社区
 */
const joinCommunity = catchAsync(async (req, res) => {
  const { community_id, building, role = 'resident' } = req.body;
  const userId = req.user.id;
  
  // 验证社区是否存在
  const community = await Community.findByPk(community_id);
  if (!community) {
    throw ApiError.notFound('社区不存在');
  }
  
  // 检查用户是否已加入该社区
  const existingRelation = await UserCommunity.findOne({
    where: {
      user_id: userId,
      community_id
    }
  });
  
  if (existingRelation) {
    throw ApiError.badRequest('您已经加入该社区');
  }
  
  // 创建用户与社区的关联
  const userCommunity = await UserCommunity.create({
    user_id: userId,
    community_id,
    building,
    role,
    is_default: false,
    status: 'pending'
  });
  
  res.status(201).json({
    code: 201,
    message: '申请加入社区成功，等待审核',
    data: userCommunity
  });
});

/**
 * 切换当前使用的社区
 */
const switchCommunity = catchAsync(async (req, res) => {
  const { community_id } = req.body;
  const userId = req.user.id;
  
  // 验证社区是否存在
  const community = await Community.findByPk(community_id);
  if (!community) {
    throw ApiError.notFound('社区不存在');
  }
  
  // 检查用户是否已加入该社区
  const userCommunity = await UserCommunity.findOne({
    where: {
      user_id: userId,
      community_id,
      status: 'approved'
    }
  });
  
  if (!userCommunity) {
    throw ApiError.forbidden('您尚未加入该社区或申请未通过审核');
  }
  
  // 更新用户当前社区
  await User.update(
    { current_community_id: community_id },
    { where: { id: userId } }
  );
  
  res.json({
    code: 200,
    message: '切换社区成功',
    data: {
      current_community: {
        id: community.id,
        name: community.name,
        address: community.address
      }
    }
  });
});

/**
 * 获取用户加入的社区列表
 */
const getUserCommunities = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  const userCommunities = await UserCommunity.findAll({
    where: {
      user_id: userId,
      status: 'approved'
    },
    include: [{
      model: Community,
      attributes: ['id', 'name', 'address', 'province', 'city', 'district', 'photo_url']
    }],
    order: [['is_default', 'DESC']]
  });
  
  res.json({
    code: 200,
    message: '获取用户社区列表成功',
    data: userCommunities
  });
});

/**
 * 设置默认社区
 */
const setDefaultCommunity = catchAsync(async (req, res) => {
  const { community_id } = req.body;
  const userId = req.user.id;
  
  // 验证社区是否存在
  const community = await Community.findByPk(community_id);
  if (!community) {
    throw ApiError.notFound('社区不存在');
  }
  
  // 检查用户是否已加入该社区
  const userCommunity = await UserCommunity.findOne({
    where: {
      user_id: userId,
      community_id,
      status: 'approved'
    }
  });
  
  if (!userCommunity) {
    throw ApiError.forbidden('您尚未加入该社区或申请未通过审核');
  }
  
  // 将所有社区设置为非默认
  await UserCommunity.update(
    { is_default: false },
    { where: { user_id: userId } }
  );
  
  // 设置当前社区为默认
  await userCommunity.update({ is_default: true });
  
  // 更新用户当前社区
  await User.update(
    { current_community_id: community_id },
    { where: { id: userId } }
  );
  
  res.json({
    code: 200,
    message: '设置默认社区成功',
    data: {
      default_community: {
        id: community.id,
        name: community.name
      }
    }
  });
});

module.exports = {
  createCommunity,
  getCommunities,
  getCommunityDetail,
  updateCommunity,
  findNearbyCommunities,
  joinCommunity,
  switchCommunity,
  getUserCommunities,
  setDefaultCommunity
}; 