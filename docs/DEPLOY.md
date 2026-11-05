# 部署（免费版，不买域名）

## 现在的状态

- `dist/` 已经是可直接部署的产物（`pnpm build` 生成），约 13.3 MB，主要是三份 tesseract wasm 变体。
- 已包含：`favicon.svg`、`og.png`、`_headers`（CSP + 安全头 + 缓存）、`_redirects`、`robots.txt`、
  `sitemap.xml`、`manifest.webmanifest`、`sw.js`、`icons/`（PWA 图标）。
- 纯静态，**没有任何后端依赖**，托管费用为 0。
- **发布产物里没有真实持仓截图**：`public/_t*.png` 已移到 gitignore 的 `tests/fixtures/`。

---

## 一、推荐：连 Git 自动部署

仓库已经推到 <https://github.com/fanpaisk/jiancang>，CI 在 `.github/workflows/ci.yml`。

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选 `fanpaisk/jiancang`，项目名填 **`jiancang`**
3. Build command：`pnpm build`；Build output directory：`dist`
4. 环境变量加 `NODE_VERSION=22`（Pages 默认 Node 版本可能偏低）
5. Deploy；之后每次 push 到 `main` 自动发布，PR 会生成预览地址。

> `pnpm build` 的 `prebuild` 会从 `node_modules` 拷 OCR 资源，Cloudflare 构建环境能正常执行。

---

## 二、5 分钟手动上线（备选）

1. 打开 https://dash.cloudflare.com ，注册/登录
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. **项目名填 `jiancang`**（这个名字会变成你的网址，别填错）
4. 把 `G:\减仓工具\dist` **整个文件夹**拖进去 → **Deploy site**
5. 拿到 `https://jiancang.pages.dev`，可以直接发给别人了

> 如果拖拽不方便，也可以用命令行：
> ```bash
> npx wrangler pages deploy dist --project-name jiancang
> ```
> 首次运行会打开浏览器要求授权。

### ⚠️ 项目名决定网址

`jiancang` → `https://jiancang.pages.dev`

如果你填了别的名字，比如 `jc-tool`，网址就变成 `https://jc-tool.pages.dev`。**这时必须同步改两个地方**，否则分享预览图会 404：

- `index.html` 里的 `og:url`
- `index.html` 里的 `og:image`

---

## 为啥不用买域名

| | 说明 |
|---|---|
| **托管**（Cloudflare Pages） | 免费：服务器、带宽、HTTPS 证书、全球 CDN 都不要钱 |
| **域名**（`xxx.pages.dev`） | Cloudflare 免费送的二级域名，可以直接用 |

`.pages.dev` 的缺点只有一个：长一点，第一眼像"部署链接"而不是"产品"。

**先上线，有人用了再考虑换域名。** 那时只需在 Pages 里加一条 Custom domain，代码一行都不用改——除了上面说的 `og:url` / `og:image`。

---

## 三、上线后自查

- [ ] 手机上打开，三页都能滑、能点
- [ ] 首次打开有三步引导，可跳过；刷新后不再出现
- [ ] 「载入示例」→ 顶部出现黄色「示例数据」横幅，结果是 0%（C 类 107 天，费率 0）
- [ ] 加 `?demo=2` → 结果是 35%，横幅显示「盈利示例」
- [ ] 生成分享卡片，图能正常下载，卡片带站点地址和「示例数据」水印（示例模式下）
- [ ] 加到日历提醒，`.ics` 能导入
- [ ] 刷新页面，数据还在（localStorage）
- [ ] 把链接发到微信/即刻，看预览卡片有没有正常显示 `og.png`
- [ ] 无痕窗口打开，确认首屏没有报错
- [ ] Chrome DevTools → Application → Manifest 无报错；「添加到主屏幕」可安装
- [ ] 断网刷新，外壳仍能打开（Service Worker 生效）
- [ ] **在部署环境点一次「截图识别」**：CSP 是否放行 wasm/worker、OCR 是否仍能跑完
- [ ] 确认 `https://jiancang.pages.dev/_t.png` 等 4 个地址都是 404（真实截图已移走）

> 微信里打开可能提示"非官方网页"或加载慢，这是 Cloudflare 免费域名的固有情况，不是配置错误。

---

## 三、以后想换域名（可选）

大概 ¥100/年，随时可以补，不影响现在的链接继续可用。

1. 买域名（`jiancang.app` 目前大概率可注册；`jiancang.com` 和 `zhiying.app` 已被占）
2. Cloudflare → Pages 项目 → **Custom domains** → 填域名
3. 域名在 Cloudflare 注册：DNS 自动配好；在别处买：把 NS 改成 Cloudflare 的两个地址
4. 改 `index.html` 的 `og:url` / `og:image`，重新部署

> 不建议 `.cn`：要实名，且容易被期待有备案和资质。现在"免费、无导流、纯计算器"的定位是保护色，别在域名上给自己加戏。

---

## 四、上线之后

1. **PWA 已就绪**：manifest + SW + 图标都在产物里；部署后按上面清单验一次安装与离线。
2. **分享卡片加二维码**：卡片右下角放一个指向站点的二维码，图片传播闭环才算完成。
3. **桌面双栏**：≥960px 左输入右结果，移动端保留三页。
4. **ESLint / Prettier / Playwright / Lighthouse**：工程收尾。

---

## 附：为什么用 Cloudflare Pages

| 方案 | 免备案 | 免费 | 国内速度 | 结论 |
|---|---|---|---|---|
| **Cloudflare Pages** | ✅ | ✅ | 一般 | **首选** |
| Vercel | ✅ | ✅ | 部分网络不可达 | 备选 |
| GitHub Pages | ✅ | ✅ | 时通时不通 | 备选 |
| 阿里云 OSS / 腾讯云 COS | ❌ 需备案 | 低消 | 快 | 以后规模化再说 |
