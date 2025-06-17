/**
 * 微信小程序连接测试脚本
 * 用于验证对CONNECTION_CLOSED错误的修复
 */

const https = require('https');
const http = require('http');

// 测试配置
const CONFIG = {
  domain: 'lovehome.xin',
  endpoints: [
    '/health',
    '/api/health'
  ],
  iterations: 5,  // 每个端点测试次数
  delay: 1500,    // 测试间隔(ms)
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 模拟微信小程序的请求头
const wxHeaders = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.20 NetType/WIFI Language/zh_CN miniProgram',
  'Referer': 'https://servicewechat.com/appid/devtools',
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

/**
 * 发送HTTPS请求并返回Promise
 */
function makeRequest(protocol, options) {
  const client = protocol === 'https' ? https : http;
  const fullUrl = `${protocol}://${options.hostname}${options.path}`;
  
  console.log(`${colors.bright}${colors.blue}请求: ${fullUrl}${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    const start = Date.now();
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: tryParseJSON(data),
          duration
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - start;
      reject({
        error: error.message,
        duration
      });
    });
    
    // 模拟CONNECTION_CLOSED错误的超时
    req.setTimeout(10000, () => {
      req.destroy(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

/**
 * 尝试解析JSON，失败则返回原始数据
 */
function tryParseJSON(data) {
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
}

/**
 * 延时函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试单个端点
 */
async function testEndpoint(endpoint, protocol = 'https') {
  const options = {
    hostname: CONFIG.domain,
    port: protocol === 'https' ? 443 : 80,
    path: endpoint,
    method: 'GET',
    headers: wxHeaders,
    timeout: 5000,
    rejectUnauthorized: false  // 忽略自签名证书错误
  };
  
  try {
    const response = await makeRequest(protocol, options);
    console.log(`${colors.green}✓ 成功:${colors.reset} 状态码=${response.status}, 用时=${response.duration}ms`);
    console.log(`  响应头: Connection=${response.headers.connection || '未设置'}`);
    console.log(`  响应数据: ${JSON.stringify(response.data).substring(0, 100)}...`);
    return { success: true, response };
  } catch (error) {
    console.log(`${colors.red}✗ 失败:${colors.reset} ${error.error}, 用时=${error.duration}ms`);
    return { success: false, error };
  }
}

/**
 * 运行完整测试
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.magenta}====== 微信小程序连接测试工具 ======${colors.reset}\n`);
  console.log(`${colors.yellow}测试域名: ${CONFIG.domain}${colors.reset}`);
  console.log(`${colors.yellow}测试次数: 每个端点 ${CONFIG.iterations} 次${colors.reset}\n`);
  
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    endpoints: {}
  };
  
  // 测试HTTPS端点
  for (const endpoint of CONFIG.endpoints) {
    console.log(`\n${colors.cyan}测试端点: ${endpoint} (HTTPS)${colors.reset}`);
    results.endpoints[endpoint] = { success: 0, failed: 0, avgDuration: 0 };
    
    let totalDuration = 0;
    
    for (let i = 0; i < CONFIG.iterations; i++) {
      const result = await testEndpoint(endpoint);
      results.total++;
      
      if (result.success) {
        results.success++;
        results.endpoints[endpoint].success++;
        totalDuration += result.response.duration;
      } else {
        results.failed++;
        results.endpoints[endpoint].failed++;
      }
      
      // 等待一段时间再发起下一次请求
      if (i < CONFIG.iterations - 1) {
        await sleep(CONFIG.delay);
      }
    }
    
    // 计算平均响应时间
    results.endpoints[endpoint].avgDuration = 
      totalDuration / results.endpoints[endpoint].success || 0;
  }
  
  // 结果摘要
  console.log(`\n${colors.bright}${colors.magenta}====== 测试结果摘要 ======${colors.reset}`);
  console.log(`${colors.yellow}总请求数: ${results.total}${colors.reset}`);
  console.log(`${colors.green}成功: ${results.success} (${(results.success/results.total*100).toFixed(1)}%)${colors.reset}`);
  console.log(`${colors.red}失败: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)${colors.reset}\n`);
  
  // 端点详情
  for (const endpoint in results.endpoints) {
    const info = results.endpoints[endpoint];
    console.log(`${colors.cyan}端点 ${endpoint}:${colors.reset}`);
    console.log(`  成功率: ${(info.success/(info.success+info.failed)*100).toFixed(1)}%`);
    console.log(`  平均响应时间: ${info.avgDuration.toFixed(2)}ms`);
  }
  
  // 问题诊断和建议
  console.log(`\n${colors.bright}${colors.magenta}====== 问题诊断 ======${colors.reset}`);
  if (results.failed > 0) {
    console.log(`${colors.red}存在连接失败情况，可能的原因:${colors.reset}`);
    console.log(`  1. 服务器配置问题（Connection: close 头）`);
    console.log(`  2. SSL证书链不完整`);
    console.log(`  3. 防火墙或安全组阻止连接`);
    console.log(`  4. 服务器响应超时`);
    
    console.log(`\n${colors.yellow}建议:${colors.reset}`);
    console.log(`  1. 检查Nginx keepalive_timeout设置`);
    console.log(`  2. 确认SSL证书状态并修复证书链`);
    console.log(`  3. 检查微信小程序端连接设置`);
  } else {
    console.log(`${colors.green}全部测试通过！连接问题已修复。${colors.reset}`);
  }
}

// 执行测试
runTests().catch(console.error); 