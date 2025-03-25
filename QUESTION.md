# 测试问题收集

## 调整 redirect 和 url_redirect规则

- 接口配置中：

1. url_redirect规则完整url

2. redirect规则是 http:// 或者 https:// 配置结尾没有细致要求 可以是/ 可以是 /api

- 匹配规则：

1. url_redirect规则需要完整匹配 fullPath 与配置地址完全匹配才会命中规则，命中后直接返回 res.end(`${fullUrl} ${targetUrl}`);

2. redirect规则根据请求的 url 与配置的源 url 判断是否 indexOf() == 0 即可，命中后直接通过 replace fullUrl 地址然后返回 res.end(`${fullUrl} ${targetUrl}`);


