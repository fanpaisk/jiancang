/** 站点级常量：品牌、版本、链接。改这里就能换名/换域名，不用翻组件。 */

export const APP_NAME = '减仓计算器'
export const APP_TAGLINE = '抄四个数，算清楚该减多少'
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
export const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''

/** 线上地址；二维码、分享卡片、canonical 都从这里取 */
export const SITE_URL = 'https://jiancang.pages.dev/'
export const REPO_URL = 'https://github.com/fanpaisk/jiancang'
export const FEEDBACK_URL = `${REPO_URL}/issues`

export const STORAGE_KEY = 'jiancang.v1'
export const ONBOARDING_KEY = 'jiancang.onboarded.v1'
