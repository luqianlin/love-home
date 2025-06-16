/**
 * Community数据模型 - 社区/小区管理
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Community = sequelize.define('Community', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '小区名称'
  },
  address: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '小区详细地址'
  },
  province: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '省份'
  },
  city: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '城市'
  },
  district: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '区县'
  },
  boundary: {
    type: DataTypes.GEOMETRY('POLYGON', 4326),
    allowNull: true,
    comment: '小区电子围栏坐标'
  },
  center_point: {
    type: DataTypes.GEOMETRY('POINT', 4326),
    allowNull: true,
    comment: '小区中心点坐标'
  },
  property_contact: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: '物业联系电话'
  },
  photo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '小区照片URL'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive'),
    defaultValue: 'pending',
    comment: '小区状态'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建人ID'
  }
}, {
  tableName: 'communities',
  timestamps: true,
  indexes: [
    {
      name: 'idx_communities_status',
      fields: ['status']
    },
    {
      type: 'SPATIAL',
      name: 'idx_communities_boundary',
      fields: ['boundary']
    },
    {
      type: 'SPATIAL',
      name: 'idx_communities_center',
      fields: ['center_point']
    }
  ],
  comment: '社区小区信息表'
});

module.exports = Community; 