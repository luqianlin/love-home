<template>
  <div class="community-form">
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">{{ isEdit ? '编辑社区' : '创建社区' }}</h2>
          <button class="btn btn-outline" @click="goBack">返回</button>
        </div>
      </div>
      
      <div class="card-body">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="text-lg font-medium mb-3">基本信息</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">社区名称 <span class="text-red-500">*</span></label>
                <input 
                  v-model="formData.name" 
                  type="text" 
                  class="form-control" 
                  placeholder="请输入社区名称，如：华盛小区"
                  required
                  :class="{ 'invalid': errors.name }"
                >
                <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
              </div>
              
              <div class="form-group">
                <label class="form-label">物业联系电话</label>
                <input 
                  v-model="formData.property_contact" 
                  type="tel" 
                  class="form-control" 
                  placeholder="请输入物业联系电话"
                  :class="{ 'invalid': errors.property_contact }"
                >
                <div v-if="errors.property_contact" class="error-message">{{ errors.property_contact }}</div>
              </div>
            </div>
          </div>
          
          <!-- 地址信息 -->
          <div class="form-section">
            <h3 class="text-lg font-medium mb-3">地址信息</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-group">
                <label class="form-label">省份 <span class="text-red-500">*</span></label>
                <select 
                  v-model="formData.province" 
                  class="form-select"
                  required
                  :class="{ 'invalid': errors.province }"
                >
                  <option value="">请选择省份</option>
                  <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
                </select>
                <div v-if="errors.province" class="error-message">{{ errors.province }}</div>
              </div>
              
              <div class="form-group">
                <label class="form-label">城市 <span class="text-red-500">*</span></label>
                <select 
                  v-model="formData.city" 
                  class="form-select"
                  required
                  :class="{ 'invalid': errors.city }"
                >
                  <option value="">请选择城市</option>
                  <option v-for="city in filteredCities" :key="city" :value="city">{{ city }}</option>
                </select>
                <div v-if="errors.city" class="error-message">{{ errors.city }}</div>
              </div>
              
              <div class="form-group">
                <label class="form-label">区县 <span class="text-red-500">*</span></label>
                <select 
                  v-model="formData.district" 
                  class="form-select"
                  required
                  :class="{ 'invalid': errors.district }"
                >
                  <option value="">请选择区县</option>
                  <option v-for="district in filteredDistricts" :key="district" :value="district">{{ district }}</option>
                </select>
                <div v-if="errors.district" class="error-message">{{ errors.district }}</div>
              </div>
            </div>
            
            <div class="form-group mt-4">
              <label class="form-label">详细地址 <span class="text-red-500">*</span></label>
              <input 
                v-model="formData.address" 
                type="text" 
                class="form-control" 
                placeholder="请输入详细地址，如：XX路XX号"
                required
                :class="{ 'invalid': errors.address }"
              >
              <div v-if="errors.address" class="error-message">{{ errors.address }}</div>
            </div>
            
            <div class="form-group mt-4">
              <label class="form-label">社区照片URL</label>
              <input 
                v-model="formData.photo_url" 
                type="text" 
                class="form-control" 
                placeholder="请输入社区照片URL"
                :class="{ 'invalid': errors.photo_url }"
              >
              <div v-if="errors.photo_url" class="error-message">{{ errors.photo_url }}</div>
              <small class="text-gray-500">建议使用小区大门或标志性建筑的照片</small>
            </div>
          </div>
          
          <!-- 电子围栏设置 -->
          <div class="form-section">
            <h3 class="text-lg font-medium mb-3">电子围栏设置</h3>
            <p class="text-gray-500 mb-3">在地图上绘制小区边界作为电子围栏，用于自动匹配用户所在小区</p>
            
            <div class="map-container" style="height: 400px;">
              <div id="map" style="height: 100%; width: 100%;"></div>
            </div>
            
            <div class="map-controls mt-2 mb-4">
              <div class="flex flex-wrap items-center">
                <button type="button" class="btn btn-sm btn-outline mr-2 mb-2" @click="startDrawing">
                  <i class="fa fa-draw-polygon mr-1"></i> 绘制围栏
                </button>
                <button type="button" class="btn btn-sm btn-outline mr-2 mb-2" @click="clearDrawing">
                  <i class="fa fa-trash mr-1"></i> 清除围栏
                </button>
                <button type="button" class="btn btn-sm btn-outline mb-2" @click="getUserLocation">
                  <i class="fa fa-location-arrow mr-1"></i> 定位当前位置
                </button>
              </div>
              <div class="text-sm text-gray-500 mt-2">
                提示：电子围栏将用于自动匹配用户位置与小区，建议尽量准确绘制小区边界
              </div>
            </div>
            
            <!-- 隐藏字段，存储边界数据 -->
            <input type="hidden" v-model="formData.boundary">
            <input type="hidden" v-model="formData.center_point">
          </div>
          
          <!-- 状态设置 -->
          <div v-if="isEdit" class="form-section">
            <h3 class="text-lg font-medium mb-3">状态设置</h3>
            <div class="form-group">
              <label class="form-label">社区状态</label>
              <select v-model="formData.status" class="form-select">
                <option value="active">正常</option>
                <option value="pending">待审核</option>
                <option value="inactive">已禁用</option>
              </select>
            </div>
          </div>
          
          <!-- 提交按钮 -->
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? '提交中...' : (isEdit ? '保存修改' : '创建社区') }}
            </button>
            <button type="button" class="btn btn-outline ml-2" @click="goBack">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCommunityDetail, createCommunity, updateCommunity } from '@/api/community';
import { ElMessage } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';

export default {
  name: 'CommunityForm',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const isEdit = computed(() => Boolean(route.params.id));
    const isSubmitting = ref(false);
    const map = ref(null);
    const drawnItems = ref(null);
    
    // 表单数据
    const formData = reactive({
      name: '',
      address: '',
      province: '',
      city: '',
      district: '',
      property_contact: '',
      photo_url: '',
      boundary: '',
      center_point: '',
      status: 'active'
    });
    
    const errors = reactive({});
    
    // 中国省份列表（实际项目中应该从API获取）
    const provinces = ['北京市', '上海市', '广东省', '江苏省', '浙江省', '四川省', '湖北省'];
    
    // 城市数据（简化版，实际应从API获取）
    const cities = {
      '北京市': ['北京市'],
      '上海市': ['上海市'],
      '广东省': ['广州市', '深圳市', '佛山市', '东莞市'],
      '江苏省': ['南京市', '苏州市', '无锡市'],
      '浙江省': ['杭州市', '宁波市', '温州市'],
      '四川省': ['成都市', '绵阳市'],
      '湖北省': ['武汉市', '宜昌市']
    };
    
    // 区县数据（简化版，实际应从API获取）
    const districts = {
      '北京市': {
        '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区']
      },
      '上海市': {
        '上海市': ['黄浦区', '徐汇区', '静安区', '浦东新区']
      },
      '广东省': {
        '广州市': ['天河区', '海珠区', '越秀区'],
        '深圳市': ['福田区', '南山区', '罗湖区']
      }
      // ...其他省市的区县数据
    };
    
    // 根据选择的省份筛选城市
    const filteredCities = computed(() => {
      if (!formData.province) return [];
      return cities[formData.province] || [];
    });
    
    // 根据选择的省份和城市筛选区县
    const filteredDistricts = computed(() => {
      if (!formData.province || !formData.city) return [];
      return (districts[formData.province] && districts[formData.province][formData.city]) || [];
    });
    
    // 初始化地图
    const initMap = () => {
      // 设置默认位置为北京
      const defaultCenter = [39.9042, 116.4074]; 
      
      // 创建地图
      map.value = L.map('map').setView(defaultCenter, 12);
      
      // 添加OSM底图
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.value);
      
      // 初始化绘图图层
      drawnItems.value = new L.FeatureGroup();
      map.value.addLayer(drawnItems.value);
      
      // 初始化绘图控件
      const drawControl = new L.Control.Draw({
        draw: {
          polyline: false,
          circle: false,
          rectangle: false,
          circlemarker: false,
          marker: false,
          polygon: {
            allowIntersection: false,
            showArea: true
          }
        },
        edit: {
          featureGroup: drawnItems.value,
          remove: true,
          edit: true
        }
      });
      
      map.value.addControl(drawControl);
      
      // 监听绘图完成事件
      map.value.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItems.value.addLayer(layer);
        
        // 提取多边形坐标
        const polygon = layer.getLatLngs()[0];
        const coordinates = polygon.map(latLng => [latLng.lng, latLng.lat]);
        
        // 确保多边形闭合
        if (coordinates.length > 0) {
          coordinates.push(coordinates[0]);
        }
        
        // 保存边界数据
        formData.boundary = JSON.stringify(coordinates);
        
        // 计算中心点
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        formData.center_point = JSON.stringify({
          type: 'Point',
          coordinates: [center.lng, center.lat]
        });
      });
      
      // 监听编辑完成事件
      map.value.on(L.Draw.Event.EDITED, (event) => {
        const layers = event.layers;
        layers.eachLayer((layer) => {
          const polygon = layer.getLatLngs()[0];
          const coordinates = polygon.map(latLng => [latLng.lng, latLng.lat]);
          
          if (coordinates.length > 0) {
            coordinates.push(coordinates[0]);
          }
          
          formData.boundary = JSON.stringify(coordinates);
          
          const bounds = layer.getBounds();
          const center = bounds.getCenter();
          formData.center_point = JSON.stringify({
            type: 'Point',
            coordinates: [center.lng, center.lat]
          });
        });
      });
      
      // 监听删除完成事件
      map.value.on(L.Draw.Event.DELETED, () => {
        if (drawnItems.value.getLayers().length === 0) {
          formData.boundary = '';
          formData.center_point = '';
        }
      });
    };
    
    // 开始绘制
    const startDrawing = () => {
      // 清除现有的绘制
      clearDrawing();
      
      // 触发绘制多边形
      new L.Draw.Polygon(map.value).enable();
    };
    
    // 清除绘制
    const clearDrawing = () => {
      drawnItems.value.clearLayers();
      formData.boundary = '';
      formData.center_point = '';
    };
    
    // 获取用户位置
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        ElMessage.error('您的浏览器不支持地理定位');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.value.setView([latitude, longitude], 16);
          
          // 添加当前位置标记
          L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'current-location-marker',
              html: '<div class="pulse"></div>',
              iconSize: [15, 15]
            })
          }).addTo(map.value);
        },
        (error) => {
          console.error('定位失败', error);
          ElMessage.error('定位失败，请确保已授权位置权限');
        }
      );
    };
    
    // 加载社区详情
    const loadCommunityDetail = async (id) => {
      try {
        const res = await getCommunityDetail(id);
        if (res.code === 200) {
          const data = res.data;
          
          // 填充表单数据
          formData.name = data.name;
          formData.address = data.address;
          formData.province = data.province;
          formData.city = data.city;
          formData.district = data.district;
          formData.property_contact = data.property_contact;
          formData.photo_url = data.photo_url;
          formData.status = data.status;
          
          // 处理边界数据
          if (data.boundary) {
            let boundary;
            try {
              boundary = typeof data.boundary === 'string' ? JSON.parse(data.boundary) : data.boundary;
              formData.boundary = JSON.stringify(boundary.coordinates[0]);
              
              // 在地图上显示边界
              const coordinates = boundary.coordinates[0];
              const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
              
              // 添加多边形到地图
              const polygon = L.polygon(latLngs, { color: '#4CAF50' }).addTo(drawnItems.value);
              
              // 设置地图视图以包含多边形
              map.value.fitBounds(polygon.getBounds());
            } catch (e) {
              console.error('解析边界数据失败', e);
            }
          }
          
          // 处理中心点数据
          if (data.center_point) {
            let centerPoint;
            try {
              centerPoint = typeof data.center_point === 'string' ? JSON.parse(data.center_point) : data.center_point;
              formData.center_point = JSON.stringify(centerPoint);
              
              // 如果没有边界数据，则根据中心点设置地图视图
              if (!data.boundary && centerPoint.coordinates) {
                const [lng, lat] = centerPoint.coordinates;
                map.value.setView([lat, lng], 15);
              }
            } catch (e) {
              console.error('解析中心点数据失败', e);
            }
          }
        }
      } catch (error) {
        console.error('加载社区详情失败', error);
        ElMessage.error('加载社区详情失败');
      }
    };
    
    // 表单验证
    const validateForm = () => {
      // 清除之前的错误信息
      Object.keys(errors).forEach(key => delete errors[key]);
      
      let isValid = true;
      
      // 验证必填字段
      ['name', 'address', 'province', 'city', 'district'].forEach(field => {
        if (!formData[field]) {
          errors[field] = '此字段为必填项';
          isValid = false;
        }
      });
      
      // 验证电话格式
      if (formData.property_contact && !/^1[3-9]\d{9}$/.test(formData.property_contact)) {
        errors.property_contact = '请输入有效的手机号码';
        isValid = false;
      }
      
      return isValid;
    };
    
    // 提交表单
    const handleSubmit = async () => {
      if (!validateForm()) {
        ElMessage.error('表单填写有误，请检查');
        return;
      }
      
      try {
        isSubmitting.value = true;
        
        if (isEdit.value) {
          // 编辑模式
          const res = await updateCommunity(route.params.id, formData);
          if (res.code === 200) {
            ElMessage.success('社区信息更新成功');
            router.push({ name: 'CommunityList' });
          }
        } else {
          // 创建模式
          const res = await createCommunity(formData);
          if (res.code === 201) {
            ElMessage.success('社区创建成功');
            router.push({ name: 'CommunityList' });
          }
        }
      } catch (error) {
        console.error('提交失败', error);
        ElMessage.error('提交失败: ' + (error.response?.data?.message || '未知错误'));
      } finally {
        isSubmitting.value = false;
      }
    };
    
    // 返回上一页
    const goBack = () => {
      router.go(-1);
    };
    
    onMounted(async () => {
      // 这里添加一个延迟，确保地图容器已经渲染
      setTimeout(() => {
        initMap();
        
        if (isEdit.value) {
          loadCommunityDetail(route.params.id);
        }
      }, 100);
    });
    
    onUnmounted(() => {
      if (map.value) {
        map.value.remove();
        map.value = null;
      }
    });
    
    return {
      isEdit,
      isSubmitting,
      formData,
      errors,
      provinces,
      filteredCities,
      filteredDistricts,
      startDrawing,
      clearDrawing,
      getUserLocation,
      handleSubmit,
      goBack
    };
  }
};
</script>

<style scoped>
.community-form {
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
.form-section {
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #eee;
  border-radius: 0.5rem;
  background-color: #f9f9f9;
}
.form-group {
  margin-bottom: 0.75rem;
}
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
.form-control, .form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  outline: none;
  transition: border-color 0.3s;
}
.form-control:focus, .form-select:focus {
  border-color: #4CAF50;
}
.form-control.invalid, .form-select.invalid {
  border-color: #f44336;
}
.error-message {
  margin-top: 0.25rem;
  color: #f44336;
  font-size: 0.875rem;
}
.form-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
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
.btn:hover {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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