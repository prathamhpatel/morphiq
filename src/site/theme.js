/*
 * The site's ground-and-ink pair.
 *
 * The roll happens once at module load, which is once per page load, so every
 * page in a session shares one palette and a refresh reskins the whole site.
 * Navigating from home to the docs must not reroll — that would read as a bug
 * rather than as a feature.
 */
export const PALETTES = [
  ['#b3eafa', '#1f3347'],
  ['#0051c8', '#ffffff'],
  ['#d25656', '#fdfffe'],
  ['#f5faf9', '#0f2b4f'],
  ['#d1cdc7', '#252728'],
  ['#080600', '#efc324'],
  ['#002281', '#f6ecec'],
  ['#060838', '#2bdca3'],
  ['#25273d', '#ebc519'],
  ['#303133', '#e1bc02'],
  ['#f7f1e8', '#372113'],
  ['#ffbf1e', '#2d260b'],
  ['#2818ef', '#f0f5f0'],
  ['#000203', '#d1cfce'],
  ['#1e1c18', '#e4e0de'],
]

export const [BG, INK] = PALETTES[Math.floor(Math.random() * PALETTES.length)]

/**
 * Paints the pair onto the document and unlocks scrolling.
 *
 * The pair goes on the root element rather than on each page, so a stylesheet
 * can read it without every page having to pass it down; the body carries the
 * shell's dark default, which would show through on overscroll.
 */
export function applyTheme() {
  const root = document.documentElement
  const prevBody = document.body.style.backgroundColor

  root.style.setProperty('--mq-bg', BG)
  root.style.setProperty('--mq-ink', INK)
  root.classList.add('site-scroll')
  document.body.style.backgroundColor = BG

  return () => {
    root.classList.remove('site-scroll')
    document.body.style.backgroundColor = prevBody
  }
}
