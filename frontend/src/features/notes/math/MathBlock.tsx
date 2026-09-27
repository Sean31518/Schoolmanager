import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import katex from 'katex'
import { useState } from 'react'

function MathBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? ''
  const [editing, setEditing] = useState(editor.isEditable && latex === '')
  const [draft, setDraft] = useState(latex)

  function commit() {
    updateAttributes({ latex: draft.trim() })
    setEditing(false)
  }

  if (editing) {
    return (
      <NodeViewWrapper className="my-2">
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setDraft(latex)
              setEditing(false)
            }
          }}
          placeholder="LaTeX, z.B. \frac{a}{b}  (Strg/Cmd+Enter zum Bestätigen)"
          className="w-full rounded-md border border-accent bg-bg-muted p-2 font-mono text-sm text-text-primary"
        />
      </NodeViewWrapper>
    )
  }

  let html: string
  try {
    html = katex.renderToString(latex || '\\text{Mathe-Block (klicken zum Bearbeiten)}', {
      throwOnError: false,
      displayMode: true,
    })
  } catch {
    html = latex
  }

  return (
    <NodeViewWrapper
      className="my-2 cursor-text overflow-x-auto rounded-md border border-transparent px-2 py-3 text-center hover:border-border"
      onClick={() => editor.isEditable && setEditing(true)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** Block-level (display-mode) LaTeX math, for a formula on its own line.
 * Typing $$...$$ auto-converts it. Its input rule requires two non-$
 * characters worth of content between the delimiters before it can match,
 * and InlineMath's rule requires the character right before its own
 * opening $ not to be a $ - between the two, "$$x$$" only ever matches as
 * a block, never gets hijacked mid-type by the inline rule seeing "$x$"
 * inside it (verified: with only one $ typed so far there's nothing to
 * match; with two, inline's lookbehind sees the preceding $ and refuses). */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (el) => ({ latex: (el as HTMLElement).getAttribute('data-latex') || '' }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-block', 'data-latex': node.attrs.latex as string }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView)
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^\s$][^$]*?)\$\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex: match[1] }))
        },
      }),
    ]
  },
})
