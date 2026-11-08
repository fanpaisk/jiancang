# 安全策略

## 支持的版本

| 版本 | 支持 |
|---|---|
| 1.x（最新） | ✅ |
| 更早版本 | ❌ 请先升级到最新版 |

## 报告安全问题

**不要在本仓库的公开 issue 里贴漏洞细节、真实持仓截图或复现利用代码。**

优先使用 GitHub 的私密漏洞报告：

1. 打开 <https://github.com/fanpaisk/jiancang/security>
2. 点 **Report a vulnerability**
3. 写清：影响范围、复现步骤、浏览器/系统、你期望的结果

如果私密报告入口不可用，开一个**不含细节**的 issue，只说明「有安全问题，需要私密渠道」，维护者会来接。

## 这个项目的攻击面

它是纯静态站点：没有后端、没有数据库、没有账号体系，持仓数据只存在用户浏览器的 `localStorage`。因此重点关注的不是「服务器被入侵」，而是：

- 前端 XSS（React 默认转义；如果有人引入 `dangerouslySetInnerHTML` 或第三方脚本，风险会上升）
- CSP / 安全头绕过
- Service Worker 缓存污染
- npm 依赖供应链问题
- Cloudflare 或 GitHub 账号被接管后篡改站点

不在范围内：DDoS、Cloudflare/GitHub 平台自身漏洞、社会工程、对用户设备的物理访问。

## 维护者建议

- Cloudflare 与 GitHub 都开启 2FA
- 不在仓库里提交任何 API key、token 或真实持仓数据
- 依赖更新走 Dependabot，CI 跑 `pnpm audit --audit-level=high`

## 响应方式

这是个人维护的开源项目，没有漏洞赏金。会尽量在合理时间内确认和修复；修复前请不要公开细节。
