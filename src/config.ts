import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // --- Site ---
  site: {
    title: "Dhruva's dumb website",
    subtitle: "",
    description: '',
    author: 'Dhruva Karkada',
    url: 'https://dkarkada.xyz',
    favicon: '/icons/godmode.png',
  },

  // --- Colors ---
  color: {
    mode: 'dark', // light, dark, auto
    // The palette lives in src/styles/theme.css. Only the page background is
    // needed here, for the browser's theme-color meta; keep it in sync.
    light: { background: 'oklch(0.88 0.03 85)' },
    dark: { background: 'oklch(0.18 0.032 280)' },
  },

  // --- Global ---
  global: {
    locale: 'en',
    moreLocales: [],
    fontStyle: 'serif', // sans, serif
    dateFormat: 'DAY MONTH YYYY', // YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, MONTH DAY YYYY, DAY MONTH YYYY
    toc: true,
    katex: true,
    reduceMotion: false,
  },

  // --- Comments ---
  comment: {
    enabled: false,
    // giscus: https://giscus.app/
    giscus: {
      repo: '',
      repoID: '',
      category: '',
      categoryID: '',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
    },
  },

  // --- SEO ---
  seo: {
    twitterID: '@dhruvakarkada',
    verification: {
      google: '',
      bing: '',
      yandex: '',
      baidu: '',
    },
    googleAnalyticsID: '',
    umamiAnalyticsID: '',
    follow: {
      feedID: '',
      userID: '',
    },
    // Get an access key at https://apiflash.com/ for auto-generated OG screenshots
    apiflashKey: '09662c8f06254a0d9a935ded05e0846d',
  },

  // --- Footer ---
  footer: {
    links: [
      {
        name: 'GitHub',
        url: 'https://github.com/dkarkada',
      },
      {
        name: 'Email',
        url: 'dkarkada@berkeley.edu',
      },
      {
        name: 'X',
        url: 'https://x.com/dhruvakarkada',
      },
    ],
  },
}

export default themeConfig

export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]
