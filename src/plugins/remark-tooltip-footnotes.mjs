// Inline tooltip footnotes: `text[^fn: the note, with *markdown* and $math$] more text`.
// Renders as a numbered superscript button; the note shows as a tooltip on hover
// and toggles open persistently on click (see components/Widgets/Footnotes.astro).

import { visit } from 'unist-util-visit'

const OPEN = '[^fn:'

// Find the `]` closing a footnote that opens in children[start] at text offset `from`.
// Brackets inside links etc. are already parsed into nodes, so only text is scanned.
function findClose(children, start, from) {
  let depth = 1
  for (let j = start; j < children.length; j++) {
    const node = children[j]
    if (node.type !== 'text')
      continue
    for (let k = j === start ? from : 0; k < node.value.length; k++) {
      const ch = node.value[k]
      if (ch === '[')
        depth++
      else if (ch === ']' && --depth === 0)
        return [j, k]
    }
  }
  return null
}

const text = value => ({ type: 'text', value })

export function remarkTooltipFootnotes() {
  return (tree) => {
    let count = 0

    visit(tree, (parent) => {
      const children = parent.children
      if (!children)
        return

      for (let i = 0; i < children.length; i++) {
        const node = children[i]
        if (node.type !== 'text')
          continue
        const at = node.value.indexOf(OPEN)
        if (at === -1)
          continue
        const close = findClose(children, i, at + OPEN.length)
        if (!close)
          continue
        const [j, k] = close

        // Collect the footnote's content nodes between the opener and the closer.
        let content
        if (j === i) {
          content = [text(node.value.slice(at + OPEN.length, k))]
        }
        else {
          content = [
            text(node.value.slice(at + OPEN.length)),
            ...children.slice(i + 1, j),
            text(children[j].value.slice(0, k)),
          ]
        }
        content[0].value = content[0].value.replace(/^\s+/, '')
        const last = content[content.length - 1]
        if (last.type === 'text')
          last.value = last.value.replace(/\s+$/, '')
        content = content.filter(c => c.type !== 'text' || c.value)

        const n = ++count
        const id = `fn-tip-${n}`
        const footnote = {
          type: 'tooltipFootnote',
          data: { hName: 'span', hProperties: { className: ['fn'] } },
          children: [
            {
              type: 'tooltipFootnoteRef',
              data: {
                hName: 'button',
                hProperties: {
                  type: 'button',
                  className: ['fn-ref'],
                  ariaExpanded: 'false',
                  ariaControls: id,
                  ariaLabel: `Footnote ${n}`,
                },
              },
              children: [text(String(n))],
            },
            {
              type: 'tooltipFootnoteBody',
              data: { hName: 'span', hProperties: { className: ['fn-body'], id, role: 'note' } },
              children: content,
            },
          ],
        }

        const before = node.value.slice(0, at)
        const after = (j === i ? node.value : children[j].value).slice(k + 1)
        const replacement = [before && text(before), footnote, after && text(after)].filter(Boolean)
        children.splice(i, j - i + 1, ...replacement)
        // Continue scanning from the footnote itself; `after` may hold another one.
        i += before ? 1 : 0
      }
    })
  }
}
