/**
 * 数据库种子脚本
 * 用于填充初始测试数据
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

// 创建数据库连接
const createConnection = async () => {
  try {
    return await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'smart_community',
      multipleStatements: true // 允许多条SQL语句
    });
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    throw error;
  }
};

// 生成密码哈希
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// 加密手机号 (AES-256)
const encryptPhone = (phone) => {
  const key = process.env.ENCRYPTION_KEY || 'community_secret_key_for_encryption';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// 填充测试数据
const seedDatabase = async () => {
  let connection;
  try {
    connection = await createConnection();
    console.log('开始填充测试数据...');

    // 清空现有数据（按照外键约束顺序）
    await connection.query(`
      SET FOREIGN_KEY_CHECKS=0;
      TRUNCATE TABLE notifications;
      TRUNCATE TABLE finance_reports;
      TRUNCATE TABLE work_order_records;
      TRUNCATE TABLE work_orders;
      TRUNCATE TABLE votes;
      TRUNCATE TABLE topics;
      TRUNCATE TABLE user_communities;
      TRUNCATE TABLE communities;
      TRUNCATE TABLE users;
      SET FOREIGN_KEY_CHECKS=1;
    `);
    console.log('现有数据已清空');

    // 创建测试用户
    const adminPassword = hashPassword('admin123');
    const propertyAdminPassword = hashPassword('property123');
    const residentPassword = hashPassword('resident123');

    await connection.query(`
      INSERT INTO users (username, password, nickname, phone, role) VALUES
      ('admin', ?, '系统管理员', ?, 'system_admin'),
      ('property', ?, '物业管理员', ?, 'property_admin'),
      ('resident1', ?, '张业主', ?, 'resident'),
      ('resident2', ?, '李业主', ?, 'resident'),
      ('resident3', ?, '王业主', ?, 'resident');
    `, [
      adminPassword, 
      encryptPhone('13800138000'),
      propertyAdminPassword, 
      encryptPhone('13800138001'),
      residentPassword, 
      encryptPhone('13800138002'),
      residentPassword, 
      encryptPhone('13800138003'),
      residentPassword, 
      encryptPhone('13800138004')
    ]);
    console.log('测试用户创建成功');

    // 创建测试小区
    await connection.query(`
      INSERT INTO communities (name, address, boundary) VALUES
      ('阳光家园', '北京市朝阳区阳光街道1号', ST_GeomFromText('POLYGON((116.407 39.904, 116.408 39.904, 116.408 39.905, 116.407 39.905, 116.407 39.904))', 4326)),
      ('和谐小区', '北京市海淀区和平路18号', ST_GeomFromText('POLYGON((116.317 39.984, 116.318 39.984, 116.318 39.985, 116.317 39.985, 116.317 39.984))', 4326));
    `);
    console.log('测试小区创建成功');

    // 创建用户-小区关系
    await connection.query(`
      INSERT INTO user_communities (user_id, community_id, is_default) VALUES
      (1, 1, 1),
      (2, 1, 1),
      (3, 1, 1),
      (4, 1, 1),
      (5, 2, 1);
    `);
    console.log('用户-小区关系创建成功');

    // 设置用户当前小区
    await connection.query(`
      UPDATE users SET current_community_id = 1 WHERE id IN (1, 2, 3, 4);
      UPDATE users SET current_community_id = 2 WHERE id = 5;
    `);
    console.log('用户当前小区设置成功');

    // 创建测试议题
    await connection.query(`
      INSERT INTO topics (user_id, community_id, title, content, category, building, vote_type, vote_options) VALUES
      (3, 1, '建议增加充电桩', '## 建议描述\n随着电动车数量增加，现有充电设施不足，建议增加10个充电桩。\n\n## 位置建议\n地下车库负一层', '公共设施', '3-2', 'support_oppose', NULL),
      (4, 1, '小区健身设施投票', '## 投票说明\n小区计划增设健身设施，请大家投票选择希望增加的设施类型', '公共设施', '5-1', 'options', JSON_ARRAY('室外健身器材', '室内健身房', '瑜伽室'));
    `);
    console.log('测试议题创建成功');

    // 创建测试投票
    await connection.query(`
      INSERT INTO votes (topic_id, user_id, option_value) VALUES
      (1, 3, 'support'),
      (1, 4, 'support'),
      (2, 3, '室外健身器材'),
      (2, 4, '室内健身房');
    `);
    console.log('测试投票创建成功');

    // 创建测试工单
    await connection.query(`
      INSERT INTO work_orders (user_id, community_id, order_number, type, description, location, contact_info, urgency, status) VALUES
      (3, 1, 'WO20230001', '水电维修', '厨房水管漏水', POINT(116.407, 39.904), ?, 'normal', 'pending'),
      (4, 1, 'WO20230002', '电梯故障', '电梯无法到达6楼', POINT(116.4075, 39.9045), ?, 'urgent', 'processing');
    `, [
      encryptPhone('13800138002'),
      encryptPhone('13800138003')
    ]);
    console.log('测试工单创建成功');

    // 创建测试工单处理记录
    await connection.query(`
      INSERT INTO work_order_records (work_order_id, operator_id, content, status) VALUES
      (2, 2, '已派维修人员前往检查，预计30分钟到达', 'processing');
    `);
    console.log('测试工单处理记录创建成功');

    // 创建测试通知
    await connection.query(`
      INSERT INTO notifications (community_id, title, content, level, target_scope, expire_time, created_by) VALUES
      (1, '[通知]周末社区大扫除活动', '## 活动通知\n本周六上午9点在社区广场集合，开展环境大扫除活动', 'normal', NULL, DATE_ADD(NOW(), INTERVAL 7 DAY), 2),
      (1, '[紧急]今日18-20点停水通知', '由于小区供水管道维修，今日18:00-20:00将临时停水，请提前做好准备', 'urgent', JSON_ARRAY('3-1', '3-2'), DATE_ADD(NOW(), INTERVAL 1 DAY), 2);
    `);
    console.log('测试通知创建成功');

    console.log('所有测试数据填充完成');
  } catch (error) {
    console.error('填充测试数据失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// 执行种子脚本
seedDatabase(); 