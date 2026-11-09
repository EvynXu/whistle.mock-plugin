// 常量定义文件
export const contentTypes = [
  { value: 'application/json; charset=utf-8', label: 'JSON' },
  { value: 'text/plain; charset=utf-8', label: '纯文本' },
  { value: 'text/html; charset=utf-8', label: 'HTML' },
  { value: 'application/xml; charset=utf-8', label: 'XML' },
  { value: 'application/javascript; charset=utf-8', label: 'JavaScript' },
];

export const proxyTypes = [
  { value: 'response', label: '模拟响应' },
  { value: 'redirect', label: '重定向' },
  { value: 'url_redirect', label: 'URL重定向' },
];

export const statusCodes = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '204', label: '204 No Content' },
  { value: '400', label: '400 Bad Request' },
  { value: '401', label: '401 Unauthorized' },
  { value: '403', label: '403 Forbidden' },
  { value: '404', label: '404 Not Found' },
  { value: '500', label: '500 Internal Server Error' },
];

export const httpMethods = [
  { value: 'ALL', label: '所有方法' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
]; 