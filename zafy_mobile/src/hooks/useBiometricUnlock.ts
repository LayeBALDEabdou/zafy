import { t } from '@/i18n';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

import { loadBiometricEnabled } from '@/lib/account';

/** `disabled` : le téléphone le permet, mais l'utilisateur l'a désactivé (Profil → Code et sécurité). */
type Availability = 'checking' | 'available' | 'disabled' | 'no_hardware' | 'not_enrolled';

const ERRORS = {
  lockout: 'errors.bioLockout',
  not_enrolled: 'errors.bioNotEnrolled',
  not_available: 'errors.bioUnavailable',
  passcode_not_set: 'errors.bioNoPasscode',
  authentication_failed: 'errors.bioFailed',
} as const satisfies Partial<Record<LocalAuthentication.LocalAuthenticationError, string>>;

// Annulations volontaires : pas de message d'erreur.
const SILENT = new Set(['user_cancel', 'system_cancel', 'app_cancel', 'user_fallback']);

/** Déverrouillage par empreinte (ou Face ID) via le capteur du téléphone. */
export function useBiometricUnlock() {
  const [availability, setAvailability] = useState<Availability>('checking');

  useEffect(() => {
    (async () => {
      if (!(await LocalAuthentication.hasHardwareAsync())) return setAvailability('no_hardware');
      if (!(await LocalAuthentication.isEnrolledAsync())) return setAvailability('not_enrolled');
      setAvailability((await loadBiometricEnabled()) ? 'available' : 'disabled');
    })();
  }, []);

  /** Renvoie `true` si réussi, sinon un message d'erreur (ou `null` si annulé). */
  const authenticate = useCallback(async (): Promise<true | string | null> => {
    if (availability === 'no_hardware') return t(ERRORS.not_available);
    if (availability === 'not_enrolled') return t(ERRORS.not_enrolled);
    if (availability === 'disabled') return t('security.bioOff');

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('errors.bioPrompt'),
      cancelLabel: t('errors.bioCancel'),
      fallbackLabel: '',
      // Pas de repli sur le code du téléphone : le code Zafy reste l'alternative.
      disableDeviceFallback: true,
    });
    if (result.success) return true;
    if (SILENT.has(result.error)) return null;
    const key = (ERRORS as Partial<Record<string, (typeof ERRORS)[keyof typeof ERRORS]>>)[result.error];
    return t(key ?? 'errors.bioGeneric');
  }, [availability]);

  return { availability, authenticate };
}
