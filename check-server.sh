#!/bin/bash

# 智慧社区平台服务器健康检查脚本
# 用于检查服务器状态并提供诊断信息

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 域名和端点配置
DOMAIN="lovehome.xin"
HTTP_HEALTH_ENDPOINT="http://$DOMAIN/health"
HTTPS_HEALTH_ENDPOINT="https://$DOMAIN/health"
HTTP_API_HEALTH_ENDPOINT="http://$DOMAIN/api/health"
HTTPS_API_HEALTH_ENDPOINT="https://$DOMAIN/api/health"
NODE_PORT=8080
NODE_HEALTH_ENDPOINT="http://localhost:$NODE_PORT/api/health"

# 打印标题
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   智慧社区平台服务器健康检查工具   ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# 检查基本命令是否可用
command -v curl >/dev/null 2>&1 || { echo -e "${RED}错误: 需要curl命令但未安装${NC}"; exit 1; }
command -v nc >/dev/null 2>&1 || { echo -e "${YELLOW}警告: 建议安装netcat以获得更好的诊断${NC}"; }

# 检查系统时间
echo -e "${BLUE}[系统时间]${NC}"
echo -e "当前系统时间: $(date)"
echo

# 检查基本网络连接
echo -e "${BLUE}[基本网络连接]${NC}"
ping -c 1 $DOMAIN > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 到 $DOMAIN 的网络连接正常${NC}"
else
    echo -e "${RED}✗ 无法连接到 $DOMAIN，请检查网络设置或DNS解析${NC}"
fi
echo

# 检查端口连接
echo -e "${BLUE}[端口检查]${NC}"
if command -v nc >/dev/null 2>&1; then
    nc -z -w 5 $DOMAIN 80 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ HTTP端口(80)开放${NC}"
    else
        echo -e "${RED}✗ HTTP端口(80)不可访问${NC}"
    fi
    
    nc -z -w 5 $DOMAIN 443 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ HTTPS端口(443)开放${NC}"
    else
        echo -e "${RED}✗ HTTPS端口(443)不可访问${NC}"
    fi
    
    nc -z -w 5 localhost $NODE_PORT > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Node.js服务端口($NODE_PORT)开放${NC}"
    else
        echo -e "${RED}✗ Node.js服务端口($NODE_PORT)不可访问${NC}"
    fi
else
    echo -e "${YELLOW}! 无法进行端口检查（未安装netcat）${NC}"
fi
echo

# 检查HTTP健康端点
echo -e "${BLUE}[HTTP健康检查]${NC}"
HTTP_RESULT=$(curl -s -o /dev/null -w "%{http_code}" $HTTP_HEALTH_ENDPOINT)
if [ "$HTTP_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTP健康检查端点($HTTP_HEALTH_ENDPOINT)正常${NC}"
else
    echo -e "${RED}✗ HTTP健康检查端点($HTTP_HEALTH_ENDPOINT)异常，状态码: $HTTP_RESULT${NC}"
fi

HTTP_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" $HTTP_API_HEALTH_ENDPOINT)
if [ "$HTTP_API_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTP API健康检查端点($HTTP_API_HEALTH_ENDPOINT)正常${NC}"
else
    echo -e "${RED}✗ HTTP API健康检查端点($HTTP_API_HEALTH_ENDPOINT)异常，状态码: $HTTP_API_RESULT${NC}"
fi
echo

# 检查HTTPS健康端点
echo -e "${BLUE}[HTTPS健康检查]${NC}"
HTTPS_RESULT=$(curl -s -o /dev/null -w "%{http_code}" $HTTPS_HEALTH_ENDPOINT)
if [ "$HTTPS_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTPS健康检查端点($HTTPS_HEALTH_ENDPOINT)正常${NC}"
else
    echo -e "${RED}✗ HTTPS健康检查端点($HTTPS_HEALTH_ENDPOINT)异常，状态码: $HTTPS_RESULT${NC}"
fi

HTTPS_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" $HTTPS_API_HEALTH_ENDPOINT)
if [ "$HTTPS_API_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ HTTPS API健康检查端点($HTTPS_API_HEALTH_ENDPOINT)正常${NC}"
else
    echo -e "${RED}✗ HTTPS API健康检查端点($HTTPS_API_HEALTH_ENDPOINT)异常，状态码: $HTTPS_API_RESULT${NC}"
fi
echo

# 检查本地Node.js服务
echo -e "${BLUE}[本地Node.js服务]${NC}"
NODE_RESULT=$(curl -s -o /dev/null -w "%{http_code}" $NODE_HEALTH_ENDPOINT)
if [ "$NODE_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ Node.js服务健康检查端点($NODE_HEALTH_ENDPOINT)正常${NC}"
    
    # 获取详细信息
    NODE_INFO=$(curl -s $NODE_HEALTH_ENDPOINT)
    echo -e "${GREEN}服务信息: $NODE_INFO${NC}"
else
    echo -e "${RED}✗ Node.js服务健康检查端点($NODE_HEALTH_ENDPOINT)异常，状态码: $NODE_RESULT${NC}"
    
    # 检查进程
    PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}! Node.js进程正在运行(PID: $PID)，但健康检查失败${NC}"
    else
        echo -e "${RED}✗ 未找到Node.js进程${NC}"
    fi
fi
echo

# 检查Nginx状态
echo -e "${BLUE}[Nginx状态]${NC}"
NGINX_RUNNING=$(ps aux | grep nginx | grep -v grep)
if [ -n "$NGINX_RUNNING" ]; then
    echo -e "${GREEN}✓ Nginx服务正在运行${NC}"
else
    echo -e "${RED}✗ Nginx服务未运行${NC}"
fi
echo

# 总结
echo -e "${BLUE}[检查结果总结]${NC}"
if [ "$HTTP_RESULT" == "200" ] || [ "$HTTPS_RESULT" == "200" ] || [ "$HTTP_API_RESULT" == "200" ] || [ "$HTTPS_API_RESULT" == "200" ]; then
    echo -e "${GREEN}✓ 服务器健康检查通过，至少有一个端点正常响应${NC}"
else
    echo -e "${RED}✗ 服务器健康检查失败，所有端点均无法正常响应${NC}"
    
    # 提供修复建议
    echo -e "${YELLOW}建议尝试以下修复步骤:${NC}"
    echo -e " 1. 检查Node.js服务是否正常运行: ${YELLOW}pm2 status${NC}"
    echo -e " 2. 重启Node.js服务: ${YELLOW}pm2 restart server${NC}"
    echo -e " 3. 检查Nginx配置: ${YELLOW}sudo nginx -t${NC}"
    echo -e " 4. 重启Nginx服务: ${YELLOW}sudo systemctl restart nginx${NC}"
    echo -e " 5. 查看服务器日志: ${YELLOW}pm2 logs${NC}"
fi
echo

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       健康检查完成                 ${NC}"
echo -e "${BLUE}=======================================${NC}"