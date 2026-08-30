import { useEffect } from 'react'
import { applyTheme, usePalette } from './theme.js'
import ThemePicker from './ThemePicker.jsx'
import MobileNav from './MobileNav.jsx'
import BitmapText from '../components/BitmapText/BitmapText.jsx'
import './templates.css'

const REPO = 'https://github.com/prathamhpatel/morphiq'

/*
 * Templates, before there are any.
 *
 * An empty screen is an invitation to act, so this one says what is coming,
 * when it is worth checking back, and where to go in the meantime — rather
 * than leaving two words on a page and calling it a design.
 */
export default function Templates({ onNavigate }) {
  const { bg, ink } = usePalette()
  useEffect(applyTheme, [])

  return (
    <div className="mq tpl">
      <div className="tpl__rules" aria-hidden="true">
        <span className="tpl__v tpl__v--a" />
        <span className="tpl__v tpl__v--b" />
        <span className="tpl__v tpl__v--c" />
      </div>

      <header className="tpl__nav">
        <button
          type="button"
          className="tpl__wordmark"
          onClick={() => onNavigate?.('site')}
        >
          <span className="mq-mark" aria-hidden="true" />
          <span>Morphiq</span>
        </button>

        <nav className="tpl__links">
          <button type="button" onClick={() => onNavigate?.('docs')}>Docs</button>
          <button type="button" onClick={() => onNavigate?.('docs')}>Components</button>
          <button type="button" className="is-active">Templates</button>
        </nav>

        <a className="tpl__github" href={REPO} target="_blank" rel="noreferrer">
          <span className="mq-icon mq-icon--github" aria-hidden="true" />
          Github
        </a>

        <MobileNav
          current="Templates"
          items={[
            { label: 'Docs', onSelect: () => onNavigate?.('docs') },
            { label: 'Components', onSelect: () => onNavigate?.('docs') },
            { label: 'Templates', onSelect: () => {} },
          ]}
        />
      </header>

      <section className="tpl__body">
        <div className="tpl__lockup">
          <p className="tpl__eyebrow">Templates</p>
          <h1 className="tpl__title">Coming soon!</h1>
          <p className="tpl__lede">
            Full pages built from the components — a landing page, a docs
            shell, a portfolio — each one installable in a single command, the
            same way a component is.
          </p>
          <p className="tpl__note">
            The components come first. Follow the repository to see them land.
          </p>

          <div className="tpl__actions">
            <button
              type="button"
              className="tpl__cta"
              onClick={() => onNavigate?.('docs')}
            >
              Browse the components
              <span className="mq-icon mq-icon--arrow" aria-hidden="true" />
            </button>
            <a className="tpl__link" href={REPO} target="_blank" rel="noreferrer">
              Watch on GitHub
            </a>
          </div>
        </div>

        <div className="tpl__dither">
          <BitmapText
            text={'SOON'}
            fontFamily="'Author', sans-serif"
            fontWeight={500}
            grain={0.62}
            cell={5}
            dither="bayer4"
            padding={0}
            color={ink}
            background={bg}
          />
        </div>
      </section>

      <ThemePicker />
    </div>
  )
}
