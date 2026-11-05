# AGENTS.md

<!-- SESSION_HANDOFF:START -->
## 开工前必读

- `docs/STATUS.md` —— 当前状态、下一步、已知缺陷
- `docs/DECISIONS.md` —— 每个决定的理由与被否方案

先读这两份，再动手。

## 这是什么

**减仓计算器**：纯前端、免费开源的单基金「减仓试算器」。用户填四个数（份额 / 单位成本 /
当前净值 / 持有天数），工具按用户自选的「流派」规则算出该减多少、付多少赎回费、
现在减还是等几天。不做投资建议，不联网，数据只存浏览器 localStorage。

技术栈：Vite + React + TypeScript；`src/core/` 纯函数；Vitest；无后端。
仓库：<https://github.com/fanpaisk/jiancang>；线上：<https://jiancang-b3b.pages.dev/>；
CI 在 `.github/workflows/ci.yml`。

## 硬约束

- **纯前端，零后端**。不加服务器、不加账号、不引入需要 API key 的云服务。
- **不做投资建议**。输出必须可追溯到用户自己设的规则，文案写「按规则」。
- **`src/core/` 不许 import React 或 DOM**，否则没法单测。
- **费率不套模板**。「持仓成本」在各家含义不同（每份 vs 总成本），必须交叉校验。
- **OCR 结果绝不静默填入**：先列出来让用户核对，且覆盖式写入（未识别的一律清空）。
- 只做**场外开放式基金**，不扩到股票 / 场内 ETF / 货币基金。

## 架构（为频繁改版解耦）

```
core/        纯计算，永不知道 React 存在
app/         useAppState：状态、派生数据、动作
pages/       持仓 / 规则 / 结果，只负责组装
shell/       topbar、tabbar、更多弹层、首次引导、示例横幅
ui/          Button / Sheet / Icon / ErrorBoundary
components/  业务区块（输入、结果、流派、OCR）
styles/      tokens.css（设计令牌）+ styles.css（组件）+ shell.css（外壳）
```

改页面布局 → 动 `pages/` 与 `shell/`；改视觉 → 动 `styles/tokens.css`；
改算法 → 动 `core/`（先写测试）；**不要**把业务逻辑写回 `App.tsx`。

## 命令

```bash
pnpm install
pnpm dev         # 开发服；predev 会自动把 OCR 资源拷进 public/
pnpm test        # 171 个用例
pnpm typecheck   # tsc --noEmit
pnpm build       # 产物在 dist/（约 13.3MB，主要是三份 wasm 变体）
pnpm audit       # 依赖安全扫描（CI 也会跑）
pnpm verify      # typecheck + test + build，提交前跑这一条
```

验收线：`typecheck` 退出 0 && `test` 全绿 && `build` 成功。

## 已知的坑

1. **dev server 会发陈旧模块**：改完文件刷新仍是旧样子 → 重启 `pnpm dev`，必要时硬刷新。
2. **jsdelivr 被墙**：tesseract 默认从 CDN 取引擎，国内必失败。引擎/中文模型全部自托管，
   由 `scripts/copy-ocr-assets.mjs` 从 `node_modules` 拷到 `public/`（已 gitignore）。
3. **OCR 遇大面积色块**：tesseract 会把整块彩色卡片（如蓝底白字）当图片跳过。
   解法是分带识别 + 手动框选，见 `src/lib/ocr.ts`。
4. **浮点边界**：所有阈值比较走 `core/util.ts` 的 `gte/lte/gt`，别用裸 `>=`。
5. **OCR 数字会错位**：千分位逗号会被认成小数点（实测 `1,209.70` → `1.209.70`），
   `parseOcrNumber` 已处理；仍有 10 倍误读风险，所以必须人工核对。
6. **受限沙箱下 test/build 会假失败**：esbuild 启子进程被拦时报 `spawn EPERM`，
   不是代码问题；换 full-access 环境再跑。
7. **真实持仓截图绝不进 `public/`**：只放 `tests/fixtures/`（已 gitignore）。
<!-- SESSION_HANDOFF:END -->
