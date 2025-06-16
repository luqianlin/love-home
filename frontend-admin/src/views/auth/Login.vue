<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          智慧社区管理系统
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          请登录您的管理账号
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">用户名</label>
            <input 
              id="username" 
              name="username" 
              type="text" 
              autocomplete="username" 
              required 
              v-model="loginForm.username"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
              placeholder="用户名" 
            />
          </div>
          <div>
            <label for="password" class="sr-only">密码</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              autocomplete="current-password" 
              required 
              v-model="loginForm.password"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
              placeholder="密码" 
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input 
              id="remember-me" 
              name="remember-me" 
              type="checkbox" 
              v-model="loginForm.rememberMe"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900"> 
              记住我 
            </label>
          </div>
        </div>

        <div>
          <button 
            type="submit" 
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            :disabled="loading"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <!-- 加载图标 -->
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
        
        <div v-if="errorMessage" class="mt-4 text-center text-sm text-red-600">
          {{ errorMessage }}
        </div>
      </form>
      
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>© {{ new Date().getFullYear() }} 智慧社区 版权所有</p>
      </div>
    </div>
  </div>
</template>

<script>
import { login } from '@/api/auth';
import Cookies from 'js-cookie';

export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: '',
        rememberMe: false
      },
      loading: false,
      errorMessage: ''
    };
  },
  methods: {
    async handleLogin() {
      if (this.loading) return;
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const response = await login({
          username: this.loginForm.username,
          password: this.loginForm.password
        });
        
        // 存储登录信息
        const { token, role, expiresIn } = response;
        const expires = this.loginForm.rememberMe ? 7 : 1; // 记住我7天，否则1天
        
        Cookies.set('Admin-Token', token, { expires });
        Cookies.set('Admin-Role', role, { expires });
        
        // 根据角色重定向到对应的管理界面
        if (role === 'system_admin') {
          this.$router.push('/system/dashboard');
        } else if (role === 'property_admin') {
          this.$router.push('/property/dashboard');
        } else {
          this.errorMessage = '未知的用户角色';
        }
      } catch (error) {
        console.error('登录失败:', error);
        if (error.response && error.response.data && error.response.data.message) {
          this.errorMessage = error.response.data.message;
        } else {
          this.errorMessage = '登录失败，请检查用户名和密码';
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>