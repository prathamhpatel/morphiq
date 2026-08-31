/*
 * Google Analytics 4.
 *
 * The measurement ID comes from VITE_GA_ID rather than the source, so this
 * repo carries no property of its own — a fork builds with analytics off and
 * stays off. Nothing is requested at all when the variable is unset, which is
 * also what keeps local builds and preview deploys out of the property.
 *
 * gtag's own page_view is disabled. Its enhanced measurement hooks pushState
 * and replaceState, and this site routes on window.location.hash, which calls
 * neither — automatic views would miss every navigation after the first. So
 * App sends them, one per view, from the same state that decides what renders.
 */

const ID = import.meta.env.VITE_GA_ID

/** gtag has to push `arguments`, not a rest array — the shape is load-bearing. */
function gtag() {
  window.dataLayer.push(arguments)
}

let ready = false

export function initAnalytics() {
  if (ready || !ID || typeof window === 'undefined') return
  ready = true

  window.dataLayer = window.dataLayer || []
  gtag('js', new Date())
  gtag('config', ID, { send_page_view: false })

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`
  document.head.appendChild(s)
}

/**
 * One page view. `path` is the app's own route name rather than location.pathname,
 * which is always "/" here and would collapse every view into a single row.
 */
export function trackPageView(path, title) {
  if (!ready) return
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  })
}
