import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/* Author is licensed, so its files are not in the repo — see src/site/fonts.css.
   Point VITE_AUTHOR_FONT_CSS at your Klim webfont URL to load it. */
const authorCss = import.meta.env.VITE_AUTHOR_FONT_CSS
if (authorCss) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = authorCss
  document.head.appendChild(link)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
