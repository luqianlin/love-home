<template>
  <div class="community-list">
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">社区列表</h2>
          <div class="flex">
            <button class="btn btn-primary mr-2" @click="handleCreate">创建社区</button>
            <button class="btn btn-outline" @click="handleSwitchCommunity">切换当前社区</button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- 搜索区域 -->
        <div class="search-box mb-4 flex items-center flex-wrap">
          <div class="form-group mr-4 mb-2">
            <input
              v-model="searchParams.name"
              type="text"
              class="form-control"
              placeholder="社区名称"
            />
          </div>
          <div class="form-group mr-4 mb-2">
            <select v-model="searchParams.status" class="form-select">
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="pending">待审核</option>
              <option value="inactive">已禁用</option>
            </select>
          </div>
          <div class="form-group mr-4 mb-2">
            <select v-model="searchParams.province" class="form-select">
              <option value="">全部省份</option>
              <option v-for="province in provinces" :key="province" :value="province">
                {{ province }}
              </option>
            </select>
          </div>
          <button class="btn btn-primary mb-2" @click="handleSearch">搜索</button>
          <button class="btn btn-outline ml-2 mb-2" @click="resetSearch">重置</button>
        </div>

        <!-- 表格区域 -->
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>社区名称</th>
                <th>地址</th>
                <th>物业电话</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in communityList" :key="item.id" class="hover:bg-gray-50">
                <td>{{ item.id }}</td>
                <td>
                  <div class="flex items-center">
                    <span class="font-medium">{{ item.name }}</span>
                    <span v-if="item.id === currentCommunityId" class="badge-primary ml-2 px-2 py-1 rounded text-xs">当前</span>
                  </div>
                </td>
                <td>{{ item.address }}</td>
                <td>{{ item.property_contact || '未设置' }}</td>
                <td>
                  <span :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</span>
                </td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td>
                  <div class="flex space-x-2">
                    <button class="btn btn-sm btn-info" @click="handleEdit(item.id)">编辑</button>
                    <button 
                      v-if="item.id !== currentCommunityId" 
                      class="btn btn-sm btn-primary"
                      @click="handleSwitch(item.id)"
                    >
                      切换
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="communityList.length === 0">
                <td colspan="7" class="text-center py-4 text-gray-500">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页区域 -->
        <div class="pagination-wrapper mt-4 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            共 {{ pagination.total }} 条记录，当前第 {{ pagination.page }} / {{ pagination.pages }} 页
          </div>
          <div class="pagination">
            <button
              class="btn btn-outline btn-sm mx-1"
              :disabled="pagination.page <= 1"
              @click="handlePageChange(pagination.page - 1)"
            >
              上一页
            </button>
            <button
              v-for="pageNum in getPageNumbers()"
              :key="pageNum"
              class="btn btn-sm mx-1"
              :class="pageNum === pagination.page ? 'btn-primary' : 'btn-outline'"
              @click="handlePageChange(pageNum)"
            >
              {{ pageNum }}
            </button>
            <button
              class="btn btn-outline btn-sm mx-1"
              :disabled="pagination.page >= pagination.pages"
              @click="handlePageChange(pagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getCommunities, switchCommunity } from '@/api/community';
import { ElMessage } from 'element-plus';

export default {
  name: 'CommunityList',
  setup() {
    const router = useRouter();
    const communityList = ref([]);
    const currentCommunityId = ref(null);
    const loading = ref(false);
    const pagination = reactive({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1
    });
    
    const searchParams = reactive({
      name: '',
      status: '',
      province: ''
    });

    // 省份列表，实际项目中可以从API获取
    const provinces = ref(['北京市', '上海市', '广东省', '江苏省', '浙江省']);

    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        active: '正常',
        pending: '待审核',
        inactive: '已禁用'
      };
      return statusMap[status] || status;
    };

    // 获取状态样式
    const getStatusClass = (status) => {
      const classMap = {
        active: 'text-green-600',
        pending: 'text-yellow-600',
        inactive: 'text-red-600'
      };
      return classMap[status] || '';
    };

    // 获取分页号码列表
    const getPageNumbers = () => {
      const { page, pages } = pagination;
      if (pages <= 5) {
        return Array.from({ length: pages }, (_, i) => i + 1);
      }
      
      if (page <= 3) {
        return [1, 2, 3, 4, 5];
      }
      
      if (page >= pages - 2) {
        return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
      }
      
      return [page - 2, page - 1, page, page + 1, page + 2];
    };

    // 获取社区列表
    const fetchCommunities = async () => {
      try {
        loading.value = true;
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...searchParams
        };
        
        const res = await getCommunities(params);
        if (res.code === 200) {
          communityList.value = res.data.communities;
          pagination.total = res.data.pagination.total;
          pagination.pages = res.data.pagination.pages;
          
          // 获取当前用户的社区ID
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          currentCommunityId.value = userInfo.current_community_id;
        }
      } catch (error) {
        console.error('获取社区列表失败', error);
        ElMessage.error('获取社区列表失败');
      } finally {
        loading.value = false;
      }
    };

    // 切换社区
    const handleSwitch = async (communityId) => {
      try {
        const res = await switchCommunity(communityId);
        if (res.code === 200) {
          ElMessage.success('切换社区成功');
          // 更新本地存储的用户信息
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          userInfo.current_community_id = communityId;
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          
          currentCommunityId.value = communityId;
        }
      } catch (error) {
        console.error('切换社区失败', error);
        ElMessage.error('切换社区失败');
      }
    };

    // 搜索
    const handleSearch = () => {
      pagination.page = 1;
      fetchCommunities();
    };

    // 重置搜索
    const resetSearch = () => {
      Object.keys(searchParams).forEach(key => {
        searchParams[key] = '';
      });
      pagination.page = 1;
      fetchCommunities();
    };

    // 页码变化
    const handlePageChange = (page) => {
      pagination.page = page;
      fetchCommunities();
    };

    // 创建社区
    const handleCreate = () => {
      router.push({ name: 'CommunityCreate' });
    };

    // 编辑社区
    const handleEdit = (id) => {
      router.push({ name: 'CommunityEdit', params: { id } });
    };

    // 切换到社区选择器
    const handleSwitchCommunity = () => {
      router.push({ name: 'CommunitySwitcher' });
    };

    onMounted(() => {
      fetchCommunities();
    });

    return {
      communityList,
      currentCommunityId,
      pagination,
      searchParams,
      provinces,
      formatDate,
      getStatusText,
      getStatusClass,
      getPageNumbers,
      handleSearch,
      resetSearch,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleSwitch,
      handleSwitchCommunity
    };
  }
};
</script>

<style scoped>
.community-list {
  padding: 1rem;
}
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.card-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}
.card-body {
  padding: 1rem;
}
.form-control, .form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}
.badge-primary {
  background-color: #4CAF50;
  color: white;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.btn-primary {
  background-color: #4CAF50;
  color: white;
  border: 1px solid #4CAF50;
}
.btn-outline {
  background-color: transparent;
  border: 1px solid #ddd;
  color: #333;
}
.btn-info {
  background-color: #2196F3;
  color: white;
  border: 1px solid #2196F3;
}
.btn:hover {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>