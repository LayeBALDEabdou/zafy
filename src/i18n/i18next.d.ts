import type { fr } from '@/i18n/fr';

// Clés de traduction vérifiées par TypeScript : une clé inexistante est une erreur.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof fr };
  }
}
