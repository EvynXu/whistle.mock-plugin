const axios = require('axios');
const { URL } = require('url');

/**
 * 代理抓取真实接口响应
 * POST /cgi-bin/proxy-fetch
 * body: {
 *   url: string,
 *   method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
 *   headers?: Record<string, string>,
 *   queryParams?: Record<string, string>,
 *   body?: any,
 *   bodyType?: 'json' | 'form' | 'text' | 'none'
 * }
 *
 * 注意：ui-server.js 已用 body-parser 解析 JSON，直接取 req.body
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ code: 405, message: 'Method Not Allowed' }));
    return;
  }

  try {
    const params = req.body || {};
    const {
      url: targetUrl,
      method = 'GET',
      headers = {},
      queryParams = {},
      body: requestBody,
      bodyType = 'none'
    } = params;

    if (!targetUrl) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 400, message: '缺少 URL 参数' }));
      return;
    }

    // 构建带 query 参数的 URL
    const parsed = new URL(targetUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        parsed.searchParams.set(key, String(value));
      }
    });
    const finalUrl = parsed.toString();

    // 构造 axios 请求配置
    const axiosConfig = {
      url: finalUrl,
      method: method.toUpperCase(),
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      },
      timeout: 15000,
      maxRedirects: 5,
      responseType: 'text',
      decompress: true,
      validateStatus: () => true,
    };

    // 移除禁止客户端发送的请求头（不区分大小写）
    ['host', 'content-length', 'transfer-encoding'].forEach(h => {
      const key = Object.keys(axiosConfig.headers).find(k => k.toLowerCase() === h);
      if (key) delete axiosConfig.headers[key];
    });

    // 处理请求体
    if (requestBody && bodyType !== 'none' && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
      if (bodyType === 'json') {
        axiosConfig.headers['Content-Type'] = 'application/json; charset=utf-8';
        axiosConfig.data = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
      } else if (bodyType === 'form') {
        axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
        if (typeof requestBody === 'object' && requestBody !== null) {
          const qs = new URLSearchParams();
          Object.entries(requestBody).forEach(([k, v]) => qs.append(k, v));
          axiosConfig.data = qs.toString();
        } else {
          axiosConfig.data = String(requestBody);
        }
      } else {
        axiosConfig.headers['Content-Type'] = 'text/plain; charset=utf-8';
        axiosConfig.data = String(requestBody);
      }
    }

    console.log('[proxy-fetch] 发起请求:', axiosConfig.method, finalUrl);
    const proxyRes = await axios(axiosConfig);
    console.log('[proxy-fetch] 请求完成:', proxyRes.status, finalUrl);

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      code: 0,
      data: {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers: proxyRes.headers,
        body: typeof proxyRes.data === 'string' ? proxyRes.data : JSON.stringify(proxyRes.data),
        finalUrl: proxyRes.request?.res?.responseUrl || finalUrl
      }
    }));
  } catch (err) {
    console.error('[proxy-fetch] 请求失败:', err.message);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败: ' + (err.response?.statusText || err.message)
    }));
  }
};
