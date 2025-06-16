#!/bin/bash
# 智慧社区平台部署后处理脚本
# 作者: GitHub@luqianlin

set -e  # 遇到错误立即退出

# 记录部署时间和版本
DEPLOY_TIME=$(date "+%Y-%m-%d %H:%M:%S")
DEPLOY_VERSION=$(cat version.txt)
echo "开始部署后处理 - 时间: $DEPLOY_TIME, 版本: $DEPLOY_VERSION" >> /var/log/community-deploy.log

# 备份当前数据库
echo "正在备份数据库..."
BACKUP_DIR="/backups/db/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
mysqldump -u$DB_USER -p$DB_PASS community | gzip > $BACKUP_DIR/community.sql.gz
echo "数据库备份完成: $BACKUP_DIR/community.sql.gz"

# 运行数据库迁移
echo "正在执行数据库迁移..."
cd /var/www/community
NODE_ENV=production npm run migrate

# 重新启动应用服务
echo "重新启动应用服务..."
pm2 reload ecosystem.config.js --env production

# 清理旧的缓存
echo "清理Redis缓存..."
redis-cli FLUSHDB

# 生成部署标记
echo "{\"version\": \"$DEPLOY_VERSION\", \"time\": \"$DEPLOY_TIME\", \"deployer\": \"CI/CD\"}" > public/deploy-info.json

# 验证部署
echo "验证部署..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $HTTP_STATUS -ne 200 ]; then
  echo "部署验证失败！HTTP状态码: $HTTP_STATUS"
  exit 1
fi

# 发送部署完成通知
if [ -f /usr/local/bin/notify.sh ]; then
  /usr/local/bin/notify.sh "智慧社区平台 v$DEPLOY_VERSION 已成功部署"
fi

echo "部署后处理完成 - $(date "+%Y-%m-%d %H:%M:%S")" >> /var/log/community-deploy.log
echo "部署后处理成功完成！" 