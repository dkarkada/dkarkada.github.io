import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    // site title
    title: "Dhruva's Dumb Website",
    // site subtitle
    subtitle: "",
    // site description
    description: '',
    // author name
    author: 'Dhruva Karkada',
    // site url
    url: 'https://dkarkada.xyz',
    // favicon url
    // recommended formats: svg, png or ico
    favicon: '/icons/godmode.png', // or https://example.com/favicon.svg
  },
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    // default theme mode
    mode: 'dark', // light, dark, auto
    light: {
      // primary color
      // used for title, hover, etc
      // oklch color picker: https://oklch.com/
      primary: 'oklch(25% 0.005 298)',
      // secondary color
      // used for post text
      secondary: 'oklch(40% 0.005 298)',
      // background color
      background: 'oklch(96% 0.005 298)',
      // highlight color
      // used for navbar, selected text, etc
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)', // rgba(255,235,0,0.5)
    },
    dark: {
      primary: 'oklch(0.86 0.03 64)',
      secondary: 'oklch(0.74 0.04 64)',
      background: 'oklch(0.20 0.036 280)',
      highlight: 'oklch(0.28 0.05 275 / 1.0)',
    },
  },
  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    // default language
    locale: 'en',
    moreLocales: [],
    // font styles for post text
    fontStyle: 'serif', // sans, serif
    // date format for posts
    dateFormat: 'DAY MONTH YYYY', // YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, MONTH DAY YYYY, DAY MONTH YYYY
    // enable table of contents for all posts by default
    toc: true,
    // enable KaTeX for mathematical formulas rendering
    katex: true,
    // reduce animations and transitions to improve performance
    reduceMotion: false,
  },
  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    // enable comment system
    enabled: false, // true, false
    // giscus
    // https://giscus.app/
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
  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  seo: {
    // @twitter ID
    twitterID: '@dhruvakarkada',
    // site verification
    verification: {
      // google search console
      // https://search.google.com/search-console
      google: 'EJycXvwEQm0w9qPkFzA94Z7iF19wxNGFGRKj2e6Pmrk',
      // bing webmaster tools
      // https://www.bing.com/webmasters
      bing: '',
      // yandex webmaster
      // https://webmaster.yandex.com
      yandex: '',
      // baidu search
      // https://ziyuan.baidu.com
      baidu: '',
    },
    // google analytics
    // https://analytics.google.com
    googleAnalyticsID: '',
    // umami analytics
    // https://cloud.umami.is
    umamiAnalyticsID: '',
    // follow verification
    // https://follow.is/
    follow: {
      // feed ID
      feedID: '',
      // user ID
      userID: '',
    },
    // apiflash access key
    // automatically generate website screenshots for open graph images
    // get your access key at: https://apiflash.com/
    apiflashKey: '',
  },
  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    // social links
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
    // year of website start
    startYear: 2025,
  },
  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
//   preload: {
//     // image hosting url
//     // optimize remote images in Markdown files to avoid cumulative layout shift
//     imageHostURL: 'image.radishzz.cc',
//     // custom google analytics js
//     // for users who route analytics javascript to a customized domain
//     // See https://gist.github.com/xiaopc/0602f06ca465d76bd9efd3dda9393738
//     customGoogleAnalyticsJS: '',
//     // custom umami analytics js
//     // for users who deploy umami on their own, or route analytics javascript to a customized domain
//     // see https://github.com/umami-software/umami/discussions/1026
//     customUmamiAnalyticsJS: 'https://js.radishzz.cc/jquery.min.js',
//   },
  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

export default themeConfig

export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]
