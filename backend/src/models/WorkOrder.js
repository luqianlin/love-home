/**
 * WorkOrder数据模型 - 工单管理系统
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_no: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: '工单编号(系统生成)'
  },
  type: {
    type: DataTypes.ENUM('水电维修', '电梯故障', '公共设施', '环境卫生'),
    allowNull: false,
    comment: '工单类型'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 200]
    },
    comment: '故障描述'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '图片URL数组'
  },
  contact_info: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      is: /^1[3-9]\d{9}$/
    },
    comment: '联系电话'
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
    comment: '故障位置坐标'
  },
  address: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '故障位置文字描述'
  },
  urgency: {
    type: DataTypes.ENUM('普通', '紧急'),
    defaultValue: '普通',
    comment: '紧急程度'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'timeout'),
    defaultValue: 'pending',
    comment: '工单状态'
  },
  handler_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '处理人员ID'
  },
  handled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '受理时间'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '处理备注'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建用户ID'
  },
  community_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属社区ID'
  }
}, {
  tableName: 'work_orders',
  timestamps: true,
  hooks: {
    // 生成工单编号
    beforeCreate: async (workOrder) => {
      const date = new Date();
      const dateStr = date.getFullYear().toString() + 
                     (date.getMonth() + 1).toString().padStart(2, '0') +
                     date.getDate().toString().padStart(2, '0');
      
      // 查询当天最后一个工单编号
      const lastOrder = await WorkOrder.findOne({
        where: {
          order_no: {
            [Op.like]: `${dateStr}%`
          }
        },
        order: [['id', 'DESC']]
      });
      
      let sequence = '001';
      if (lastOrder) {
        const lastSequence = parseInt(lastOrder.order_no.substring(8));
        sequence = (lastSequence + 1).toString().padStart(3, '0');
      }
      
      workOrder.order_no = dateStr + sequence;
    }
  },
  indexes: [
    {
      name: 'idx_work_orders_community',
      fields: ['community_id']
    },
    {
      name: 'idx_work_orders_status',
      fields: ['status']
    },
    {
      name: 'idx_work_orders_user',
      fields: ['user_id']
    },
    {
      type: 'SPATIAL',
      name: 'idx_work_orders_location',
      fields: ['location']
    }
  ],
  comment: '工单管理表'
});

// 引入Op操作符
const { Op } = require('sequelize');

module.exports = WorkOrder; 