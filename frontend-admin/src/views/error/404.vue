<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="text-6xl font-bold text-blue-600 mb-4">404</div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">页面不存在</h1>
      <p class="text-gray-600 mb-8">您访问的页面不存在或已被移除</p>
      <div class="flex justify-center space-x-4">
        <router-link 
          :to="homeRoute" 
          class="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700"
        >
          返回首页
        </router-link>
        <button 
          @click="goBack" 
          class="px-4 py-2 bg-gray-200 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-300"
        >
          返回上一页
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Cookies from 'js-cookie';

export default {
  name: 'NotFound',
  setup() {
    const router = useRouter();
    
    // 根据用户角色决定重定向到哪个首页
    const homeRoute = computed(() => {
      const userRole = Cookies.get('Admin-Role');
      if (userRole === 'system_admin') {
        return '/system/dashboard';
      } else if (userRole === 'property_admin') {
        return '/property/dashboard';
      } else {
        return '/login';
      }
    });
    
    // 返回上一页
    const goBack = () => {
      router.go(-1);
    };
    
    return {
      homeRoute,
      goBack
    };
  }
};
</script> 