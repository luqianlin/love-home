/**
 * User数据模型 - 用户管理
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '密码(加密存储)'
  },
  name: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '姓名'
  },
  mobile: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      is: /^1[3-9]\d{9}$/
    },
    comment: '手机号(加密存储)'
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: '邮箱'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像URL'
  },
  role: {
    type: DataTypes.ENUM('resident', 'property_admin', 'system_admin'),
    allowNull: false,
    defaultValue: 'resident',
    comment: '用户角色'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
    comment: '用户状态'
  },
  building: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: '所在楼栋(如: 3-2)'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  last_login_ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '最后登录IP'
  },
  wechat_openid: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: '微信OpenID'
  },
  current_community_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '当前使用的小区ID'
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    // 密码加密
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  },
  indexes: [
    {
      name: 'idx_users_role',
      fields: ['role']
    },
    {
      name: 'idx_users_status',
      fields: ['status']
    },
    {
      name: 'idx_users_current_community',
      fields: ['current_community_id']
    }
  ],
  comment: '用户信息表'
});

// 密码验证方法
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = User;