# 状态

> 快照时间：2026-11-05。覆盖式更新；理由见 `DECISIONS.md`。

## 一句话

**B 路线第一批包装已完成**：真实持仓截图移出发布产物、示例数据合成化、状态/页面/外壳解耦、
设计令牌与通用组件、PWA、CSP、CI 都已落地，并已部署到
<https://jiancang-b3b.pages.dev/>。OCR 已补上基金代码、A/C 类别与当日涨跌幅识别；
`typecheck` / `test` / `build` 全绿；**OCR 仍未在真实截图集上复测**。

## 已验收（本次改动后重跑）

| 项 | 命令 | 本次输出 |
|---|---|---|
| 类型 | `pnpm typecheck` | 退出码 0 |
| 单测 | `pnpm test` | 11 个文件 / **160 passed**，1.9s |
| 构建 | `pnpm build` | 成功，主包 213.57 kB（gzip 70.97 kB），CSS 25.81 kB |
| 产物 | `dist/` | 13.3 MB，已无 `_t*.png` 真实截图 |
| CI | GitHub Actions | 两次 push 的 run 均 `success` |
| 线上 | <https://jiancang-b3b.pages.dev/> | HTTP 200，标题正确；部署已成功 |

## 本轮做了什么

1. **P0 清理**
   - 4 张真实持仓截图从 `public/` 移到 `tests/fixtures/`（已 gitignore），`dist/` 不再包含。
   - 示例数据改为合成数字；`?demo=1/2` 顶部有黄色「示例数据」横幅，分享卡片带「示例数据」水印。
   - 「载入示例 / 导入 / 清空」加二次确认；OCR 至少认出「份额 + 成本或净值」才允许填入。
   - 结果页文案从「推荐减仓」改为「按规则应减」；「恢复推荐」改为「恢复规则值」。
   - 版本号 1.1.0，注入 `__APP_VERSION__` / `__BUILD_TIME__`，更多弹层显示。
   - 渲染错误边界，白屏兜底。
2. **解耦**
   - `src/app/useAppState.ts` 集中状态、派生数据、动作。
   - `src/pages/` 三页组装层；`src/shell/` 外壳；`src/ui/` 通用原语。
   - `src/styles/tokens.css` 设计令牌；`shell.css` 外壳样式。
   - `src/core/` 原有 142 个用例仍全绿；新增 `fund.ts`、代码/类别/当日涨跌幅用例后共 160 个。
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
5. **OCR 补全（1.1.0）**
   - 代码：只从页面上部/基金名附近找 6 位数字，避免把金额当代码；`017470C` 这种粘连也能拆。
   - 类别：从名称后缀推断 A/C（`…C`、`C类`、`…A`、`A类`）；推断不出时明确提示手选。
   - 核对列表新增「基金名称 / 代码 / 份额类别」，填入时会带上类别。
   - 当日涨跌幅：新增 OCR 字段与输入框；只记录，暂不参与规则（规则待定）。
   - 正号涨跌幅（`+4.10%`）现在也能解析，之前只认负数。

## 下一步（按优先级）

1. **线上验收**（已部署到 `https://jiancang-b3b.pages.dev/`）
   - 项目名带 `-b3b`：`jiancang.pages.dev` 被占用，Cloudflare 自动加后缀；全站地址已同步。
   - 重点实测：PWA 安装/离线、CSP 下 OCR 是否正常、分享卡片二维码、微信预览、`/_t*.png` 是否 404。
2. **用户复测 OCR**（落点：`src/lib/ocr.ts`、`src/core/layout.ts`）
   - 重点：代码是否读到、A/C 是否推断正确、当日涨跌幅是否选对字段；华泰那张 10 倍误读与负号丢失。
   - 真实截图只在 `tests/fixtures/ocr/`，复现：`pnpm dev` → 持仓 → 截图识别。
3. **单日异动规则**：用户已提需求，当前只记录当日涨跌幅；是否进入规则、阈值与预设待定。
4. **桌面双栏**（≥960px）：左侧输入、右侧结果常驻；移动端保留三页。
5. **工程收尾**：ESLint + Prettier、Playwright 冒烟、Lighthouse 验收、深色模式。

## 已知缺陷 / 风险

- 腾讯华泰类布局：`单位成本` 读不到时，交叉校验没有参照物，市值误读会被放过。
- OCR 对负号不敏感（实测 −42.75% → 42.75%）；正号已能解析，但符号丢失仍需人工核对。
- 代码只在页面上部/名称附近找；截图没截到代码、或代码被切成多段时仍会缺。
- A/C 只从名称后缀推断；名称本身没写类别的基金无法自动判断。
- 当日涨跌幅目前只记录，不参与减仓规则；盘中是估算，收盘后才是官方净值涨跌。
- 新 CSP 已在线上生效，但 OCR 尚未在部署环境实测；`wasm-unsafe-eval` / worker 可能需要微调。
- Service Worker 首次安装只缓存外壳；OCR 的 13MB 资源首次仍要联网。
- 没有 e2e / 视觉回归；目前靠单测与手动验证。
- 桌面端仍是 480px 单列，视觉上偏「手机 demo」。
- 线上未知路径仍回退到 `index.html`（`/_t.png` 返回 200 `text/html`，不是图片）；
  真实截图已不在产物里，但 Pages 的 SPA 回退还没完全关掉。
- 项目名 `jiancang-b3b` 带随机后缀，网址不像正式产品；以后换域名要同步多处。

## 未决问题

- 是否买域名/抢回 `jiancang`（当前先用 `jiancang-b3b.pages.dev`）。
- 是否把「当日涨跌幅」纳入规则、阈值/方向/预设怎么定 —— 字段已记录，规则待定。
- 是否做深色模式（令牌已就绪，但大量硬编码浅色值需逐个替换）。
