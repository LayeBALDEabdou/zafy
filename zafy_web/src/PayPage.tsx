import type { Dictionary } from './i18n'

/** Package Android de l'app (zafy_mobile/app.json). */
const ANDROID_PACKAGE = 'app.zafy.wallet'

/** « 771234567 » → « +221 77 123 45 67 ». */
function formatPhone(phone: string) {
  const m = phone.match(/^(?:221)?(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${phone}`
}

/** 5000, « XOF » → « 5 000 FCFA » ; 10, « EUR » → « 10,00 € ». Vide si absent ou invalide. */
function formatAmount(amount: number, currency: string | null) {
  if (!(amount > 0)) return ''
  const space = '\u202f'
  if (currency === 'XOF') return `${Math.round(amount).toLocaleString('fr-FR')}${space}FCFA`
  if (currency === 'EUR' || currency === 'USD') {
    const value = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${value}${space}${currency === 'EUR' ? '€' : '$'}`
  }
  return ''
}

/**
 * Page ouverte par un lien de demande de paiement partagé (/payer?r=<facture>&n=<prénom>&m=<montant>).
 * Si l'app est installée (et le lien vérifié), Android l'ouvre directement sur Envoyer et cette page ne s'affiche pas ;
 * sinon elle montre la demande, un bouton pour ouvrir Zafy et un lien de téléchargement.
 */
export function PayPage({ t, apkUrl }: { t: Dictionary; apkUrl: string }) {
  const params = new URLSearchParams(window.location.search)
  // Lien court « /payer/771234567?m=5000&c=XOF » : l'app retrouve le portefeuille dans l'annuaire Zafy
  const shortPhone = window.location.pathname.match(/^\/payer\/(\d{8,15})\/?$/)?.[1]
  const invoice = shortPhone ?? params.get('r')?.trim()
  const name = shortPhone ? formatPhone(shortPhone) : params.get('n')?.trim()
  // Montant dans la devise de celui qui demande ; anciens liens : texte déjà écrit, ou en sats
  const sats = Number(params.get('s')) || 0
  const amount = shortPhone
    ? formatAmount(Number(params.get('m')), params.get('c'))
    : params.get('m')?.trim() || (sats > 0 ? `${sats.toLocaleString()} sats` : '')

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

  // Même chemin dans l'app : « zafy://payer/771234567?m=… » ou « zafy://payer?r=… »
  const path = `${window.location.pathname.slice(1)}${window.location.search}`
  // Android : lien « intent » qui ouvre l'app, ou la section téléchargement si elle n'est pas installée
  const isAndroid = /android/i.test(navigator.userAgent)
  const openUrl = isAndroid
    ? `intent://${path}#Intent;scheme=zafy;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(`${window.location.origin}/#telecharger`)};end`
    : `zafy://${path}`

  return (
    <main className="container contact-page">
      <div className="card contact-card">
        <div className="contact-avatar">{(name || 'Z').charAt(0).toUpperCase()}</div>
        <h1>{name || t.pay.someone}</h1>
        {amount ? <p className="contact-phone">{amount}</p> : null}
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
