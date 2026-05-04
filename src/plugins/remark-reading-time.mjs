import { toString } from 'mdast-util-to-string'

export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = toString(tree)
    const words = textOnPage.trim().split(/\s+/).length
    data.astro.frontmatter.minutes = Math.max(1, Math.round(words / 200))
  }
}
