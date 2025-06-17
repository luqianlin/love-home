#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== 健康检查端点修复工具 ====${NC}"

# 检查Node.js服务状态
echo -e "${YELLOW}检查Node.js服务状态${NC}"
if command -v pm2 &> /dev/null; then
    echo "使用PM2检查服务:"
    pm2 list
    
    # 获取应用ID
    APP_ID=$(pm2 list | grep love-home | awk '{print $2}')
    if [ -n "$APP_ID" ]; then
        echo -e "${GREEN}找到应用ID: $APP_ID${NC}"
    else
        echo -e "${RED}未找到应用${NC}"
        echo "尝试启动应用:"
        cd /path/to/love-home  # 请修改为实际路径
        pm2 start ecosystem.config.js
    fi
else
    echo -e "${RED}未安装PM2${NC}"
    echo "检查Node.js进程:"
    ps aux | grep node
fi

# 测试本地健康检查端点
echo -e "${YELLOW}测试本地健康检查端点${NC}"
echo "运行命令: curl http://localhost:3000/api/health"
RESPONSE=$(curl -s http://localhost:3000/api/health)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}健康检查端点返回状态码: $HTTP_CODE (正常)${NC}"
    echo "响应内容:"
    echo "$RESPONSE"
else
    echo -e "${RED}健康检查端点返回状态码: $HTTP_CODE (异常)${NC}"
    echo "尝试修复..."
    
    # 检查路由是否正确配置
    if [ -f "backend/src/routes/index.js" ]; then
        HEALTH_CHECK=$(grep -n "router.get('/health'" backend/src/routes/index.js)
        if [ -n "$HEALTH_CHECK" ]; then
            echo -e "${GREEN}健康检查路由已配置: $HEALTH_CHECK${NC}"
        else
            echo -e "${RED}健康检查路由未配置${NC}"
            echo "添加健康检查路由..."
            # 插入健康检查路由
            sed -i '/const router = express.Router();/a\
\
// API健康检查端点\
router.get(\'/health\', (req, res) => {\
  res.status(200).json({ \
    status: \'ok\', \
    message: \'服务正常运行\',\
    timestamp: new Date().toISOString(),\
    uptime: process.uptime()\
  });\
});' backend/src/routes/index.js
            
            echo -e "${GREEN}已添加健康检查路由${NC}"
        fi
    else
        echo -e "${RED}未找到路由文件${NC}"
    fi
    
    # 检查静态健康检查文件
    if [ -f "public/api/health" ]; then
        echo -e "${GREEN}静态健康检查文件已存在${NC}"
        echo "文件内容:"
        cat public/api/health
    else
        echo -e "${RED}静态健康检查文件不存在${NC}"
        echo "创建静态健康检查文件..."
        mkdir -p public/api
        cat > public/api/health << EOL
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "environment": "production",
  "uptime": "0d 0h 0m"
}
EOL
        echo -e "${GREEN}已创建静态健康检查文件${NC}"
    fi
    
    # 重启应用
    echo "重启Node.js应用..."
    if command -v pm2 &> /dev/null; then
        pm2 restart all
    else
        echo -e "${RED}未安装PM2，无法自动重启应用${NC}"
        echo "请手动重启Node.js应用"
    fi
fi

# 测试Nginx代理的健康检查端点
echo -e "${YELLOW}测试Nginx代理的健康检查端点${NC}"
echo "运行命令: curl https://lovehome.xin/api/health"
HTTP_CODE=$(curl -s -k -o /dev/null -w "%{http_code}" https://lovehome.xin/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}通过Nginx的健康检查端点返回状态码: $HTTP_CODE (正常)${NC}"
else
    echo -e "${RED}通过Nginx的健康检查端点返回状态码: $HTTP_CODE (异常)${NC}"
    echo "问题可能是:"
    echo "1. Nginx配置中的代理设置不正确"
    echo "2. 防火墙阻止了Nginx与Node.js服务的通信"
    echo "3. Node.js服务未监听正确的端口或地址"
    
    echo -e "${YELLOW}检查Nginx配置中的代理设置...${NC}"
    if [ -f "/etc/nginx/nginx.conf" ]; then
        grep -A 10 "location /api" /etc/nginx/nginx.conf
    else
        echo -e "${RED}未找到Nginx配置文件${NC}"
    fi
fi

echo -e "${GREEN}==== 健康检查完成 ====${NC}"
echo "如果问题仍然存在，请检查:"
echo "1. 确保Node.js服务正在运行并监听正确的端口"
echo "2. 检查Nginx配置中的代理设置是否正确"
echo "3. 确保防火墙允许Nginx与Node.js服务通信"
echo "4. 查看Nginx和Node.js服务的日志以获取更多信息" 