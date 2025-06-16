/**
 * 数据库迁移脚本
 * 用于创建初始数据库结构
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// 创建数据库连接
const createDbConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true // 允许多条SQL语句
  });
};

// 创建数据库和所有表
const migrate = async () => {
  let connection;
  try {
    console.log('开始数据库迁移...');
    connection = await createDbConnection();

    // 创建数据库
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'smart_community'}\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci;
    `);

    console.log(`数据库 ${process.env.DB_NAME || 'smart_community'} 创建成功或已存在`);

    // 使用数据库
    await connection.query(`USE \`${process.env.DB_NAME || 'smart_community'}\``);

    // 创建用户表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        nickname VARCHAR(50) NOT NULL,
        phone VARCHAR(255) NOT NULL COMMENT '加密存储',
        role ENUM('resident', 'property_admin', 'system_admin') DEFAULT 'resident',
        avatar VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        current_community_id INT NULL,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('用户表创建成功');

    // 创建小区表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '小区名称',
        address VARCHAR(100) NOT NULL,
        boundary POLYGON NOT NULL SRID 4326 COMMENT '电子围栏',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        SPATIAL INDEX(boundary)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('小区表创建成功');

    // 创建用户-小区关系表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_communities (
        user_id INT NOT NULL,
        community_id INT NOT NULL,
        is_default BOOLEAN DEFAULT 0 COMMENT '默认小区',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, community_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('用户-小区关系表创建成功');

    // 创建议题表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        community_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(30) NOT NULL,
        building VARCHAR(10) NOT NULL,
        vote_type ENUM('support_oppose', 'options', 'no_vote') DEFAULT 'no_vote',
        vote_options JSON DEFAULT NULL,
        status ENUM('active', 'closed', 'hidden') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('议题表创建成功');

    // 创建投票表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        user_id INT NOT NULL,
        option_value VARCHAR(50) NOT NULL,
        vote_method ENUM('real_name', 'anonymous') DEFAULT 'real_name',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (topic_id, user_id),
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('投票表创建成功');

    // 创建工单表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        community_id INT NOT NULL,
        order_number VARCHAR(20) NOT NULL UNIQUE,
        type VARCHAR(30) NOT NULL,
        description TEXT NOT NULL,
        location POINT NOT NULL SRID 0, 
        contact_info VARCHAR(255) NOT NULL COMMENT '加密存储',
        images JSON DEFAULT NULL,
        urgency ENUM('normal', 'urgent') DEFAULT 'normal',
        status ENUM('pending', 'processing', 'completed', 'timeout') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        SPATIAL INDEX(location),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('工单表创建成功');

    // 创建工单处理记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS work_order_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        work_order_id INT NOT NULL,
        operator_id INT NOT NULL,
        content TEXT NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'timeout') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('工单处理记录表创建成功');

    // 创建财务报表表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS finance_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        community_id INT NOT NULL,
        period DATE NOT NULL COMMENT '2023-10',
        report_type ENUM('property_expense', 'public_income', 'repair_fund') NOT NULL,
        csv_path VARCHAR(255) NOT NULL COMMENT '/uploads/finance/202310.csv',
        note TEXT DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('财务报表表创建成功');

    // 创建通知表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        community_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        level ENUM('urgent', 'normal') NOT NULL,
        target_scope JSON DEFAULT NULL COMMENT '["3-1","5-2"]',
        expire_time TIMESTAMP NULL DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('通知表创建成功');

    console.log('数据库迁移完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// 执行迁移
migrate(); 