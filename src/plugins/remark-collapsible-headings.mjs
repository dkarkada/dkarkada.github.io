// Turns a heading written as `### > Title` into a collapsible section,
// collapsed by default. The section runs from the heading up to the next
// heading of the same or higher level, and renders as
// <details class="collapsible"><summary><h3>Title</h3></summary>…</details>.

const MARKER = /^>\s*/

function isCollapsibleHeading(node) {
  const first = node.type === 'heading' && node.children?.[0]
  return first?.type === 'text' && MARKER.test(first.value)
}

export function remarkCollapsibleHeadings() {
  return (tree) => {
    const children = tree.children
    for (let i = 0; i < children.length; i++) {
      const heading = children[i]
      if (!isCollapsibleHeading(heading))
        continue

      heading.children[0].value = heading.children[0].value.replace(MARKER, '')

      let end = i + 1
      while (end < children.length
        && !(children[end].type === 'heading' && children[end].depth <= heading.depth)) {
        end++
      }

      const summary = {
        type: 'collapsibleSummary',
        data: { hName: 'summary' },
        children: [heading],
      }
      const details = {
        type: 'collapsible',
        data: { hName: 'details', hProperties: { className: ['collapsible'] } },
        children: [summary, ...children.slice(i + 1, end)],
      }
      children.splice(i, end - i, details)
    }
  }
}
