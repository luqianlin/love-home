#!/bin/bash

# 微信小程序连接修复部署脚本
# 此脚本部署修复微信小程序 ERR_CONNECTION_CLOSED 问题的更改

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== 微信小程序连接修复部署 =====${NC}"

# 服务器信息
SERVER_USER="root"
SERVER_IP="45.125.44.25"
SERVER_PORT="22"
REMOTE_PATH="/var/www/love-home"

# 备份当前配置
echo -e "${YELLOW}[1/6] 备份当前配置文件...${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
  mkdir -p backups/$(date +%Y%m%d) && \
  cp server.js backups/$(date +%Y%m%d)/server.js.bak && \
  cp nginx-config.conf backups/$(date +%Y%m%d)/nginx-config.conf.bak && \
  cp frontend-mp/src/utils/request.js backups/$(date +%Y%m%d)/request.js.bak && \
  echo '备份完成'"

if [ $? -ne 0 ]; then
  echo -e "${RED}备份失败，请检查SSH连接和权限${NC}"
  exit 1
fi

# 上传修改后的文件
echo -e "${YELLOW}[2/6] 上传修复后的文件...${NC}"

# 上传server.js
scp -P $SERVER_PORT server.js $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 上传nginx配置
scp -P $SERVER_PORT nginx-config.conf $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 上传修改后的request.js
scp -P $SERVER_PORT frontend-mp/src/utils/request.js $SERVER_USER@$SERVER_IP:$REMOTE_PATH/frontend-mp/src/utils/

# 上传测试脚本
scp -P $SERVER_PORT test-wechat-conn.js $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

if [ $? -ne 0 ]; then
  echo -e "${RED}文件上传失败${NC}"
  exit 1
fi

# 更新NGINX配置
echo -e "${YELLOW}[3/6] 更新Nginx配置...${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
  cp nginx-config.conf /etc/nginx/sites-available/lovehome.xin.conf && \
  ln -sf /etc/nginx/sites-available/lovehome.xin.conf /etc/nginx/sites-enabled/ && \
  nginx -t"

if [ $? -ne 0 ]; then
  echo -e "${RED}Nginx配置测试失败，回滚配置...${NC}"
  ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
    cp backups/$(date +%Y%m%d)/nginx-config.conf.bak /etc/nginx/sites-available/lovehome.xin.conf && \
    nginx -t && systemctl reload nginx"
  exit 1
fi

# 重启服务
echo -e "${YELLOW}[4/6] 重启服务...${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
  systemctl reload nginx && \
  pm2 reload server.js"

if [ $? -ne 0 ]; then
  echo -e "${RED}服务重启失败${NC}"
  exit 1
fi

# 验证SSL配置
echo -e "${YELLOW}[5/6] 验证SSL配置...${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
  echo '检查SSL证书信息:' && \
  openssl x509 -in 18979882_lovehome.xin_nginx/lovehome.xin.pem -text -noout | grep -A 2 'Validity' && \
  echo '检查SSL握手:' && \
  echo | openssl s_client -connect localhost:443 -servername lovehome.xin 2>/dev/null | grep 'Verification'"

# 运行连接测试
echo -e "${YELLOW}[6/6] 运行连接测试...${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
  NODE_ENV=production node test-wechat-conn.js"

# 部署完成
echo -e "${GREEN}===== 微信小程序连接修复部署完成 =====${NC}"
echo -e "${YELLOW}如需手动验证，请使用微信开发者工具重新连接或运行以下命令:${NC}"
echo -e "  ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP \"cd $REMOTE_PATH && NODE_ENV=production node test-wechat-conn.js\""
echo -e "${YELLOW}请监控服务器日志以确认修复是否生效:${NC}"
echo -e "  ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP \"cd $REMOTE_PATH && pm2 logs server\""