export function SidebarResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      title="Breite anpassen"
      className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-accent/50 active:bg-accent/70"
    />
  )
}
