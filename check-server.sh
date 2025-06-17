#!/bin/bash

# 检查系统信息
echo "=== 系统信息 ==="
uname -a
echo "运行时间: $(uptime)"
echo ""

# 检查内存和磁盘
echo "=== 内存使用情况 ==="
free -h
echo ""
echo "=== 磁盘使用情况 ==="
df -h
echo ""

# 检查服务状态
echo "=== Nginx状态 ==="
systemctl status nginx | head -n 20
echo ""

echo "=== PM2/Node.js状态 ==="
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2未安装"
    ps aux | grep node
fi
echo ""

# 检查HTTPS证书
echo "=== SSL证书状态 ==="
if [ -d "/etc/letsencrypt/live/lovehome.xin" ]; then
    echo "证书信息:"
    openssl x509 -in /etc/letsencrypt/live/lovehome.xin/fullchain.pem -noout -dates -issuer -subject
else
    echo "证书目录不存在: /etc/letsencrypt/live/lovehome.xin"
    echo "查找其他可能的证书目录:"
    ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "未找到证书目录"
fi
echo ""

# 检查防火墙
echo "=== 防火墙状态 ==="
if command -v firewall-cmd &> /dev/null; then
    echo "Firewalld状态:"
    firewall-cmd --state
    echo "开放端口:"
    firewall-cmd --list-ports
elif command -v ufw &> /dev/null; then
    echo "UFW状态:"
    ufw status
else
    echo "iptables规则:"
    iptables -L -n | head -n 20
fi
echo ""

# 检查健康检查端点
echo "=== 健康检查端点 ==="
echo "本地API健康检查:"
curl -s http://localhost:3000/api/health || echo "连接失败"
echo ""
echo "通过域名检查:"
curl -s -k https://lovehome.xin/api/health || echo "连接失败"
echo ""

# 检查Nginx配置
echo "=== Nginx配置 ==="
echo "配置语法检查:"
nginx -t
echo ""
echo "server_name配置:"
grep -n "server_name" /etc/nginx/nginx.conf 2>/dev/null || grep -n "server_name" /etc/nginx/conf.d/*.conf 2>/dev/null || echo "未找到server_name配置"
echo ""
echo "SSL证书配置:"
grep -n "ssl_certificate" /etc/nginx/nginx.conf 2>/dev/null || grep -n "ssl_certificate" /etc/nginx/conf.d/*.conf 2>/dev/null || echo "未找到SSL证书配置"
echo ""

echo "=== 检查完成 ===" 