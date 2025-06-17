/**
 * 定时任务服务
 * 包含工单超时监控、数据备份等定时任务
 */
const cron = require('node-cron');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { WorkOrder, User, UserCommunity, Community } = require('../models');
const { sendNotification } = require('../utils/notificationHelper');
const sequelize = require('../config/database');

/**
 * 初始化定时任务
 */
const initScheduledTasks = () => {
  // 工单超时监控 - 每10分钟检查一次
  cron.schedule('*/10 * * * *', checkWorkOrderTimeout);
  
  // 数据库备份 - 每天凌晨3点执行
  cron.schedule('0 3 * * *', backupDatabase);
  
  // 清理过期通知 - 每天凌晨2点执行
  cron.schedule('0 2 * * *', cleanExpiredNotifications);
  
  // 系统健康检查 - 每小时执行一次
  cron.schedule('0 * * * *', systemHealthCheck);
  
  console.log('定时任务已初始化');
};

/**
 * 检查工单超时
 * 超过48小时未处理的工单将发送预警通知
 */
const checkWorkOrderTimeout = async () => {
  try {
    console.log('开始检查工单超时...');
    
    // 计算48小时前的时间
    const timeoutThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // 查询超时工单
    const timeoutWorkOrders = await WorkOrder.findAll({
      where: {
        status: 'pending',
        createdAt: {
          [Op.lt]: timeoutThreshold
        },
        timeout_notified: false
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'name', 'mobile']
        },
        {
          model: Community,
          attributes: ['id', 'name']
        }
      ]
    });
    
    console.log(`发现 ${timeoutWorkOrders.length} 个超时工单`);
    
    // 处理每个超时工单
    for (const workOrder of timeoutWorkOrders) {
      // 查找社区管理员
      const propertyAdmins = await User.findAll({
        include: [
          {
            model: UserCommunity,
            where: {
              community_id: workOrder.community_id,
              role: 'property_admin'
            }
          }
        ]
      });
      
      // 发送通知
      await sendNotification({
        title: `工单超时预警: ${workOrder.order_no}`,
        content: `工单"${workOrder.description.substring(0, 20)}..."已超过48小时未处理，请尽快处理！`,
        level: 'urgent',
        recipients: propertyAdmins.map(admin => ({
          id: admin.id,
          mobile: admin.mobile,
          email: admin.email
        })),
        community_id: workOrder.community_id,
        related_id: workOrder.id,
        related_type: 'work_order_timeout'
      });
      
      // 更新工单状态为已通知
      await workOrder.update({ timeout_notified: true });
      
      console.log(`工单 ${workOrder.order_no} 超时通知已发送`);
    }
    
    console.log('工单超时检查完成');
  } catch (error) {
    console.error('工单超时检查失败:', error);
  }
};

/**
 * 数据库备份
 * 每天备份一次数据库，保留30天
 */
const backupDatabase = async () => {
  try {
    console.log('开始数据库备份...');
    
    // 创建备份目录
    const backupDir = path.join(__dirname, '../../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // 生成备份文件名
    const date = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `backup-${date}.sql.gz`);
    
    // 获取数据库配置
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    };
    
    // 构建备份命令
    const cmd = `mysqldump -h${dbConfig.host} -P${dbConfig.port} -u${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} | gzip > ${backupFile}`;
    
    // 执行备份命令
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`数据库备份失败: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`数据库备份警告: ${stderr}`);
        return;
      }
      
      console.log(`数据库备份成功: ${backupFile}`);
      
      // 清理30天前的备份
      cleanOldBackups();
    });
  } catch (error) {
    console.error('数据库备份失败:', error);
  }
};

/**
 * 清理旧备份
 * 删除30天前的备份文件
 */
const cleanOldBackups = () => {
  try {
    const backupDir = path.join(__dirname, '../../../backups');
    const files = fs.readdirSync(backupDir);
    
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`已删除过期备份: ${filePath}`);
      }
    });
  } catch (error) {
    console.error('清理旧备份失败:', error);
  }
};

/**
 * 清理过期通知
 */
const cleanExpiredNotifications = async () => {
  try {
    console.log('开始清理过期通知...');
    
    // 查询过期的通知
    const expiredNotifications = await Notification.findAll({
      where: {
        status: 'active',
        expire_time: {
          [Op.lt]: new Date()
        }
      }
    });
    
    console.log(`发现 ${expiredNotifications.length} 个过期通知`);
    
    // 更新通知状态为已归档
    for (const notification of expiredNotifications) {
      await notification.update({ status: 'archived' });
    }
    
    console.log('过期通知清理完成');
  } catch (error) {
    console.error('清理过期通知失败:', error);
  }
};

/**
 * 系统健康检查
 * 检查数据库连接、Redis连接等
 */
const systemHealthCheck = async () => {
  try {
    console.log('开始系统健康检查...');
    
    // 检查数据库连接
    let dbStatus = 'OK';
    try {
      await sequelize.authenticate();
    } catch (error) {
      dbStatus = `ERROR: ${error.message}`;
      console.error('数据库连接失败:', error);
    }
    
    // 检查Redis连接
    let redisStatus = 'OK';
    try {
      await sequelize.redis.ping();
    } catch (error) {
      redisStatus = `ERROR: ${error.message}`;
      console.error('Redis连接失败:', error);
    }
    
    // 检查系统资源
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 记录健康状态
    const healthStatus = {
      timestamp: new Date().toISOString(),
      database: dbStatus,
      redis: redisStatus,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      cpu: {
        user: `${Math.round(cpuUsage.user / 1000)} ms`,
        system: `${Math.round(cpuUsage.system / 1000)} ms`
      }
    };
    
    console.log('系统健康状态:', healthStatus);
    
    // 如果有异常，发送告警
    if (dbStatus !== 'OK' || redisStatus !== 'OK') {
      // 查找系统管理员
      const sysAdmins = await User.findAll({
        where: {
          role: 'system_admin'
        }
      });
      
      // 发送通知
      await sendNotification({
        title: '系统健康检查告警',
        content: `系统检测到异常:\n数据库状态: ${dbStatus}\nRedis状态: ${redisStatus}`,
        level: 'urgent',
        recipients: sysAdmins.map(admin => ({
          id: admin.id,
          mobile: admin.mobile,
          email: admin.email
        })),
        related_type: 'system_health'
      });
    }
    
    console.log('系统健康检查完成');
  } catch (error) {
    console.error('系统健康检查失败:', error);
  }
};

module.exports = {
  initScheduledTasks
}; 