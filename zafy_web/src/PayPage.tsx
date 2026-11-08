import type { Dictionary } from './i18n'

/** Package Android de l'app (zafy_mobile/app.json). */
const ANDROID_PACKAGE = 'app.zafy.wallet'

/**
 * Page ouverte par un lien de demande de paiement partagé (/payer?r=<facture>&n=<prénom>&s=<sats>).
 * Si l'app est installée (et le lien vérifié), Android l'ouvre directement sur Envoyer et cette page ne s'affiche pas ;
 * sinon elle montre la demande, un bouton pour ouvrir Zafy et un lien de téléchargement.
 */
export function PayPage({ t, apkUrl }: { t: Dictionary; apkUrl: string }) {
  const params = new URLSearchParams(window.location.search)
  const invoice = params.get('r')?.trim()
  const name = params.get('n')?.trim()
  const sats = Number(params.get('s')) || 0

  if (!invoice) {
    return (
      <main className="container contact-page">
        <div className="card contact-card">
          <p>{t.pay.invalid}</p>
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
    ? `intent://payer?${query}#Intent;scheme=zafy;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(`${window.location.origin}/#telecharger`)};end`
    : `zafy://payer?${query}`

  return (
    <main className="container contact-page">
      <div className="card contact-card">
        <div className="contact-avatar">{(name || 'Z').charAt(0).toUpperCase()}</div>
        <h1>{name || t.pay.someone}</h1>
        {sats > 0 ? <p className="contact-phone">{sats.toLocaleString()} sats</p> : null}
        <p className="contact-title">{t.pay.title}</p>
        <p className="contact-text">{t.pay.text}</p>
        <a className="button button-primary" href={openUrl}>
          {t.pay.open}
        </a>
        <p className="contact-noapp">
          {t.contact.noApp} <a href={apkUrl}>{t.contact.getApp}</a>
        </p>
      </div>
    </main>
  )
}
