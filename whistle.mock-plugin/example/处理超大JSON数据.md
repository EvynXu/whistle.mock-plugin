# 处理超大JSON数据

## 问题解决

针对http://localhost:8899/cgi-bin/interfaces接口出现413 Payload Too Large错误，我们进行了以下优化:

1. 增加了所有解析中间件的请求体大小限制
   - 将`express.json`中间件限制从3MB提高到100MB
   - 将`bodyParser`限制从6MB提高到100MB
   - 对所有路由中间件都进行了限制提升

2. 增加了代码中对大型JSON文案的处理逻辑
   - 添加了对响应内容大小的检查
   - 优化了错误处理流程

## 使用说明

### 提交超大JSON数据

现在您可以通过以下方式提交大型JSON数据:

1. 通过UI界面提交
   - 直接在接口编辑界面粘贴大型JSON数据
   - 最大支持100MB的请求体大小

2. 通过API提交
   ```
   POST http://localhost:8899/cgi-bin/interfaces
   Content-Type: application/json
   
   {
     "featureId": "your-feature-id",
     "name": "大型JSON响应",
     "urlPattern": "/api/large-json",
     "httpMethod": "GET",
     "httpStatus": 200,
     "contentType": "application/json",
     "responseContent": "这里是您的超大JSON数据",
     "proxyType": "response",
     "active": true
   }
   ```

### 生成大型JSON数据用于测试

如果您需要生成测试用的大型JSON数据，可以使用以下JavaScript代码:

```javascript
// 生成一个指定大小的JSON对象
function generateLargeJson(mbSize) {
  const data = { items: [] };
  const itemSize = 1024; // 每个项目约1KB
  const numItems = (mbSize * 1024 * 1024) / itemSize;
  
  for (let i = 0; i < numItems; i++) {
    data.items.push({
      id: i,
      name: `Item ${i}`,
      description: `This is a test item with number ${i}. ${'x'.repeat(800)}`
    });
  }
  
  return data;
}

// 生成一个约10MB的JSON
const largeJson = generateLargeJson(10);
const jsonString = JSON.stringify(largeJson);
console.log(`生成的JSON大小: ${Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024)} MB`);
```

## 注意事项

1. 虽然系统现在支持最大100MB的请求，但过大的JSON会导致:
   - 浏览器性能下降
   - 服务器内存占用增加
   - 网络传输时间延长

2. 建议:
   - 尽可能优化JSON大小
   - 考虑分片处理大型数据
   - 使用数据压缩技术减小传输体积 