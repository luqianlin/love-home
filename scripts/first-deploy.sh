#!/bin/bash
# 智慧社区平台首次部署脚本
# 作者: GitHub@luqianlin

set -e  # 遇到错误立即退出

echo "开始首次部署智慧社区平台..."

# 确保应用目录存在
mkdir -p /var/www/love-home

# 克隆代码库(如果已有代码库路径，请修改)
echo "克隆代码库..."
git clone git@github.com:luqianlin/love-home.git /tmp/love-home

# 复制代码到部署目录
echo "复制代码到部署目录..."
cp -r /tmp/love-home/* /var/www/love-home/
rm -rf /tmp/love-home

# 安装依赖
echo "安装依赖..."
cd /var/www/love-home
npm ci --production

# 运行数据库迁移
echo "初始化数据库..."
NODE_ENV=production npm run migrate

# 生成示例数据(如果需要)
echo "生成示例数据..."
NODE_ENV=production npm run seed

# 构建前端资源
echo "构建前端资源..."
npm run build

# 设置文件权限
echo "设置文件权限..."
chown -R root:root /var/www/love-home
chmod -R 755 /var/www/love-home

# 启动应用
echo "使用PM2启动应用..."
pm2 start ecosystem.config.js
pm2 save

# 设置开机自启动
echo "设置PM2开机自启动..."
pm2 startup
systemctl enable nginx
systemctl enable mysql
systemctl enable redis-server

# 生成版本信息
echo "生成版本信息..."
VERSION=$(git rev-parse --short HEAD || echo "v1.0.0")
DATE=$(date "+%Y-%m-%d %H:%M:%S")
echo "{\"version\": \"$VERSION\", \"deploy_time\": \"$DATE\", \"deployer\": \"初始部署脚本\"}" > /var/www/love-home/public/version.json

# 保存第一个成功版本信息
mkdir -p /var/www/love-home-versions
echo "$VERSION" > /var/www/love-home-versions/last_success.txt

echo "首次部署完成！"
echo "您可以通过访问 http://45.125.44.25 查看应用。" 