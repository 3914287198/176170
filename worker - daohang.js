/**
 * Cloudflare Worker - 批量检测所有域名
 * 检测所有HTTP和HTTPS域名，一次性返回所有结果
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 要检测的所有域名列表
const ALL_URLS = [
  // 网盘地址（HTTP）
  'http://ruchu888.ysepan.com',
  'http://ruchu888.cccpan.com',
  'http://ruchu888.uupan.net',
  'http://ruchu888.ysok.net',
  'http://ruchu888.ysupan.com',
  // 新版网盘地址（HTTPS）
  'https://www.176170.xyz',
  'https://1.176170.xyz',
  'https://2.176170.xyz',
  'https://3.176170.xyz',
  'https://4.176170.xyz',
  // 博客地址（HTTPS）
  'https://bk1.176170.xyz',
  'https://bk2.176170.xyz',
  'https://bk3.176170.xyz',
  'https://bk4.176170.xyz',
  'https://bk5.176170.xyz',
  'https://bk6.176170.xyz',
  'https://bk7.176170.xyz',
  'https://bk8.176170.xyz'
];

// 检测单个URL
async function checkUrl(url) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // 不自动跟随重定向，避免重定向循环
      signal: AbortSignal.timeout(5000),
    });

    const endTime = Date.now();
    const httpCode = response.status;

    // 判断在线状态：
    // 在线：200-499（包括重定向301/302/307/308）、500、520
    // 离线：502、503、504、530、其他5xx错误
    const isOnline =
      (httpCode >= 200 && httpCode < 500) ||
      httpCode === 500 ||
      httpCode === 520;

    return {
      url: url,
      status: isOnline,
      http_code: httpCode,
      response_time: endTime - startTime,
      error: null,
    };
  } catch (error) {
    const endTime = Date.now();
    // catch到错误表示无法连接（域名不存在、网络超时等）
    return {
      url: url,
      status: false,
      http_code: 0,
      response_time: endTime - startTime,
      error: error.message,
    };
  }
}

export default {
  async fetch(request) {
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const startTime = Date.now();

    try {
      // 串行检测所有URL，避免"Too many subrequests"错误
      const results = [];
      for (const url of ALL_URLS) {
        const result = await checkUrl(url);
        results.push(result);
      }

      const endTime = Date.now();

      return new Response(
        JSON.stringify({
          success: true,
          total_time: endTime - startTime,
          count: results.length,
          online_count: results.filter(r => r.status).length,
          data: results,
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      const endTime = Date.now();
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          total_time: endTime - startTime,
        }),
        {
          status: 500,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
