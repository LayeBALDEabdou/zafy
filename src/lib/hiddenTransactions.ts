import { File, Paths } from 'expo-file-system';

/**
 * Transactions retirées de l'historique par l'utilisateur.
 * Un paiement Bitcoin ne peut pas être effacé du réseau : on le masque seulement sur ce téléphone.
 */
const file = () => new File(Paths.document, 'transactions-masquees.json');

export async function loadHiddenTransactions(): Promise<Set<string>> {
  try {
    const f = file();
    return new Set(f.exists ? (JSON.parse(await f.text()) as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function hideTransaction(id: string) {
  const hidden = await loadHiddenTransactions();
  hidden.add(id);
  const f = file();
  if (!f.exists) f.create();
  await f.write(JSON.stringify([...hidden]));
}
