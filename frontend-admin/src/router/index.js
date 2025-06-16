/**
 * 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router';
import Cookie from 'js-cookie';

// 布局组件
const Layout = () => import('../views/layout/Index.vue');

// 登录页面
const Login = () => import('../views/auth/Login.vue');

// 物业管理员路由
const propertyRoutes = [
  {
    path: 'dashboard',
    name: 'PropertyDashboard',
    component: () => import('../views/property/Dashboard.vue'),
    meta: { title: '仪表盘', icon: 'dashboard', role: 'property_admin' }
  },
  {
    path: 'notifications',
    name: 'NotificationManagement',
    component: () => import('../views/property/notifications/Index.vue'),
    meta: { title: '通知管理', icon: 'notification', role: 'property_admin' },
    children: [
      {
        path: 'list',
        name: 'NotificationList',
        component: () => import('../views/property/notifications/List.vue'),
        meta: { title: '通知列表', role: 'property_admin' }
      },
      {
        path: 'create',
        name: 'NotificationCreate',
        component: () => import('../views/property/notifications/Create.vue'),
        meta: { title: '发布通知', role: 'property_admin' }
      }
    ]
  },
  {
    path: 'topics',
    name: 'TopicManagement',
    component: () => import('../views/property/topics/Index.vue'),
    meta: { title: '议题管理', icon: 'topic', role: 'property_admin' },
    children: [
      {
        path: 'list',
        name: 'TopicList',
        component: () => import('../views/property/topics/List.vue'),
        meta: { title: '议题列表', role: 'property_admin' }
      },
      {
        path: 'detail/:id',
        name: 'TopicDetail',
        component: () => import('../views/property/topics/Detail.vue'),
        meta: { title: '议题详情', role: 'property_admin' }
      }
    ]
  },
  {
    path: 'workorders',
    name: 'WorkOrderManagement',
    component: () => import('../views/property/workorders/Index.vue'),
    meta: { title: '工单管理', icon: 'workorder', role: 'property_admin' },
    children: [
      {
        path: 'list',
        name: 'WorkOrderList',
        component: () => import('../views/property/workorders/List.vue'),
        meta: { title: '工单列表', role: 'property_admin' }
      },
      {
        path: 'detail/:id',
        name: 'WorkOrderDetail',
        component: () => import('../views/property/workorders/Detail.vue'),
        meta: { title: '工单详情', role: 'property_admin' }
      }
    ]
  },
  {
    path: 'finance',
    name: 'FinanceManagement',
    component: () => import('../views/property/finance/Index.vue'),
    meta: { title: '财务管理', icon: 'finance', role: 'property_admin' },
    children: [
      {
        path: 'list',
        name: 'FinanceList',
        component: () => import('../views/property/finance/List.vue'),
        meta: { title: '财报列表', role: 'property_admin' }
      },
      {
        path: 'upload',
        name: 'FinanceUpload',
        component: () => import('../views/property/finance/Upload.vue'),
        meta: { title: '上传财报', role: 'property_admin' }
      }
    ]
  },
  {
    path: 'residents',
    name: 'ResidentManagement',
    component: () => import('../views/property/residents/Index.vue'),
    meta: { title: '业主管理', icon: 'user', role: 'property_admin' }
  }
];

// 系统管理员路由
const systemRoutes = [
  {
    path: 'dashboard',
    name: 'SystemDashboard',
    component: () => import('../views/system/Dashboard.vue'),
    meta: { title: '系统概览', icon: 'dashboard', role: 'system_admin' }
  },
  {
    path: 'users',
    name: 'UserManagement',
    component: () => import('../views/system/users/Index.vue'),
    meta: { title: '用户管理', icon: 'user', role: 'system_admin' },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('../views/system/users/List.vue'),
        meta: { title: '用户列表', role: 'system_admin' }
      },
      {
        path: 'create',
        name: 'UserCreate',
        component: () => import('../views/system/users/Create.vue'),
        meta: { title: '新增用户', role: 'system_admin' }
      }
    ]
  },
  {
    path: 'communities',
    name: 'CommunityManagement',
    component: () => import('../views/system/communities/Index.vue'),
    meta: { title: '小区管理', icon: 'community', role: 'system_admin' },
    children: [
      {
        path: 'list',
        name: 'CommunityList',
        component: () => import('../views/system/communities/List.vue'),
        meta: { title: '小区列表', role: 'system_admin' }
      },
      {
        path: 'create',
        name: 'CommunityCreate',
        component: () => import('../views/system/communities/Create.vue'),
        meta: { title: '新增小区', role: 'system_admin' }
      }
    ]
  },
  {
    path: 'settings',
    name: 'SystemSettings',
    component: () => import('../views/system/settings/Index.vue'),
    meta: { title: '系统设置', icon: 'setting', role: 'system_admin' }
  },
  {
    path: 'backup',
    name: 'DataBackup',
    component: () => import('../views/system/backup/Index.vue'),
    meta: { title: '数据备份', icon: 'backup', role: 'system_admin' }
  }
];

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录', public: true }
  },
  {
    path: '/property',
    component: Layout,
    redirect: '/property/dashboard',
    meta: { title: '物业管理', role: 'property_admin' },
    children: propertyRoutes
  },
  {
    path: '/system',
    component: Layout,
    redirect: '/system/dashboard',
    meta: { title: '系统管理', role: 'system_admin' },
    children: systemRoutes
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/error/404.vue'),
    meta: { title: '页面不存在', public: true }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory('/admin'),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 智慧社区管理系统` : '智慧社区管理系统';
  
  // 公开页面直接访问
  if (to.meta.public) {
    next();
    return;
  }

  // 获取用户信息和角色
  const token = Cookie.get('Admin-Token');
  const userRole = Cookie.get('Admin-Role');
  
  // 未登录跳转到登录页
  if (!token) {
    next('/login');
    return;
  }

  // 权限检查
  if (to.meta.role && to.meta.role !== userRole) {
    next('/403'); // 权限不足页面
    return;
  }

  // 正常导航
  next();
});

export default router; 