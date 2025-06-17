#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 确认函数
confirm() {
    read -p "$1 (y/n): " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

echo -e "${GREEN}==== Nginx配置更新工具 ====${NC}"
echo "此脚本将帮助您更新Nginx配置以使用lovehome.xin域名和对应的SSL证书"
echo ""

# 1. 备份当前配置
echo -e "${YELLOW}步骤1: 备份当前Nginx配置${NC}"
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d%H%M%S)"
echo "备份文件将保存为: $BACKUP_FILE"
echo "运行命令: sudo cp /etc/nginx/nginx.conf $BACKUP_FILE"
if confirm "是否继续?"; then
    sudo cp /etc/nginx/nginx.conf $BACKUP_FILE
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}备份成功!${NC}"
    else
        echo -e "${RED}备份失败!${NC}"
        exit 1
    fi
else
    echo "操作已取消"
    exit 0
fi
echo ""

# 2. 修改配置文件
echo -e "${YELLOW}步骤2: 更新服务器名称和证书路径${NC}"
echo "将修改以下内容:"
echo "- 服务器名称: community.example.com -> lovehome.xin"
echo "- 证书路径: /etc/letsencrypt/live/community.example.com/ -> /etc/letsencrypt/live/lovehome.xin/"
echo "  (如果您的证书在其他位置，请在下一步手动指定)"
if confirm "是否继续?"; then
    # 修改服务器名称
    sudo sed -i 's/server_name community.example.com/server_name lovehome.xin/g' /etc/nginx/nginx.conf
    
    # 修改证书路径
    sudo sed -i 's|/etc/letsencrypt/live/community.example.com/|/etc/letsencrypt/live/lovehome.xin/|g' /etc/nginx/nginx.conf
    
    echo -e "${GREEN}配置已更新!${NC}"
else
    echo "操作已取消"
    exit 0
fi
echo ""

# 3. 手动指定证书路径
echo -e "${YELLOW}步骤3: 手动指定证书路径${NC}"
echo "如果您的证书不在默认位置，您可以手动指定路径"
if confirm "是否需要手动指定证书路径?"; then
    read -p "请输入证书(fullchain.pem)完整路径: " CERT_PATH
    read -p "请输入密钥(privkey.pem)完整路径: " KEY_PATH
    
    if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
        sudo sed -i "s|ssl_certificate .*|ssl_certificate $CERT_PATH;|g" /etc/nginx/nginx.conf
        sudo sed -i "s|ssl_certificate_key .*|ssl_certificate_key $KEY_PATH;|g" /etc/nginx/nginx.conf
        echo -e "${GREEN}证书路径已更新!${NC}"
    else
        echo -e "${RED}证书文件不存在，请检查路径!${NC}"
    fi
else
    echo "跳过手动设置证书路径"
fi
echo ""

# 4. 检查配置语法
echo -e "${YELLOW}步骤4: 检查Nginx配置语法${NC}"
echo "运行命令: sudo nginx -t"
if confirm "是否继续?"; then
    sudo nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}配置语法正确!${NC}"
    else
        echo -e "${RED}配置语法错误!${NC}"
        if confirm "是否恢复备份?"; then
            sudo cp $BACKUP_FILE /etc/nginx/nginx.conf
            echo -e "${GREEN}已恢复备份!${NC}"
        fi
        exit 1
    fi
else
    echo "操作已取消"
    exit 0
fi
echo ""

# 5. 重新加载Nginx
echo -e "${YELLOW}步骤5: 重新加载Nginx配置${NC}"
echo "运行命令: sudo systemctl reload nginx"
if confirm "是否继续?"; then
    sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Nginx配置已重新加载!${NC}"
    else
        echo -e "${RED}Nginx配置重新加载失败!${NC}"
        exit 1
    fi
else
    echo "操作已取消"
    exit 0
fi
echo ""

# 6. 测试HTTPS连接
echo -e "${YELLOW}步骤6: 测试HTTPS连接${NC}"
echo "运行命令: curl -I https://lovehome.xin"
if confirm "是否继续?"; then
    curl -I https://lovehome.xin
fi
echo ""

echo -e "${GREEN}==== 配置更新完成 ====${NC}"
echo "如果您遇到任何问题，可以通过以下命令恢复备份:"
echo "sudo cp $BACKUP_FILE /etc/nginx/nginx.conf && sudo systemctl reload nginx" 