/**
 * JWT配置文件
 */
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'smart-community-secret-key';

// Token有效期
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '1d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * 生成访问令牌
 * @param {Object} payload 载荷数据
 * @returns {String} JWT令牌
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

/**
 * 生成刷新令牌
 * @param {Object} payload 载荷数据
 * @returns {String} JWT刷新令牌
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * 验证令牌
 * @param {String} token JWT令牌
 * @returns {Object|null} 解析后的载荷或null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  JWT_SECRET,
  TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};