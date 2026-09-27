import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import katex from 'katex'
import { useState } from 'react'

function InlineMathView({ node, updateAttributes, editor }: NodeViewProps) {
  const latex = (node.attrs.latex as string) ?? ''
  const [editing, setEditing] = useState(editor.isEditable && latex === '')
  const [draft, setDraft] = useState(latex)

  function commit() {
    updateAttributes({ latex: draft.trim() })
    setEditing(false)
  }

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="inline-block">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setDraft(latex)
              setEditing(false)
            }
          }}
          placeholder="LaTeX"
          size={Math.max(4, draft.length || 6)}
          className="rounded border border-accent bg-bg-muted px-1 font-mono text-sm text-text-primary"
        />
      </NodeViewWrapper>
    )
  }

  let html: string
  try {
    html = katex.renderToString(latex || '\\,', { throwOnError: false, displayMode: false })
  } catch {
    html = latex
  }

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle">
      <span
        className="cursor-text rounded px-0.5 hover:bg-accent/10"
        onClick={() => editor.isEditable && setEditing(true)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </NodeViewWrapper>
  )
}

/** Inline LaTeX math, e.g. "the area is $A = \pi r^2$" - typing a $...$ span
 * auto-converts it (the lookbehind keeps this from firing partway through
 * typing a $$...$$ block-math span, see MathBlock's docblock for why both
 * need to coexist without one hijacking the other). Empty on insertion (via
 * the slash command) so it opens straight into edit mode. */
export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
        getAttrs: (el) => ({ latex: (el as HTMLElement).getAttribute('data-latex') || '' }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'inline-math', 'data-latex': node.attrs.latex as string }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathView)
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^\s$][^$]*?)\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex: match[1] }))
        },
      }),
    ]
  },
})
