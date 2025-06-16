/**
 * 认证控制器
 */
const { User, UserCommunity, Community } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const { catchAsync } = require('../middleware/errorMiddleware');
const { redis } = require('../config/database');
const crypto = require('crypto');

/**
 * 用户注册
 */
const register = catchAsync(async (req, res) => {
  const { username, password, name, mobile, email } = req.body;
  
  // 检查用户名是否已存在
  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    throw ApiError.conflict('用户名已存在');
  }
  
  // 创建新用户
  const user = await User.create({
    username,
    password, // 密码会在模型的beforeCreate钩子中加密
    name,
    mobile,
    email,
    role: 'resident' // 默认为普通居民
  });
  
  // 移除敏感信息
  const userWithoutPassword = { ...user.get() };
  delete userWithoutPassword.password;
  
  res.status(201).json({
    code: 201,
    message: '注册成功',
    data: userWithoutPassword
  });
});

/**
 * 用户登录
 */
const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;
  
  // 查找用户
  const user = await User.findOne({ 
    where: { username },
    include: [
      {
        model: Community,
        as: 'currentCommunity',
        attributes: ['id', 'name']
      }
    ]
  });
  
  if (!user) {
    throw ApiError.unauthorized('用户名或密码错误');
  }
  
  // 验证密码
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('用户名或密码错误');
  }
  
  // 检查用户状态
  if (user.status !== 'active') {
    throw ApiError.forbidden('账户已被禁用');
  }
  
  // 获取用户关联的社区
  const userCommunities = await UserCommunity.findAll({
    where: { user_id: user.id, status: 'approved' },
    include: [
      {
        model: Community,
        attributes: ['id', 'name', 'address']
      }
    ]
  });
  
  // 生成令牌
  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  
  // 存储刷新令牌到Redis
  const tokenId = crypto.randomBytes(16).toString('hex');
  await redis.set(
    `refresh_token:${tokenId}`,
    JSON.stringify({ userId: user.id, refreshToken }),
    'EX',
    60 * 60 * 24 * 7 // 7天过期
  );
  
  // 更新最后登录时间和IP
  await user.update({
    last_login_at: new Date(),
    last_login_ip: req.ip
  });
  
  // 移除敏感信息
  const userWithoutPassword = { ...user.get() };
  delete userWithoutPassword.password;
  
  res.json({
    code: 200,
    message: '登录成功',
    data: {
      user: userWithoutPassword,
      communities: userCommunities,
      accessToken,
      refreshToken: tokenId,
      expiresIn: 24 * 60 * 60 // 1天
    }
  });
});

/**
 * 刷新令牌
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: tokenId } = req.body;
  
  if (!tokenId) {
    throw ApiError.badRequest('刷新令牌不能为空');
  }
  
  // 从Redis获取刷新令牌
  const tokenData = await redis.get(`refresh_token:${tokenId}`);
  if (!tokenData) {
    throw ApiError.unauthorized('刷新令牌无效或已过期');
  }
  
  const { userId, refreshToken } = JSON.parse(tokenData);
  
  // 验证刷新令牌
  const decoded = require('../config/jwt').verifyToken(refreshToken);
  if (!decoded) {
    // 删除无效的刷新令牌
    await redis.del(`refresh_token:${tokenId}`);
    throw ApiError.unauthorized('刷新令牌无效或已过期');
  }
  
  // 查找用户
  const user = await User.findByPk(userId);
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('用户不存在或已被禁用');
  }
  
  // 生成新令牌
  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  const accessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);
  
  // 更新Redis中的刷新令牌
  await redis.set(
    `refresh_token:${tokenId}`,
    JSON.stringify({ userId: user.id, refreshToken: newRefreshToken }),
    'EX',
    60 * 60 * 24 * 7 // 7天过期
  );
  
  res.json({
    code: 200,
    message: '令牌刷新成功',
    data: {
      accessToken,
      refreshToken: tokenId,
      expiresIn: 24 * 60 * 60 // 1天
    }
  });
});

/**
 * 获取当前用户信息
 */
const getCurrentUser = catchAsync(async (req, res) => {
  // req.user由认证中间件提供
  const userId = req.user.id;
  
  const user = await User.findOne({
    where: { id: userId },
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Community,
        as: 'currentCommunity',
        attributes: ['id', 'name', 'address']
      }
    ]
  });
  
  if (!user) {
    throw ApiError.notFound('用户不存在');
  }
  
  // 获取用户关联的社区
  const userCommunities = await UserCommunity.findAll({
    where: { user_id: userId, status: 'approved' },
    include: [
      {
        model: Community,
        attributes: ['id', 'name', 'address']
      }
    ]
  });
  
  res.json({
    code: 200,
    message: '获取用户信息成功',
    data: {
      user,
      communities: userCommunities
    }
  });
});

/**
 * 切换当前社区
 */
const switchCommunity = catchAsync(async (req, res) => {
  const { communityId } = req.body;
  const userId = req.user.id;
  
  // 验证社区ID
  if (!communityId) {
    throw ApiError.badRequest('社区ID不能为空');
  }
  
  // 检查用户是否有权限访问该社区
  const userCommunity = await UserCommunity.findOne({
    where: {
      user_id: userId,
      community_id: communityId,
      status: 'approved'
    }
  });
  
  if (!userCommunity) {
    throw ApiError.forbidden('您没有权限访问该社区');
  }
  
  // 更新用户当前社区
  await User.update(
    { current_community_id: communityId },
    { where: { id: userId } }
  );
  
  // 获取社区信息
  const community = await Community.findByPk(communityId);
  
  res.json({
    code: 200,
    message: '切换社区成功',
    data: {
      currentCommunity: community
    }
  });
});

/**
 * 退出登录
 */
const logout = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // 将令牌添加到黑名单
    await redis.set(
      `blacklist:${token}`,
      '1',
      'EX',
      60 * 60 * 24 // 1天过期
    );
  }
  
  // 如果有刷新令牌，也删除它
  const { refreshToken } = req.body;
  if (refreshToken) {
    await redis.del(`refresh_token:${refreshToken}`);
  }
  
  res.json({
    code: 200,
    message: '退出登录成功'
  });
});

/**
 * 修改密码
 */
const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;
  
  // 验证新密码
  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('两次输入的新密码不一致');
  }
  
  // 获取用户
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('用户不存在');
  }
  
  // 验证旧密码
  const isPasswordValid = await user.validatePassword(oldPassword);
  if (!isPasswordValid) {
    throw ApiError.badRequest('旧密码错误');
  }
  
  // 更新密码
  user.password = newPassword;
  await user.save();
  
  res.json({
    code: 200,
    message: '密码修改成功'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  getCurrentUser,
  switchCommunity,
  logout,
  changePassword
};