/**
 * FinanceReport数据模型 - 财务透明中心
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinanceReport = sequelize.define('FinanceReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  period: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '财报期间(年月)'
  },
  report_type: {
    type: DataTypes.ENUM('物业收支', '公共收益', '维修基金'),
    allowNull: false,
    comment: '报告类型'
  },
  csv_path: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '财报CSV文件路径'
  },
  note: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '公示说明备注'
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '上传者ID'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    comment: '财报状态'
  },
  community_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属社区ID'
  }
}, {
  tableName: 'finance_reports',
  timestamps: true,
  indexes: [
    {
      name: 'idx_finance_reports_community',
      fields: ['community_id']
    },
    {
      name: 'idx_finance_reports_period',
      fields: ['period']
    },
    {
      name: 'idx_finance_reports_type',
      fields: ['report_type']
    }
  ],
  comment: '财务报告表'
});

module.exports = FinanceReport; 