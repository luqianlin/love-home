# 腾讯云服务器部署指南

本文档提供将智慧社区平台部署到腾讯云服务器的详细指南。

## 服务器信息

- **服务器IP**: 49.235.80.118
- **用户名**: root
- **密码**: lql@123lql
- **项目路径**: /var/www/love-home

## 部署方式

### 1. 使用GitHub Actions自动部署

我们已配置GitHub Actions工作流，当代码推送到main分支时会自动部署。

**如何触发手动部署**:
1. 在GitHub仓库页面点击"Actions"选项卡
2. 选择"部署到腾讯云服务器"工作流
3. 点击"Run workflow"按钮
4. 确认参数，然后点击绿色的"Run workflow"按钮

### 2. 使用脚本手动部署

在本地执行部署脚本:

```bash
# Linux/Mac
./deploy-tencent.sh

# Windows
bash deploy-tencent.sh
```

> 注意: Windows系统需要安装Git Bash或WSL才能运行脚本。

## 首次部署步骤

如果是首次部署，请先在服务器上执行以下准备工作:

1. **安装必要软件**:
   ```bash
   apt update && apt upgrade -y
   apt install -y nginx curl git nodejs npm redis-server
   npm install -g pm2
   ```

2. **创建项目目录**:
   ```bash
   mkdir -p /var/www/love-home
   ```

3. **配置Nginx**:
   ```bash
   # 创建Nginx配置
   nano /etc/nginx/sites-available/love-home.conf
   
   # 添加以下内容:
   server {
       listen 80;
       server_name 49.235.80.118;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   
   # 创建符号链接
   ln -s /etc/nginx/sites-available/love-home.conf /etc/nginx/sites-enabled/
   
   # 测试配置
   nginx -t
   
   # 重新加载Nginx
   systemctl reload nginx
   ```

## 验证部署

部署完成后，请访问以下URL验证服务是否正常运行:

- 网站: http://49.235.80.118
- 健康检查: http://49.235.80.118/health

## 常见问题排查

1. **部署失败**:
   - 检查GitHub Actions日志查看详细错误信息
   - 确保服务器可以访问互联网和GitHub

2. **网站无法访问**:
   - 检查Nginx状态: `systemctl status nginx`
   - 检查Node.js应用状态: `pm2 status`
   - 检查应用日志: `pm2 logs server`

3. **权限问题**:
   - 确保项目目录权限正确: `chown -R root:root /var/www/love-home`

## 数据库配置

确保更新数据库配置文件 (`backend/src/config/database.js`)，指向正确的数据库服务器:

```javascript
module.exports = {
  host: 'localhost',
  port: 3306,
  database: 'love_home',
  username: 'root',
  password: 'your_password',
  dialect: 'mysql'
};
```

## 其他说明

- 本项目使用PM2进行进程管理，可通过`pm2 list`查看进程状态
- Nginx配置文件位于: `/etc/nginx/sites-available/love-home.conf`
- 应用日志位于: `~/.pm2/logs/` 