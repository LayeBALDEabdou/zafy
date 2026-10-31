import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import { describeDestination } from '@/lib/breez';
import { fillContactIdentities, loadContacts, matchContact, type Contact } from '@/lib/contacts';

// Partagé entre les écrans : affichage immédiat, rechargé à chaque retour sur l'écran
let cache: Contact[] = [];

/** Annuaire chargé, et `find` pour retrouver un contact par adresse ou cible de signalement. */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(cache);
  const { status } = useWallet();

  useFocusEffect(
    useCallback(() => {
      const show = (list: Contact[]) => {
        cache = list;
        setContacts(list);
      };
      loadContacts()
        .then(show)
        .then(() =>
          // Anciens contacts sans identité Spark : on la lit une fois, portefeuille ouvert
          status === 'ready'
            ? fillContactIdentities(async (a) => (await describeDestination(a)).identityPublicKey)
            : null,
        )
        .then((filled) => filled && show(filled))
        .catch(() => {});
    }, [status]),
  );

  return useMemo(
    () => ({ contacts, find: (value: string | undefined) => matchContact(contacts, value) }),
    [contacts],
  );
}
