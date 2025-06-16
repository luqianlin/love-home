/**
 * 工单管理路由
 */
const express = require('express');
const router = express.Router();
const workOrdersController = require('../controllers/workOrdersController');
const { authMiddleware, isPropertyAdmin } = require('../middleware/authMiddleware');
const { validateWorkOrder } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 获取工单列表 (管理员可查看全部，普通用户只能查看自己的)
router.get('/', authMiddleware, workOrdersController.getWorkOrders);

// 获取单个工单详情
router.get('/:id', authMiddleware, workOrdersController.getWorkOrderById);

// 创建工单 (含图片上传，最多3张)
router.post('/', 
  authMiddleware, 
  upload.array('images', 3), 
  validateWorkOrder, 
  workOrdersController.createWorkOrder
);

// 更新工单状态 (物业管理员权限)
router.patch('/:id/status', 
  authMiddleware, 
  isPropertyAdmin, 
  workOrdersController.updateWorkOrderStatus
);

// 添加工单处理记录 (物业管理员权限)
router.post('/:id/records', 
  authMiddleware, 
  isPropertyAdmin, 
  workOrdersController.addWorkOrderRecord
);

// 业主确认工单完成
router.post('/:id/confirm', 
  authMiddleware, 
  workOrdersController.confirmWorkOrderCompletion
);

// 获取工单统计数据 (物业管理员权限)
router.get('/stats/summary', 
  authMiddleware, 
  isPropertyAdmin, 
  workOrdersController.getWorkOrderStats
);

module.exports = router; 