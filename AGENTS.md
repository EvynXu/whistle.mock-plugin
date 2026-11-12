# Whistle 插件发布规则

适用于 `whistle.mock-plugins` 的稳定版和 beta 版。每次发布都执行下面的检查。

## 已知回归

`1.4.0-beta.5` 的 `rules.txt` 通过 `@./rules-development.txt` 引用全量代理规则，但被引用的文件没有进入 npm 安装包。源码挂载测试能读到该文件，npm 用户启用插件后却无法命中 Mock。`1.4.0-beta.6` 将全量代理规则移回随包发布的 `rules.txt`。

## 发布检查

1. 完成生产构建并运行单测。从仓库根目录执行 `npm pack ./whistle.mock-plugin --pack-destination <临时目录> --json`，保留生成的 tarball 供验证和发布。
2. 用 `tar -xOzf <安装包路径> package/rules.txt` 检查包内规则。确认有 `* whistle.mock-plugins://` 和 `@whistle.mock-plugins/cgi-bin/replay-session/cache-rules`。如增加本地规则引用，确认每个被引用文件也在同一个包内。
3. 从该 tarball 安装插件，在独立 Whistle 实例里启用插件，保持手工 Rules 为空。分别验证命中已启用 Mock 的请求返回模拟响应，以及未匹配的请求正常访问原服务。
4. 仅发布通过上述检查的同一个 tarball。发布后确认目标 npm 标签指向本次版本，并核对注册表的 `dist.integrity` 与本地 `npm pack --json` 的 `integrity` 一致，再确认发布完成。
