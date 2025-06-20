# 零成本智慧社区平台

一个完整的社区管理解决方案，旨在提供高效的社区治理、信息触达与财务透明化。

## 核心功能

- **社区议事厅**：Markdown格式提交，Redis原子计数投票
- **智能通知系统**：支持紧急通知(微信Bot+邮件)和常规公告(浏览器通知)
- **财务透明中心**：前端CSV解析，支持在线答疑
- **工单管理系统**：支持位置定位、状态追踪和超时预警
- **多小区管理**：支持电子围栏技术匹配用户所在小区

## 技术栈

- **前端**：Vue3 + TailwindCSS
- **后端**：Express.js (RESTful API)
- **数据库**：MySQL 8.0 + Redis
- **地图服务**：Leaflet + OpenStreetMap
- **运维**：PM2 + Netdata

## 快速开始

### 环境要求

- Node.js 16+
- MySQL 8.0+
- Redis 6+
- Nginx (生产环境)

### 小程序域名配置

微信小程序有严格的域名配置要求：

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发"->"开发设置"->"服务器域名"
3. 添加以下域名到对应类别：
   - **request合法域名**：`https://lovehome.xin`
   - **socket合法域名**：`wss://lovehome.xin`（如需WebSocket）
   - **上传/下载合法域名**：`https://lovehome.xin`（如需文件上传下载）
4. DNS预解析域名中添加：`lovehome.xin`

**注意事项**：
- 所有域名必须使用HTTPS/WSS协议
- 域名必须经过ICP备案
- 开发环境可在开发者工具中勾选"不校验合法域名"选项

### 本地开发

1. 克隆仓库

```bash
git clone git@github.com:luqianlin/love-home.git
cd love-home
```

2. 安装依赖

```bash
npm install
cd frontend-admin && npm install && cd ..
```

3. 配置环境变量

```bash
cp .env.example .env
# 编辑.env文件，填写必要的配置信息
```

4. 启动开发服务器

```bash
# 后端服务
npm run dev

# 前端开发服务器
cd frontend-admin && npm run serve
```

### 生产环境部署

#### 自动部署（推荐）

1. 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

- `SERVER_HOST`: 服务器IP地址
- `SERVER_USERNAME`: SSH用户名
- `SERVER_PASSWORD`: SSH密码
- `SERVER_PORT`: SSH端口（默认22）
- `DEPLOY_WEBHOOK_URL`: 部署通知Webhook URL

2. 推送代码到main分支，自动触发部署

```bash
git push origin main
```

#### 手动部署

1. 服务器初始化

```bash
# 在新服务器上运行
sudo bash scripts/server-setup.sh
```

2. 配置PM2

```bash
pm2 deploy ecosystem.config.js production setup
pm2 deploy ecosystem.config.js production
```

## 项目结构

```
love-home/
├── backend/            # 后端代码
│   └── src/
│       ├── config/     # 配置文件
│       ├── controllers/ # 控制器
│       ├── middleware/ # 中间件
│       ├── models/     # 数据模型
│       ├── routes/     # 路由
│       ├── services/   # 服务
│       └── utils/      # 工具函数
├── frontend-admin/     # 管理后台
├── frontend-mp/        # 微信小程序
├── public/            # 静态资源
├── scripts/           # 部署脚本
└── server.js          # 服务器入口
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

MIT License
