#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==== 更新SSL证书配置 ====${NC}"

# 证书文件路径
CERT_PATH="/18979882_lovehome.xin_nginx/lovehome.xin.pem"
KEY_PATH="/18979882_lovehome.xin_nginx/lovehome.xin.key"

# 检查证书文件是否存在
echo -e "${YELLOW}检查证书文件...${NC}"
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo -e "${GREEN}找到证书文件:${NC}"
    echo "证书: $CERT_PATH"
    echo "密钥: $KEY_PATH"
    
    # 检查证书有效性
    echo -e "${YELLOW}检查证书有效性...${NC}"
    openssl x509 -in "$CERT_PATH" -noout -dates -issuer -subject
    
    # 更新Nginx配置
    echo -e "${YELLOW}更新Nginx配置...${NC}"
    NGINX_CONF="/etc/nginx/conf.d/lovehome.xin.conf"
    
    if [ -f "$NGINX_CONF" ]; then
        # 备份原配置
        cp "$NGINX_CONF" "${NGINX_CONF}.bak"
        echo -e "${GREEN}已备份原配置到 ${NGINX_CONF}.bak${NC}"
        
        # 更新证书路径
        sed -i "s|ssl_certificate .*|ssl_certificate $CERT_PATH;|g" "$NGINX_CONF"
        sed -i "s|ssl_certificate_key .*|ssl_certificate_key $KEY_PATH;|g" "$NGINX_CONF"
        
        echo -e "${GREEN}已更新证书路径${NC}"
        
        # 测试Nginx配置
        echo -e "${YELLOW}测试Nginx配置...${NC}"
        nginx -t
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx配置测试通过${NC}"
            
            # 重启Nginx
            echo -e "${YELLOW}重启Nginx...${NC}"
            systemctl restart nginx
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Nginx已重启，SSL证书已更新${NC}"
                
                # 检查HTTPS连接
                echo -e "${YELLOW}测试HTTPS连接...${NC}"
                curl -I https://localhost
            else
                echo -e "${RED}Nginx重启失败${NC}"
            fi
        else
            echo -e "${RED}Nginx配置测试失败，恢复备份${NC}"
            cp "${NGINX_CONF}.bak" "$NGINX_CONF"
            systemctl restart nginx
        fi
    else
        echo -e "${RED}未找到Nginx配置文件: $NGINX_CONF${NC}"
        echo -e "${YELLOW}创建新的配置文件...${NC}"
        
        # 创建配置目录
        mkdir -p /etc/nginx/conf.d
        
        # 创建配置文件
        cat > "$NGINX_CONF" << EOL
server {
    listen 80;
    server_name lovehome.xin;

    # 重定向HTTP到HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name lovehome.xin;

    # SSL配置
    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # API代理 - 端口为8080
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件和前端SPA
    location / {
        root /var/www;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOL
        echo -e "${GREEN}已创建新的配置文件${NC}"
        
        # 测试和重启Nginx
        echo -e "${YELLOW}测试Nginx配置...${NC}"
        nginx -t
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx配置测试通过${NC}"
            systemctl restart nginx
            echo -e "${GREEN}Nginx已重启，SSL证书已配置${NC}"
        else
            echo -e "${RED}Nginx配置测试失败${NC}"
        fi
    fi
else
    echo -e "${RED}未找到证书文件${NC}"
    echo "请确认证书文件路径:"
    echo "证书: $CERT_PATH"
    echo "密钥: $KEY_PATH"
    
    echo -e "${YELLOW}尝试查找证书文件...${NC}"
    find / -name "*.pem" -o -name "*.key" | grep -i lovehome
fi

echo -e "${GREEN}==== 配置完成 ====${NC}"