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
    light: {
      primary: 'oklch(25% 0.005 298)',
      secondary: 'oklch(40% 0.005 298)',
      background: 'oklch(96% 0.005 298)',
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)',
    },
    dark: {
      primary: 'oklch(0.86 0.03 64)',
      secondary: 'oklch(0.74 0.04 64)',
      background: 'oklch(0.20 0.036 280)',
      highlight: 'oklch(0.28 0.05 275 / 1.0)',
    },
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
