#!/bin/bash
# 智慧社区平台部署脚本

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

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    error "$1 命令未安装，请先安装！"
  fi
}

# 检查必要的命令
check_command node
check_command npm
check_command pm2

# 开始部署流程
log "开始部署智慧社区平台..."

# 项目目录
PROJECT_DIR="/var/www/smart-community"
BACKUP_DIR="${PROJECT_DIR}/backups/$(date '+%Y%m%d%H%M%S')"

# 第一步：备份当前版本
log "备份当前版本..."
mkdir -p ${BACKUP_DIR}
if [ -d "${PROJECT_DIR}/api" ]; then
  cp -r ${PROJECT_DIR}/api ${BACKUP_DIR}/api
  success "API 备份完成"
fi

if [ -d "${PROJECT_DIR}/admin" ]; then
  cp -r ${PROJECT_DIR}/admin ${BACKUP_DIR}/admin
  success "管理后台备份完成"
fi

# 第二步：更新环境变量
log "更新环境变量..."
if [ -f "${PROJECT_DIR}/.env.production" ]; then
  cp ${PROJECT_DIR}/.env.production ${PROJECT_DIR}/api/.env
  success "环境变量更新成功"
else
  warn "环境变量文件不存在，跳过更新"
fi

# 第三步：重启服务
log "重启后端服务..."
cd ${PROJECT_DIR}/api
npm install --production
if pm2 restart ecosystem.config.js; then
  success "后端服务重启成功"
else
  error "后端服务重启失败"
fi

# 第四步：更新Nginx配置（如果存在）
log "检查Nginx配置..."
if [ -f "/etc/nginx/sites-available/smart-community.conf" ]; then
  sudo nginx -t
  if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    success "Nginx配置重载成功"
  else
    error "Nginx配置无效，请检查"
  fi
else
  warn "未找到Nginx配置，跳过更新"
fi

# 第五步：清理旧的备份
log "清理旧的备份..."
find ${PROJECT_DIR}/backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
success "清理完成"

success "智慧社区平台部署完成！"

# 输出部署摘要
echo -e "\n${GREEN}部署摘要:${NC}"
echo -e "${BLUE}部署时间:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BLUE}部署目录:${NC} ${PROJECT_DIR}"
echo -e "${BLUE}备份目录:${NC} ${BACKUP_DIR}"
echo -e "${BLUE}Node版本:${NC} $(node -v)"
echo -e "${BLUE}NPM版本:${NC} $(npm -v)"

exit 0 