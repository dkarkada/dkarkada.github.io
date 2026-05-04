import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: false,
  ignores: ['public/vendors/**'],
})
