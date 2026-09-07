import remarkSmartypants from 'remark-smartypants'

// SmartyPants with quote conversion disabled: keep straight quotes and
// apostrophes (Spectral's curly versions have a harsh angled design) while still
// converting `--`/`---` to dashes and `...` to an ellipsis. The inner transform
// is re-wrapped in an untyped closure so it slots into Astro's remarkPlugins
// config without tripping unified's strict `Plugin` typing.
export function remarkSmartypantsNoQuotes() {
  const transform = remarkSmartypants({ quotes: false })
  return (tree, file) => {
    transform(tree, file, () => {})
  }
}
