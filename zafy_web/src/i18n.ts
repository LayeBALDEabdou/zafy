import { useEffect, useState } from 'react'

export type Language = 'fr' | 'en'

type Text = { title: string; text: string }

/** Textes de la page en français et en anglais (même forme pour les deux langues). */
const fr = {
  pageTitle: 'Zafy · Paiements Bitcoin rapides et sûrs',
  nav: { features: 'Fonctionnalités', how: 'Comment ça marche', download: 'Télécharger' },
  languageLabel: 'Langue',
  hero: {
    title: 'Envoie de l’argent en quelques secondes, sans te faire arnaquer.',
    text: 'Zafy (Zap + Safe) protège ton argent contre les faux agents, les codes piégés et les vols de carte SIM. Tes clés restent sur ton téléphone.',
    download: 'Télécharger l’app',
    how: 'Comment ça marche',
    phoneAlt: 'Écran d’accueil de Zafy : solde, envoyer, recevoir, vérifier',
  },
  pocket: {
    imageAlt: 'Portefeuille, carte bancaire et pièces',
    title: 'Ton argent t’appartient, vraiment.',
    text: 'Avec le mobile money, un vol de carte SIM ou un code donné à un faux agent suffit pour perdre ton argent. Avec Zafy, il est protégé par une clé secrète qui ne quitte jamais ton téléphone : personne d’autre ne peut y toucher.',
    checks: [
      'Personne ne peut bloquer ton argent',
      'Voler ta carte SIM ne sert à rien',
      'Téléphone perdu ? Tes 12 mots suffisent pour tout récupérer',
    ],
  },
  features: {
    eyebrow: 'Fonctionnalités',
    title: 'Tout pour payer l’esprit tranquille',
    items: [
      { title: 'Tes clés, ton argent', text: 'Les clés sont créées et gardées sur ton téléphone. Un vol de carte SIM ne donne accès à rien.' },
      { title: 'Vérifie un message', text: 'Colle un SMS ou un message WhatsApp douteux : Zafy repère les signes d’arnaque avant que tu paies.' },
      { title: 'Alertes de la communauté', text: 'Les numéros et adresses d’escrocs sont signalés sur Nostr. Zafy te prévient avant chaque envoi.' },
      { title: 'Contacts reconnus', text: 'Scanne la carte Zafy d’un proche : son nom s’affiche à chaque paiement, impossible de se tromper.' },
      { title: 'Paiements planifiés', text: 'Loyer, tontine, famille : programme tes paiements avec un rappel ou un envoi automatique.' },
      { title: 'En FCFA, euro ou dollar', text: 'Vois et saisis les montants dans ta monnaie. En français ou en anglais.' },
    ] as Text[],
  },
  steps: {
    eyebrow: 'Comment ça marche',
    title: 'Trois étapes, et c’est tout',
    items: [
      { title: 'Crée ton compte', text: 'Un prénom, un code à 4 chiffres. Note tes 12 mots de sauvegarde sur papier.' },
      { title: 'Ajoute des sats', text: 'Reçois de l’argent d’un proche ou d’un client avec ton QR code.' },
      { title: 'Paie en sécurité', text: 'Scanne, vérifie le nom et les alertes, confirme. C’est parti en quelques secondes.' },
    ] as Text[],
    screensAlt: [
      'Écran Vérifier : analyse d’un message suspect',
      'Écran d’accueil de Zafy',
      'Écran Alertes : arnaques signalées par la communauté',
    ],
  },
  contact: {
    pageTitle: 'Ajouter un contact · Zafy',
    title: 'te partage sa carte Zafy',
    text: 'Ouvre-la dans l’app Zafy pour ajouter ce contact : son nom s’affichera à chaque paiement.',
    open: 'Ouvrir dans Zafy',
    noApp: 'Tu n’as pas encore Zafy ?',
    getApp: 'Télécharger l’app',
    invalid: 'Ce lien de carte Zafy est incomplet ou abîmé.',
    home: 'Découvrir Zafy',
  },
  download: {
    title: 'Essaie Zafy sur Android',
    text: 'Version de test : elle fonctionne sur le réseau Bitcoin de test, sans argent réel. Bientôt sur le Play Store.',
    scan: 'Scanne pour télécharger',
    qrLabel: 'QR code de téléchargement',
    button: 'Télécharger l’APK',
  },
}

export type Dictionary = typeof fr

const en: Dictionary = {
  pageTitle: 'Zafy · Fast and safe Bitcoin payments',
  nav: { features: 'Features', how: 'How it works', download: 'Download' },
  languageLabel: 'Language',
  hero: {
    title: 'Send money in seconds, without getting scammed.',
    text: 'Zafy (Zap + Safe) protects your money from fake agents, trap codes and SIM card theft. Your keys stay on your phone.',
    download: 'Download the app',
    how: 'How it works',
    phoneAlt: 'Zafy home screen: balance, send, receive, check',
  },
  pocket: {
    imageAlt: 'Wallet, bank card and coins',
    title: 'Your money really belongs to you.',
    text: 'With mobile money, a stolen SIM card or a code given to a fake agent is enough to lose your money. With Zafy, it is protected by a secret key that never leaves your phone: nobody else can touch it.',
    checks: [
      'Nobody can freeze your money',
      'Stealing your SIM card is useless',
      'Lost your phone? Your 12 words are enough to get everything back',
    ],
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything to pay with peace of mind',
    items: [
      { title: 'Your keys, your money', text: 'Keys are created and kept on your phone. A stolen SIM card gives access to nothing.' },
      { title: 'Check a message', text: 'Paste a suspicious SMS or WhatsApp message: Zafy spots the signs of a scam before you pay.' },
      { title: 'Community alerts', text: 'Scammers’ numbers and addresses are reported on Nostr. Zafy warns you before every payment.' },
      { title: 'Known contacts', text: 'Scan a relative’s Zafy card: their name shows up on every payment, so you can’t get it wrong.' },
      { title: 'Scheduled payments', text: 'Rent, savings club, family: schedule your payments with a reminder or automatic sending.' },
      { title: 'In FCFA, euro or dollar', text: 'See and enter amounts in your own currency. In French or English.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'Three steps, that’s all',
    items: [
      { title: 'Create your account', text: 'A first name, a 4-digit code. Write down your 12 backup words on paper.' },
      { title: 'Add sats', text: 'Receive money from a relative or a customer with your QR code.' },
      { title: 'Pay safely', text: 'Scan, check the name and the alerts, confirm. It’s sent in seconds.' },
    ],
    screensAlt: [
      'Check screen: analysis of a suspicious message',
      'Zafy home screen',
      'Alerts screen: scams reported by the community',
    ],
  },
  contact: {
    pageTitle: 'Add a contact · Zafy',
    title: 'is sharing their Zafy card with you',
    text: 'Open it in the Zafy app to add this contact: their name will show up on every payment.',
    open: 'Open in Zafy',
    noApp: 'Don’t have Zafy yet?',
    getApp: 'Download the app',
    invalid: 'This Zafy card link is incomplete or damaged.',
    home: 'Discover Zafy',
  },
  download: {
    title: 'Try Zafy on Android',
    text: 'Test version: it runs on the Bitcoin test network, with no real money. Coming soon to the Play Store.',
    scan: 'Scan to download',
    qrLabel: 'Download QR code',
    button: 'Download the APK',
  },
}

const DICTIONARIES: Record<Language, Dictionary> = { fr, en }

/** Page « carte de contact » ouverte depuis un lien partagé (/ajouter-contact?n=…&a=…). */
export const isContactPage = () => window.location.pathname.startsWith('/ajouter-contact')
const STORAGE_KEY = 'zafy-langue'

/** Langue enregistrée, sinon celle du navigateur (anglais si le navigateur est en anglais, français sinon). */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // Stockage indisponible (navigation privée…)
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

/** Langue choisie, ses textes, et la fonction pour en changer (mémorisée dans le navigateur). */
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    document.title = isContactPage() ? DICTIONARIES[language].contact.pageTitle : DICTIONARIES[language].pageTitle
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Stockage indisponible : la langue n'est pas mémorisée
    }
  }, [language])

  return { language, setLanguage, t: DICTIONARIES[language] }
}
