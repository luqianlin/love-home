#!/bin/bash

# 智慧社区平台健康检查端点修复脚本 - 遵循标准部署流程
# 这个脚本通过SSH密钥方式修复API健康检查端点问题

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   智慧社区平台健康检查端点标准修复工具      ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo

# 检查必要工具
echo -e "${BLUE}[检查] 必要工具${NC}"
MISSING_TOOLS=0
for tool in git curl ssh scp; do
  if ! command -v $tool &> /dev/null; then
    echo -e "${RED}✗ $tool 未安装${NC}"
    MISSING_TOOLS=1
  else
    echo -e "${GREEN}✓ $tool 已安装${NC}"
  fi
done

if [ $MISSING_TOOLS -eq 1 ]; then
  echo -e "${RED}错误: 缺少必要工具，请先安装${NC}"
  exit 1
fi
echo

# 确认Git仓库
REPO_DIR=$(pwd)
if [ ! -d "$REPO_DIR/.git" ]; then
  echo -e "${RED}错误: 当前目录不是Git仓库${NC}"
  exit 1
fi

# 确认当前分支是main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}警告: 当前不在main分支上，可能会导致部署问题${NC}"
  read -p "是否继续? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${BLUE}[修复] 将创建修复分支${NC}"
# 创建修复分支
HOTFIX_BRANCH="hotfix/health-endpoint-$(date +%Y%m%d%H%M%S)"
git checkout -b $HOTFIX_BRANCH

# 修复server.js
echo -e "${BLUE}[修复] 修改server.js${NC}"
sed -i 's/app.use(helmet());/app.use(helmet({\n  contentSecurityPolicy: false, \/\/ 禁用CSP以避免微信小程序请求问题\n  crossOriginEmbedderPolicy: false, \/\/ 禁用COEP以解决跨域问题\n}));/' server.js
sed -i 's/app.use(cors());/app.use(cors({\n  origin: '"'"'*'"'"', \/\/ 允许所有来源访问\n  methods: ['"'"'GET'"'"', '"'"'POST'"'"', '"'"'PUT'"'"', '"'"'DELETE'"'"', '"'"'OPTIONS'"'"'],\n  allowedHeaders: ['"'"'Content-Type'"'"', '"'"'Authorization'"'"']\n}));/' server.js

# 添加健康检查端点
if ! grep -q "app.get('/health'" server.js; then
  HEALTH_ENDPOINT='
// 提供多个健康检查端点以增加可靠性
app.get("/health", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  res.status(200).json({ 
    status: "ok", 
    message: "服务正常运行",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});'

  # 插入健康检查端点到正确位置
  sed -i "/app.get('\/api\/health'/i $HEALTH_ENDPOINT" server.js
  echo -e "${GREEN}✓ 添加了新的健康检查端点到server.js${NC}"
else
  echo -e "${YELLOW}! 健康检查端点已存在，跳过${NC}"
fi

# 修改Nginx配置
echo -e "${BLUE}[修复] 修改Nginx配置${NC}"
if ! grep -q "location = /health" nginx-config.conf; then
  # 为HTTP和HTTPS都添加健康检查配置
  HEALTH_CONFIG='
    # 健康检查端点配置
    location = /api/health {
        proxy_pass http://localhost:8080/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream off;
        proxy_read_timeout 10s;
        proxy_connect_timeout 10s;
        proxy_cache off;
        proxy_buffering off;
        
        # 允许跨域请求
        add_header '"'"'Access-Control-Allow-Origin'"'"' '"'"'*'"'"' always;
        add_header '"'"'Access-Control-Allow-Methods'"'"' '"'"'GET, OPTIONS'"'"' always;
        add_header '"'"'Access-Control-Allow-Headers'"'"' '"'"'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'"'"' always;
        
        # 处理OPTIONS请求
        if ($request_method = '"'"'OPTIONS'"'"') {
            add_header '"'"'Access-Control-Allow-Origin'"'"' '"'"'*'"'"' always;
            add_header '"'"'Access-Control-Allow-Methods'"'"' '"'"'GET, OPTIONS'"'"' always;
            add_header '"'"'Access-Control-Allow-Headers'"'"' '"'"'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'"'"' always;
            add_header '"'"'Access-Control-Max-Age'"'"' 1728000;
            add_header '"'"'Content-Type'"'"' '"'"'text/plain; charset=utf-8'"'"';
            add_header '"'"'Content-Length'"'"' 0;
            return 204;
        }
    }
    
    # 另一个健康检查路径
    location = /health {
        proxy_pass http://localhost:8080/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream off;
        proxy_read_timeout 10s;
        proxy_connect_timeout 10s;
        proxy_cache off;
        proxy_buffering off;
        
        add_header '"'"'Access-Control-Allow-Origin'"'"' '"'"'*'"'"' always;
        add_header '"'"'Access-Control-Allow-Methods'"'"' '"'"'GET, OPTIONS'"'"' always;
        add_header '"'"'Access-Control-Allow-Headers'"'"' '"'"'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'"'"' always;
    }'

  # 在HTTP服务器块中插入
  sed -i '/server {.*listen 80;/,/location \/ {/ {/location \/ {/i '"$HEALTH_CONFIG"'}' nginx-config.conf
  
  # 在HTTPS服务器块中插入
  sed -i '/server {.*listen 443 ssl;/,/location \/api {/ {/location \/api {/i '"$HEALTH_CONFIG"'}' nginx-config.conf
  
  echo -e "${GREEN}✓ 添加了健康检查配置到Nginx配置${NC}"
else
  echo -e "${YELLOW}! 健康检查配置已存在，跳过${NC}"
fi

# 修改小程序代码
echo -e "${BLUE}[修复] 修改小程序连接逻辑${NC}"
# 修改baseUrl
sed -i 's/baseUrl: '"'"'https:\/\/lovehome.xin\/api'"'"',/baseUrl: '"'"'https:\/\/lovehome.xin'"'"',/' frontend-mp/app.js

# 创建部署说明
echo -e "${BLUE}[文档] 创建修复说明${NC}"
cat > HEALTH_CHECK_FIX.md << 'EOD'
# 智慧社区平台健康检查端点修复

## 修复内容

1. 增强了服务器端的健康检查端点：
   - 在server.js中优化了健康检查接口，添加了CORS跨域支持
   - 添加了多个健康检查路径(/health和/api/health)，增加了系统的健壮性
   - 调整了helmet和cors配置，解决跨域问题

2. 优化了Nginx配置：
   - 改进了HTTP和HTTPS健康检查端点的配置
   - 增加了"always"标记确保跨域头信息正确返回
   - 禁用了缓存和缓冲，确保健康检查端点的实时响应

3. 改进了小程序连接机制：
   - 优化了app.js中的baseUrl配置，确保可以连接到正确的健康检查端点

## 部署步骤

1. 将修复代码合并到main分支
2. 使用GitHub Actions自动部署
3. 或者使用以下命令手动部署:

```bash
# 连接到服务器
ssh <user>@lovehome.xin

# 进入项目目录
cd /var/www/love-home

# 拉取最新代码
git pull

# 重启服务
pm2 restart server

# 重新加载Nginx配置
sudo systemctl reload nginx
```

## 验证步骤

1. 访问健康检查端点验证:
   - https://lovehome.xin/health
   - https://lovehome.xin/api/health

2. 使用微信小程序连接验证
EOD

# 提交更改
echo -e "${BLUE}[Git] 提交修复${NC}"
git add server.js nginx-config.conf frontend-mp/app.js HEALTH_CHECK_FIX.md
git commit -m "修复: 健康检查端点的跨域支持和可访问性"

# 显示摘要
echo
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}修复已完成并提交到分支: $HOTFIX_BRANCH${NC}"
echo -e "${BLUE}修复内容:${NC}"
echo " 1. 增强了服务器端的健康检查端点"
echo " 2. 优化了Nginx配置以支持跨域请求"
echo " 3. 改进了小程序连接机制"
echo " 4. 创建了修复说明文档"
echo
echo -e "${BLUE}后续部署步骤:${NC}"
echo " 1. 将修复分支合并到main: git checkout main && git merge $HOTFIX_BRANCH"
echo " 2. 推送到GitHub触发自动部署: git push origin main"
echo " 3. 或按照HEALTH_CHECK_FIX.md中的说明手动部署"
echo
echo -e "${BLUE}===============================================${NC}"