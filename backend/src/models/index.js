/**
 * 数据库模型索引
 * 导出所有模型并建立模型间关联关系
 */
const User = require('./User');
const Community = require('./Community');
const UserCommunity = require('./UserCommunity');
const Topic = require('./Topic');
const TopicVote = require('./TopicVote');
const WorkOrder = require('./WorkOrder');
const Notification = require('./Notification');
const FinanceReport = require('./FinanceReport');

// 设置模型间的关联关系

// 用户与社区的多对多关系已在UserCommunity中设置

// 用户与当前社区的关系
User.belongsTo(Community, { as: 'currentCommunity', foreignKey: 'current_community_id' });

// 议题关联关系
Topic.belongsTo(User, { foreignKey: 'user_id' });
Topic.belongsTo(Community, { foreignKey: 'community_id' });
Topic.hasMany(TopicVote, { foreignKey: 'topic_id' });

// 投票关联关系
TopicVote.belongsTo(Topic, { foreignKey: 'topic_id' });
TopicVote.belongsTo(User, { foreignKey: 'user_id' });
TopicVote.belongsTo(Community, { foreignKey: 'community_id' });

// 工单关联关系
WorkOrder.belongsTo(User, { as: 'creator', foreignKey: 'user_id' });
WorkOrder.belongsTo(User, { as: 'handler', foreignKey: 'handler_id' });
WorkOrder.belongsTo(Community, { foreignKey: 'community_id' });

// 通知关联关系
Notification.belongsTo(User, { as: 'publisher', foreignKey: 'publisher_id' });
Notification.belongsTo(Community, { foreignKey: 'community_id' });

// 财务报告关联关系
FinanceReport.belongsTo(User, { as: 'uploader', foreignKey: 'uploaded_by' });
FinanceReport.belongsTo(Community, { foreignKey: 'community_id' });

module.exports = {
  User,
  Community,
  UserCommunity,
  Topic,
  TopicVote,
  WorkOrder,
  Notification,
  FinanceReport
}; 