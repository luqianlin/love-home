/**
 * PM2配置文件
 * 用于生产环境进程管理
 */
module.exports = {
  apps: [
    {
      name: 'community-platform',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'community-tasks',
      script: 'backend/src/services/taskRunner.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        ENABLE_SCHEDULED_TASKS: 'true'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/tasks-error.log',
      out_file: 'logs/tasks-out.log',
      merge_logs: true,
      time: true
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'luqianlin',
      host: '45.125.44.25',
      ref: 'origin/main',
      repo: 'git@github.com:luqianlin/love-home.git',
      path: '/var/www/love-home',
      'post-deploy': 'npm install && cd frontend-admin && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js'
    }
  }
}; 