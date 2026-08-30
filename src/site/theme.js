import { useSyncExternalStore } from 'react'

/*
 * The site's ground-and-ink pairs.
 *
 * A pair is stored unordered: which of the two is the ground depends on the
 * appearance mode, so every palette gives both a light and a dark rendering
 * without a second entry. That is also why there is no separate "dark palette"
 * list to keep in sync.
 */
export const PALETTES = [
  ['#b3eafa', '#1f3347'],
  ['#0051c8', '#ffffff'],
  ['#8f3a3a', '#fdfffe'],
  ['#f5faf9', '#0f2b4f'],
  ['#080600', '#efc324'],
  ['#002281', '#f6ecec'],
  ['#060838', '#2bdca3'],
  ['#ffbf1e', '#2d260b'],
  ['#2818ef', '#f0f5f0'],
  ['#000203', '#d1cfce'],
]

const STORE_KEY = 'morphiq:theme'

/** Relative luminance, so the pair can be ordered rather than guessed at. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

/**
 * Light mode grounds on the lighter half of the pair; dark mode on the darker.
 *
 * Exported because the picker's swatches have to be drawn in the resolved
 * order, not the stored one — the pairs are written down unordered, so half of
 * them would otherwise preview with the ink where the ground will be.
 */
export function pairFor(index, mode) {
  const [a, b] = PALETTES[index] ?? PALETTES[0]
  const [lighter, darker] = luminance(a) >= luminance(b) ? [a, b] : [b, a]
  return mode === 'dark'
    ? { index, mode, bg: darker, ink: lighter }
    : { index, mode, bg: lighter, ink: darker }
}

const resolve = pairFor

function readStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const { bg, ink, mode } = JSON.parse(raw)
    const index = PALETTES.findIndex(
      ([a, b]) => (a === bg && b === ink) || (a === ink && b === bg)
    )
    if (index < 0) return null // a palette that has since been retired
    return { index, mode: mode === 'dark' ? 'dark' : 'light' }
  } catch {
    return null
  }
}

function systemMode() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/* No stored choice means a fresh draw on every load — the reskin-on-refresh
   that the site opens with. Once someone picks, their pick is what they get. */
const initial = readStored() ?? {
  index: Math.floor(Math.random() * PALETTES.length),
  mode: systemMode(),
}

let current = resolve(initial.index, initial.mode)
const listeners = new Set()

export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const getPalette = () => current

/** Paints the pair onto the root element, where every stylesheet reads it. */
function paint() {
  const root = document.documentElement
  root.style.setProperty('--mq-bg', current.bg)
  root.style.setProperty('--mq-ink', current.ink)
  root.style.colorScheme = current.mode
  document.body.style.backgroundColor = current.bg
}

function commit(next) {
  current = resolve(next.index, next.mode)
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ bg: current.bg, ink: current.ink, mode: current.mode })
    )
  } catch {
    /* private browsing — the choice just does not outlive the session */
  }
  paint()
  listeners.forEach((fn) => fn())
}

export const setPalette = (index) => commit({ index, mode: current.mode })
export const setMode = (mode) => commit({ index: current.index, mode })
export const shuffle = () => {
  let next = current.index
  while (PALETTES.length > 1 && next === current.index) {
    next = Math.floor(Math.random() * PALETTES.length)
  }
  commit({ index: next, mode: current.mode })
}

/** The live pair. Components that paint with it re-render when it changes. */
export const usePalette = () => useSyncExternalStore(subscribe, getPalette, getPalette)

/**
 * Mount-time setup for a page: paint the pair and unlock scrolling, which the
 * app shell locks for the component lab.
 */
export function applyTheme() {
  const root = document.documentElement
  const prevBody = document.body.style.backgroundColor
  root.classList.add('site-scroll')
  paint()
  return () => {
    root.classList.remove('site-scroll')
    document.body.style.backgroundColor = prevBody
  }
}
