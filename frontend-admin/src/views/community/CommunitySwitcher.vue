<template>
  <div class="community-switcher">
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">切换小区</h2>
          <button class="btn btn-primary" @click="refreshLocation">
            <i class="fa fa-location-arrow mr-1"></i> 刷新位置
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <!-- 当前位置信息 -->
        <div v-if="locationStatus" class="location-info mb-4 p-3 rounded border">
          <div class="flex items-center">
            <i class="fa fa-map-marker-alt text-primary text-xl mr-2"></i>
            <div>
              <div class="text-sm text-gray-500">您当前的位置：</div>
              <div class="font-medium">{{ locationStatus === 'success' ? locationAddress : '定位失败，请手动选择小区' }}</div>
            </div>
          </div>
        </div>
        
        <!-- 当前选中的社区 -->
        <div v-if="currentCommunity" class="current-community mb-4 p-4 rounded bg-green-50 border border-green-200">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm text-gray-500">当前使用的社区：</div>
              <div class="font-medium text-lg">{{ currentCommunity.name }}</div>
              <div class="text-sm text-gray-500 mt-1">{{ currentCommunity.address }}</div>
            </div>
            <button class="btn btn-sm btn-outline" @click="handleCreateCommunity">创建新社区</button>
          </div>
        </div>

        <!-- 位置匹配的社区 -->
        <template v-if="matchedCommunity">
          <h3 class="text-lg font-medium mb-3">您所在的社区</h3>
          <div class="matched-community bg-blue-50 border border-blue-200 p-4 rounded mb-4">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium text-lg">{{ matchedCommunity.name }}</div>
                <div class="text-sm text-gray-500 mt-1">{{ matchedCommunity.address }}</div>
                <div class="text-xs text-gray-400 mt-1">
                  <span v-if="matchedCommunity.distance_km">距离您 {{ (matchedCommunity.distance_km * 1000).toFixed(0) }} 米</span>
                </div>
              </div>
              <button 
                class="btn btn-primary"
                :disabled="currentCommunity && currentCommunity.id === matchedCommunity.id"
                @click="handleSwitch(matchedCommunity.id)"
              >
                {{ currentCommunity && currentCommunity.id === matchedCommunity.id ? '当前使用中' : '切换为当前社区' }}
              </button>
            </div>
          </div>
        </template>

        <!-- 附近的社区列表 -->
        <template v-if="nearbyCommunities.length > 0">
          <h3 class="text-lg font-medium mb-3">附近的社区</h3>
          <div class="nearby-communities">
            <div 
              v-for="community in nearbyCommunities" 
              :key="community.id"
              class="community-item border p-4 rounded mb-3 hover:bg-gray-50"
            >
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium">{{ community.name }}</div>
                  <div class="text-sm text-gray-500 mt-1">{{ community.address }}</div>
                  <div class="text-xs text-gray-400 mt-1">
                    <span v-if="community.distance_km">距离您 {{ (community.distance_km * 1000).toFixed(0) }} 米</span>
                  </div>
                </div>
                <div class="flex items-center">
                  <button 
                    class="btn btn-sm btn-primary"
                    :disabled="currentCommunity && currentCommunity.id === community.id"
                    @click="handleSwitch(community.id)"
                  >
                    {{ currentCommunity && currentCommunity.id === community.id ? '当前使用中' : '切换' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 用户已加入的社区列表 -->
        <template v-if="userCommunities.length > 0">
          <h3 class="text-lg font-medium my-3">您已加入的社区</h3>
          <div class="user-communities">
            <div 
              v-for="item in userCommunities" 
              :key="item.community_id"
              class="community-item border p-4 rounded mb-3"
              :class="{'bg-gray-50': currentCommunity && currentCommunity.id === item.community_id}"
            >
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium">{{ item.Community.name }}</div>
                  <div class="text-sm text-gray-500 mt-1">{{ item.Community.address }}</div>
                  <div class="flex mt-1">
                    <span v-if="item.is_default" class="badge-primary px-2 py-1 rounded text-xs mr-2">默认</span>
                    <span v-if="item.building" class="badge-info px-2 py-1 rounded text-xs mr-2">{{ item.building }}栋</span>
                    <span class="badge-secondary px-2 py-1 rounded text-xs">{{ getRoleText(item.role) }}</span>
                  </div>
                </div>
                <div class="flex items-center">
                  <button 
                    v-if="!item.is_default"
                    class="btn btn-sm btn-outline mr-2"
                    @click="handleSetDefault(item.community_id)"
                  >
                    设为默认
                  </button>
                  <button 
                    class="btn btn-sm"
                    :class="currentCommunity && currentCommunity.id === item.community_id ? 'btn-success' : 'btn-primary'"
                    :disabled="currentCommunity && currentCommunity.id === item.community_id"
                    @click="handleSwitch(item.community_id)"
                  >
                    {{ currentCommunity && currentCommunity.id === item.community_id ? '当前使用中' : '切换' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 地图区域 -->
        <div class="map-container mt-4" style="height: 400px;">
          <div id="map" style="height: 100%; width: 100%;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getUserCommunities, switchCommunity, setDefaultCommunity, findNearbyCommunities } from '@/api/community';
import { ElMessage } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default {
  name: 'CommunitySwitcher',
  setup() {
    const router = useRouter();
    const map = ref(null);
    const userCommunities = ref([]);
    const nearbyCommunities = ref([]);
    const matchedCommunity = ref(null);
    const currentLocation = ref(null);
    const locationAddress = ref('');
    const locationStatus = ref('');
    const markers = ref([]);
    
    const currentCommunity = ref(null);
    const getCurrentCommunityId = () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return userInfo.current_community_id;
    };

    // 获取用户角色文本
    const getRoleText = (role) => {
      const roleMap = {
        resident: '住户',
        property_admin: '物业管理员',
        visitor: '访客'
      };
      return roleMap[role] || role;
    };

    // 初始化地图
    const initMap = () => {
      // 设置默认位置为中国中心点
      const defaultCenter = [35.86166, 104.195397]; 
      
      // 创建地图
      map.value = L.map('map').setView(defaultCenter, 5);
      
      // 添加OSM底图
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.value);
    };

    // 更新地图位置
    const updateMapLocation = (lat, lng) => {
      if (!map.value) return;
      
      // 清除现有标记
      markers.value.forEach(marker => marker.remove());
      markers.value = [];
      
      // 设置地图中心
      map.value.setView([lat, lng], 15);
      
      // 添加当前位置标记
      const currentPosMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'current-location-marker',
          html: '<div class="pulse"></div>',
          iconSize: [15, 15]
        })
      }).addTo(map.value);
      
      markers.value.push(currentPosMarker);
      
      // 添加社区标记
      if (matchedCommunity.value) {
        addCommunityMarker(matchedCommunity.value, true);
      }
      
      nearbyCommunities.value.forEach(community => {
        addCommunityMarker(community);
      });
      
      userCommunities.value.forEach(item => {
        if (item.Community.center_point) {
          try {
            const point = JSON.parse(item.Community.center_point);
            if (point.coordinates) {
              addCommunityMarker({
                id: item.community_id,
                name: item.Community.name,
                center_point: item.Community.center_point
              }, currentCommunity.value && currentCommunity.value.id === item.community_id);
            }
          } catch (e) {
            console.error('解析社区中心点失败', e);
          }
        }
      });
    };

    // 添加社区标记
    const addCommunityMarker = (community, isCurrent = false) => {
      if (!map.value) return;
      
      let lat, lng;
      
      // 解析社区中心点
      if (community.center_point) {
        try {
          if (typeof community.center_point === 'string') {
            const point = JSON.parse(community.center_point);
            if (point.coordinates) {
              [lng, lat] = point.coordinates;
            }
          } else if (community.center_point.coordinates) {
            [lng, lat] = community.center_point.coordinates;
          }
        } catch (e) {
          console.error('解析社区中心点失败', e);
          return;
        }
      } else {
        return;
      }
      
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: `community-marker ${isCurrent ? 'current' : ''}`,
          html: `<div class="marker-content ${isCurrent ? 'current' : ''}">${community.name}</div>`,
          iconSize: [100, 30],
          iconAnchor: [50, 30]
        })
      }).addTo(map.value);
      
      marker.bindPopup(`
        <div>
          <h3>${community.name}</h3>
          <p>${community.address || ''}</p>
          ${community.distance_km ? `<p>距离: ${(community.distance_km * 1000).toFixed(0)}米</p>` : ''}
          <button onclick="window.switchToCommunity(${community.id})" class="popup-btn">
            ${isCurrent ? '当前使用中' : '切换到此社区'}
          </button>
        </div>
      `);
      
      markers.value.push(marker);
    };

    // 获取用户位置
    const getUserLocation = () => {
      locationStatus.value = 'loading';
      
      if (!navigator.geolocation) {
        locationStatus.value = 'error';
        ElMessage.error('您的浏览器不支持地理定位');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          currentLocation.value = { lat: latitude, lng: longitude };
          
          // 调用逆地理编码API获取位置详情
          try {
            // 这里应该调用一个逆地理编码API，这里仅模拟
            locationAddress.value = `位置坐标: (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
            
            // 查找附近社区
            const res = await findNearbyCommunities(latitude, longitude, 3);
            if (res.code === 200) {
              matchedCommunity.value = res.data.matched;
              nearbyCommunities.value = res.data.communities.filter(c => {
                return !matchedCommunity.value || c.id !== matchedCommunity.value.id;
              });
              
              // 更新地图
              updateMapLocation(latitude, longitude);
            }
            
            locationStatus.value = 'success';
          } catch (error) {
            console.error('获取位置信息失败', error);
            locationStatus.value = 'error';
          }
        },
        (error) => {
          console.error('定位失败', error);
          locationStatus.value = 'error';
          ElMessage.error('定位失败，请确保已授权位置权限');
        }
      );
    };

    // 刷新位置
    const refreshLocation = () => {
      getUserLocation();
    };

    // 获取用户的社区列表
    const fetchUserCommunities = async () => {
      try {
        const res = await getUserCommunities();
        if (res.code === 200) {
          userCommunities.value = res.data;
          
          // 获取当前社区
          const currentId = getCurrentCommunityId();
          if (currentId) {
            const found = userCommunities.value.find(item => item.community_id === currentId);
            if (found) {
              currentCommunity.value = {
                id: found.community_id,
                name: found.Community.name,
                address: found.Community.address
              };
            }
          }
        }
      } catch (error) {
        console.error('获取用户社区列表失败', error);
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
          
          // 更新当前社区
          let targetCommunity;
          
          // 在用户社区中查找
          const userCommunity = userCommunities.value.find(item => item.community_id === communityId);
          if (userCommunity) {
            targetCommunity = {
              id: userCommunity.community_id,
              name: userCommunity.Community.name,
              address: userCommunity.Community.address
            };
          } 
          // 在匹配社区中查找
          else if (matchedCommunity.value && matchedCommunity.value.id === communityId) {
            targetCommunity = matchedCommunity.value;
          } 
          // 在附近社区中查找
          else {
            const found = nearbyCommunities.value.find(c => c.id === communityId);
            if (found) {
              targetCommunity = found;
            }
          }
          
          if (targetCommunity) {
            currentCommunity.value = targetCommunity;
          }
        }
      } catch (error) {
        console.error('切换社区失败', error);
        ElMessage.error('切换社区失败');
      }
    };

    // 设置默认社区
    const handleSetDefault = async (communityId) => {
      try {
        const res = await setDefaultCommunity(communityId);
        if (res.code === 200) {
          ElMessage.success('设置默认社区成功');
          // 刷新社区列表
          fetchUserCommunities();
        }
      } catch (error) {
        console.error('设置默认社区失败', error);
        ElMessage.error('设置默认社区失败');
      }
    };

    // 创建新社区
    const handleCreateCommunity = () => {
      router.push({ name: 'CommunityCreate' });
    };

    // 注册全局切换社区方法（用于地图标记的点击事件）
    const registerGlobalSwitchMethod = () => {
      window.switchToCommunity = (communityId) => {
        handleSwitch(communityId);
      };
    };

    // 清理全局方法
    const cleanupGlobalMethods = () => {
      window.switchToCommunity = undefined;
    };

    onMounted(() => {
      initMap();
      fetchUserCommunities();
      getUserLocation();
      registerGlobalSwitchMethod();
    });

    onUnmounted(() => {
      if (map.value) {
        map.value.remove();
        map.value = null;
      }
      cleanupGlobalMethods();
    });

    return {
      userCommunities,
      nearbyCommunities,
      matchedCommunity,
      currentCommunity,
      locationAddress,
      locationStatus,
      getRoleText,
      refreshLocation,
      handleSwitch,
      handleSetDefault,
      handleCreateCommunity
    };
  }
};
</script>

<style scoped>
.community-switcher {
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
.btn-success {
  background-color: #2E7D32;
  color: white;
  border: 1px solid #2E7D32;
}
.btn-outline {
  background-color: transparent;
  border: 1px solid #ddd;
  color: #333;
}
.btn-outline:hover {
  background-color: #f5f5f5;
}
.btn:hover {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.text-primary {
  color: #4CAF50;
}
.badge-primary {
  background-color: #4CAF50;
  color: white;
}
.badge-info {
  background-color: #2196F3;
  color: white;
}
.badge-secondary {
  background-color: #9E9E9E;
  color: white;
}

/* 地图样式 */
:deep(.current-location-marker .pulse) {
  width: 15px;
  height: 15px;
  background-color: #4285f4;
  border-radius: 50%;
  box-shadow: 0 0 0 rgba(66, 133, 244, 0.4);
  animation: pulse 1.5s infinite;
}
:deep(.community-marker) {
  background: transparent;
}
:deep(.community-marker .marker-content) {
  background-color: #FF5722;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(.community-marker .marker-content.current) {
  background-color: #4CAF50;
}
:deep(.popup-btn) {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  margin-top: 5px;
  font-size: 12px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
  }
}
</style>