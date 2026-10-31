import type { Dictionary } from './i18n'

/** Package Android de l'app (zafy_mobile/app.json). */
const ANDROID_PACKAGE = 'app.zafy.wallet'

/** « 771234567 » → « +221 77 123 45 67 ». */
function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const m = digits.match(/^(?:221)?(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone
}

/**
 * Page ouverte par un lien de carte de contact partagé (WhatsApp, SMS…).
 * Si l'app est installée, Android l'ouvre directement (App Links) et cette page ne s'affiche pas ;
 * sinon elle montre la carte, un bouton pour ouvrir Zafy et un lien de téléchargement.
 */
export function ContactPage({ t, apkUrl }: { t: Dictionary; apkUrl: string }) {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('n')?.trim()
  const address = params.get('a')?.trim()
  const phone = params.get('p')?.trim()

  if (!name || !address) {
    return (
      <main className="container contact-page">
        <div className="card contact-card">
          <p>{t.contact.invalid}</p>
          <a className="button button-primary" href="/">
            {t.contact.home}
          </a>
        </div>
      </main>
    )
  }

  const query = window.location.search.slice(1)
  // Android : lien « intent » qui ouvre l'app, ou la section téléchargement si elle n'est pas installée
  const isAndroid = /android/i.test(navigator.userAgent)
  const openUrl = isAndroid
    ? `intent://ajouter-contact?${query}#Intent;scheme=zafy;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(`${window.location.origin}/#telecharger`)};end`
    : `zafy://ajouter-contact?${query}`

  return (
    <main className="container contact-page">
      <div className="card contact-card">
        <div className="contact-avatar">{name.charAt(0).toUpperCase()}</div>
        <h1>{name}</h1>
        {phone ? <p className="contact-phone">{formatPhone(phone)}</p> : null}
        <p className="contact-title">{t.contact.title}</p>
        <p className="contact-text">{t.contact.text}</p>
        <a className="button button-primary" href={openUrl}>
          {t.contact.open}
        </a>
        <p className="contact-noapp">
          {t.contact.noApp} <a href={apkUrl}>{t.contact.getApp}</a>
        </p>
      </div>
    </main>
  )
}
