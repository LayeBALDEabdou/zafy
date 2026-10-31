import type { IconName } from '@/components/Icon';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmText: string;
  destructive: boolean;
  icon?: IconName;
  resolve: (ok: boolean) => void;
};

// Affichée par <ConfirmDialog /> (monté une fois dans le layout racine)
let show: ((request: ConfirmRequest) => void) | null = null;

export function setConfirmHost(fn: typeof show) {
  show = fn;
}

/** Demande confirmation dans une carte aux couleurs de Zafy et renvoie le choix. */
export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  destructive = false,
  icon?: IconName,
) {
  return new Promise<boolean>((resolve) => {
    if (!show) return resolve(false);
    show({ title, message, confirmText, destructive, icon, resolve });
  });
}
