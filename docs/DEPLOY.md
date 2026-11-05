# 部署（免费版，不买域名）

## 现在的状态

- `dist/` 已经是可直接部署的产物（`pnpm build` 生成），约 13.3 MB，主要是三份 tesseract wasm 变体。
- 已包含：`favicon.svg`、`og.png`、`_headers`（CSP + 安全头 + 缓存）、`_redirects`、`robots.txt`、
  `sitemap.xml`、`manifest.webmanifest`、`sw.js`、`icons/`（PWA 图标）。
- 纯静态，**没有任何后端依赖**，托管费用为 0。
- **发布产物里没有真实持仓截图**：`public/_t*.png` 已移到 gitignore 的 `tests/fixtures/`。

---

## ⚠️ 先确认：你要建的是 Pages，不是 Worker

Cloudflare 的 **Workers** 和 **Pages** 都能连 Git，但本项目是纯静态站点，必须走 **Pages**。

| | Pages（正确） | Workers（错误） |
|---|---|---|
| 发布物 | 直接托管 `dist/` 静态文件 | 需要 Worker 脚本 / `wrangler` |
| 网址 | `https://jiancang.pages.dev` | `https://jiancang.<子域>.workers.dev` |
| 构建后步骤 | 自动上传 `dist` | 执行 `npx wrangler deploy` |

**怎么判断建错了**：Deployments 日志最后出现
`Executing user deploy command: npx wrangler deploy`，并且报
`ERR_PNPM_IGNORED_BUILDS` / `workerd`。

**这只是部署方式错了，不是代码错了**：日志里 `pnpm build` 已经成功，`dist/` 也生成了；
失败的是后面的 deploy 步骤——wrangler 想把 Vite 项目改造成 Worker，安装 `workerd` 时被
pnpm 的构建脚本策略拦下，于是退出。

**处理**：不要在这个 Worker 项目里重试。回 **Workers & Pages → Create → Pages** 标签重走下面流程。
旧的 Worker 项目可以删掉，也可以留着；它不影响 Pages，但它的网址不是 `jiancang.pages.dev`，
会让 `og:url`、二维码、canonical 全部对不上。

---

## 一、推荐：连 Git 自动部署

仓库已经推到 <https://github.com/fanpaisk/jiancang>，CI 在 `.github/workflows/ci.yml`。

1. Cloudflare Dashboard → **Workers & Pages** → **Create**
   - 在弹出的页面选 **Pages** 标签（不是 Workers），再点 **Connect to Git**
   - 找不到 Pages 标签就直接开 <https://dash.cloudflare.com/?to=/:account/pages/new>
2. 选 `fanpaisk/jiancang`，项目名填 **`jiancang`**
3. Framework preset 选 **None**（没有就选 **No framework**）；不要选 **VitePress**
4. Build command：`pnpm build`；Build output directory：`dist`；Root directory 留空
5. 环境变量可不配：构建日志已检测到 Node 22。想配就在
   **Settings → Environment variables → Production** 加 `NODE_VERSION=22`
6. 点 **Save and Deploy**。之后每次 push 到 `main` 自动发布，PR 会生成预览地址。

> **Framework preset 只是帮你预填命令的快捷方式**，不是运行环境。列表里没有 Vite 就选
> None；VitePress 是文档站生成器，输出目录是 `.vitepress/dist`，和本项目无关。
>
> `pnpm build` 的 `prebuild` 会从 `node_modules` 拷 OCR 资源，Cloudflare 构建环境能正常执行。
>
> 英文界面对照：Create = 创建；Connect to Git = 连接到 Git；Project name = 项目名称；
> Framework preset = 框架预设；Build command = 构建命令；Build output directory = 构建输出目录；
> Save and Deploy = 保存并部署。

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
2. **分享卡片二维码已内置**：指向 `https://jiancang.pages.dev/`，部署后用手机扫一次确认。
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
