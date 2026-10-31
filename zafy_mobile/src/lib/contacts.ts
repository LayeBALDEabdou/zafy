import { File, Paths } from 'expo-file-system';

import { t } from '@/i18n';
import { formatTarget, normalizePhone } from '@/lib/nostr';

export type Contact = {
  id: string;
  name: string;
  /** Facultatif : pour reconnaître la personne (jamais envoyé ailleurs). */
  phone?: string;
  /** Adresse réutilisable (Spark ou Bitcoin) : une facture ne sert qu'une fois. */
  address: string;
  /** Identité Spark lue dans l'adresse : reconnaît ce contact dans ses factures Spark. */
  identity?: string;
};

const shorten = (s: string) => (s.length > 22 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);

/** Numéro joliment écrit (« +221 77 123 45 67 »), ou null s'il n'a pas été renseigné. */
export const contactPhone = (c: Contact) => (c.phone ? formatTarget(`phone:${normalizePhone(c.phone)}`) : null);

/** Sous-titre d'un contact : son numéro, sinon son adresse raccourcie. */
export const contactSubtitle = (c: Contact) => contactPhone(c) ?? shorten(c.address);

export type ContactInput = Omit<Contact, 'id'>;

// Annuaire personnel, enregistré seulement sur ce téléphone
const file = () => new File(Paths.document, 'contacts.json');

export async function loadContacts(): Promise<Contact[]> {
  const f = file();
  if (!f.exists) return [];
  try {
    const contacts = JSON.parse(await f.text()) as Contact[];
    return contacts.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  } catch {
    return [];
  }
}

async function saveContacts(contacts: Contact[]) {
  const f = file();
  if (!f.exists) f.create();
  await f.write(JSON.stringify(contacts));
}

export async function getContact(id: string) {
  return (await loadContacts()).find((c) => c.id === id) ?? null;
}

const sameAddress = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Contact correspondant à une adresse, ou à une cible de signalement (« phone:+221… », « sparkid:… »).
 * Synchrone : à utiliser avec la liste déjà chargée (voir `useContacts`).
 */
export function matchContact(contacts: Contact[], value: string | undefined) {
  if (!value) return null;
  if (value.startsWith('sparkid:')) {
    const identity = value.slice('sparkid:'.length);
    return contacts.find((c) => c.identity === identity) ?? null;
  }
  if (value.startsWith('phone:')) {
    const phone = value.slice('phone:'.length);
    return contacts.find((c) => c.phone && normalizePhone(c.phone) === phone) ?? null;
  }
  const address = value.replace(/^(spark|bitcoin):/, '');
  return contacts.find((c) => sameAddress(c.address, address)) ?? null;
}

/** Le contact enregistré pour cette adresse, s'il existe. */
export async function findContactByAddress(address: string) {
  if (!address.trim()) return null;
  return (await loadContacts()).find((c) => sameAddress(c.address, address)) ?? null;
}

/** Ajoute un contact, ou le modifie si `id` est fourni. Refuse une adresse déjà enregistrée sous un autre nom. */
export async function saveContact(input: ContactInput, id?: string) {
  const contacts = await loadContacts();
  const duplicate = contacts.find((c) => c.id !== id && sameAddress(c.address, input.address));
  if (duplicate) throw new Error(t('errors.duplicateContact', { name: duplicate.name }));
  const contact: Contact = { ...input, id: id ?? `${Date.now()}` };
  await saveContacts(id ? contacts.map((c) => (c.id === id ? contact : c)) : [...contacts, contact]);
  return contact;
}

/** Complète l'identité Spark des contacts qui n'en ont pas encore (enregistrés avant cette fonction). */
export async function fillContactIdentities(identityOf: (address: string) => Promise<string | undefined>) {
  const contacts = await loadContacts();
  let changed = false;
  for (const c of contacts) {
    if (c.identity) continue;
    const identity = await identityOf(c.address).catch(() => undefined);
    if (identity) {
      c.identity = identity;
      changed = true;
    }
  }
  if (changed) await saveContacts(contacts);
  return changed ? contacts : null;
}

export async function deleteContact(id: string) {
  await saveContacts((await loadContacts()).filter((c) => c.id !== id));
}

// --- Choix d'un contact depuis un autre écran (Envoyer, Nouveau paiement) ---

type Listener = (contact: Contact) => void;
// Pile, comme pour le scanner : l'écran du dessus reçoit le choix
const listeners: Listener[] = [];

export function onContactPick(fn: Listener) {
  listeners.push(fn);
  return () => {
    const i = listeners.lastIndexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export const emitContactPick = (contact: Contact) => listeners.at(-1)?.(contact);
