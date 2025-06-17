# 智慧社区平台小程序

## 配置说明

### 域名配置

根据微信小程序安全规范，所有网络请求必须使用HTTPS协议并且域名必须在微信公众平台后台配置。

#### 生产环境

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发"->"开发设置"->"服务器域名"
3. 添加以下域名到对应类别：
   - **request合法域名**：`https://lovehome.xin`
   - **socket合法域名**：`wss://lovehome.xin`（如需WebSocket）
   - **上传/下载合法域名**：`https://lovehome.xin`（如需文件上传下载）
4. DNS预解析域名中添加：`lovehome.xin`

#### 开发环境

开发时有两种方式：

1. 在微信开发者工具中勾选 "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"：
   - 点击工具栏中的"详情"
   - 勾选"本地设置"中的"不校验合法域名..."选项

2. 在微信公众平台后台添加开发服务器域名：
   - 添加 `http://localhost:3000` 到request合法域名

注意：手机预览时，如需访问本地服务器，建议使用内网穿透工具（如ngrok、花生壳等）。

### API基础URL配置

生产环境和开发环境的API基础URL配置在 `app.js` 中：

```javascript
globalData: {
  // 生产环境 - 使用HTTPS协议
  baseUrl: 'https://lovehome.xin/api',
  
  // 开发环境 - 在开发者工具中需禁用域名校验或配置localhost为合法域名
  // baseUrl: 'http://localhost:3000/api',
}
```

## 系统信息API更新说明

微信小程序SDK已将 `wx.getSystemInfoSync()` 标记为过时API。请使用以下新API替代：

- `wx.getAppBaseInfo()` - 获取应用基本信息
- `wx.getSystemSetting()` - 获取系统设置
- `wx.getDeviceInfo()` - 获取设备信息
- `wx.getWindowInfo()` - 获取窗口信息

本项目已在 `app.js` 中更新相关代码：

```javascript
const systemInfo = {
  ...wx.getAppBaseInfo(),
  ...wx.getSystemSetting(),
  ...wx.getDeviceInfo(),
  ...wx.getWindowInfo()
};
```

## 开发注意事项

1. 网络请求限制：
   - 最大并发数：wx.request、wx.uploadFile、wx.downloadFile为10个
   - WebSocket连接数：wx.connectSocket最多5个

2. 小程序进入后台后，5秒内网络请求没有结束会返回错误

3. 域名要求：
   - 只支持HTTPS/WSS协议
   - 域名必须经过ICP备案
   - 不支持IP地址和localhost（需要在开发者工具中禁用校验） 