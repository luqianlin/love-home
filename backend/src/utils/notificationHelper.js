/**
 * 通知辅助工具
 * 用于发送各类通知
 */
const { Notification, User, UserCommunity } = require('../models');
const { redis } = require('../config/database');
const nodemailer = require('nodemailer');

/**
 * 发送通知
 * @param {Object} options 通知选项
 * @param {String} options.title 通知标题
 * @param {String} options.content 通知内容
 * @param {String} options.level 通知级别 (urgent/normal)
 * @param {String} options.target_scope 目标范围 (楼栋单元数组)
 * @param {Date} options.expire_time 过期时间
 * @param {Number} options.target_user_id 目标用户ID
 * @param {String} options.target_role 目标角色
 * @param {Number} options.community_id 社区ID
 * @param {Number} options.related_id 关联ID
 * @param {String} options.related_type 关联类型
 * @returns {Promise<Object>} 创建的通知对象
 */
const sendNotification = async (options) => {
  const {
    title,
    content,
    level = 'normal',
    target_scope,
    expire_time,
    target_user_id,
    target_role,
    community_id,
    related_id,
    related_type,
    publisher_id = 1 // 默认系统发布
  } = options;
  
  // 创建通知记录
  const notification = await Notification.create({
    title,
    content,
    level,
    target_scope,
    expire_time: level === 'urgent' ? expire_time || new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    status: 'published',
    pushed: false,
    publisher_id,
    community_id
  });
  
  // 获取目标用户
  let targetUsers = [];
  
  if (target_user_id) {
    // 指定用户
    const user = await User.findByPk(target_user_id);
    if (user) {
      targetUsers = [user];
    }
  } else if (target_role) {
    // 指定角色
    targetUsers = await User.findAll({
      where: { role: target_role },
      include: [
        {
          model: UserCommunity,
          where: { community_id }
        }
      ]
    });
  } else {
    // 根据target_scope过滤用户
    const query = {
      include: [
        {
          model: UserCommunity,
          where: { community_id }
        }
      ]
    };
    
    if (target_scope && target_scope.length > 0) {
      query.include[0].where.building = target_scope;
    }
    
    targetUsers = await User.findAll(query);
  }
  
  // 发送通知
  for (const user of targetUsers) {
    // 存储到Redis队列
    const notificationData = {
      id: notification.id,
      title,
      content,
      level,
      user_id: user.id,
      community_id,
      related_id,
      related_type,
      created_at: new Date().toISOString()
    };
    
    // 添加到用户的通知列表
    await redis.lpush(`user:${user.id}:notifications`, JSON.stringify(notificationData));
    
    // 设置通知过期时间
    if (level === 'urgent' && expire_time) {
      const expireTime = new Date(expire_time).getTime();
      const now = Date.now();
      const ttl = Math.floor((expireTime - now) / 1000);
      
      if (ttl > 0) {
        await redis.expire(`user:${user.id}:notifications`, ttl);
      }
    }
    
    // 紧急通知发送邮件
    if (level === 'urgent' && user.email) {
      try {
        await sendUrgentEmail(user.email, title, content);
      } catch (error) {
        console.error('发送紧急邮件失败:', error);
      }
    }
  }
  
  // 更新通知状态
  await notification.update({ pushed: true });
  
  return notification;
};

/**
 * 发送紧急邮件
 * @param {String} email 收件人邮箱
 * @param {String} title 邮件标题
 * @param {String} content 邮件内容
 * @returns {Promise} 发送结果
 */
const sendUrgentEmail = async (email, title, content) => {
  // 创建邮件传输对象
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
  
  // 发送邮件
  return transporter.sendMail({
    from: `"智慧社区" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: `【紧急通知】${title}`,
    text: content,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
        <h2 style="color: #e74c3c;">紧急通知</h2>
        <h3>${title}</h3>
        <div style="margin: 20px 0; padding: 15px; background-color: #fff; border-left: 4px solid #e74c3c;">
          ${content}
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">此为系统自动发送，请勿回复</p>
      </div>
    `
  });
};

/**
 * 获取用户未读通知
 * @param {Number} userId 用户ID
 * @param {Number} limit 限制数量
 * @returns {Promise<Array>} 未读通知列表
 */
const getUserUnreadNotifications = async (userId, limit = 10) => {
  const notifications = await redis.lrange(`user:${userId}:notifications`, 0, limit - 1);
  return notifications.map(item => JSON.parse(item));
};

/**
 * 标记通知为已读
 * @param {Number} userId 用户ID
 * @param {Number} notificationId 通知ID
 * @returns {Promise<Boolean>} 是否成功
 */
const markNotificationAsRead = async (userId, notificationId) => {
  const notifications = await redis.lrange(`user:${userId}:notifications`, 0, -1);
  
  for (let i = 0; i < notifications.length; i++) {
    const notification = JSON.parse(notifications[i]);
    
    if (notification.id === parseInt(notificationId, 10)) {
      // 移除该通知
      await redis.lrem(`user:${userId}:notifications`, 1, notifications[i]);
      return true;
    }
  }
  
  return false;
};

module.exports = {
  sendNotification,
  getUserUnreadNotifications,
  markNotificationAsRead
}; 