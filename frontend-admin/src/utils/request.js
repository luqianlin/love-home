/**
 * 网络请求工具类
 */
import axios from 'axios';
import Cookies from 'js-cookie';
import router from '../router';

// 创建axios实例
const service = axios.create({
  baseURL: process.env.VUE_APP_API_URL || '/api', // API基础URL
  timeout: 15000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 添加token到请求头
    const token = Cookies.get('Admin-Token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data;
    
    // 成功响应直接返回数据
    return res;
  },
  error => {
    // 错误处理
    let message = '请求失败';
    
    if (error.response) {
      const { status, data } = error.response;
      
      // 处理不同的HTTP状态码
      switch (status) {
        case 401:
          message = '未授权，请重新登录';
          // 清除登录信息
          Cookies.remove('Admin-Token');
          Cookies.remove('Admin-Role');
          // 跳转到登录页
          router.push('/login');
          break;
        case 403:
          message = '拒绝访问';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = data?.message || `请求失败(${status})`;
      }
    } else if (error.request) {
      // 请求发送但没有收到响应
      message = '网络异常，服务器未响应';
    }
    
    // 显示错误提示
    console.error(message);
    
    return Promise.reject(error);
  }
);

export default service;