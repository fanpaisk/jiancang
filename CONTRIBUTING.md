# 参与贡献

这是一个个人作品，欢迎提 issue；比较大的改动请先开 issue 对齐，避免白做。

## 先确认边界

这个项目刻意保持很小，以下方向**不接受**：

- 加后端、账号、云同步、数据库
- 引入需要 API key 的第三方服务
- 做投资建议、自动交易、收益预测
- 扩到股票、场内 ETF、货币基金、银行理财
- 把真实持仓截图或用户数据提交进仓库

如果新功能能在纯前端、零后端、不联网查询基金的前提下完成，欢迎讨论。

## 本地开发

需要 Node.js 20+、pnpm 11。

```bash
pnpm install
pnpm dev         # 开发服；predev 会自动把 OCR 资源拷进 public/
pnpm test        # 171 个用例
pnpm typecheck   # tsc --noEmit
pnpm build       # 产物在 dist/
pnpm audit       # 依赖安全扫描
pnpm verify      # typecheck + test + build，提交前跑这一条
```

## 代码边界

```
core/        纯计算，不许 import React 或 DOM
app/         useAppState：状态、派生数据、动作
pages/       三页组装层
shell/       顶部栏、标签栏、弹层、引导
ui/          通用原语
components/  业务区块
```

- 改算法 → 动 `core/`，先写测试
- 改页面/布局 → 动 `pages/`、`shell/`
- 改视觉 → 动 `styles/tokens.css`
- 不要把业务逻辑写回 `App.tsx`

## 提交前

- `pnpm verify` 通过
- `pnpm audit` 无 high/critical
- 用户可见的改动更新 `CHANGELOG.md`
- 改 `core/` 要补 Vitest 用例
- OCR 相关改动不要提交真实截图；用坐标夹具或合成数据

## Pull Request

- 一个 PR 只做一件事，说明「为什么」而不只是「改了什么」
- 附上复现步骤或截图（截图请打码持仓信息）
- 提交信息用中文或英文都可以，说清楚即可

## 许可

贡献的代码按 [MIT License](LICENSE) 授权。
