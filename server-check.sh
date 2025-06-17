#!/bin/bash

# 输出彩色文本的函数
print_green() {
    echo -e "\033[0;32m$1\033[0m"
}
print_red() {
    echo -e "\033[0;31m$1\033[0m"
}
print_yellow() {
    echo -e "\033[0;33m$1\033[0m"
}

# 1. 检查服务器状态
print_green "==== 检查服务器状态 ===="
echo "系统信息:"
uname -a
echo ""
echo "运行时间:"
uptime
echo ""
echo "内存使用情况:"
free -h
echo ""
echo "磁盘使用情况:"
df -h
echo ""

# 2. 检查服务状态
print_green "==== 检查服务状态 ===="
echo "Nginx状态:"
systemctl status nginx | head -n 20
echo ""
echo "Node.js/PM2状态:"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    print_red "PM2未安装"
    echo "检查Node.js服务进程:"
    ps aux | grep node
fi
echo ""

# 3. 检查HTTPS证书
print_green "==== 检查HTTPS证书 ===="
if [ -d "/etc/letsencrypt/live/lovehome.xin" ]; then
    echo "证书信息:"
    openssl x509 -in /etc/letsencrypt/live/lovehome.xin/fullchain.pem -noout -dates -issuer -subject
    echo ""
    CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/lovehome.xin/fullchain.pem -noout -enddate | cut -d= -f2)
    echo "证书过期时间: $CERT_EXPIRY"
    
    # 检查证书是否即将过期（30天内）
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_DATE=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))
    
    if [ $DAYS_LEFT -lt 30 ]; then
        print_yellow "警告: 证书将在 $DAYS_LEFT 天后过期"
    else
        print_green "证书状态良好，还有 $DAYS_LEFT 天过期"
    fi
else
    print_red "找不到lovehome.xin的SSL证书目录"
    echo "尝试列出所有证书目录:"
    ls -la /etc/letsencrypt/live/
fi
echo ""

# 4. 检查防火墙配置
print_green "==== 检查防火墙配置 ===="
echo "检查防火墙状态:"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --state
    echo "开放的端口和服务:"
    firewall-cmd --list-all
elif command -v ufw &> /dev/null; then
    ufw status verbose
else
    echo "检查iptables规则:"
    iptables -L -n
fi
echo ""

# 5. 检查Nginx配置
print_green "==== 检查Nginx配置 ===="
echo "Nginx配置文件语法检查:"
nginx -t
echo ""
echo "Nginx配置的server_name设置:"
grep -r "server_name" /etc/nginx/
echo ""

# 6. 测试健康检查端点
print_green "==== 测试健康检查端点 ===="
echo "测试API健康检查端点(本地):"
curl -s http://localhost:3000/api/health
echo ""
echo ""
echo "测试API健康检查端点(域名):"
curl -s -k https://lovehome.xin/api/health
echo ""
echo ""

# 7. 检查DNS解析
print_green "==== 检查DNS解析 ===="
echo "lovehome.xin的DNS解析记录:"
dig +short lovehome.xin
echo ""
echo "反向DNS查询:"
ip=$(dig +short lovehome.xin)
dig +short -x $ip
echo ""

print_green "==== 检查完成 ====" 