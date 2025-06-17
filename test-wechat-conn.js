/**
 * 微信小程序连接测试脚本
 * 模拟微信小程序发送请求，用于测试服务器响应
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const util = require('util');

// 测试配置
const config = {
  // 目标服务器
  host: 'lovehome.xin',
  // 测试的端点
  endpoints: [
    { path: '/health', method: 'GET' },
    { path: '/api/health', method: 'GET' }
  ],
  // 是否忽略SSL错误
  ignoreSSLErrors: true,
  // 模拟微信小程序的UA
  userAgent: 'MicroMessenger/miniProgram lovehome/1.0',
  // 是否使用HTTP/2
  useHttp2: false,
  // 日志级别: 'debug', 'info', 'warn', 'error'
  logLevel: 'info',
  // 超时时间(毫秒)
  timeout: 10000,
  // 测试协议: 'http', 'https'
  protocol: 'https',
  // 是否保存响应到文件
  saveResponsesToFile: true,
  // 响应保存路径
  responsesPath: './test-responses'
};

// 日志级别定义
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 日志函数
const log = (level, message, data) => {
  if (LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, util.inspect(data, { depth: null, colors: true }));
    } else {
      console.log(logMessage);
    }
    
    // 保存到日志文件
    const logEntry = `${logMessage}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync('./wechat-conn-test.log', logEntry);
  }
};

/**
 * 发送请求到指定端点
 * @param {Object} endpoint - 端点配置
 * @param {Boolean} useCustomAgent - 是否使用自定义Agent
 */
const testEndpoint = (endpoint, useCustomAgent = false) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: config.host,
      path: endpoint.path,
      method: endpoint.method,
      timeout: config.timeout,
      headers: {
        'User-Agent': config.userAgent,
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    };
    
    // 是否忽略SSL错误
    if (config.protocol === 'https' && config.ignoreSSLErrors) {
      options.rejectUnauthorized = false;
    }
    
    // 添加自定义Agent
    if (useCustomAgent) {
      if (config.protocol === 'https') {
        options.agent = new https.Agent({
          keepAlive: true,
          keepAliveMsecs: 3000,
          maxSockets: 1,
          rejectUnauthorized: !config.ignoreSSLErrors
        });
      } else {
        options.agent = new http.Agent({
          keepAlive: true,
          keepAliveMsecs: 3000,
          maxSockets: 1
        });
      }
    }
    
    log('debug', `请求 ${config.protocol}://${config.host}${endpoint.path} 参数:`, options);
    
    const protocol = config.protocol === 'https' ? https : http;
    
    const req = protocol.request(options, (res) => {
      const elapsedTime = Date.now() - startTime;
      const statusCategory = Math.floor(res.statusCode / 100);
      
      log('info', `请求完成: ${endpoint.path}`, {
        statusCode: res.statusCode,
        headers: res.headers,
        elapsedTime: `${elapsedTime}ms`
      });
      
      let data = '';
      
      // 获取响应内容
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // 响应结束
      res.on('end', () => {
        try {
          // 尝试解析JSON响应
          const parsedData = data ? JSON.parse(data) : {};
          
          // 保存响应到文件
          if (config.saveResponsesToFile) {
            // 确保目录存在
            if (!fs.existsSync(config.responsesPath)) {
              fs.mkdirSync(config.responsesPath, { recursive: true });
            }
            
            const filename = `${config.responsesPath}/${config.host.replace(/\./g, '_')}_${endpoint.path.replace(/\//g, '_')}_${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify({
              endpoint: endpoint,
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedData,
              elapsedTime: elapsedTime,
              date: new Date().toISOString()
            }, null, 2));
          }
          
          log('debug', `响应数据:`, parsedData);
          resolve({
            endpoint: endpoint,
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData,
            elapsedTime: elapsedTime,
            success: statusCategory === 2
          });
        } catch (error) {
          log('error', `解析响应数据失败`, { 
            error: error.message, 
            data 
          });
          resolve({
            endpoint: endpoint,
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            elapsedTime: elapsedTime,
            success: statusCategory === 2,
            parseError: error.message
          });
        }
      });
    });
    
    // 处理错误
    req.on('error', (error) => {
      const elapsedTime = Date.now() - startTime;
      log('error', `请求失败: ${endpoint.path}`, { 
        error: error.message,
        code: error.code,
        elapsedTime: `${elapsedTime}ms`
      });
      
      resolve({
        endpoint: endpoint,
        error: error.message,
        code: error.code,
        elapsedTime: elapsedTime,
        success: false
      });
    });
    
    // 设置超时处理
    req.on('timeout', () => {
      log('warn', `请求超时: ${endpoint.path}`, {
        timeout: config.timeout
      });
      req.destroy();
    });
    
    // 发送请求
    req.end();
  });
};

/**
 * 进行所有端点的测试
 */
const runTests = async () => {
  log('info', '开始微信小程序连接测试', { 
    server: `${config.protocol}://${config.host}`,
    endpoints: config.endpoints.map(e => e.path),
    time: new Date().toISOString()
  });
  
  // 准备结果存储
  const results = [];
  
  // 标准测试
  log('info', '执行标准测试...');
  for (const endpoint of config.endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // 使用自定义Agent的测试
  log('info', '使用自定义Agent执行测试...');
  for (const endpoint of config.endpoints) {
    const result = await testEndpoint(endpoint, true);
    results.push({
      ...result,
      customAgent: true
    });
  }
  
  // 输出结果摘要
  log('info', '测试完成，结果摘要:', {
    totalTests: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageTime: `${Math.round(results.reduce((sum, r) => sum + r.elapsedTime, 0) / results.length)}ms`
  });
  
  // 分析失败的请求
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    log('warn', '失败的请求:', failedResults);
    
    // 分析失败原因
    const errorCodes = {};
    failedResults.forEach(result => {
      if (result.code) {
        errorCodes[result.code] = (errorCodes[result.code] || 0) + 1;
      }
    });
    
    log('warn', '失败原因统计:', errorCodes);
    
    // 针对特定错误提供建议
    if (errorCodes['ECONNRESET'] || errorCodes['ETIMEDOUT']) {
      log('info', '建议: 服务器可能关闭了连接或响应超时，检查服务器防火墙、SSL配置和超时设置');
    }
    
    if (errorCodes['CERT_HAS_EXPIRED']) {
      log('info', '建议: SSL证书已过期，请更新证书');
    }
    
    if (errorCodes['ENOTFOUND']) {
      log('info', '建议: 无法解析域名，检查DNS配置');
    }
  }
};

// 运行测试
runTests().catch(error => {
  log('error', '测试过程中发生错误', { error: error.message, stack: error.stack });
});