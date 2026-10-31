import { getLocales } from 'expo-localization';
import { File, Paths } from 'expo-file-system';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { en } from '@/i18n/en';
import { fr } from '@/i18n/fr';

export type Language = 'fr' | 'en';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

const file = () => new File(Paths.document, 'langue.json');

/** Langue enregistrée, sinon celle du téléphone (anglais si le téléphone est en anglais, français sinon). */
function initialLanguage(): Language {
  try {
    const f = file();
    if (f.exists) {
      const saved = (JSON.parse(f.textSync()) as { language?: string }).language;
      if (saved === 'fr' || saved === 'en') return saved;
    }
  } catch {
    // Aperçu web ou fichier illisible
  }
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
}

// Instance propre à l'app, branchée sur react-i18next (useTranslation)
const i18next = createInstance();
i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'fr',
  // React échappe déjà le texte
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(language: Language) {
  if (language === i18next.language) return;
  i18next.changeLanguage(language);
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify({ language }));
  } catch {
    // Aperçu web : pas de fichier, on garde en mémoire
  }
}

export const getLanguage = () => i18next.language as Language;

/** Traduction hors composant (notifications, messages d'erreur…). `{{name}}` est remplacé par `params.name`. */
export const t = i18next.t.bind(i18next);

/**
 * Variante au singulier (clé + « One ») quand `n` vaut 1, ex. `t(plural('banner.yourPhone', n), { n })`.
 * (Les pluriels intégrés d'i18next dépendent d'`Intl.PluralRules`, absent de certains moteurs Android.)
 */
export const plural = <K extends string>(key: K, n: number) => (Math.abs(n) === 1 ? (`${key}One` as K) : key);

/** Dans un composant : réaffiche le texte quand la langue change. */
export function useT() {
  const { t: translate, i18n } = useTranslation();
  return { t: translate, language: i18n.language as Language, setLanguage };
}
