#!/bin/bash
# 智慧社区平台部署回滚脚本
# 作者: GitHub@luqianlin

set -e  # 遇到错误立即退出

ROLLBACK_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo "开始执行回滚操作 - 时间: $ROLLBACK_TIME" >> /var/log/community-rollback.log

# 获取最后一次成功部署版本
LAST_SUCCESS_VERSION=$(cat /var/www/community-versions/last_success.txt)
echo "上一个稳定版本: $LAST_SUCCESS_VERSION"

# 检查备份是否存在
BACKUP_PATH="/var/www/community-versions/$LAST_SUCCESS_VERSION"
if [ ! -d "$BACKUP_PATH" ]; then
  echo "错误：找不到上一个稳定版本的备份：$BACKUP_PATH"
  exit 1
fi

# 恢复文件
echo "正在恢复文件到版本 $LAST_SUCCESS_VERSION..."
rm -rf /var/www/community/*
cp -r $BACKUP_PATH/* /var/www/community/
echo "文件恢复完成"

# 恢复数据库
echo "正在恢复数据库..."
DB_BACKUP="$BACKUP_PATH/db.sql.gz"
if [ -f "$DB_BACKUP" ]; then
  mysql -u$DB_USER -p$DB_PASS community < <(zcat $DB_BACKUP)
  echo "数据库恢复完成"
else
  echo "警告：未找到数据库备份，跳过数据库恢复"
fi

# 清理缓存
echo "清理Redis缓存..."
redis-cli FLUSHDB

# 重启服务
echo "重启应用服务..."
cd /var/www/community
pm2 reload ecosystem.config.js --env production

# 验证回滚
echo "验证回滚..."
sleep 5 # 等待服务启动
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $HTTP_STATUS -ne 200 ]; then
  echo "回滚验证失败！HTTP状态码: $HTTP_STATUS"
  echo "回滚异常，请手动检查！" >> /var/log/community-rollback.log
  # 发送告警
  if [ -f /usr/local/bin/notify.sh ]; then
    /usr/local/bin/notify.sh "【严重警告】智慧社区平台回滚失败，需要人工干预！"
  fi
  exit 1
fi

# 记录回滚信息
echo "{\"rollback_to\": \"$LAST_SUCCESS_VERSION\", \"time\": \"$ROLLBACK_TIME\", \"status\": \"success\"}" > /var/www/community/public/rollback-info.json

# 发送通知
if [ -f /usr/local/bin/notify.sh ]; then
  /usr/local/bin/notify.sh "智慧社区平台已回滚至版本 $LAST_SUCCESS_VERSION"
fi

echo "回滚完成，系统已恢复至版本 $LAST_SUCCESS_VERSION"
echo "回滚完成 - $(date "+%Y-%m-%d %H:%M:%S")" >> /var/log/community-rollback.log 