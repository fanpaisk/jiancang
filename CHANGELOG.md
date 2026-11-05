# Changelog

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；版本号遵循 SemVer。

## [1.0.0] - 2026-11-05

### Added

- 首次使用三步引导，可跳过，localStorage 记住。
- 「更多」弹层：导出 / 导入 / 清空、计算口径、隐私说明、常见问题、版本、GitHub 与反馈、安装 PWA。
- 顶部栏品牌、隐私徽章与更多入口；三个标签改为「持仓 / 规则 / 结果」。
- PWA：manifest、192/512/maskable/apple-touch 图标、Service Worker（外壳预缓存 + OCR 按需缓存）。
- 设计令牌 `styles/tokens.css`；通用原语 `ui/Button`、`ui/Sheet`、`ui/Icon`、`ui/ErrorBoundary`。
- 渲染错误边界；示例数据黄色横幅与分享卡片水印。
- 分享卡片右下角预生成二维码（`src/lib/qrMatrix.ts`），运行时零依赖。
- CSP、canonical、og:locale、twitter、JSON-LD、sitemap 相关静态文件。
- GitHub Actions CI；`pnpm verify`；`.editorconfig` / `.gitattributes` / `.nvmrc`。
- 版本与构建日期注入：`__APP_VERSION__` / `__BUILD_TIME__`。

### Changed

- 状态、派生数据与动作收进 `src/app/useAppState.ts`；页面拆到 `src/pages/`，外壳拆到 `src/shell/`。
- 结果页文案「推荐减仓」→「按规则应减」；「恢复推荐」→「恢复规则值」。
- 示例表单改用合成数据，不再搬运真实持仓。
- 底部标签栏加入图标，触控高度提升到 48px；tab 使用 `role=tablist/tab/tabpanel` 并支持左右键。
- 清除 `styles.css` 中的重复 `:root`，颜色/圆角/阴影改由令牌统一。

### Fixed

- 真实持仓截图不再进入 `public/` 与 `dist/`（移到 gitignore 的 `tests/fixtures/`）。
- 「载入示例 / 导入 / 清空」增加二次确认，避免误覆盖用户持仓。
- OCR 至少认出「份额 + 成本或净值」才允许填入；未识别字段会明确提示将被清空。
- 持久化写入改为 300ms 防抖；演示模式不落盘。

### Security

- 生产环境 CSP：`script-src 'self' 'wasm-unsafe-eval'`、`worker-src 'self' blob:`、
  `connect-src 'self'`、`object-src 'none'` 等。
- `sw.js` 与 `manifest.webmanifest` 的缓存头单独配置。
