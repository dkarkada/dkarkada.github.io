import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { generateDescription } from '@/utils/description'
import { renderOgImage } from '@/utils/og-image'

// One preview card per post, served at /og/<post.id>.png (see Head.astro).
export const getStaticPaths = (async () => {
  const posts = await getCollection('posts')
  return posts.map(post => ({
    params: { image: `${post.id}.png` },
    props: {
      title: post.data.title,
      description: post.data.description || generateDescription(post, 'og'),
    },
  }))
}) satisfies GetStaticPaths

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props.title, props.description)
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
