const { getApiError } = require('../ui/src/utils/api-error');

describe('WebDAV 前端错误提示', () => {
  test('后端返回对象时读取 message 和 conflict', () => {
    expect(getApiError({
      response: {
        status: 409,
        data: { message: '远端数据较新', conflict: 'REMOTE_NEWER' },
      },
    }, '推送失败')).toEqual({
      message: '远端数据较新',
      conflict: 'REMOTE_NEWER',
    });
  });

  test('字符串、HTML 和空响应始终生成非空提示', () => {
    expect(getApiError({ response: { status: 502, data: '上游连接失败' } }, '连接失败').message)
      .toBe('上游连接失败');
    expect(getApiError({ response: { status: 500, data: '<html><body>Internal Server Error</body></html>' } }, '连接失败').message)
      .toBe('Internal Server Error');
    expect(getApiError({ response: { status: 504, data: '' } }, '连接失败').message)
      .toContain('HTTP 504');
  });

  test('纯网络错误使用明确兜底信息', () => {
    expect(getApiError({ message: 'Network Error' }, '连接失败').message)
      .toContain('网络请求失败');
  });
});
