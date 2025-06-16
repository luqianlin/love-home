#!/bin/bash
# 智慧社区平台服务器初始化脚本

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出带时间戳的日志
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# 输出成功信息
success() {
  log "${GREEN}✓ $1${NC}"
}

# 输出错误信息
error() {
  log "${RED}✗ $1${NC}"
  exit 1
}

# 输出警告信息
warn() {
  log "${YELLOW}⚠ $1${NC}"
}

log "开始初始化智慧社区平台服务器环境..."

# 检查是否以root运行
if [ "$(id -u)" != "0" ]; then
   error "此脚本必须以root身份运行"
fi

# 第一步：更新系统
log "更新系统包..."
apt update && apt upgrade -y
success "系统更新完成"

# 第二步：安装必要的软件包
log "安装必要软件包..."
apt install -y curl wget git nginx build-essential redis-server ufw
success "必要软件包安装完成"

# 第三步：安装Node.js
log "安装Node.js 16.x..."
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs
success "Node.js $(node -v) 安装完成"

# 第四步：安装PM2
log "安装PM2..."
npm install -g pm2
success "PM2 安装完成"

# 第五步：安装MySQL 8.0
log "安装MySQL 8.0..."
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

# 配置MySQL安全性
log "配置MySQL安全性..."
mysql_secure_installation
success "MySQL 安装完成"

# 第六步：创建项目目录
log "创建项目目录..."
PROJECT_DIR="/var/www/smart-community"
mkdir -p ${PROJECT_DIR}/{api,admin,backups,logs}
mkdir -p ${PROJECT_DIR}/api/{uploads,public}
chown -R www-data:www-data ${PROJECT_DIR}
success "项目目录创建完成"

# 第七步：配置Nginx
log "配置Nginx..."
cat > /etc/nginx/sites-available/smart-community.conf << EOF
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name admin.example.com;
    root /var/www/smart-community/admin;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 启用gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 256;

    # 缓存静态资源
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# 创建符号链接并验证配置
ln -sf /etc/nginx/sites-available/smart-community.conf /etc/nginx/sites-enabled/
nginx -t

if [ $? -eq 0 ]; then
    systemctl restart nginx
    success "Nginx配置完成"
else
    error "Nginx配置错误，请检查"
fi

# 第八步：配置防火墙
log "配置防火墙..."
ufw allow ssh
ufw allow http
ufw allow https
echo "y" | ufw enable
success "防火墙配置完成"

# 第九步：设置自动备份
log "配置自动备份..."
cat > /etc/cron.daily/smart-community-backup << EOF
#!/bin/bash
BACKUP_DIR="/var/www/smart-community/backups/\$(date '+%Y%m%d')"
mkdir -p \${BACKUP_DIR}
mysqldump -u root smart_community > \${BACKUP_DIR}/smart_community.sql
cp -r /var/www/smart-community/api/uploads \${BACKUP_DIR}/uploads
find /var/www/smart-community/backups -type d -mtime +30 -exec rm -rf {} \\; 2>/dev/null
EOF
chmod +x /etc/cron.daily/smart-community-backup
success "自动备份配置完成"

# 第十步：创建监控脚本
log "配置系统监控..."
cat > /etc/cron.daily/smart-community-monitor << EOF
#!/bin/bash
# 检查API服务是否运行
if ! pm2 list | grep -q "server"; then
    pm2 start /var/www/smart-community/api/ecosystem.config.js
    echo "API服务已重启 - \$(date)" >> /var/www/smart-community/logs/monitor.log
fi

# 检查磁盘空间
DISK_USAGE=\$(df -h / | awk 'NR==2 {print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    echo "警告：磁盘使用率已超过 80%：\$DISK_USAGE% - \$(date)" >> /var/www/smart-community/logs/monitor.log
fi

# 检查MySQL服务
if ! systemctl is-active --quiet mysql; then
    systemctl restart mysql
    echo "MySQL服务已重启 - \$(date)" >> /var/www/smart-community/logs/monitor.log
fi
EOF
chmod +x /etc/cron.daily/smart-community-monitor
success "系统监控配置完成"

success "服务器环境初始化完成！"

# 输出摘要
echo -e "\n${GREEN}初始化摘要:${NC}"
echo -e "${BLUE}项目目录:${NC} ${PROJECT_DIR}"
echo -e "${BLUE}Node版本:${NC} $(node -v)"
echo -e "${BLUE}NPM版本:${NC} $(npm -v)"
echo -e "${BLUE}MySQL版本:${NC} $(mysql --version | awk '{print $5}' | sed 's/,//')"

log "请记得配置MySQL数据库和创建.env.production文件"
log "请修改Nginx配置中的域名信息后重启Nginx"

exit 0 