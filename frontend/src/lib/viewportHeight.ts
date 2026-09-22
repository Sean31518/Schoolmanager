/** iOS Safari's dvh unit is still unreliable in practice - on iPad it tracks
 * correctly in landscape (where the toolbar is always compact and fixed)
 * but can under-report the real visible height in portrait, where Safari's
 * toolbar collapses/expands on scroll and WebKit doesn't always recompute
 * dvh for that. window.visualViewport.height reflects the actual visible
 * area directly and updates live as the toolbar animates, so mirror it into
 * a CSS custom property and use that instead of dvh for full-height layouts. */
function setAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-100vh', `${height}px`)
}

export function initViewportHeightFix() {
  setAppHeight()
  window.visualViewport?.addEventListener('resize', setAppHeight)
  window.visualViewport?.addEventListener('scroll', setAppHeight)
  window.addEventListener('resize', setAppHeight)
  window.addEventListener('orientationchange', setAppHeight)
}
