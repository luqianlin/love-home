#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

CERT_DIR="18979882_lovehome.xin_nginx"

echo -e "${GREEN}==== 检查SSL证书 ====${NC}"

# 检查证书目录是否存在
if [ -d "$CERT_DIR" ]; then
    echo -e "${GREEN}证书目录存在: $CERT_DIR${NC}"
    echo "目录内容:"
    ls -la "$CERT_DIR"
    echo ""
    
    # 检查证书文件
    if [ -f "$CERT_DIR/lovehome.xin.pem" ]; then
        echo -e "${GREEN}找到证书文件: $CERT_DIR/lovehome.xin.pem${NC}"
        echo "证书信息:"
        openssl x509 -in "$CERT_DIR/lovehome.xin.pem" -text -noout | grep -A 2 "Issuer:" 
        echo ""
        openssl x509 -in "$CERT_DIR/lovehome.xin.pem" -text -noout | grep -A 2 "Subject:" 
        echo ""
        openssl x509 -in "$CERT_DIR/lovehome.xin.pem" -noout -dates
        echo ""
    elif [ -f "$CERT_DIR/fullchain.pem" ]; then
        echo -e "${GREEN}找到证书文件: $CERT_DIR/fullchain.pem${NC}"
        echo "证书信息:"
        openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep -A 2 "Issuer:" 
        echo ""
        openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep -A 2 "Subject:" 
        echo ""
        openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -dates
        echo ""
    else
        echo -e "${YELLOW}寻找其他可能的证书文件...${NC}"
        find "$CERT_DIR" -name "*.pem" -o -name "*.crt" | while read cert_file; do
            echo -e "${GREEN}找到证书文件: $cert_file${NC}"
            echo "证书信息:"
            openssl x509 -in "$cert_file" -text -noout | grep -A 2 "Issuer:" 
            echo ""
            openssl x509 -in "$cert_file" -text -noout | grep -A 2 "Subject:" 
            echo ""
            openssl x509 -in "$cert_file" -noout -dates
            echo ""
        done
    fi
else
    echo -e "${RED}证书目录不存在: $CERT_DIR${NC}"
    echo "检查工作目录:"
    pwd
    echo ""
    echo "尝试查找证书文件:"
    find . -name "*.pem" -o -name "*.crt" | grep -i lovehome
fi

echo -e "${GREEN}==== 检查Nginx配置中的证书路径 ====${NC}"
if [ -f "nginx/nginx.conf" ]; then
    echo "Nginx配置文件中的证书路径:"
    grep -n "ssl_certificate" nginx/nginx.conf
    echo ""
else
    echo -e "${YELLOW}未找到本地Nginx配置文件${NC}"
fi

echo -e "${GREEN}==== 建议操作 ====${NC}"
echo "1. 确保Nginx配置中的证书路径正确指向'$CERT_DIR'目录下的证书文件"
echo "2. 确保证书文件权限正确 (建议: 644/-rw-r--r--)"
echo "3. 确保证书有效期足够长"
echo "4. 在服务器上运行 'nginx -t' 检查配置语法" 