/**
 * 通知辅助工具
 * 支持多种通知方式：Server酱、邮件、Web推送
 */
const axios = require('axios');
const nodemailer = require('nodemailer');
const { redis } = require('../config/database');
const crypto = require('crypto');
const AES = require('crypto-js/aes');
const Utf8 = require('crypto-js/enc-utf8');

// 加密密钥
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'community-platform-secret-key';

/**
 * 发送通知
 * @param {Object} options 通知选项
 * @param {string} options.title 通知标题
 * @param {string} options.content 通知内容
 * @param {string} options.level 通知级别 (urgent/normal)
 * @param {Array} options.recipients 接收者列表
 * @param {number} options.community_id 社区ID
 * @param {number} options.related_id 相关ID
 * @param {string} options.related_type 相关类型
 */
const sendNotification = async (options) => {
  const { title, content, level, recipients, community_id, related_id, related_type } = options;
  
  // 紧急通知使用Server酱和邮件
  if (level === 'urgent') {
    // 使用Server酱发送微信通知
    await sendServerChan(title, content);
    
    // 使用邮件发送通知
    if (recipients && recipients.length > 0) {
      for (const recipient of recipients) {
        if (recipient.email) {
          await sendEmail(recipient.email, title, content);
        }
      }
    }
  }
  
  // 所有通知都存入Redis以便Web推送
  storeWebNotification(options);
  
  return true;
};

/**
 * 使用Server酱发送微信通知
 * @param {string} title 通知标题
 * @param {string} content 通知内容
 */
const sendServerChan = async (title, content) => {
  try {
    const serverChanKey = process.env.SERVER_CHAN_KEY;
    if (!serverChanKey) {
      console.warn('未配置Server酱密钥，跳过微信通知');
      return false;
    }
    
    // 调用Server酱API
    const response = await axios.post(`https://sctapi.ftqq.com/${serverChanKey}.send`, {
      title,
      desp: content
    });
    
    if (response.data && response.data.code === 0) {
      console.log('Server酱通知发送成功');
      return true;
    } else {
      console.error('Server酱通知发送失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Server酱通知发送异常:', error);
    return false;
  }
};

/**
 * 使用NodeMailer发送邮件通知
 * @param {string} to 接收邮箱
 * @param {string} subject 邮件主题
 * @param {string} html 邮件内容
 */
const sendEmail = async (to, subject, html) => {
  try {
    // 解密邮箱
    const decryptedEmail = decryptData(to);
    
    // 创建邮件传输对象
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.qq.com',
      port: process.env.MAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
    
    // 发送邮件
    const info = await transporter.sendMail({
      from: `"智慧社区平台" <${process.env.MAIL_USER}>`,
      to: decryptedEmail,
      subject,
      html
    });
    
    console.log('邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('邮件发送失败:', error);
    return false;
  }
};

/**
 * 存储Web推送通知到Redis
 * @param {Object} notification 通知对象
 */
const storeWebNotification = async (notification) => {
  try {
    const { title, content, level, recipients, community_id, related_id, related_type } = notification;
    
    // 通知ID
    const notificationId = `notification:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
    
    // 通知数据
    const notificationData = {
      id: notificationId,
      title,
      content,
      level,
      community_id,
      related_id,
      related_type,
      created_at: new Date().toISOString()
    };
    
    // 存储通知数据
    await redis.set(notificationId, JSON.stringify(notificationData), 'EX', 60 * 60 * 24 * 7); // 7天过期
    
    // 如果有指定接收者，则为每个接收者添加通知
    if (recipients && recipients.length > 0) {
      for (const recipient of recipients) {
        await redis.sadd(`user:${recipient.id}:notifications`, notificationId);
      }
    } else if (community_id) {
      // 否则添加到社区通知列表
      await redis.sadd(`community:${community_id}:notifications`, notificationId);
    }
    
    return true;
  } catch (error) {
    console.error('存储Web通知失败:', error);
    return false;
  }
};

/**
 * 获取用户的Web推送通知
 * @param {number} userId 用户ID
 * @param {number} communityId 社区ID
 * @param {number} limit 限制数量
 */
const getUserWebNotifications = async (userId, communityId, limit = 10) => {
  try {
    // 获取用户通知ID列表
    const userNotificationIds = await redis.smembers(`user:${userId}:notifications`);
    
    // 获取社区通知ID列表
    const communityNotificationIds = await redis.smembers(`community:${communityId}:notifications`);
    
    // 合并通知ID
    const notificationIds = [...new Set([...userNotificationIds, ...communityNotificationIds])];
    
    // 获取通知详情
    const notifications = [];
    for (const id of notificationIds.slice(0, limit)) {
      const data = await redis.get(id);
      if (data) {
        notifications.push(JSON.parse(data));
      }
    }
    
    // 按时间排序
    return notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('获取Web通知失败:', error);
    return [];
  }
};

/**
 * 标记通知为已读
 * @param {number} userId 用户ID
 * @param {string} notificationId 通知ID
 */
const markNotificationAsRead = async (userId, notificationId) => {
  try {
    await redis.srem(`user:${userId}:notifications`, notificationId);
    return true;
  } catch (error) {
    console.error('标记通知已读失败:', error);
    return false;
  }
};

/**
 * 加密数据
 * @param {string} data 原始数据
 * @returns {string} 加密后的数据
 */
const encryptData = (data) => {
  if (!data) return null;
  return AES.encrypt(data, SECRET_KEY).toString();
};

/**
 * 解密数据
 * @param {string} encryptedData 加密数据
 * @returns {string} 解密后的数据
 */
const decryptData = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    const bytes = AES.decrypt(encryptedData, SECRET_KEY);
    return bytes.toString(Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
  getUserWebNotifications,
  markNotificationAsRead,
  encryptData,
  decryptData
}; 