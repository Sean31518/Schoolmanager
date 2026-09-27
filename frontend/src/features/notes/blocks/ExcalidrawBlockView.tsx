import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useRef } from 'react'
import { useTheme } from '../../../lib/useTheme'

const SAVE_DEBOUNCE_MS = 800

interface ExcalidrawScene {
  elements?: unknown[]
  appState?: { viewBackgroundColor?: string }
}

/** Handwritten/drawn notes via Excalidraw, stored as its own scene JSON in
 * the block's contentJson (the same generic column TEXT blocks use) - no
 * uploaded file involved, so it round-trips through export/import for free
 * alongside TEXT blocks. onChange fires on every stroke, so saves are
 * debounced instead of writing on each one. Only the background color is
 * kept from Excalidraw's own appState - the rest (UI panel positions, zoom,
 * selection) isn't worth persisting and would just bloat every save. */
export function ExcalidrawBlockView({
  contentJson,
  onSave,
}: {
  contentJson: unknown
  onSave: (content: unknown) => void
}) {
  const { theme } = useTheme()
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scene = (contentJson ?? {}) as ExcalidrawScene

  function scheduleSave(elements: readonly unknown[], viewBackgroundColor: string | undefined) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      onSave({ elements, appState: { viewBackgroundColor } })
    }, SAVE_DEBOUNCE_MS)
  }

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-lg border border-border">
      <Excalidraw
        theme={theme}
        initialData={{
          elements: (scene.elements ?? []) as never,
          appState: { viewBackgroundColor: scene.appState?.viewBackgroundColor },
          scrollToContent: true,
        }}
        onChange={(elements, appState) => scheduleSave(elements, appState.viewBackgroundColor)}
      />
    </div>
  )
}
