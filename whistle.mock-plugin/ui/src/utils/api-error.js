const normalizeMessage = (value) => {
  if (typeof value != 'string') return '';
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
};

const parseResponseData = (data) => {
  if (!data) return {};
  if (typeof data == 'object') {
    return {
      message: normalizeMessage(data.message || data.error || data.detail),
      conflict: data.conflict || null,
    };
  }
  if (typeof data != 'string') return {};

  const text = data.trim();
  if (!text) return {};
  try {
    return parseResponseData(JSON.parse(text));
  } catch (error) {
    return { message: normalizeMessage(text), conflict: null };
  }
};

const getApiError = (error, fallback) => {
  const safeFallback = normalizeMessage(fallback) || 'WebDAV 操作失败';
  const response = error && error.response;
  const responseError = parseResponseData(response && response.data);
  if (responseError.message) return responseError;

  const status = response && response.status;
  if (status) {
    const statusText = normalizeMessage(response.statusText);
    return {
      message: `${safeFallback}（HTTP ${status}${statusText ? ` ${statusText}` : ''}）`,
      conflict: responseError.conflict || null,
    };
  }

  if (error && error.code == 'ECONNABORTED') {
    return { message: `${safeFallback}：请求超时，请检查 WebDAV 地址和网络`, conflict: null };
  }

  const message = normalizeMessage(error && error.message);
  if (message && message != 'Network Error') {
    return { message, conflict: null };
  }
  return { message: `${safeFallback}：网络请求失败，请检查 Whistle 服务日志`, conflict: null };
};

module.exports = { getApiError, normalizeMessage, parseResponseData };
