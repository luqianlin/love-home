#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   智慧社区平台服务器修复工具   ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# 检查是否有足够权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}警告：建议使用sudo权限运行此脚本${NC}"
  echo
fi

# 函数：重启Node.js服务
restart_node_service() {
  echo -e "${BLUE}[1/5] 重启Node.js服务${NC}"
  if command -v pm2 &> /dev/null; then
    echo "使用PM2重启服务..."
    pm2 restart server || pm2 restart all
    echo -e "${GREEN}✓ Node.js服务重启完成${NC}"
  else
    echo -e "${RED}✗ 未找到PM2，无法重启Node.js服务${NC}"
    echo "尝试使用系统服务重启..."
    sudo systemctl restart node-server || echo -e "${RED}✗ 系统服务重启失败${NC}"
  fi
  echo
}

# 函数：检查并修复Nginx配置
check_nginx_config() {
  echo -e "${BLUE}[2/5] 检查Nginx配置${NC}"
  if command -v nginx &> /dev/null; then
    echo "检查Nginx配置语法..."
    nginx -t
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Nginx配置正确${NC}"
    else
      echo -e "${RED}✗ Nginx配置有误，请手动修复${NC}"
      return 1
    fi
  else
    echo -e "${RED}✗ 未找到Nginx命令${NC}"
    return 1
  fi
  echo
  return 0
}

# 函数：重启Nginx服务
restart_nginx() {
  echo -e "${BLUE}[3/5] 重启Nginx服务${NC}"
  if command -v nginx &> /dev/null; then
    echo "重启Nginx服务..."
    sudo systemctl restart nginx || sudo service nginx restart
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Nginx服务重启完成${NC}"
    else
      echo -e "${RED}✗ Nginx服务重启失败${NC}"
      return 1
    fi
  else
    echo -e "${RED}✗ 未找到Nginx命令${NC}"
    return 1
  fi
  echo
  return 0
}

# 函数：检查防火墙设置
check_firewall() {
  echo -e "${BLUE}[4/5] 检查防火墙设置${NC}"
  if command -v ufw &> /dev/null; then
    echo "检查UFW防火墙状态..."
    sudo ufw status
    echo "确保HTTP和HTTPS端口开放..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo -e "${GREEN}✓ 防火墙端口检查完成${NC}"
  elif command -v firewall-cmd &> /dev/null; then
    echo "检查firewalld防火墙状态..."
    sudo firewall-cmd --list-all
    echo "确保HTTP和HTTPS端口开放..."
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo -e "${GREEN}✓ 防火墙端口检查完成${NC}"
  else
    echo -e "${YELLOW}! 未找到常见防火墙命令，请手动检查防火墙设置${NC}"
  fi
  echo
}

# 函数：测试健康检查端点
test_health_endpoint() {
  echo -e "${BLUE}[5/5] 测试健康检查端点${NC}"
  # 测试本地健康检查端点
  echo "测试本地Node.js健康检查端点..."
  local_result=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)
  if [ "$local_result" == "200" ]; then
    echo -e "${GREEN}✓ 本地健康检查端点响应正常 (状态码: $local_result)${NC}"
    local_content=$(curl -s http://localhost:8080/api/health)
    echo "响应内容: $local_content"
  else
    echo -e "${RED}✗ 本地健康检查端点响应异常 (状态码: $local_result)${NC}"
  fi
  
  # 测试HTTP健康检查端点
  echo "测试HTTP健康检查端点..."
  http_result=$(curl -s -o /dev/null -w "%{http_code}" http://lovehome.xin/api/health)
  if [ "$http_result" == "200" ]; then
    echo -e "${GREEN}✓ HTTP健康检查端点响应正常 (状态码: $http_result)${NC}"
  else
    echo -e "${RED}✗ HTTP健康检查端点响应异常 (状态码: $http_result)${NC}"
  fi
  
  # 测试HTTPS健康检查端点
  echo "测试HTTPS健康检查端点..."
  https_result=$(curl -s -o /dev/null -w "%{http_code}" https://lovehome.xin/api/health)
  if [ "$https_result" == "200" ]; then
    echo -e "${GREEN}✓ HTTPS健康检查端点响应正常 (状态码: $https_result)${NC}"
    https_content=$(curl -s https://lovehome.xin/api/health)
    echo "响应内容: $https_content"
  else
    echo -e "${RED}✗ HTTPS健康检查端点响应异常 (状态码: $https_result)${NC}"
  fi
  echo
  
  # 返回总体结果
  if [ "$local_result" == "200" ] && [ "$https_result" == "200" ]; then
    return 0
  else
    return 1
  fi
}

# 主执行流程
echo -e "${YELLOW}此脚本将执行以下修复操作:${NC}"
echo "1. 重启Node.js服务"
echo "2. 检查Nginx配置"
echo "3. 重启Nginx服务"
echo "4. 检查防火墙设置"
echo "5. 测试健康检查端点"
echo

read -p "是否继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}操作已取消${NC}"
  exit 1
fi

# 执行修复步骤
restart_node_service
check_nginx_config && restart_nginx
check_firewall
test_health_endpoint
result=$?

# 总结
echo -e "${BLUE}=======================================${NC}"
if [ $result -eq 0 ]; then
  echo -e "${GREEN}✓ 服务器修复成功!${NC}"
  echo -e "${GREEN}✓ 所有健康检查端点均正常响应${NC}"
else
  echo -e "${YELLOW}! 服务器部分修复，但仍有问题${NC}"
  echo -e "${YELLOW}! 建议查看服务器日志以获取更多信息:${NC}"
  echo "  - Node.js日志: pm2 logs"
  echo "  - Nginx错误日志: /var/log/nginx/error.log"
  echo "  - 系统日志: journalctl -xe"
fi
echo -e "${BLUE}=======================================${NC}"
