/**
 * 智慧社区管理后台入口文件
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/css/tailwind.css';
import './assets/css/main.css';

// 创建应用实例
const app = createApp(App);

// 使用Pinia状态管理
const pinia = createPinia();
app.use(pinia);

// 配置路由
app.use(router);

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('应用错误:', err);
  console.error('错误组件:', vm);
  console.error('错误信息:', info);
};

// 挂载应用
app.mount('#app'); 