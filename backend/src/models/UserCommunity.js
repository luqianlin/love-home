/**
 * UserCommunity数据模型 - 用户与小区的多对多关系
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Community = require('./Community');

const UserCommunity = sequelize.define('UserCommunity', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: '用户ID'
  },
  community_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: Community,
      key: 'id'
    },
    comment: '小区ID'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否默认小区'
  },
  building: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: '所在楼栋单元(如: 3-2)'
  },
  join_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '加入时间'
  },
  role: {
    type: DataTypes.ENUM('resident', 'property_admin', 'visitor'),
    defaultValue: 'resident',
    comment: '在该小区中的角色'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved',
    comment: '关联状态'
  }
}, {
  tableName: 'user_communities',
  timestamps: true,
  indexes: [
    {
      name: 'idx_user_communities_user',
      fields: ['user_id']
    },
    {
      name: 'idx_user_communities_community',
      fields: ['community_id']
    },
    {
      name: 'idx_user_communities_status',
      fields: ['status']
    }
  ],
  comment: '用户-小区关系表'
});

// 设置关联关系
User.belongsToMany(Community, { through: UserCommunity, foreignKey: 'user_id' });
Community.belongsToMany(User, { through: UserCommunity, foreignKey: 'community_id' });

module.exports = UserCommunity; 