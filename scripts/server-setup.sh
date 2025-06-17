#!/bin/bash
# 智慧社区平台服务器初始化脚本
# 用于新服务器的环境配置和初始化

set -e

# 显示欢迎信息
echo "======================================================"
echo "  智慧社区平台服务器初始化脚本"
echo "  适用于Ubuntu 22.04 LTS"
echo "======================================================"
echo ""

# 检查是否以root运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用root权限运行此脚本"
  exit 1
fi

# 更新系统
echo "正在更新系统..."
apt update && apt upgrade -y

# 安装基础软件
echo "正在安装基础软件..."
apt install -y curl wget git vim htop net-tools unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# 安装Node.js
echo "正在安装Node.js 16.x..."
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs
npm install -g pm2

# 安装MySQL
echo "正在安装MySQL 8.0..."
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# 安装Redis
echo "正在安装Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 安装Nginx
echo "正在安装Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 安装Certbot (Let's Encrypt)
echo "正在安装Certbot..."
apt install -y certbot python3-certbot-nginx

# 创建应用目录
echo "正在创建应用目录..."
mkdir -p /var/www/love-home
mkdir -p /var/www/love-home/logs
mkdir -p /var/www/love-home/backups
mkdir -p /var/www/love-home/public/uploads/finance
mkdir -p /var/www/love-home/public/uploads/images
mkdir -p /var/www/love-home/public/uploads/avatars
chown -R www-data:www-data /var/www/love-home

# 配置MySQL
echo "正在配置MySQL..."
cat > /tmp/mysql_secure.sql << EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'temppassword';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
CREATE DATABASE IF NOT EXISTS community_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'community_user'@'localhost' IDENTIFIED BY 'community_password';
GRANT ALL PRIVILEGES ON community_platform.* TO 'community_user'@'localhost';
FLUSH PRIVILEGES;
EOF

mysql < /tmp/mysql_secure.sql
rm /tmp/mysql_secure.sql

# 配置Nginx
echo "正在配置Nginx..."
cat > /etc/nginx/sites-available/community << EOF
server {
    listen 80;
    server_name _;

    root /var/www/love-home/public;
    index index.html;

    # 静态资源缓存
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # 上传文件目录
    location /uploads {
        expires 1d;
        try_files \$uri =404;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 管理后台
    location /admin {
        try_files \$uri \$uri/ /admin/index.html;
    }

    # 前端SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
EOF

ln -sf /etc/nginx/sites-available/community /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 创建示例.env文件
echo "正在创建示例.env文件..."
cat > /var/www/love-home/.env.example << EOF
# 应用配置
NODE_ENV=production
PORT=3000
JWT_SECRET=change_this_to_a_secure_random_string
ENCRYPTION_KEY=change_this_to_a_secure_random_string

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=community_platform
DB_USER=community_user
DB_PASSWORD=community_password
DB_SYNC=false

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 邮件配置
MAIL_HOST=smtp.example.com
MAIL_PORT=465
MAIL_USER=noreply@example.com
MAIL_PASS=your_mail_password
MAIL_FROM=noreply@example.com

# Server酱配置
SERVER_CHAN_KEY=your_server_chan_key

# 定时任务配置
ENABLE_SCHEDULED_TASKS=true
EOF

# 创建定时备份脚本
echo "正在创建定时备份脚本..."
cat > /var/www/love-home/scripts/backup.sh << EOF
#!/bin/bash
# 数据库备份脚本

# 配置
BACKUP_DIR="/var/www/love-home/backups"
DB_NAME="community_platform"
DB_USER="community_user"
DB_PASS="community_password"
KEEP_DAYS=30

# 创建备份目录
mkdir -p \$BACKUP_DIR

# 生成备份文件名
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/\$DB_NAME-\$DATE.sql.gz"

# 备份数据库
mysqldump -u\$DB_USER -p\$DB_PASS \$DB_NAME | gzip > \$BACKUP_FILE

# 删除旧备份
find \$BACKUP_DIR -name "\$DB_NAME-*.sql.gz" -type f -mtime +\$KEEP_DAYS -delete

# 记录日志
echo "\$(date): 备份完成: \$BACKUP_FILE" >> \$BACKUP_DIR/backup.log
EOF

chmod +x /var/www/love-home/scripts/backup.sh

# 添加定时任务
echo "正在添加定时任务..."
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/love-home/scripts/backup.sh") | crontab -

# 安装完成
echo ""
echo "======================================================"
echo "  智慧社区平台服务器初始化完成!"
echo "======================================================"
echo ""
echo "请完成以下步骤:"
echo "1. 修改 /var/www/love-home/.env.example 为 .env 并更新配置"
echo "2. 部署应用代码到 /var/www/love-home 目录"
echo "3. 运行 'cd /var/www/love-home && npm install'"
echo "4. 运行 'cd /var/www/love-home && pm2 start ecosystem.config.js'"
echo "5. 如需配置HTTPS，运行 'certbot --nginx -d your-domain.com'"
echo ""
echo "初始MySQL root密码: temppassword"
echo "请立即修改此密码!"
echo "" 