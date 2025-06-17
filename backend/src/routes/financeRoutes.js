/**
 * 财务透明中心路由
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const financeController = require('../controllers/financeController');
const authMiddleware = require('../middleware/authMiddleware');

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // 只允许CSV文件
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV格式文件'), false);
    }
  }
});

// 需要登录的路由
router.use(authMiddleware.authenticate);

// 获取财务报表列表
router.get('/', financeController.getFinanceReports);

// 获取财务报表详情
router.get('/:id', financeController.getFinanceReportDetail);

// 获取财务统计数据
router.get('/stats/yearly', financeController.getFinanceStats);

// 添加财务报表评论
router.post('/:id/comments', financeController.addFinanceReportComment);

// 删除财务报表评论
router.delete('/:id/comments/:commentId', financeController.deleteFinanceReportComment);

// 需要管理员权限的路由
router.use(authMiddleware.checkRole(['property_admin', 'system_admin']));

// 上传财务报表
router.post('/', upload.single('csv_file'), financeController.uploadFinanceReport);

// 删除财务报表
router.delete('/:id', financeController.deleteFinanceReport);

module.exports = router; 