<template>
    <div class="container mx-auto px-4">
      <h1 class="text-2xl font-semibold text-gray-800 mb-6">物业管理仪表盘</h1>
      
      <!-- 数据概览卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- 待处理工单 -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="flex items-center">
            <div class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="font-semibold text-gray-600">待处理工单</h2>
              <div class="flex items-baseline">
                <p class="text-2xl font-bold text-gray-800">23</p>
                <p class="ml-2 text-sm text-green-600">+14.5%</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 未读通知 -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="flex items-center">
            <div class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="font-semibold text-gray-600">未读通知</h2>
              <div class="flex items-baseline">
                <p class="text-2xl font-bold text-gray-800">12</p>
                <p class="ml-2 text-sm text-red-600">+25.8%</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 本周新增议题 -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="flex items-center">
            <div class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-yellow-100 text-yellow-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="font-semibold text-gray-600">本周新增议题</h2>
              <div class="flex items-baseline">
                <p class="text-2xl font-bold text-gray-800">8</p>
                <p class="ml-2 text-sm text-green-600">+3.1%</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 业主总数 -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="flex items-center">
            <div class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="font-semibold text-gray-600">业主总数</h2>
              <div class="flex items-baseline">
                <p class="text-2xl font-bold text-gray-800">546</p>
                <p class="ml-2 text-sm text-green-600">+2.5%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 最新工单 -->
        <div class="md:col-span-2 bg-white rounded-lg shadow">
          <div class="p-5 border-b border-gray-200">
            <h2 class="font-bold text-lg text-gray-800">最新工单</h2>
          </div>
          <div class="p-5">
            <ul class="divide-y divide-gray-200">
              <li v-for="(item, index) in latestWorkorders" :key="index" class="py-3">
                <div class="flex justify-between">
                  <div>
                    <p class="font-medium text-gray-800">{{ item.title }}</p>
                    <p class="text-sm text-gray-500">{{ item.content }}</p>
                  </div>
                  <div class="text-right">
                    <span :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</span>
                    <p class="text-sm text-gray-500 mt-1">{{ item.timestamp }}</p>
                  </div>
                </div>
              </li>
            </ul>
            <div class="mt-4 text-center">
              <router-link to="/property/workorders/list" class="text-blue-500 hover:text-blue-700 text-sm font-medium">
                查看全部工单
                <svg class="inline-block ml-1 w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </router-link>
            </div>
          </div>
        </div>
  
        <!-- 待办事项 -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-5 border-b border-gray-200">
            <h2 class="font-bold text-lg text-gray-800">待办事项</h2>
          </div>
          <div class="p-5">
            <ul class="space-y-3">
              <li v-for="(todo, index) in todos" :key="index" class="flex items-start">
                <input type="checkbox" class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300" />
                <div class="ml-3">
                  <p class="text-gray-800">{{ todo.text }}</p>
                  <p class="text-xs text-gray-500">{{ todo.date }}</p>
                </div>
              </li>
            </ul>
            <div class="mt-4">
              <button class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-md text-sm px-4 py-2">
                添加待办
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'PropertyDashboard',
    data() {
      return {
        latestWorkorders: [
          {
            title: '电梯故障报修',
            content: '3号楼2单元电梯无法正常使用，请尽快安排维修',
            status: 'pending',
            timestamp: '2小时前'
          },
          {
            title: '小区路灯损坏',
            content: '小区南门附近的3盏路灯不亮，疑似线路问题',
            status: 'processing',
            timestamp: '4小时前'
          },
          {
            title: '楼道墙面脱落',
            content: '5号楼3单元楼道墙面大面积脱落，存在安全隐患',
            status: 'urgent',
            timestamp: '昨天'
          },
          {
            title: '绿化带修剪',
            content: '小区中央花园绿化带需要修剪',
            status: 'completed',
            timestamp: '3天前'
          }
        ],
        todos: [
          { text: '处理3号楼业主投诉', date: '今天 14:00' },
          { text: '组织小区业主委员会会议', date: '明天 10:00' },
          { text: '完成本月财务报表', date: '本周五' },
          { text: '发布水电费缴纳通知', date: '本周内' }
        ]
      };
    },
    methods: {
      getStatusClass(status) {
        const classes = {
          pending: 'px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800',
          processing: 'px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800',
          completed: 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-800',
          urgent: 'px-2 py-1 rounded-full text-xs bg-red-100 text-red-800'
        };
        return classes[status] || classes.pending;
      },
      getStatusText(status) {
        const text = {
          pending: '待处理',
          processing: '处理中',
          completed: '已完成',
          urgent: '紧急'
        };
        return text[status] || '待处理';
      }
    }
  };
  </script>