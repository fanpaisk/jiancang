# 状态

> 快照时间：2026-11-05。覆盖式更新；理由见 `DECISIONS.md`。

## 一句话

**B 路线第一批包装已完成**：真实持仓截图移出发布产物、示例数据合成化、状态/页面/外壳解耦、
设计令牌与通用组件、PWA、CSP、CI 都已落地，并已部署到
<https://jiancang-b3b.pages.dev/>。`typecheck` / `test` / `build` 全绿；**OCR 仍未复测**。

## 已验收（本次改动后重跑）

| 项 | 命令 | 本次输出 |
|---|---|---|
| 类型 | `pnpm typecheck` | 退出码 0 |
| 单测 | `pnpm test` | 10 个文件 / **142 passed**，2.2s |
| 构建 | `pnpm build` | 成功，主包 211.17 kB（gzip 70.16 kB），CSS 25.47 kB |
| 产物 | `dist/` | 13.3 MB，已无 `_t*.png` 真实截图 |
| CI | GitHub Actions | 两次 push 的 run 均 `success` |
| 线上 | <https://jiancang-b3b.pages.dev/> | HTTP 200，标题正确；部署已成功 |

## 本轮做了什么

1. **P0 清理**
   - 4 张真实持仓截图从 `public/` 移到 `tests/fixtures/`（已 gitignore），`dist/` 不再包含。
   - 示例数据改为合成数字；`?demo=1/2` 顶部有黄色「示例数据」横幅，分享卡片带「示例数据」水印。
   - 「载入示例 / 导入 / 清空」加二次确认；OCR 至少认出「份额 + 成本或净值」才允许填入。
   - 结果页文案从「推荐减仓」改为「按规则应减」；「恢复推荐」改为「恢复规则值」。
   - 版本号 1.0.0，注入 `__APP_VERSION__` / `__BUILD_TIME__`，更多弹层显示。
   - 渲染错误边界，白屏兜底。
2. **解耦**
   - `src/app/useAppState.ts` 集中状态、派生数据、动作。
   - `src/pages/` 三页组装层；`src/shell/` 外壳；`src/ui/` 通用原语。
   - `src/styles/tokens.css` 设计令牌；`shell.css` 外壳样式。
   - `src/core/` 一行未动，142 个用例原样通过。
3. **产品化**
   - 顶部栏：品牌 + 不上传数据徽章 + 更多。
   - 三个标签：持仓 / 规则 / 结果（规则在结果前）。
   - 首次使用三步引导（可跳过，localStorage 记住）。
   - 更多弹层：导出/导入/清空、计算口径、隐私说明、FAQ、版本、GitHub/反馈、安装 PWA。
   - PWA：manifest + 192/512/maskable/apple-touch 图标 + 手写 Service Worker。
   - 分享卡片右下角二维码：预生成矩阵（`src/lib/qrMatrix.ts`），运行时零依赖。
   - CSP、缓存头、canonical、og:locale、twitter、JSON-LD、sitemap 由静态文件补齐。
4. **工程化**
   - `git init`，推送 <https://github.com/fanpaisk/jiancang>。
   - GitHub Actions：install → typecheck → test → build → artifact。
   - `.editorconfig` / `.gitattributes` / `.nvmrc`；`pnpm verify`。

## 下一步（按优先级）

1. **线上验收**（已部署到 `https://jiancang-b3b.pages.dev/`）
   - 项目名带 `-b3b`：`jiancang.pages.dev` 被占用，Cloudflare 自动加后缀；全站地址已同步。
   - 重点实测：PWA 安装/离线、CSP 下 OCR 是否正常、分享卡片二维码、微信预览、`/_t*.png` 是否 404。
2. **用户复测 OCR**（落点：`src/lib/ocr.ts`、`src/core/layout.ts`）
   - 重点：华泰那张 10 倍误读与负号丢失；基金名称是否还认成图例；框选是否顺手。
   - 真实截图只在 `tests/fixtures/ocr/`，复现：`pnpm dev` → 持仓 → 截图识别。
3. **桌面双栏**（≥960px）：左侧输入、右侧结果常驻；移动端保留三页。
4. **工程收尾**：ESLint + Prettier、Playwright 冒烟、Lighthouse 验收、深色模式。

## 已知缺陷 / 风险

- 腾讯华泰类布局：`单位成本` 读不到时，交叉校验没有参照物，市值误读会被放过。
- OCR 对负号不敏感（实测 −42.75% → 42.75%）。
- 新 CSP 尚未在部署环境实测 OCR；`wasm-unsafe-eval` / worker 可能需要微调。
- Service Worker 首次安装只缓存外壳；OCR 的 13MB 资源首次仍要联网。
- 没有 e2e / 视觉回归；目前靠单测与手动验证。
- 桌面端仍是 480px 单列，视觉上偏「手机 demo」。

## 未决问题

- 用哪个 Cloudflare 账号部署（用户侧操作，无代码依赖）。
- 是否加「单日异动追加减仓」规则 —— 当前判断是不加，等真实需求。
- 是否做深色模式（令牌已就绪，但大量硬编码浅色值需逐个替换）。
