#!/bin/bash

# 智慧社区平台部署脚本 - 腾讯云服务器
# 使用方法：./deploy-tencent.sh

# 服务器信息
SERVER_IP="49.235.80.118"
SERVER_USER="root"
SERVER_PASSWORD="lql@123lql"
SERVER_PATH="/var/www/love-home"

# 颜色设置
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # 无颜色

echo -e "${GREEN}===== 智慧社区平台部署工具 =====${NC}"
echo -e "${YELLOW}将代码部署到腾讯云服务器 (${SERVER_IP})${NC}"
echo

# 检查是否安装了sshpass
if ! command -v sshpass &> /dev/null; then
    echo "安装sshpass..."
    # 根据系统安装sshpass
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    elif command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "无法安装sshpass，请手动安装后重试"
        exit 1
    fi
fi

# 部署到服务器
echo -e "${YELLOW}正在部署到服务器...${NC}"

# 使用sshpass进行密码验证
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    # 确保目录存在
    mkdir -p $SERVER_PATH
    
    # 检查是否为首次部署
    if [ ! -d \"$SERVER_PATH/.git\" ]; then
        echo '首次部署，克隆仓库...'
        cd $(dirname $SERVER_PATH)
        git clone https://github.com/yourusername/love-home.git $(basename $SERVER_PATH)
        cd $SERVER_PATH
    else
        echo '更新代码...'
        cd $SERVER_PATH
        git pull origin main
    fi
    
    # 安装依赖
    echo '安装依赖...'
    npm install
    
    # 重启服务
    echo '重启服务...'
    if command -v pm2 &> /dev/null; then
        pm2 restart server || pm2 start server.js
    else
        npm install -g pm2
        pm2 start server.js
    fi
    
    # 配置Nginx（如果需要）
    if [ -f \"$SERVER_PATH/nginx-config.conf\" ]; then
        echo '配置Nginx...'
        cp $SERVER_PATH/nginx-config.conf /etc/nginx/sites-available/love-home.conf
        ln -sf /etc/nginx/sites-available/love-home.conf /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
    fi
    
    echo '部署完成！'
"

echo -e "${GREEN}部署已完成！${NC}"
echo -e "请访问 http://$SERVER_IP 检查站点是否正常运行"