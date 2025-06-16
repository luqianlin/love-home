/**
 * 工单管理路由
 */
const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');
const { authenticate, requireCommunity, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './public/uploads/work-orders');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `work-order-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// 所有路由都需要认证和社区
router.use(authenticate);
router.use(requireCommunity);

// 获取工单统计数据 (物业管理员权限)
router.get('/stats', authorize('property_admin', 'system_admin'), workOrderController.getWorkOrderStats);

// 获取工单列表 (管理员可查看全部，普通用户只能查看自己的)
router.get('/', workOrderController.getWorkOrders);

// 获取单个工单详情
router.get('/:id', workOrderController.getWorkOrderDetail);

// 创建工单 (含图片上传，最多3张)
router.post('/', upload.array('images', 3), workOrderController.createWorkOrder);

// 更新工单状态 (物业管理员权限)
router.patch('/:id/status', authorize('property_admin', 'system_admin'), workOrderController.updateWorkOrderStatus);

module.exports = router; 