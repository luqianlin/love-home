#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== 服务器修复工具 ====${NC}"

# 检查Node.js项目位置
echo -e "${YELLOW}检查Node.js项目位置...${NC}"
NODE_APP_PATH="/var/www/love-home/love-home"

if [ -d "$NODE_APP_PATH" ]; then
    echo -e "${GREEN}找到Node.js应用目录: $NODE_APP_PATH${NC}"
    cd "$NODE_APP_PATH"
    
    # 添加健康检查路由
    echo -e "${YELLOW}添加健康检查端点...${NC}"
    if [ -f "server/server.js" ]; then
        echo -e "${GREEN}找到服务器文件: server/server.js${NC}"
        
        # 检查routes文件夹是否存在
        if [ -d "server/routes" ]; then
            echo -e "${GREEN}找到routes目录${NC}"
            
            # 检查index.js文件是否存在
            if [ -f "server/routes/index.js" ]; then
                echo -e "${GREEN}找到routes/index.js文件${NC}"
                
                # 检查是否已有健康检查路由
                if grep -q "router.get('/health'" "server/routes/index.js"; then
                    echo -e "${GREEN}健康检查路由已存在${NC}"
                else
                    echo -e "${YELLOW}添加健康检查路由...${NC}"
                    # 备份原文件
                    cp "server/routes/index.js" "server/routes/index.js.bak"
                    
                    # 添加健康检查路由
                    sed -i '/const router = express.Router();/a\
\
// 健康检查端点\
router.get(\"/health\", (req, res) => {\
  res.status(200).json({ \
    status: \"ok\", \
    message: \"服务正常运行\",\
    timestamp: new Date().toISOString(),\
    uptime: process.uptime()\
  });\
});' "server/routes/index.js"
                    
                    echo -e "${GREEN}已添加健康检查路由${NC}"
                fi
            else
                echo -e "${RED}未找到routes/index.js文件${NC}"
            fi
        else
            echo -e "${RED}未找到routes目录${NC}"
        fi
    else
        echo -e "${RED}未找到server.js文件${NC}"
    fi
else
    echo -e "${RED}未找到Node.js应用目录: $NODE_APP_PATH${NC}"
fi

# 检查并安装Nginx
echo -e "${YELLOW}检查Nginx...${NC}"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}Nginx已安装${NC}"
else
    echo -e "${RED}Nginx未安装${NC}"
    echo -e "${YELLOW}安装Nginx...${NC}"
    if command -v yum &> /dev/null; then
        yum install -y nginx
    elif command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    else
        echo -e "${RED}无法确定包管理器，请手动安装Nginx${NC}"
    fi
fi

# 配置Nginx
echo -e "${YELLOW}配置Nginx...${NC}"
if command -v nginx &> /dev/null; then
    # 检查配置目录
    NGINX_CONF_DIR="/etc/nginx"
    if [ -d "$NGINX_CONF_DIR" ]; then
        echo -e "${GREEN}找到Nginx配置目录: $NGINX_CONF_DIR${NC}"
        
        # 备份原配置
        if [ -f "$NGINX_CONF_DIR/nginx.conf" ]; then
            cp "$NGINX_CONF_DIR/nginx.conf" "$NGINX_CONF_DIR/nginx.conf.bak"
            echo -e "${GREEN}已备份原配置${NC}"
        fi
        
        # 创建lovehome.xin配置
        echo -e "${YELLOW}创建lovehome.xin站点配置...${NC}"
        mkdir -p "$NGINX_CONF_DIR/conf.d"
        
        cat > "$NGINX_CONF_DIR/conf.d/lovehome.xin.conf" << 'EOL'
server {
    listen 80;
    server_name lovehome.xin;

    # 重定向HTTP到HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name lovehome.xin;

    # SSL配置
    ssl_certificate /var/www/love-home/18979882_lovehome.xin_nginx/fullchain.pem;
    ssl_certificate_key /var/www/love-home/18979882_lovehome.xin_nginx/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 根目录
    root /var/www/love-home/love-home/public;
    index index.html;

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # 前端SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOL
        echo -e "${GREEN}已创建站点配置${NC}"
        
        # 复制SSL证书
        echo -e "${YELLOW}准备SSL证书...${NC}"
        CERT_DIR="/var/www/love-home/18979882_lovehome.xin_nginx"
        mkdir -p "$CERT_DIR"
        
        # 判断证书位置
        if [ -d "/tmp/18979882_lovehome.xin_nginx" ]; then
            echo -e "${GREEN}找到本地证书目录，复制证书...${NC}"
            cp -r /tmp/18979882_lovehome.xin_nginx/* "$CERT_DIR/"
        else
            # 尝试在工作目录找证书
            if [ -d "18979882_lovehome.xin_nginx" ]; then
                echo -e "${YELLOW}需要上传证书文件...${NC}"
                echo "请使用以下命令上传证书:"
                echo "scp -r 18979882_lovehome.xin_nginx/* root@45.125.44.25:$CERT_DIR/"
            else
                echo -e "${RED}未找到证书文件，请手动配置${NC}"
                echo "修改 $NGINX_CONF_DIR/conf.d/lovehome.xin.conf 中的证书路径"
            fi
        fi
        
        # 测试配置
        echo -e "${YELLOW}测试Nginx配置...${NC}"
        nginx -t
        
        # 重启Nginx
        echo -e "${YELLOW}重启Nginx...${NC}"
        if systemctl status nginx &>/dev/null; then
            systemctl restart nginx
        else
            service nginx restart || /etc/init.d/nginx restart
        fi
    else
        echo -e "${RED}未找到Nginx配置目录${NC}"
    fi
else
    echo -e "${RED}Nginx安装失败${NC}"
fi

# 重启Node.js应用
echo -e "${YELLOW}重启Node.js应用...${NC}"
cd "$NODE_APP_PATH"
if [ -f "server/server.js" ]; then
    echo -e "${GREEN}找到server.js，尝试重启...${NC}"
    pkill -f "node.*server.js"
    nohup node server/server.js > server.log 2>&1 &
    echo -e "${GREEN}已重启Node.js应用${NC}"
else
    echo -e "${RED}未找到server.js，无法重启应用${NC}"
fi

echo -e "${GREEN}==== 修复完成 ====${NC}"
echo "请检查以下服务状态:"
echo "1. Nginx: systemctl status nginx"
echo "2. Node.js: ps aux | grep node"
echo "3. 健康检查: curl http://localhost:3000/api/health"
echo "4. HTTPS: curl -k https://lovehome.xin/api/health"