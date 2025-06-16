/**
 * Topic数据模型 - 社区议事厅
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Topic = sequelize.define('Topic', {
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
    comment: '议题标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 5000]
    },
    comment: '详细描述(Markdown格式)'
  },
  category: {
    type: DataTypes.ENUM('公共设施', '环境卫生', '社区安全'),
    allowNull: false,
    comment: '问题分类'
  },
  building: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: '发布者所在楼栋单元(如: 3-2)'
  },
  vote_type: {
    type: DataTypes.ENUM('支持/反对', '选项投票', '无需投票'),
    defaultValue: '无需投票',
    comment: '投票类型'
  },
  vote_options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '投票选项(JSON数组)'
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '浏览次数'
  },
  community_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属社区ID'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'closed'),
    defaultValue: 'active',
    comment: '议题状态'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建用户ID'
  }
}, {
  tableName: 'topics',
  timestamps: true,  // 启用createdAt和updatedAt
  indexes: [
    {
      name: 'idx_topics_community',
      fields: ['community_id']
    },
    {
      name: 'idx_topics_category',
      fields: ['category']
    },
    {
      name: 'idx_topics_status',
      fields: ['status']
    }
  ],
  comment: '社区议事厅议题表'
});

module.exports = Topic;