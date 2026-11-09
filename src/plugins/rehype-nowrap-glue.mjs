import { SKIP, visit } from 'unist-util-visit'

// Browsers may break a line between an inline atom and the text glued to it, stranding
// punctuation or a footnote marker at the start of a line ("$P_{ii}$." -> "P_ii" / ". First";
// "full-rank.[^fn]" -> "full-rank." / "¹"). Wrap each inline KaTeX equation and each tooltip
// footnote, together with the non-whitespace text touching it on either side ("(", ".", "-th",
// ...), in <span class="nowrap-glue">; global.css forbids breaks at those seams only.
// Must run after rehype-katex.

function classes(node) {
  const c = node.properties?.className
  return Array.isArray(c) ? c : typeof c === 'string' ? c.split(/\s+/) : []
}

function isAtom(node) {
  if (node.type !== 'element' || node.tagName !== 'span') {
    return false
  }
  const c = classes(node)
  return c.includes('katex') || c.includes('fn')
}

export function rehypeNowrapGlue() {
  return (tree) => {
    // Visit every parent, not just hast elements: in MDX, content inside JSX (e.g.
    // <figcaption>) sits under mdxJsx*Element nodes.
    visit(tree, (parent) => {
      const c = classes(parent)
      if (c.includes('katex') || c.includes('katex-display')) {
        return SKIP // KaTeX internals
      }
      // A wrapper made here: don't re-wrap its children, but do descend (into a footnote body).
      if (!parent.children || c.includes('nowrap-glue')) {
        return
      }
      const kids = parent.children
      for (let i = 0; i < kids.length; i++) {
        if (!isAtom(kids[i])) {
          continue
        }
        const group = [kids[i]]
        let start = i
        let end = i + 1

        const prev = kids[i - 1]
        const lead = prev?.type === 'text' ? prev.value.match(/\S+$/) : null
        if (lead) {
          prev.value = prev.value.slice(0, lead.index)
          group.unshift({ type: 'text', value: lead[0] })
          if (!prev.value) {
            start = i - 1
          }
        }

        const next = kids[i + 1]
        const trail = next?.type === 'text' ? next.value.match(/^\S+/) : null
        if (trail) {
          next.value = next.value.slice(trail[0].length)
          group.push({ type: 'text', value: trail[0] })
          if (!next.value) {
            end = i + 2
          }
        }

        if (group.length === 1) {
          continue
        }
        const wrapper = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['nowrap-glue'] },
          children: group,
        }
        kids.splice(start, end - start, wrapper)
        i = start
      }
    })
  }
}
