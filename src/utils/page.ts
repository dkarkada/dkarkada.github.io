import { moreLocales } from '@/config'
// import { getLangFromPath } from '@/i18n/lang'
// import { getLocalizedPath } from '@/i18n/path'

// Checks if cleaned path matches a specific page type
function isPageType(path: string, prefix: string = '') {
  if (prefix === 'about') {
    return path.includes('/about/')
  }
  // Removes leading and trailing slashes from a path
  const clean = path.replace(/^\/|\/$/g, '')
  return prefix === ''
    ? clean === '' || moreLocales.includes(clean)
    : clean.startsWith(prefix) || moreLocales.some(lang => clean.startsWith(`${lang}/${prefix}`))
}

export function getCleanPath(path: string) {
  const clean = path.replace(/^\/|\/$/g, '')
  return clean === '' ? '/' : `/${clean}/`
}

// Checks if the current path is the home/post/tag/about page
export function isHomePage(path: string) {
  return isPageType(path)
}
export function isPostPage(path: string) {
  return isPageType(path, 'posts')
}
export function isTagPage(path: string) {
  return isPageType(path, 'tags')
}
export function isAboutPage(path: string) {
  return isPageType(path, 'about')
}

// Returns page type information
export function getPageInfo(path: string) {
  const isHome = isHomePage(path)
  const isPost = isPostPage(path)
  const isTag = isTagPage(path)
  const isAbout = isAboutPage(path)

  return {
    isHome,
    isPost,
    isTag,
    isAbout,
  }
}
