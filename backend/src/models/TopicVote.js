/**
 * TopicVote数据模型 - 社区议题投票
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TopicVote = sequelize.define('TopicVote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  topic_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的议题ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '投票用户ID'
  },
  option: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '选择的选项值'
  },
  vote_method: {
    type: DataTypes.ENUM('实名', '匿名'),
    defaultValue: '实名',
    comment: '投票方式'
  },
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '投票IP地址(用于防止刷票)'
  },
  community_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属社区ID'
  }
}, {
  tableName: 'topic_votes',
  timestamps: true,
  indexes: [
    {
      name: 'idx_topic_votes_topic',
      fields: ['topic_id']
    },
    {
      name: 'idx_topic_votes_user',
      fields: ['user_id']
    },
    // 确保一个用户只能对一个议题投票一次
    {
      name: 'idx_topic_votes_unique',
      unique: true,
      fields: ['topic_id', 'user_id']
    },
    {
      name: 'idx_topic_votes_community',
      fields: ['community_id']
    }
  ],
  comment: '社区议事投票表'
});

module.exports = TopicVote; 