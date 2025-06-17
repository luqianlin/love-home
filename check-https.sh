#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}检查lovehome.xin HTTP到HTTPS跳转${NC}"
echo "发送HTTP请求，检查状态码和Location头..."
curl -I -s http://lovehome.xin | head -n 10
echo ""

echo -e "${GREEN}检查HTTPS连接${NC}"
echo "发送HTTPS请求，检查状态码和证书..."
curl -I -s https://lovehome.xin | head -n 10
echo ""

echo -e "${GREEN}使用OpenSSL检查HTTPS连接和证书${NC}"
echo | openssl s_client -servername lovehome.xin -connect lovehome.xin:443 2>/dev/null | grep -A 2 "server certificate" && echo "证书验证成功" || echo -e "${RED}证书验证失败${NC}"
echo ""

echo -e "${GREEN}检查证书有效期${NC}"
echo | openssl s_client -servername lovehome.xin -connect lovehome.xin:443 2>/dev/null | openssl x509 -noout -dates
echo ""

echo -e "${GREEN}验证API健康检查端点${NC}"
code=$(curl -s -o /dev/null -w "%{http_code}" https://lovehome.xin/api/health)
if [ "$code" = "200" ]; then
  echo -e "${GREEN}API健康检查端点返回状态码: $code (正常)${NC}"
  echo "API响应内容:"
  curl -s https://lovehome.xin/api/health
  echo ""
else
  echo -e "${RED}API健康检查端点返回状态码: $code (异常)${NC}"
fi