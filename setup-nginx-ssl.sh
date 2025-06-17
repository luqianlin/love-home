#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== Nginx和SSL配置工具 ====${NC}"

# 证书目录
CERT_DIR="/var/www/love-home/18979882_lovehome.xin_nginx"
mkdir -p $CERT_DIR

# 生成自签名证书
echo -e "${YELLOW}生成自签名SSL证书...${NC}"
cd $CERT_DIR

# 生成私钥
openssl genrsa -out server.key 2048

# 生成CSR
openssl req -new -key server.key -out server.csr -subj "/C=CN/ST=Beijing/L=Beijing/O=LoveHome/OU=IT/CN=lovehome.xin"

# 生成自签名证书
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

echo -e "${GREEN}证书已生成: ${CERT_DIR}/server.crt${NC}"

# 配置Nginx
echo -e "${YELLOW}配置Nginx...${NC}"

# 上传Nginx配置
NGINX_CONF="/etc/nginx/conf.d/lovehome.xin.conf"
cat > $NGINX_CONF << 'EOL'
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
    ssl_certificate /var/www/love-home/18979882_lovehome.xin_nginx/server.crt;
    ssl_certificate_key /var/www/love-home/18979882_lovehome.xin_nginx/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # API代理 - 注意端口是8080
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件和前端SPA
    location / {
        # 先尝试文件系统中的静态文件
        root /var/www;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 自定义错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
EOL

echo -e "${GREEN}Nginx配置已创建: ${NGINX_CONF}${NC}"

# 测试Nginx配置
echo -e "${YELLOW}测试Nginx配置...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Nginx配置测试通过${NC}"
    
    # 重启Nginx
    echo -e "${YELLOW}重启Nginx...${NC}"
    systemctl restart nginx
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Nginx已重启${NC}"
        
        # 检查服务状态
        echo -e "${YELLOW}检查Nginx状态...${NC}"
        systemctl status nginx
        
        # 测试HTTP到HTTPS重定向
        echo -e "${YELLOW}测试HTTP到HTTPS重定向...${NC}"
        curl -I http://localhost || echo "HTTP测试失败"
        
        # 测试HTTPS连接
        echo -e "${YELLOW}测试HTTPS连接...${NC}"
        curl -k -I https://localhost || echo "HTTPS测试失败"
        
        # 测试API代理
        echo -e "${YELLOW}测试API代理...${NC}"
        curl -k https://localhost/api/health || echo "API代理测试失败"
    else
        echo -e "${RED}Nginx重启失败${NC}"
    fi
else
    echo -e "${RED}Nginx配置测试失败${NC}"
fi

echo -e "${GREEN}==== 配置完成 ====${NC}"
echo "请确保您的DNS已正确配置，将lovehome.xin指向服务器IP地址"
echo "如果需要使用真实SSL证书，请使用Let's Encrypt或其他证书提供商获取证书" 