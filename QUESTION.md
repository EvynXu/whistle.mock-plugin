# 测试问题收集

- 最终产出类似： pattern headerReplace://req.header-name:pattern1=replacement1&pattern2=replacement2
- headerReplace:// 写死
- header-name 对应的配置的header key
- pattern1, pattern2 写死 /(.*)/
- replacement1,replacement2 对应配置的value
- 如果有多个配置，则用&衔接
