import type { ReactNode } from 'react'

import ecranAccueil from './assets/ecran-accueil.png'
import ecranAlertes from './assets/ecran-alertes.png'
import ecranVerifier from './assets/ecran-verifier.png'
import logoClair from './assets/logo-clair.svg'
import androidIcon from './assets/android.png'
import walletImage from './assets/wallet.webp'
import flagEn from './assets/flag-en.png'
import flagFr from './assets/flag-fr.png'
import { ContactPage } from './ContactPage'
import { isContactPage, useLanguage, type Language } from './i18n'
import { QrCode } from './QrCode'

/**
 * Lien direct vers l'APK du build EAS « preview » (33702aca) : le téléchargement démarre dès le scan du QR code.
 * À mettre à jour après chaque nouveau build preview (npx eas-cli@latest build:list).
 */
const APK_URL = 'https://expo.dev/artifacts/eas/22kWmvEVQArDhBXAB-Yr-7l97ML4BJuVrTjPgNOeahY.apk'

// Tracés style Lucide (traits 2 px, arrondis), comme dans l'app mobile
const ICONS = {
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 20 3M17 6l3 3M14.5 8.5l2.5 2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="6" />
      <path d="M15.5 9.5a6 6 0 1 1-6 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-5.7" />
    </>
  ),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
}

function Icon({ name, size = 24 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

/** Icônes des fonctionnalités, dans l'ordre des textes du dictionnaire. */
const FEATURE_ICONS: (keyof typeof ICONS)[] = ['key', 'shield', 'bell', 'users', 'calendar', 'coins']

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: flagFr },
  { code: 'en', label: 'English', flag: flagEn },
]

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const contactPage = isContactPage()

  const header = (
    <header className="header">
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="Zafy, accueil">
          <img src={logoClair} alt="" width={32} height={32} />
          <span>zafy</span>
        </a>
        <div className="header-right">
          {contactPage ? null : (
            <nav className="nav" aria-label="Sections">
              <a href="#fonctionnalites">{t.nav.features}</a>
              <a href="#comment">{t.nav.how}</a>
              <a href="#telecharger">{t.nav.download}</a>
            </nav>
          )}
          <div className="languages" role="radiogroup" aria-label={t.languageLabel}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={l.code === language}
                aria-label={l.label}
                title={l.label}
                className={l.code === language ? 'language active' : 'language'}
                onClick={() => setLanguage(l.code)}>
                <img src={l.flag} alt="" width={22} height={22} />
                <span>{l.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )

  // Lien de carte de contact partagé : page dédiée, qui renvoie vers l'app
  if (contactPage) {
    return (
      <>
        {header}
        <ContactPage t={t} apkUrl={APK_URL} />
      </>
    )
  }

  return (
    <>
      {header}

      <main>
        <section className="hero">
          <div className="hero-circle hero-circle-top" aria-hidden="true" />
          <div className="hero-circle hero-circle-bottom" aria-hidden="true" />
          <div className="container hero-inner">
            <div className="hero-text">
              <h1>{t.hero.title}</h1>
              <p>{t.hero.text}</p>
              <div className="hero-actions">
                <a className="button button-primary" href={APK_URL}>
                  <Icon name="download" size={20} /> {t.hero.download}
                </a>
                <a className="button button-outline" href="#comment">
                  {t.hero.how}
                </a>
              </div>
            </div>
            <Phone src={ecranAccueil} alt={t.hero.phoneAlt} />
          </div>
        </section>

        <section className="section section-pocket">
          <div className="container pocket">
            <img
              className="pocket-image"
              src={walletImage}
              alt={t.pocket.imageAlt}
              width={450}
              height={431}
              loading="lazy"
            />
            <div className="pocket-text">
              <h2>{t.pocket.title}</h2>
              <p>{t.pocket.text}</p>
              <ul className="checks">
                {t.pocket.checks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="section section-features">
          <div className="container">
            <SectionTitle eyebrow={t.features.eyebrow} title={t.features.title} />
            <div className="features">
              {t.features.items.map((f, i) => (
                <article key={f.title} className="card feature">
                  <div className="feature-icon">
                    <Icon name={FEATURE_ICONS[i]} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comment" className="section section-white">
          <div className="container">
            <SectionTitle eyebrow={t.steps.eyebrow} title={t.steps.title} />
            <ol className="steps">
              {t.steps.items.map((s, i) => (
                <li key={s.title} className="step">
                  <span className="step-number">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="screens">
              <Phone src={ecranVerifier} alt={t.steps.screensAlt[0]} />
              <Phone src={ecranAccueil} alt={t.steps.screensAlt[1]} />
              <Phone src={ecranAlertes} alt={t.steps.screensAlt[2]} />
            </div>
          </div>
        </section>

        <section id="telecharger" className="section">
          <div className="container">
            <div className="download">
              {/* Grand robot Android en filigrane */}
              <img className="download-bg" src={androidIcon} alt="" width={400} height={400} />
              <div className="download-text">
                <h2>{t.download.title}</h2>
                <p>{t.download.text}</p>
                <a className="button button-primary" href={APK_URL}>
                  <Icon name="download" size={20} /> {t.download.button}
                </a>
              </div>
              {/* Sur ordinateur : on scanne avec son téléphone. Sur téléphone, le bouton suffit. */}
              <div className="qr">
                <QrCode value={APK_URL} size={150} label={t.download.qrLabel} />
                <span>{t.download.scan}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  )
}

/** Capture d'écran de l'app dans un cadre de téléphone. */
function Phone({ src, alt }: { src: string; alt: string }): ReactNode {
  return (
    <div className="phone">
      <img src={src} alt={alt} width={270} height={584} loading="lazy" />
    </div>
  )
}
