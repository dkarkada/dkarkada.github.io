import type { CollectionEntry } from 'astro:content'

type ExcerptScene = 'list' | 'meta' | 'og' | 'feed'

export function generateDescription(
  post: CollectionEntry<'posts'>,
  scene: ExcerptScene,
): string {
  if (!post.data.description) return ''
  if (scene === 'og') {
    const s = post.data.description
    const truncated = s.slice(0, 140).trim()
    return s.length > 140 ? `${truncated.replace(/\p{P}+$/u, '')}...` : truncated
  }
  return post.data.description
}
