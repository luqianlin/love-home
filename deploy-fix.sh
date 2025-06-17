#!/bin/bash

# 微信小程序连接问题修复部署脚本
# 用于在服务器上应用修复并验证

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  微信小程序连接问题(ERR_CONNECTION_CLOSED)修复部署  ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo

# 确认当前目录是项目根目录
if [ ! -f "server.js" ] || [ ! -f "nginx-config.conf" ]; then
    echo -e "${RED}错误: 当前目录不是项目根目录${NC}"
    echo "请在包含server.js的项目根目录运行此脚本"
    exit 1
fi

# 检查必要命令
echo -e "${BLUE}[检查] 必要命令${NC}"
MISSING_TOOLS=0
for cmd in node npm nginx pm2 systemctl openssl curl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${YELLOW}警告: $cmd 未安装或不在PATH中${NC}"
        MISSING_TOOLS=1
    else
        echo -e "${GREEN}✓ $cmd 已安装${NC}"
    fi
done

if [ $MISSING_TOOLS -eq 1 ]; then
    echo -e "${YELLOW}警告: 有命令可能不可用，部分步骤可能失败${NC}"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 备份当前文件
echo -e "${BLUE}[备份] 创建修复前备份${NC}"
BACKUP_DIR="backups/wechat-fix-$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR
cp server.js nginx-config.conf $BACKUP_DIR/
cp -r frontend-mp/src/utils $BACKUP_DIR/
echo -e "${GREEN}✓ 备份已创建: $BACKUP_DIR${NC}"

# 停止服务
echo -e "${BLUE}[部署] 停止服务${NC}"
echo "正在停止Node.js服务..."
if command -v pm2 &> /dev/null; then
    pm2 stop server || echo -e "${YELLOW}警告: 无法停止PM2服务或服务未运行${NC}"
else
    echo -e "${YELLOW}警告: PM2未安装，跳过服务停止${NC}"
fi

# 应用修复 - Node.js服务
echo -e "${BLUE}[部署] 应用Node.js修复${NC}"
echo "正在重启Node.js服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart server || pm2 start server.js
    echo -e "${GREEN}✓ Node.js服务已重启${NC}"
else
    echo -e "${YELLOW}警告: PM2未安装，无法重启服务${NC}"
    echo "请手动重启Node.js服务"
fi

# 应用修复 - Nginx
echo -e "${BLUE}[部署] 应用Nginx修复${NC}"
if command -v nginx &> /dev/null; then
    echo "检查Nginx配置语法..."
    nginx -t
    if [ $? -eq 0 ]; then
        echo "正在重载Nginx配置..."
        systemctl reload nginx || echo -e "${YELLOW}警告: 无法重载Nginx配置${NC}"
        echo -e "${GREEN}✓ Nginx配置已重载${NC}"
    else
        echo -e "${RED}错误: Nginx配置有语法错误，请修复后再重载${NC}"
    fi
else
    echo -e "${YELLOW}警告: Nginx未安装或不在PATH中，无法重载配置${NC}"
    echo "请手动重载Nginx配置"
fi

# 验证健康检查端点
echo -e "${BLUE}[验证] 测试健康检查端点${NC}"
echo "测试1: HTTP健康检查端点"
HTTP_RESULT=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/health)
if [ "$HTTP_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTP健康检查正常${NC}"
else
    echo -e "${RED}✗ HTTP健康检查失败，状态码: $HTTP_RESULT${NC}"
fi

echo "测试2: HTTPS健康检查端点"
# 使用域名测试
DOMAIN="lovehome.xin"
HTTPS_RESULT=$(curl -s -w "%{http_code}" -o /dev/null https://$DOMAIN/health --insecure)
if [ "$HTTPS_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTPS健康检查正常${NC}"
else
    echo -e "${RED}✗ HTTPS健康检查失败，状态码: $HTTPS_RESULT${NC}"
fi

# 运行微信小程序连接测试脚本
echo -e "${BLUE}[验证] 运行微信小程序连接测试${NC}"
if [ -f "test-wechat-conn.js" ]; then
    node test-wechat-conn.js
else
    echo -e "${RED}错误: 找不到test-wechat-conn.js测试脚本${NC}"
    echo "请确保脚本存在并重新运行"
fi

# 总结
echo
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}微信小程序连接修复部署完成${NC}"
echo -e "${BLUE}=========================================${NC}"
echo
echo -e "修复内容:"
echo " 1. 优化了Node.js服务健康检查端点"
echo " 2. 优化了Nginx SSL配置"
echo " 3. 专为微信小程序添加了特殊处理"
echo
echo -e "如果问题仍然存在，请检查:"
echo " 1. 服务器防火墙和云服务提供商安全组设置"
echo " 2. SSL证书链是否完整"
echo " 3. 微信小程序管理后台的域名配置"
echo
echo -e "${BLUE}=========================================${NC}"