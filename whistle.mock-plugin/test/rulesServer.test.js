/**
 * 测试 rulesServer 规则匹配功能
 * 
 * 这个文件提供了一个简单的测试用例，用于验证 rulesServer 的匹配功能
 * 实际环境中，您可以运行这个测试来确认规则匹配是否按预期工作
 */

// 模拟 fs-extra 模块
const fsMock = {
  existsSync: jest.fn().mockReturnValue(true),
  readJsonSync: jest.fn().mockReturnValue({
    interfaces: [
      {
        id: '1',
        name: '测试接口1',
        urlPattern: '/api/test1',
        httpMethod: 'GET',
        enabled: true
      },
      {
        id: '2',
        name: '测试接口2',
        urlPattern: '/api/test2',
        httpMethod: 'POST',
        enabled: true
      },
      {
        id: '3',
        name: '测试接口3',
        urlPattern: '/api/test3/*',
        httpMethod: 'ALL',
        enabled: true
      },
      {
        id: '4',
        name: '测试接口4',
        urlPattern: '/api/test4',
        httpMethod: 'GET',
        enabled: false // 禁用状态
      }
    ]
  })
};

// 模拟模块
jest.mock('fs-extra', () => fsMock);
jest.mock('path', () => ({
  join: (...args) => args.join('/')
}));

// 导入被测试的模块
const rulesServer = require('../lib/rules-server');

describe('rulesServer 测试', () => {
  let requestHandler;
  let req;
  let res;
  
  beforeEach(() => {
    // 模拟 server
    const server = {
      on: (event, handler) => {
        if (event === 'request') {
          requestHandler = handler;
        }
      }
    };
    
    // 模拟请求和响应对象
    req = {
      originalReq: {
        url: 'http://example.com/api/test1',
        method: 'GET'
      }
    };
    
    res = {
      end: jest.fn()
    };
    
    // 初始化 rulesServer
    rulesServer(server, {});
  });
  
  test('匹配到的URL应该返回mock-plugin规则', () => {
    // 测试匹配成功的情况
    req.originalReq.url = 'http://example.com/api/test1';
    req.originalReq.method = 'GET';
    
    requestHandler(req, res);
    expect(res.end).toHaveBeenCalledWith('mock-plugin://');
  });
  
  test('未匹配的URL应该返回空字符串', () => {
    // 测试匹配失败的情况
    req.originalReq.url = 'http://example.com/api/not-exist';
    req.originalReq.method = 'GET';
    
    requestHandler(req, res);
    expect(res.end).toHaveBeenCalledWith('');
  });
  
  test('禁用的接口不应该被匹配', () => {
    // 测试禁用接口的情况
    req.originalReq.url = 'http://example.com/api/test4';
    req.originalReq.method = 'GET';
    
    requestHandler(req, res);
    expect(res.end).toHaveBeenCalledWith('');
  });
  
  test('通配符模式应该正确匹配', () => {
    // 测试通配符匹配
    req.originalReq.url = 'http://example.com/api/test3/123';
    req.originalReq.method = 'GET';
    
    requestHandler(req, res);
    expect(res.end).toHaveBeenCalledWith('mock-plugin://');
  });
}); 