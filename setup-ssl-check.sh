#!/bin/bash

# SSL证书检查与修复脚本
# 用于检查SSL证书配置并修复微信小程序连接问题

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 域名和证书配置
DOMAIN="lovehome.xin"
CERT_DIR="/var/www/love-home/18979882_lovehome.xin_nginx"
CERT_FILE="${CERT_DIR}/${DOMAIN}.pem"
KEY_FILE="${CERT_DIR}/${DOMAIN}.key"
CHAIN_FILE="${CERT_DIR}/fullchain.pem"

echo -e "${BLUE}===== SSL证书检查与修复工具 =====${NC}"

# 1. 检查证书文件是否存在
echo -e "${YELLOW}[1/5] 检查证书文件...${NC}"
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo -e "${GREEN}✓ 证书文件存在${NC}"
else
  echo -e "${RED}✗ 证书文件不存在${NC}"
  echo "  证书文件: $CERT_FILE"
  echo "  密钥文件: $KEY_FILE"
  echo "请确保证书文件存在再继续"
  exit 1
fi

# 2. 检查证书有效期
echo -e "\n${YELLOW}[2/5] 检查证书有效期...${NC}"
CERT_DATES=$(openssl x509 -in "$CERT_FILE" -text -noout | grep -A 2 "Validity")
echo "$CERT_DATES"

# 提取过期时间
EXPIRY_DATE=$(echo "$CERT_DATES" | grep "Not After" | cut -d':' -f2- | xargs)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))

if [ $DAYS_LEFT -lt 0 ]; then
  echo -e "${RED}✗ 证书已过期 ($DAYS_LEFT 天)${NC}"
  echo "请更新证书后再继续"
  exit 1
elif [ $DAYS_LEFT -lt 30 ]; then
  echo -e "${YELLOW}! 证书即将过期 (剩余 $DAYS_LEFT 天)${NC}"
  echo "建议尽快更新证书"
else
  echo -e "${GREEN}✓ 证书有效期正常 (剩余 $DAYS_LEFT 天)${NC}"
fi

# 3. 验证证书链完整性
echo -e "\n${YELLOW}[3/5] 检查证书链完整性...${NC}"
CHAIN_CHECK=$(openssl verify -untrusted "$CERT_FILE" "$CERT_FILE" 2>&1)

if echo "$CHAIN_CHECK" | grep -q "OK"; then
  echo -e "${GREEN}✓ 证书链完整性验证通过${NC}"
else
  echo -e "${YELLOW}! 证书链可能不完整: ${CHAIN_CHECK}${NC}"
  echo "尝试提取完整证书链..."
  
  # 如果存在完整链文件，尝试使用
  if [ -f "$CHAIN_FILE" ]; then
    echo "发现完整链文件: $CHAIN_FILE"
    echo "验证完整链文件..."
    FULL_CHAIN_CHECK=$(openssl verify -untrusted "$CHAIN_FILE" "$CERT_FILE" 2>&1)
    
    if echo "$FULL_CHAIN_CHECK" | grep -q "OK"; then
      echo -e "${GREEN}✓ 完整链验证通过，将使用完整链文件${NC}"
      cp "$CHAIN_FILE" "$CERT_FILE"
      echo "已更新证书文件"
    else
      echo -e "${RED}✗ 完整链验证失败: ${FULL_CHAIN_CHECK}${NC}"
      echo "需要手动修复证书链"
    fi
  else
    echo -e "${YELLOW}未找到完整链文件，可能需要手动构建完整证书链${NC}"
    echo "请从证书颁发机构获取完整证书链"
  fi
fi

# 4. 检查加密套件和协议
echo -e "\n${YELLOW}[4/5] 检查支持的TLS版本和加密套件...${NC}"

# 检查TLSv1.2
echo "测试TLSv1.2支持..."
TLS12_CHECK=$(echo | openssl s_client -connect ${DOMAIN}:443 -tls1_2 -servername ${DOMAIN} 2>/dev/null | grep "Protocol")
if [ -n "$TLS12_CHECK" ]; then
  echo -e "${GREEN}✓ 支持 $TLS12_CHECK${NC}"
else
  echo -e "${RED}✗ 不支持 TLSv1.2${NC}"
fi

# 检查TLSv1.3
echo "测试TLSv1.3支持..."
TLS13_CHECK=$(echo | openssl s_client -connect ${DOMAIN}:443 -tls1_3 -servername ${DOMAIN} 2>/dev/null | grep "Protocol")
if [ -n "$TLS13_CHECK" ]; then
  echo -e "${GREEN}✓ 支持 $TLS13_CHECK${NC}"
else
  echo -e "${RED}✗ 不支持 TLSv1.3${NC}"
fi

# 检查是否支持微信小程序常用的加密套件
echo -e "\n测试关键加密套件支持..."
CIPHER_SUITES=(
  "ECDHE-RSA-AES128-GCM-SHA256"
  "ECDHE-ECDSA-AES128-GCM-SHA256"
  "ECDHE-RSA-AES256-GCM-SHA384"
)

for cipher in "${CIPHER_SUITES[@]}"; do
  echo "测试加密套件: $cipher"
  CIPHER_CHECK=$(echo | openssl s_client -connect ${DOMAIN}:443 -cipher $cipher -servername ${DOMAIN} 2>/dev/null | grep "New, ")
  if [ -n "$CIPHER_CHECK" ]; then
    echo -e "${GREEN}✓ 支持 $cipher${NC}"
  else
    echo -e "${RED}✗ 不支持 $cipher${NC}"
    MISSING_CIPHERS=1
  fi
done

# 5. 提出可能的修复建议
echo -e "\n${YELLOW}[5/5] 总结与修复建议...${NC}"

echo "SSL证书检查结果:"
echo "- 证书文件: $([ -f "$CERT_FILE" ] && echo "存在" || echo "不存在")"
echo "- 密钥文件: $([ -f "$KEY_FILE" ] && echo "存在" || echo "不存在")"
echo "- 证书有效期: 剩余 $DAYS_LEFT 天"
echo "- 证书链完整性: $(echo "$CHAIN_CHECK" | grep -q "OK" && echo "通过" || echo "未通过")"

echo -e "\n针对微信小程序连接问题(ERR_CONNECTION_CLOSED)的建议:"

if [ $DAYS_LEFT -lt 0 ]; then
  echo "1. 【关键】更新SSL证书，当前证书已过期"
elif [ $DAYS_LEFT -lt 30 ]; then
  echo "1. 【建议】尽快更新SSL证书，证书即将过期"
fi

if ! echo "$CHAIN_CHECK" | grep -q "OK"; then
  echo "2. 【关键】修复证书链不完整问题:"
  echo "   - 从证书颁发机构获取完整证书链"
  echo "   - 确保证书包含所有中间证书"
fi

if [ -n "$MISSING_CIPHERS" ]; then
  echo "3. 【关键】在Nginx配置中添加微信小程序所需的加密套件:"
  echo "   ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';"
  echo "   ssl_prefer_server_ciphers off;"
fi

echo "4. 【优化】Nginx SSL优化建议:"
echo "   - 使用HTTP/2: listen 443 ssl http2;"
echo "   - 增加保持连接超时: keepalive_timeout 300;"
echo "   - 增加SSL会话缓存: ssl_session_cache shared:SSL:20m;"
echo "   - 延长会话超时: ssl_session_timeout 4h;"

echo -e "\n${BLUE}===== SSL证书检查完成 =====${NC}" 