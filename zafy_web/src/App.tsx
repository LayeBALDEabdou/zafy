import type { ReactNode } from 'react'

import ecranAccueil from './assets/ecran-accueil.png'
import ecranAlertes from './assets/ecran-alertes.png'
import ecranVerifier from './assets/ecran-verifier.png'
import logoClair from './assets/logo-clair.svg'
import walletImage from './assets/wallet.webp'
import { QrCode } from './QrCode'

/**
 * Lien de téléchargement de l'APK (build EAS « preview »).
 * FICTIF pour l'instant (domaine réservé aux exemples) : à remplacer par le lien du build publié.
 */
const APK_URL = 'https://example.com/zafy.apk'

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

const FEATURES: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  {
    icon: 'key',
    title: 'Tes clés, ton argent',
    text: 'Les clés sont créées et gardées sur ton téléphone. Un vol de carte SIM ne donne accès à rien.',
  },
  {
    icon: 'shield',
    title: 'Vérifie un message',
    text: 'Colle un SMS ou un message WhatsApp douteux : Zafy repère les signes d’arnaque avant que tu paies.',
  },
  {
    icon: 'bell',
    title: 'Alertes de la communauté',
    text: 'Les numéros et adresses d’escrocs sont signalés sur Nostr. Zafy te prévient avant chaque envoi.',
  },
  {
    icon: 'users',
    title: 'Contacts reconnus',
    text: 'Scanne la carte Zafy d’un proche : son nom s’affiche à chaque paiement, impossible de se tromper.',
  },
  {
    icon: 'calendar',
    title: 'Paiements planifiés',
    text: 'Loyer, tontine, famille : programme tes paiements avec un rappel ou un envoi automatique.',
  },
  {
    icon: 'coins',
    title: 'En FCFA, euro ou dollar',
    text: 'Vois et saisis les montants dans ta monnaie. En français ou en anglais.',
  },
]

const STEPS = [
  { title: 'Crée ton compte', text: 'Un prénom, un code à 4 chiffres. Note tes 12 mots de sauvegarde sur papier.' },
  { title: 'Ajoute des sats', text: 'Reçois de l’argent d’un proche ou d’un client avec ton QR code.' },
  { title: 'Paie en sécurité', text: 'Scanne, vérifie le nom et les alertes, confirme. C’est parti en quelques secondes.' },
]

export default function App() {
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <a href="#" className="brand" aria-label="Zafy, accueil">
            <img src={logoClair} alt="" width={32} height={32} />
            <span>zafy</span>
          </a>
          <nav className="nav" aria-label="Sections">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#comment">Comment ça marche</a>
            <a href="#telecharger">Télécharger</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-circle hero-circle-top" aria-hidden="true" />
          <div className="hero-circle hero-circle-bottom" aria-hidden="true" />
          <div className="container hero-inner">
            <div className="hero-text">
              <h1>Envoie de l’argent en quelques secondes, sans te faire arnaquer.</h1>
              <p>
                Zafy (Zap + Safe) protège ton argent contre les faux agents, les codes piégés et les vols de carte SIM.
                Tes clés restent sur ton téléphone.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href={APK_URL}>
                  <Icon name="download" size={20} /> Télécharger l’app
                </a>
                <a className="button button-outline" href="#comment">
                  Comment ça marche
                </a>
              </div>
            </div>
            <Phone src={ecranAccueil} alt="Écran d’accueil de Zafy : solde, envoyer, recevoir, vérifier" />
          </div>
        </section>

        <section className="section section-pocket">
          <div className="container pocket">
            <img
              className="pocket-image"
              src={walletImage}
              alt="Portefeuille, carte bancaire et pièces"
              width={450}
              height={431}
              loading="lazy"
            />
            <div className="pocket-text">
              <h2>Ton argent t’appartient, vraiment.</h2>
              <p>
                Avec le mobile money, un vol de carte SIM ou un code donné à un faux agent suffit pour perdre ton argent.
                Avec Zafy, il est protégé par une clé secrète qui ne quitte jamais ton téléphone : personne d’autre ne
                peut y toucher.
              </p>
              <ul className="checks">
                <li>Personne ne peut bloquer ton argent</li>
                <li>Voler ta carte SIM ne sert à rien</li>
                <li>Téléphone perdu ? Tes 12 mots suffisent pour tout récupérer</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="section section-features">
          <div className="container">
            <SectionTitle eyebrow="Fonctionnalités" title="Tout pour payer l’esprit tranquille" />
            <div className="features">
              {FEATURES.map((f) => (
                <article key={f.title} className="card feature">
                  <div className="feature-icon">
                    <Icon name={f.icon} />
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
            <SectionTitle eyebrow="Comment ça marche" title="Trois étapes, et c’est tout" />
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="step">
                  <span className="step-number">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="screens">
              <Phone src={ecranVerifier} alt="Écran Vérifier : analyse d’un message suspect" />
              <Phone src={ecranAccueil} alt="Écran d’accueil de Zafy" />
              <Phone src={ecranAlertes} alt="Écran Alertes : arnaques signalées par la communauté" />
            </div>
          </div>
        </section>

        <section id="telecharger" className="section">
          <div className="container">
            <div className="download">
              <div className="hero-circle hero-circle-top" aria-hidden="true" />
              <div className="download-text">
                <h2>Essaie Zafy sur Android</h2>
                <p>
                  Version de test : elle fonctionne sur le réseau Bitcoin de test, sans argent réel. Bientôt sur le
                  Play Store.
                </p>
              </div>
              <div className="download-actions">
                {/* Sur ordinateur : on scanne avec son téléphone. Sur téléphone, le bouton suffit. */}
                <div className="qr">
                  <QrCode value={APK_URL} size={168} />
                  <span>Scanne pour télécharger</span>
                </div>
                <a className="button button-primary" href={APK_URL}>
                  <Icon name="download" size={20} /> Télécharger l’APK
                </a>
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
