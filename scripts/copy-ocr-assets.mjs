import { mkdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')

const tessPkg = dirname(require.resolve('tesseract.js/package.json'))
// tesseract.js-core 是间接依赖，用 tesseract.js 自己的解析路径去找
const tessRequire = createRequire(require.resolve('tesseract.js/package.json'))
const corePkg = dirname(tessRequire.resolve('tesseract.js-core/package.json'))
const langPkg = dirname(require.resolve('@tesseract.js-data/chi_sim/package.json'))

const outEngine = join(root, 'public', 'tesseract')
const outLang = join(root, 'public', 'tessdata')

await mkdir(outEngine, { recursive: true })
await mkdir(outLang, { recursive: true })

// .wasm.js 是「单文件」构建，二进制已内嵌，不需要再拷 .wasm
const CORE_VARIANTS = [
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-lstm.wasm.js',
]

const pairs = [
  [join(tessPkg, 'dist', 'worker.min.js'), join(outEngine, 'worker.min.js')],
  ...CORE_VARIANTS.map((f) => [join(corePkg, f), join(outEngine, f)]),
  [
    join(langPkg, '4.0.0_best_int', 'chi_sim.traineddata.gz'),
    join(outLang, 'chi_sim.traineddata.gz'),
  ],
]

let copied = 0
for (const [src, dst] of pairs) {
  if (!existsSync(src)) {
    console.warn('[ocr] 源文件缺失，跳过:', src)
    continue
  }
  await copyFile(src, dst)
  copied++
}

console.log(`[ocr] 已就绪 ${copied} 个文件 -> public/tesseract, public/tessdata`)
