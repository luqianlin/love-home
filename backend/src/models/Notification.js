/**
 * Notification数据模型 - 智能通知系统
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    },
    comment: '通知标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '通知内容(富文本)'
  },
  level: {
    type: DataTypes.ENUM('urgent', 'normal'),
    allowNull: false,
    defaultValue: 'normal',
    comment: '通知级别(urgent:紧急通知,normal:普通通知)'
  },
  target_scope: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '目标范围(楼栋单元数组,为空则全小区)'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间(紧急通知必填)'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'expired'),
    defaultValue: 'draft',
    comment: '通知状态'
  },
  pushed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已推送'
  },
  publisher_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '发布人ID'
  },
  community_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属社区ID'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    {
      name: 'idx_notifications_community',
      fields: ['community_id']
    },
    {
      name: 'idx_notifications_status',
      fields: ['status']
    },
    {
      name: 'idx_notifications_level',
      fields: ['level']
    }
  ],
  comment: '社区通知表'
});

module.exports = Notification;