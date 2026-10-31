import { Fragment, type ReactNode } from 'react';

import { useT } from '@/i18n';

/**
 * Remonte un écran quand la langue change, pour que chaque texte (même mis en cache par le
 * React Compiler) soit retraduit. La navigation, elle, reste en place, comme pour la devise.
 */
export function LanguageScope({ children }: { children: ReactNode }) {
  const { language } = useT();
  return <Fragment key={language}>{children}</Fragment>;
}
