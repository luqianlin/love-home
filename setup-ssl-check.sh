#!/bin/bash

# 智慧社区平台SSL证书检查与修复脚本
# 用于解决微信小程序连接问题(ERR_CONNECTION_CLOSED)

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

DOMAIN="lovehome.xin"
SSL_DIR="/var/www/love-home/18979882_lovehome.xin_nginx"
NGINX_CONF="/etc/nginx/sites-enabled/lovehome.xin.conf"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   智慧社区平台SSL证书检查与修复工具       ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo

# 检查SSL证书
echo -e "${BLUE}[检查] SSL证书${NC}"
if [ ! -f "${SSL_DIR}/${DOMAIN}.pem" ] || [ ! -f "${SSL_DIR}/${DOMAIN}.key" ]; then
  echo -e "${RED}错误: SSL证书文件不存在${NC}"
  echo -e "预期路径: ${SSL_DIR}/${DOMAIN}.pem 和 ${DOMAIN}.key"
  echo -e "请确保SSL证书文件存在"
  exit 1
else
  echo -e "${GREEN}✓ SSL证书文件存在${NC}"
  
  # 检查证书有效期
  CERT_INFO=$(openssl x509 -in ${SSL_DIR}/${DOMAIN}.pem -text -noout)
  START_DATE=$(echo "$CERT_INFO" | grep "Not Before" | cut -d: -f2-)
  END_DATE=$(echo "$CERT_INFO" | grep "Not After" | cut -d: -f2-)
  echo -e "证书有效期: ${YELLOW}$START_DATE${NC} 至 ${YELLOW}$END_DATE${NC}"
  
  # 检查证书是否过期
  EXPIRE_DATE=$(date -d "$(echo "$END_DATE" | sed -e 's/^[[:space:]]*//')" +%s)
  CURRENT_DATE=$(date +%s)
  DAYS_LEFT=$(( ($EXPIRE_DATE - $CURRENT_DATE) / 86400 ))
  
  if [ $DAYS_LEFT -lt 0 ]; then
    echo -e "${RED}✗ 证书已过期!${NC}"
    CERT_VALID=false
  elif [ $DAYS_LEFT -lt 30 ]; then
    echo -e "${YELLOW}! 证书即将过期（剩余 $DAYS_LEFT 天）${NC}"
    CERT_VALID=true
  else
    echo -e "${GREEN}✓ 证书有效（剩余 $DAYS_LEFT 天）${NC}"
    CERT_VALID=true
  fi
fi

# 检查证书链完整性
echo -e "\n${BLUE}[检查] 证书链完整性${NC}"
CERT_CHAIN=$(openssl s_client -showcerts -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null </dev/null | grep -A 1 "Certificate chain")

if echo "$CERT_CHAIN" | grep -q "i:"; then
  echo -e "${GREEN}✓ 证书链包含中间证书${NC}"
  echo "$CERT_CHAIN"
  CHAIN_COMPLETE=true
else
  echo -e "${RED}✗ 证书链可能不完整（未找到中间证书）${NC}"
  echo "$CERT_CHAIN"
  CHAIN_COMPLETE=false
fi

# 检查Nginx SSL配置
echo -e "\n${BLUE}[检查] Nginx SSL配置${NC}"

# 检查Nginx配置是否引用了正确的证书文件
if grep -q "${SSL_DIR}/${DOMAIN}.pem" "$NGINX_CONF" && grep -q "${SSL_DIR}/${DOMAIN}.key" "$NGINX_CONF"; then
  echo -e "${GREEN}✓ Nginx配置中包含正确的证书文件路径${NC}"
  CONFIG_CORRECT=true
else
  echo -e "${RED}✗ Nginx配置中可能使用了错误的证书文件路径${NC}"
  echo -e "请检查Nginx配置文件: $NGINX_CONF"
  CONFIG_CORRECT=false
fi

# 检查SSL协议和密码套件配置
if grep -q "ssl_protocols TLSv1.2 TLSv1.3" "$NGINX_CONF"; then
  echo -e "${GREEN}✓ SSL协议配置正确（TLSv1.2 TLSv1.3）${NC}"
  PROTOCOLS_OK=true
else
  echo -e "${YELLOW}! SSL协议配置可能不正确${NC}"
  echo -e "建议配置: ssl_protocols TLSv1.2 TLSv1.3;"
  PROTOCOLS_OK=false
fi

# 检查OCSP装订配置
if grep -q "ssl_stapling on" "$NGINX_CONF" && grep -q "ssl_stapling_verify on" "$NGINX_CONF"; then
  echo -e "${GREEN}✓ 已配置OCSP装订${NC}"
  STAPLING_OK=true
else
  echo -e "${YELLOW}! 未配置OCSP装订${NC}"
  echo -e "建议添加: ssl_stapling on; ssl_stapling_verify on;"
  STAPLING_OK=false
fi

# 检查会话缓存和票证
if grep -q "ssl_session_tickets on" "$NGINX_CONF"; then
  echo -e "${GREEN}✓ 已配置会话票证${NC}"
  SESSION_OK=true
else
  echo -e "${YELLOW}! 未配置会话票证${NC}"
  echo -e "建议添加: ssl_session_tickets on;"
  SESSION_OK=false
fi

# 诊断总结
echo -e "\n${BLUE}[诊断] 总结${NC}"
if [ "$CERT_VALID" = true ] && [ "$CHAIN_COMPLETE" = true ] && [ "$CONFIG_CORRECT" = true ]; then
  echo -e "${GREEN}✓ SSL证书配置基本正常${NC}"
  
  if [ "$PROTOCOLS_OK" = false ] || [ "$STAPLING_OK" = false ] || [ "$SESSION_OK" = false ]; then
    echo -e "${YELLOW}! 但仍有优化空间:${NC}"
    
    if [ "$PROTOCOLS_OK" = false ]; then
      echo -e "  - 更新SSL协议版本"
    fi
    
    if [ "$STAPLING_OK" = false ]; then
      echo -e "  - 启用OCSP装订"
    fi
    
    if [ "$SESSION_OK" = false ]; then
      echo -e "  - 启用会话票证"
    fi
  fi
else
  echo -e "${RED}✗ SSL证书配置存在问题:${NC}"
  
  if [ "$CERT_VALID" = false ]; then
    echo -e "  - 证书已过期或无效"
  fi
  
  if [ "$CHAIN_COMPLETE" = false ]; then
    echo -e "  - 证书链不完整"
  fi
  
  if [ "$CONFIG_CORRECT" = false ]; then
    echo -e "  - Nginx配置引用了错误的证书路径"
  fi
fi

echo -e "\n${BLUE}[建议] 解决方案${NC}"
if [ "$CERT_VALID" = false ]; then
  echo -e "1. 证书续签:"
  echo -e "   如果使用Let's Encrypt: ${YELLOW}certbot renew --force-renewal${NC}"
  echo -e "   或手动更新证书文件: ${SSL_DIR}/${DOMAIN}.pem 和 ${DOMAIN}.key"
fi

if [ "$CHAIN_COMPLETE" = false ]; then
  echo -e "2. 修复证书链:"
  echo -e "   确保证书文件包含完整证书链，可以通过以下命令合并:"
  echo -e "   ${YELLOW}cat domain.crt intermediate.crt > ${SSL_DIR}/${DOMAIN}.pem${NC}"
fi

if [ "$CONFIG_CORRECT" = false ] || [ "$PROTOCOLS_OK" = false ] || [ "$STAPLING_OK" = false ] || [ "$SESSION_OK" = false ]; then
  echo -e "3. 优化Nginx SSL配置:"
  echo -e "   编辑配置文件: ${YELLOW}nano $NGINX_CONF${NC}"
  echo -e "   添加或修改以下配置:"
  echo -e "   ```"
  echo -e "   ssl_certificate ${SSL_DIR}/${DOMAIN}.pem;"
  echo -e "   ssl_certificate_key ${SSL_DIR}/${DOMAIN}.key;"
  echo -e "   ssl_protocols TLSv1.2 TLSv1.3;"
  echo -e "   ssl_prefer_server_ciphers on;"
  echo -e "   ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';"
  echo -e "   ssl_session_timeout 1d;"
  echo -e "   ssl_session_cache shared:SSL:10m;"
  echo -e "   ssl_session_tickets on;"
  echo -e "   ssl_stapling on;"
  echo -e "   ssl_stapling_verify on;"
  echo -e "   resolver 8.8.8.8 8.8.4.4 valid=300s;"
  echo -e "   resolver_timeout 5s;"
  echo -e "   ```"
fi

# 提供重启命令
echo -e "\n${BLUE}[执行] 应用修复${NC}"
echo -e "完成上述修改后，需要重新加载Nginx:"
echo -e "${YELLOW}systemctl reload nginx${NC}"

echo -e "\n${BLUE}===============================================${NC}"
echo 