/** 品牌标记：蓝底圆角 + 「减」。和 favicon.svg / PWA 图标同一套形状。 */
export function Brand({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="减仓计算器"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontFamily="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
        fontSize="36"
        fontWeight="700"
        fill="#ffffff"
      >
        减
      </text>
    </svg>
  )
}
